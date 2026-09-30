#!/usr/bin/env node
/**
 * Builds database/data/catalog.json from public DVAGO category + product pages.
 *
 * Usage: node tools/catalog/scrape-dvago.mjs [--limit=1200] [--no-details] [--refresh]
 *
 * The script is polite on purpose: sequential category fetches, low concurrency for
 * product detail pages, and a delay between requests. Re-run it to refresh prices.
 * Detail fields already present in the existing catalog.json are reused; pass --refresh
 * to fetch every product page again.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'database/data/catalog.json');
// Detail pages fetched so far; lets an interrupted run resume without refetching.
const CHECKPOINT = path.join(ROOT, 'storage/app/catalog-details.json');
const BASE = 'https://www.dvago.pk';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
}));
const LIMIT = Number(args.limit ?? 1200);
const WITH_DETAILS = !args['no-details'];

/** Zovita departments → DVAGO category slugs they are built from; `target` caps each aisle. */
const DEPARTMENTS = [
    {
        slug: 'medicines', name: 'Medicines', blurb: 'Pharmacist-verified OTC and prescription medicines.', target: 460,
        sources: ['pain-fever-relief', 'cough-cold', 'allergy', 'acidity-indigestion', 'diabetes', 'hypertension',
            'cholesterol-control', 'bacterial-infection', 'diarrhea-relief', 'migraine', 'insomnia', 'asthma', 'sore-throat-relief',
            'anxiety', 'depression', 'epilepsy', 'arthritis', 'osteoarthritis', 'muscle-relaxant', 'anti-spasmodic', 'constipation',
            'piles', 'fungal-infection', 'viral-infection', 'parasitic-infection', 'urinary-tract-infection', 'hypothyroidism',
            'heart-failure', 'angina', 'arrhythmia', 'blood-clot', 'anemia', 'nausea-vomiting', 'vertigo', 'eye-infection',
            'ear-infection', 'nasal-congestion', 'mouth-ulcers', 'scabies', 'psoriasis', 'liver-care', 'kidney-disease',
            'neuropathic-pain', 'gastroesophageal-reflux-disease', 'malaria', 'tuberculosis', 'hepatitis', 'homeopathic', 'herbal',
            'muscle-spasms', 'osteoporosis', 'dementia', 'benign-prostatic-hyperplasia', 'polycystic-ovary-syndrome'],
    },
    {
        slug: 'vitamins-supplements', name: 'Vitamins & Supplements', blurb: 'Daily nutrition, minerals, and targeted support.', target: 190,
        sources: ['multivitamins', 'vitamin-c-supplements', 'vitamin-d-supplements', 'calcium-minerals', 'fish-oil-omega-3',
            'biotin-supplements', 'iron-supplements', 'probiotics', 'protein-supplement', 'kids-supplements', 'women-supplement',
            'mens-supplements', 'zinc-supplements', 'folic-acid-supplements', 'brain-memory', 'boost-your-immunity',
            'weight-management', 'digestive-enzymes', 'anti-aging-supplements', 'diabetes-supplements'],
    },
    {
        slug: 'skin-care', name: 'Skin & Derma', blurb: 'Dermatologist-backed care for every skin concern.', target: 150,
        sources: ['acne', 'sunscreen', 'moisturizer', 'facewash', 'serum', 'hyperpigmentation', 'melasma', 'dry-skin', 'scars',
            'lip-care', 'body-lotion', 'anti-aging-products', 'rashes', 'skin-whitening', 'scrubs-exfoliators', 'toner-mist'],
    },
    {
        slug: 'hair-care', name: 'Hair Care', blurb: 'Treatments for hair fall, dandruff, and scalp health.', target: 80,
        sources: ['hair-growth', 'anti-dandruff', 'medicated-shampoo', 'hair-oils', 'conditioner', 'baldness', 'hair-scalp-treatment', 'shampoo'],
    },
    {
        slug: 'mother-baby', name: 'Mother & Baby', blurb: 'Gentle essentials for little ones and new mothers.', target: 100,
        sources: ['baby-creams-lotions', 'infant-indigestion', 'stage-1-milk-powder', 'stage-2-milk-powder', 'baby-wipes',
            'baby-bath-body', 'baby-powders-oils', 'pregnancy-care', 'mother-supplements', 'soothers-teethers', 'baby-cereal', 'baby-soaps-shampoo'],
    },
    {
        slug: 'personal-care', name: 'Personal & Oral Care', blurb: 'Everyday hygiene, oral care, and feminine care.', target: 90,
        sources: ['tooth-paste', 'mouthwash', 'feminine-care', 'toothbrushes', 'deodorants-anti-perspirants', 'handwash-sanitizers',
            'sanitary-pads', 'denture-care', 'gum-care', 'bodywash-soaps', 'feminine-wash'],
    },
    {
        slug: 'health-devices', name: 'Health Devices', blurb: 'Monitors and devices for care at home.', target: 80,
        sources: ['bp-monitors', 'digital-thermometer', 'blood-glucose-monitor-strips', 'pulse-oximeter', 'nebulizer',
            'weighing-scales', 'heating-pads', 'body-massager', 'steam-inhaler', 'supports-braces', 'knee-leg-support', 'back-abdomen-support'],
    },
    {
        slug: 'first-aid', name: 'First Aid & Eye Care', blurb: 'Wound care, bandages, drops, and quick relief.', target: 90,
        sources: ['wound-care', 'dry-eyes', 'nutritional-drinks', 'first-aid', 'dressing-bandages', 'antiseptics-disinfectants',
            'eye-allergy', 'artificial-tears', 'lens-care', 'fluids-electrolytes', 'ear-wax-remover', 'face-mask'],
    },
];

