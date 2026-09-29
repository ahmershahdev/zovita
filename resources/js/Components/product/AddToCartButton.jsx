import { router } from '@inertiajs/react';
import { useState } from 'react';
import Icon from '@/Components/ui/Icon';
import { cn } from '@/lib/cn';

/** Compact circular add button used on product cards. */
export default function AddToCartButton({ product, quantity = 1, className }) {
    const [busy, setBusy] = useState(false);

    if (!product.in_stock) {
        return <span className={cn('eyebrow rounded-full bg-paper-deep px-3 py-2 text-ink-mute', className)}>Sold out</span>;
    }

    const add = (e) => {
        e.preventDefault();
        e.stopPropagation();
        router.post(
            route('cart.store'),
            { product_id: product.id, quantity },
            { preserveScroll: true, preserveState: true, onStart: () => setBusy(true), onFinish: () => setBusy(false) },
        );
    };

    return (
        <button
            type="button"
            onClick={add}
            disabled={busy}
            aria-label={`Add ${product.name} to bag`}
            className={cn(
                'group/add grid size-11 place-items-center rounded-full bg-ink text-paper transition duration-300 hover:bg-mint hover:text-ink disabled:opacity-60',
                className,
            )}
        >
            {busy ? (
                <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
            ) : (
                <Icon name="plus" size={18} className="transition-transform duration-500 group-hover/add:rotate-90" />
            )}
        </button>
    );
}
