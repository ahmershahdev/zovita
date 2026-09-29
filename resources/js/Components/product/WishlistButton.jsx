import { router, usePage } from '@inertiajs/react';
import Icon from '@/Components/ui/Icon';
import { cn } from '@/lib/cn';

export default function WishlistButton({ product, className }) {
    const saved = usePage().props.wishlist.includes(product.id);

    const toggle = (e) => {
        e.preventDefault();
        e.stopPropagation();
        router.post(route('wishlist.toggle', product.slug), {}, { preserveScroll: true, preserveState: true });
    };

    return (
        <button
            type="button"
            onClick={toggle}
            aria-pressed={saved}
            aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
            className={cn(
                'grid size-10 place-items-center rounded-full backdrop-blur transition duration-300 hover:scale-110',
                saved ? 'bg-coral text-white' : 'bg-white/80 text-ink hover:bg-white',
                className,
            )}
        >
            <Icon name="heart" size={18} fill={saved ? 'currentColor' : 'none'} />
        </button>
    );
}
