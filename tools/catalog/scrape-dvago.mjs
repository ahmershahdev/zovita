#!/usr/bin/env node
/**
 * Builds database/data/catalog.json from public DVAGO category + product pages.
 *
 * Usage: node tools/catalog/scrape-dvago.mjs [--limit=480] [--no-details]
 *
 * The script is polite on purpose: sequential category fetches, low concurrency for
 * product detail pages, and a delay between requests. Re-run it to refresh prices.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'database/data/catalog.json');
const BASE = 'https://www.dvago.pk';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
}));
const LIMIT = Number(args.limit ?? 480);
const WITH_DETAILS = !args['no-details'];

/** Zovita departments → DVAGO category slugs they are built from. */
const DEPARTMENTS = [
    {
        slug: 'medicines', name: 'Medicines', blurb: 'Pharmacist-verified OTC and prescription medicines.',
        sources: ['pain-fever-relief', 'cough-cold', 'allergy', 'acidity-indigestion', 'diabetes', 'hypertension',
            'cholesterol-control', 'bacterial-infection', 'diarrhea', 'migraine', 'insomnia', 'asthma', 'sore-throat-relief'],
    },
    {
        slug: 'vitamins-supplements', name: 'Vitamins & Supplements', blurb: 'Daily nutrition, minerals, and targeted support.',
        sources: ['multivitamins', 'vitamin-c-supplements', 'vitamin-d-supplements', 'calcium-minerals', 'fish-oil-omega-3',
            'biotin-supplements', 'iron-supplements', 'probiotics', 'protein-supplement', 'kids-supplements', 'women-supplement'],
    },
    {
        slug: 'skin-care', name: 'Skin & Derma', blurb: 'Dermatologist-backed care for every skin concern.',
        sources: ['acne', 'sunscreen', 'moisturizer', 'facewash', 'serum', 'hyperpigmentation'],
    },
    {
        slug: 'hair-care', name: 'Hair Care', blurb: 'Treatments for hair fall, dandruff, and scalp health.',
        sources: ['hair-growth', 'anti-dandruff', 'medicated-shampoo'],
    },
    {
        slug: 'mother-baby', name: 'Mother & Baby', blurb: 'Gentle essentials for little ones and new mothers.',
        sources: ['baby-creams-lotions', 'infant-indigestion', 'stage-1-milk-powder', 'baby-wipes'],
    },
    {
        slug: 'personal-care', name: 'Personal & Oral Care', blurb: 'Everyday hygiene, oral care, and feminine care.',
        sources: ['tooth-paste', 'mouthwash', 'feminine-care'],
    },
    {
        slug: 'health-devices', name: 'Health Devices', blurb: 'Monitors and devices for care at home.',
        sources: ['bp-monitors', 'digital-thermometer', 'blood-glucose-monitor-strips', 'pulse-oximeter', 'nebulizer'],
    },
    {
        slug: 'first-aid', name: 'First Aid & Eye Care', blurb: 'Wound care, bandages, drops, and quick relief.',
        sources: ['wound-care', 'dry-eyes', 'nutritional-drinks'],
    },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url, attempt = 1) {
    try {
        const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (ZovitaCatalogBot; demo catalog build)' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.text();
    } catch (err) {
        if (attempt >= 3) throw err;
        await sleep(1000 * attempt);
        return fetchText(url, attempt + 1);
    }
}

/** Next.js RSC payloads hold JSON inside JS strings, so records are escaped once. */
function extractListingRecords(html) {
    const records = [];
    for (const match of html.matchAll(/\{\\"ProductID\\":\\"\d+\\"[^{}]*\}/g)) {
        try {
            records.push(JSON.parse(JSON.parse(`"${match[0]}"`)));
        } catch { /* skip malformed fragment */ }
    }
    return records;
}

function readEscapedField(html, key) {
    const needle = `\\"${key}\\":\\"`;
    let best = '';
    let from = 0;
    for (;;) {
        const start = html.indexOf(needle, from);
        if (start === -1) break;
        const valueStart = start + needle.length;
        let end = valueStart;
        // value ends at the next unescaped \" (i.e. \" not preceded by another backslash pair)
        for (;;) {
            end = html.indexOf('\\"', end);
            if (end === -1) break;
            if (html[end - 1] !== '\\') break;
            end += 2;
        }
        if (end === -1) break;
        let value = html.slice(valueStart, end);
        try { value = JSON.parse(JSON.parse(`"\\"${value}\\""`)); } catch { value = value.replace(/\\\\n/g, '\n'); }
        value = String(value).replace(/\s+/g, ' ').trim();
        if (value.length > best.length) best = value;
        from = end;
    }
    return best;
}

