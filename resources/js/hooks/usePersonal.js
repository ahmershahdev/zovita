import { usePage } from '@inertiajs/react';

/** This visitor's personal % off a product (from the automatic offer engine), or 0. */
export function usePersonalPercent(productId) {
    return usePage().props.personal?.products?.[productId] ?? 0;
}

/** This visitor's A/B variant for an experiment. */
export function useVariant(experiment) {
    return usePage().props.experiments?.[experiment] ?? null;
}
