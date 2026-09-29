import { Link } from '@inertiajs/react';
import Badge from '@/Components/ui/Badge';
import Price from '@/Components/ui/Price';
import { cn } from '@/lib/cn';
import AddToCartButton from './AddToCartButton';
import WishlistButton from './WishlistButton';

export default function ProductCard({ product, className, priority = false }) {
    return (
        <article className={cn('group relative flex flex-col', className)}>
            <Link
                href={route('products.show', product.slug)}
                data-cursor="View"
                className="relative block aspect-[4/5] overflow-hidden rounded-4xl bg-card"
            >
                <img
                    src={product.image}
                    alt={product.name}
                    loading={priority ? 'eager' : 'lazy'}
                    decoding="async"
                    className={cn(
                        'absolute inset-0 m-auto size-[78%] object-contain mix-blend-multiply transition-transform duration-[1.2s] ease-[var(--ease-expo)] group-hover:scale-[1.07]',
                        !product.in_stock && 'opacity-40 grayscale',
                    )}
                />
                <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                    {product.discount_percent > 0 && <Badge tone="coral">−{product.discount_percent}%</Badge>}
                    {product.requires_prescription && <Badge tone="ink">Rx</Badge>}
                    {!product.in_stock && <Badge tone="outline">Sold out</Badge>}
                </div>
            </Link>
            <WishlistButton product={product} className="absolute right-3 top-3" />

            <div className="mt-4 flex items-start justify-between gap-3 px-1">
                <div className="min-w-0">
                    <p className="eyebrow truncate text-ink-mute">{product.brand}</p>
                    <h3 className="mt-1.5 line-clamp-2 text-[0.98rem] leading-snug font-medium">
                        <Link href={route('products.show', product.slug)} className="hover:underline hover:decoration-line-strong hover:underline-offset-4">
                            {product.name}
                        </Link>
                    </h3>
                    <Price price={product.price} current={product.current_price} className="mt-2" />
                </div>
                <AddToCartButton product={product} className="mt-1 shrink-0" />
            </div>
        </article>
    );
}
