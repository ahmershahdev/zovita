import { activeLocale } from '@/hooks/useT';

const pkr = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const pkrPrecise = new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** "PKR 1,234" — whole rupees for display, paisa only when present. */
export function money(value, { precise = false } = {}) {
    const amount = Number(value || 0);
    return `PKR ${(precise ? pkrPrecise : pkr).format(amount)}`;
}

/** Dates follow the interface language: Urdu month names with Western digits, like prices. */
export function date(iso, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
    return new Date(iso).toLocaleDateString(activeLocale() === 'ur' ? 'ur-PK-u-nu-latn' : 'en-US', options);
}

export function pluralize(count, word, plural = `${word}s`) {
    return `${count} ${count === 1 ? word : plural}`;
}

export const pad = (n, size = 2) => String(n).padStart(size, '0');
