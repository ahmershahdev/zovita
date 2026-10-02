import { usePage } from '@inertiajs/react';
import { useMemo } from 'react';
import { money } from '@/lib/format';

/**
 * Returns `fill(text)`, which replaces {email}, {phone}, {hours}, {free} and {fee} in content copy
 * with the live store config, so policy and help text never drift from the real numbers.
 */
export default function useStoreFacts() {
    const { app } = usePage().props;
    return useMemo(() => {
        const values = {
            email: app.support?.email ?? '',
            phone: app.support?.phone ?? '',
            hours: app.support?.hours ?? '',
            free: money(app.freeDeliveryOver ?? 2500),
            fee: money(app.deliveryFee ?? 150),
        };
        return (text) => (typeof text === 'string' ? text.replace(/\{(\w+)\}/g, (m, k) => values[k] ?? m) : text);
    }, [app]);
}
