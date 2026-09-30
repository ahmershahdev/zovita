import { useEffect, useState } from 'react';

const KEY = 'zv-recent';
const MAX = 12;
const FIELDS = ['id', 'slug', 'name', 'brand', 'category', 'form', 'image', 'thumb', 'price', 'current_price', 'discount_percent', 'requires_prescription', 'in_stock', 'max_quantity', 'generics'];

const load = () => {
    try {
        const list = JSON.parse(localStorage.getItem(KEY) || '[]');
        return Array.isArray(list) ? list.filter((p) => p && typeof p.slug === 'string') : [];
    } catch {
        return [];
    }
};

/**
 * Per-browser "recently viewed" list (a convenience only — safe to lose). Records `product` and
 * returns the other recently viewed items, newest first.
 */
export default function useRecentlyViewed(product) {
    const [items, setItems] = useState([]);

    useEffect(() => {
        const card = Object.fromEntries(FIELDS.map((f) => [f, product[f]]));
        const list = [card, ...load().filter((p) => p.slug !== product.slug)].slice(0, MAX);
        try {
            localStorage.setItem(KEY, JSON.stringify(list));
        } catch {
            /* storage full or blocked */
        }
        setItems(list.slice(1));
    }, [product.slug]); // eslint-disable-line react-hooks/exhaustive-deps

    return items;
}