const DETAIL_FIELDS = ['generics', 'indication', 'dosage', 'precautions', 'description', 'how_it_works', 'highlights', 'warnings'];

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

/** Products from the previous run whose detail pages were fetched successfully, keyed by slug. */
async function readPrevious() {
    const found = new Map();
    if (args.refresh) return found;
    for (const file of [OUT, CHECKPOINT]) {
        try {
            const data = JSON.parse(await fs.readFile(file, 'utf8'));
            const list = Array.isArray(data) ? data : data.products;
            for (const p of list) if (!p.detail_error && DETAIL_FIELDS.every((k) => k in p)) found.set(p.slug, p);
        } catch { /* no file yet */ }
    }
    return found;
}

const saveCheckpoint = (products) =>
    fs.writeFile(CHECKPOINT, JSON.stringify(products.filter((p) => !p.detail_error && DETAIL_FIELDS.every((k) => k in p))
        .map((p) => Object.fromEntries(['slug', ...DETAIL_FIELDS].map((k) => [k, p[k]])))));

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

/** WARNINGS is an object ({"Warning 1": "...", "Warning 2": "..."}), not a string. */
function readWarnings(html) {
    const items = [];
    for (let n = 1; n <= 12; n++) {
        const value = readEscapedField(html, `Warning ${n}`);
        if (value && !items.includes(value)) items.push(value);
    }
    return items.length ? items.map((w) => `• ${w}`).join('\n') : null;
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
    const previous = await readPrevious();
    const bySlug = new Map();

    for (const dept of DEPARTMENTS) {
        let deptCount = 0;
        for (const source of dept.sources) {
            if (deptCount >= dept.target) break;
            process.stdout.write(`→ ${dept.slug}/${source} `);
            let html;
            try { html = await fetchText(`${BASE}/cat/${source}`); } catch (e) { console.log(`skip (${e.message})`); continue; }
            const records = extractListingRecords(html);
            let added = 0;
            for (const r of records) {
                if (deptCount >= dept.target) break;
                if (!r.Slug || !r.Title || bySlug.has(r.Slug) || !r.ProductImage || /\.svg($|\?)|dvago-logo/i.test(r.ProductImage)) continue;
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

    // Balance departments so a capped catalog still covers every aisle.
    const grouped = DEPARTMENTS.map((d) => [...bySlug.values()].filter((p) => p.department === d.slug));
    const products = [];
    for (let i = 0; products.length < LIMIT && grouped.some((g) => g[i]); i++) {
        for (const g of grouped) if (g[i] && products.length < LIMIT) products.push(g[i]);
    }

    if (WITH_DETAILS) {
        const queue = products.filter((p) => {
            const old = previous.get(p.slug);
            if (!old) return true;
            for (const k of DETAIL_FIELDS) p[k] = old[k] ?? null;
            return false;
        });
        const total = queue.length;
        console.log(`details: ${products.length - total} reused, ${total} to fetch`);
        let done = 0;
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
                    p.highlights = readEscapedField(html, 'Highlights') || null;
                    p.warnings = readWarnings(html);
                } catch (e) {
                    p.detail_error = e.message;
                }
                done++;
                if (done % 25 === 0) {
                    console.log(`details ${done}/${total}`);
                    await saveCheckpoint(products);
                }
                await sleep(350);
            }
        };
        await Promise.all([worker(), worker(), worker()]);
    }

    const catalog = {
        source: BASE,
        generated_at: new Date().toISOString(),
        departments: DEPARTMENTS.map(({ sources, target, ...d }) => d),
        products,
    };
    await fs.mkdir(path.dirname(OUT), { recursive: true });
    await fs.writeFile(OUT, JSON.stringify(catalog, null, 2));
    await fs.rm(CHECKPOINT, { force: true });
    console.log(`\n✓ ${products.length} products → ${path.relative(ROOT, OUT)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
