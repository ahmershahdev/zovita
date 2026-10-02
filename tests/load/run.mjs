/**
 * Load & abuse tests with autocannon.
 *
 *   node tests/load/run.mjs capacity [baseUrl]   throughput/latency of key pages (allow-list your IP
 *                                                  with RATE_LIMIT_ALLOWLIST so the site budget doesn't kick in)
 *   node tests/load/run.mjs abuse [baseUrl]       one client flooding the shop: expect 429s quickly, while a
 *                                                  separate probe keeps getting fast answers
 *
 * Results are printed as a table and written to storage/app/load/<mode>.json.
 */
import autocannon from 'autocannon';
import fs from 'node:fs';

const mode = process.argv[2] ?? 'capacity';
const base = (process.argv[3] ?? 'http://localhost/zovita').replace(/\/$/, '');
const DURATION = Number(process.env.LOAD_DURATION ?? 15);
const CONNECTIONS = Number(process.env.LOAD_CONNECTIONS ?? 25);

const run = (opts) => new Promise((resolve, reject) => autocannon(opts, (err, res) => (err ? reject(err) : resolve(res))));

async function capacity() {
    // Inertia rejects JSON visits from an outdated asset version (409), so read the current one first.
    const html = await (await fetch(base + '/faq')).text();
    const version = JSON.parse(html.match(/data-page="([^"]+)"/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&')).version ?? '';
    const targets = process.env.LOAD_ONLY ? null : null;
    const all = [
        ['Home', ''],
        ['Shop (department)', '/shop/medicines'],
        ['Product page', '/product/panadol-500mg-tablets'],
        ['FAQ', '/faq'],
        ['Inertia JSON visit', '/shop', { 'X-Inertia': 'true', 'X-Inertia-Version': version, 'X-Requested-With': 'XMLHttpRequest' }],
        ['Static asset (image)', '/storage/products/panadol-500mg-tablets-sm.webp'],
    ];
    const rows = [];
    for (const [name, path, headers = {}] of all.filter(([n]) => !process.env.LOAD_ONLY || process.env.LOAD_ONLY.split(',').includes(n))) {
        const r = await run({ url: base + path, connections: CONNECTIONS, duration: DURATION, headers });
        rows.push({
            target: name,
            'req/s (avg)': Math.round(r.requests.average),
            'p50 ms': r.latency.p50,
            'p97.5 ms': r.latency.p97_5,
            'p99 ms': r.latency.p99,
            '2xx': r['2xx'],
            'non-2xx': r.non2xx,
            errors: r.errors + r.timeouts,
        });
        console.log(`✓ ${name}`);
    }
    return rows;
}

async function abuse() {
    // A probe from the same machine measures how the site behaves for a normal visitor during the flood.
    const probe = [];
    let stop = false;
    const prober = (async () => {
        while (!stop) {
            const t = performance.now();
            const res = await fetch(base + '/faq', { headers: { 'X-Forwarded-For': '198.51.100.7' } }).catch(() => null);
            probe.push({ ms: performance.now() - t, status: res?.status ?? 0 });
            await new Promise((r) => setTimeout(r, 500));
        }
    })();
    const r = await run({ url: base + '/shop', connections: CONNECTIONS, duration: DURATION });
    stop = true;
    await prober;
    const statuses = r.statusCodeStats ?? {};
    return [
        {
            scenario: `${CONNECTIONS} connections flooding /shop for ${DURATION}s from one client`,
            'total requests': r.requests.total,
            '200 OK': statuses['200']?.count ?? 0,
            '429 Too Many Requests': statuses['429']?.count ?? 0,
            'flood p50 ms': r.latency.p50,
            'probe median ms': Math.round(probe.map((p) => p.ms).sort((a, b) => a - b)[Math.floor(probe.length / 2)] ?? 0),
            'probe statuses': [...new Set(probe.map((p) => p.status))].join(','),
        },
    ];
}

const rows = mode === 'abuse' ? await abuse() : await capacity();
console.table(rows);
fs.mkdirSync('storage/app/load', { recursive: true });
fs.writeFileSync(`storage/app/load/${mode}.json`, JSON.stringify({ base, connections: CONNECTIONS, duration: DURATION, at: new Date().toISOString(), rows }, null, 2));
