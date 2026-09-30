import { Link } from '@inertiajs/react';
import ProductImage from '@/Components/product/ProductImage';
import Badge from '@/Components/ui/Badge';
import Price from '@/Components/ui/Price';
import { cn } from '@/lib/cn';
import AddToCartButton from './AddToCartButton';
import WishlistButton from './WishlistButton';

export default function ProductCard({ product, className, priority = false }) {
    const href = route('products.show', product.slug);

    return (
        <article className={cn('group relative flex flex-col', className)}>
            <Link href={href} data-cursor="View" className="relative block aspect-[4/5] overflow-hidden rounded-4xl bg-card transition-[border-radius] duration-700 ease-[var(--ease-expo)] group-hover:rounded-[2.75rem]">
                <ProductImage
                    product={product}
                    priority={priority}
                    dim={!product.in_stock}
                    sizes="(min-width: 1280px) 20vw, (min-width: 768px) 30vw, 50vw"
                    className="absolute inset-0 m-auto size-[78%] object-contain mix-blend-multiply transition-[transform,opacity] duration-[1.2s] ease-[var(--ease-expo)] group-hover:scale-[1.07] group-hover:-rotate-2"
                />
                <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                    {product.discount_percent > 0 && <Badge tone="coral">−{product.discount_percent}%</Badge>}
                    {product.requires_prescription && <Badge tone="ink">Rx</Badge>}
                    {!product.in_stock && <Badge tone="outline">Sold out</Badge>}
                </div>
                {product.generics && (
                    <span className="absolute inset-x-3 bottom-3 translate-y-2 truncate rounded-full bg-night/85 px-3 py-1.5 text-center font-mono text-[0.62rem] uppercase tracking-wider text-snow opacity-0 backdrop-blur transition duration-500 ease-[var(--ease-expo)] group-hover:translate-y-0 group-hover:opacity-100">
                        {product.generics}
                    </span>
                )}
            </Link>
            <WishlistButton product={product} className="absolute right-3 top-3" />

            <div className="mt-4 flex items-start justify-between gap-3 px-1">
                <div className="min-w-0">
                    <p className="eyebrow truncate text-ink-mute">{product.brand}</p>
                    <h3 className="mt-1.5 line-clamp-2 text-[0.98rem] font-medium leading-snug">
                        <Link href={href} className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat transition-[background-size] duration-500 hover:bg-[length:100%_1px]">
                            {product.name}
                        </Link>
                    </h3>
                    <Price price={product.price} current={product.current_price} className="mt-2" />
                    {!product.in_stock && (
                        <Link href={`${href}#alternatives`} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-teal underline decoration-teal/30 underline-offset-4">
                            Similar in stock →
                        </Link>
                    )}
                </div>
                <AddToCartButton product={product} className="mt-1 shrink-0" />
            </div>
        </article>
    );
}
