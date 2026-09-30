const slug = (s) =>
    String(s)
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-');

/**
 * Clean shop URL — mirrors App\Support\ShopPath::build so both sides produce the same canonical
 * path, e.g. shopPath({ department: 'medicines', category: 'pain-fever-relief', sort: 'price_asc' })
 * → "/shop/medicines/pain-fever-relief/sort-price-asc". No query strings.
 */
export function shopPath({ department, category, brand, form, rx, in_stock, min, max, sort, q, page } = {}) {
    const parts = [
        department,
        category,
        brand && `brand-${brand}`,
        form && `form-${form}`,
        rx === 'rx' ? 'prescription' : rx === 'otc' ? 'otc' : '',
        in_stock && 'in-stock',
        (min ?? null) !== null || (max ?? null) !== null ? `price-${Number(min ?? 0) || 0}-${max ?? 'any'}` : '',
        sort && sort !== 'featured' && `sort-${sort.replace(/_/g, '-')}`,
        q && `search-${slug(q)}`,
        page > 1 && `page-${page}`,
    ].filter(Boolean);

    return `/shop${parts.length ? `/${parts.join('/')}` : ''}`;
}

/** Absolute URL; Ziggy's base keeps sub-folder installs (http://localhost/zovita) working. */
export function shopUrl(filters) {
    return route('shop.index').replace(/\/shop$/, '') + shopPath(filters);
}
