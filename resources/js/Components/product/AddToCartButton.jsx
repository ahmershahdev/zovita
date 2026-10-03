import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import Icon from '@/Components/ui/Icon';
import { cn } from '@/lib/cn';
import { fly } from '@/lib/fly';
import { track } from '@/lib/signals';
import useT from '@/hooks/useT';

/**
 * Compact circular add button used on product cards. The product photo flies into the header bag
 * the moment it is pressed, and the button confirms with a check once the server agrees.
 */
export default function AddToCartButton({ product, quantity = 1, className }) {
    const t = useT();
    const [state, setState] = useState('idle'); // idle | busy | done

    useEffect(() => {
        if (state !== 'done') return undefined;
        const t = setTimeout(() => setState('idle'), 1600);
        return () => clearTimeout(t);
    }, [state]);

    if (!product.in_stock) {
        return <span className={cn('eyebrow rounded-full bg-paper-deep px-3 py-2 text-ink-mute', className)}>Sold out</span>;
    }

    const add = (e) => {
        e.preventDefault();
        e.stopPropagation();
        track('card_badge', 'add_to_cart');
        track('hero_cta', 'add_to_cart');
        const card = e.currentTarget.closest('[data-fly-source]') ?? e.currentTarget.closest('article');
        fly('cart', { from: card?.querySelector('img') ?? e.currentTarget, image: product.thumb ?? product.image });
        router.post(
            route('cart.store'),
            { product_id: product.id, quantity },
            {
                preserveScroll: true,
                preserveState: true,
                onStart: () => setState('busy'),
                onSuccess: (page) => setState(page.props.flash?.error ? 'idle' : 'done'),
                onError: () => setState('idle'),
            },
        );
    };

    return (
        <button
            type="button"
            onClick={add}
            disabled={state === 'busy'}
            aria-label={t('Add :name to bag', { name: product.name })}
            className={cn(
                'group/add relative grid size-11 place-items-center overflow-hidden rounded-full transition duration-300 disabled:opacity-60',
                state === 'done' ? 'bg-mint text-night' : 'bg-ink text-paper hover:bg-mint hover:text-night',
                className,
            )}
        >
            {state === 'busy' ? (
                <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
            ) : state === 'done' ? (
                <Icon name="check" size={18} className="animate-[pop-in_0.5s_var(--ease-expo)]" />
            ) : (
                <Icon name="plus" size={18} className="transition-transform duration-500 group-hover/add:rotate-90" />
            )}
        </button>
    );
}