function detectForm(title) {
    const t = title.toLowerCase();
    const forms = [
        ['syrup', /syrup|suspension|elixir/], ['drops', /drops?\b/], ['tablet', /tablet|tab\b/], ['capsule', /capsule|softgel/],
        ['sachet', /sachet/], ['injection', /injection|vial/], ['cream', /cream/], ['gel', /\bgel\b/], ['lotion', /lotion/],
        ['ointment', /ointment/], ['wash', /wash|cleanser/], ['shampoo', /shampoo/], ['serum', /serum/], ['spray', /spray|inhaler/], ['solution', /solution|liquid/],
        ['powder', /powder|formula|milk/], ['device', /monitor|thermometer|oximeter|nebulizer|strips|meter|machine/],
    ];
    return forms.find(([, re]) => re.test(t))?.[0] ?? 'other';
}

const toMoney = (v) => Math.round(Number.parseFloat(v || '0') * 100) / 100;
const titleCase = (s) => s.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase()).replace(/\(Pvt\)/i, '(Pvt)');

async function main() {
    const bySlug = new Map();
    const perDeptTarget = Math.ceil(LIMIT / DEPARTMENTS.length) + 25;

    for (const dept of DEPARTMENTS) {
        let deptCount = 0;
        for (const source of dept.sources) {
            if (deptCount >= perDeptTarget) break;
            process.stdout.write(`→ ${dept.slug}/${source} `);
            let html;
            try { html = await fetchText(`${BASE}/cat/${source}`); } catch (e) { console.log(`skip (${e.message})`); continue; }
            const records = extractListingRecords(html);
            let added = 0;
            for (const r of records) {
                if (!r.Slug || !r.Title || bySlug.has(r.Slug) || !r.ProductImage) continue;
                const price = toMoney(r.SalePrice || r.Price);
                if (!price) continue;
                bySlug.set(r.Slug, {
                    slug: r.Slug,
                    name: r.Title.trim(),
                    brand: titleCase((r.Brand || 'Zovita Select').trim()),
                    department: dept.slug,
                    category: (r.CategoryName || source).trim(),
                    category_slug: source,
                    form: detectForm(r.Title),
                    price,
                    sale_price: toMoney(r.DiscountPrice) && toMoney(r.DiscountPrice) < price ? toMoney(r.DiscountPrice) : null,
                    stock: Math.max(0, Number.parseInt(r.AvailableQty || '0', 10)),
                    max_per_order: Math.max(1, Number.parseInt(r.MaxOrder || '10', 10)),
                    requires_prescription: String(r.PrescriptionRequired).toLowerCase() === 'true',
                    pack: (r.Variations || r.VariationTitle || 'Pack').trim(),
                    summary: (r.Description || '').replace(/ and get it delivered.*$/i, '').trim(),
                    image: r.ProductImage,
                    source_url: `${BASE}/p/${r.Slug}`,
                });
                added++; deptCount++;
            }
            console.log(`+${added}`);
            await sleep(450);
        }
    }

    // Balance departments so the capped catalog still covers every aisle.
    const grouped = DEPARTMENTS.map((d) => [...bySlug.values()].filter((p) => p.department === d.slug));
    const products = [];
    for (let i = 0; products.length < LIMIT && grouped.some((g) => g[i]); i++) {
        for (const g of grouped) if (g[i] && products.length < LIMIT) products.push(g[i]);
    }

    if (WITH_DETAILS) {
        let done = 0;
        const queue = [...products];
        const worker = async () => {
            while (queue.length) {
                const p = queue.shift();
                try {
                    const html = await fetchText(p.source_url);
                    p.generics = readEscapedField(html, 'Generics') || null;
                    p.indication = readEscapedField(html, 'Indication') || readEscapedField(html, 'Usedfor') || null;
                    p.dosage = readEscapedField(html, 'Dosage') || null;
                    p.precautions = readEscapedField(html, 'Precaution') || null;
                    p.description = readEscapedField(html, 'Description1') || null;
                    p.how_it_works = readEscapedField(html, 'HowItWorks') || null;
                } catch (e) {
                    p.detail_error = e.message;
                }
                done++;
                if (done % 25 === 0) console.log(`details ${done}/${products.length}`);
                await sleep(350);
            }
        };
        await Promise.all([worker(), worker(), worker()]);
    }

    const catalog = {
        source: BASE,
        generated_at: new Date().toISOString(),
        departments: DEPARTMENTS.map(({ sources, ...d }) => d),
        products,
    };
    await fs.mkdir(path.dirname(OUT), { recursive: true });
    await fs.writeFile(OUT, JSON.stringify(catalog, null, 2));
    console.log(`\n✓ ${products.length} products → ${path.relative(ROOT, OUT)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
