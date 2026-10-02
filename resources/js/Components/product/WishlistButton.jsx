import { router, usePage } from '@inertiajs/react';
import { useRef } from 'react';
import Icon from '@/Components/ui/Icon';
import { cn } from '@/lib/cn';
import { breakHeart, fly } from '@/lib/fly';

/** Heart toggle: saving flies a heart to the header wishlist; un-saving cracks it. */
export default function WishlistButton({ product, className }) {
    const saved = usePage().props.wishlist.includes(product.id);
    const button = useRef(null);

    const toggle = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (saved) breakHeart(button.current);
        else fly('wishlist', { from: button.current });
        router.post(route('wishlist.toggle', product.slug), {}, { preserveScroll: true, preserveState: true });
    };

    return (
        <button
            ref={button}
            type="button"
            onClick={toggle}
            aria-pressed={saved}
            aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
            className={cn(
                'grid size-10 place-items-center rounded-full backdrop-blur transition duration-300 hover:scale-110 active:scale-90',
                saved ? 'bg-coral text-white' : 'bg-paper/80 text-ink backdrop-blur hover:bg-paper',
                className,
            )}
        >
            <Icon name="heart" size={18} fill={saved ? 'currentColor' : 'none'} className={saved ? 'animate-[pop-in_0.5s_var(--ease-expo)]' : undefined} />
        </button>
    );
}
