import { Head, Link, router, usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';
import ProductCard from '@/Components/product/ProductCard';
import Button from '@/Components/ui/Button';
import EmptyState from '@/Components/ui/EmptyState';
import Icon from '@/Components/ui/Icon';
import Breadcrumbs from '@/Components/ui/Breadcrumbs';
import { collapse, photoIn, transfer } from '@/lib/fly';
import { gsap } from '@/lib/gsap';

export default function WishlistIndex({ products }) {
    const { auth } = usePage().props;
    const inStock = products.filter((p) => p.in_stock).length;

    return (
        <section className="container-x pb-10 pt-10 md:pt-16">
            <Head title="Wishlist" />
            <Breadcrumbs items={[{ label: 'Wishlist' }]} className="mb-6" />
            <div className="flex flex-wrap items-end justify-between gap-6">
                <div>
                    <p className="eyebrow text-ink-mute">Saved for later</p>
                    <h1 className="mt-4 font-display text-title">
                        Your <span className="italic">wishlist.</span>
                    </h1>
                </div>
                {products.length > 0 && (
                    <p className="font-mono text-xs uppercase tracking-[0.1em] text-ink-mute">
                        {products.length} saved · {inStock} in stock
                    </p>
                )}
            </div>
            {!auth.user && products.length > 0 && (
                <p className="mt-6 text-sm text-ink-mute">
                    Saved on this device.{' '}
                    <Link href={route('login')} className="underline underline-offset-4">
                        Sign in
                    </Link>{' '}
                    to keep your wishlist across devices.
                </p>
            )}
            <div className="mt-12">
                {products.length ? (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
                        {products.map((p) => (
                            <SavedItem key={p.id} product={p} />
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        icon="heart"
                        title="Nothing saved yet"
                        body="Tap the heart on any product to keep it here for later."
                        action={<Button href={route('shop.index')} icon={<Icon name="arrow" size={16} />}>Explore the pharmacy</Button>}
                    />
                )}
            </div>
        </section>
    );
}

/** A saved product with a one-tap "move to bag": the photo flies to the bag and the card folds away. */
function SavedItem({ product }) {
    const box = useRef(null);
    const [busy, setBusy] = useState(false);

    const move = () => {
        setBusy(true);
        transfer('wishlist', 'cart', { from: box.current.querySelector('img') ?? box.current, image: photoIn(box.current) ?? product.thumb });
        const folding = collapse(box.current);
        router.post(route('wishlist.move', product.slug), {}, {
            preserveScroll: true,
            onSuccess: (page) => {
                // Refused (e.g. sold out since it was saved): bring the card back.
                if (page.props.flash?.error) folding.then(() => gsap.to(box.current, { clearProps: 'all', duration: 0.01 }));
            },
            onFinish: () => setBusy(false),
        });
    };

    return (
        <div ref={box} className="flex flex-col">
            <ProductCard product={product} />
            {product.in_stock ? (
                <button
                    type="button"
                    onClick={move}
                    disabled={busy}
                    className="group/move mt-4 flex items-center justify-center gap-2 rounded-full border border-line-strong px-4 py-2.5 text-sm transition-colors duration-300 hover:border-ink hover:bg-ink hover:text-paper disabled:opacity-60"
                >
                    <Icon name="bag" size={15} className="transition-transform duration-500 group-hover/move:-rotate-12" /> Move to bag
                </button>
            ) : (
                <p className="mt-4 rounded-full bg-paper-deep px-4 py-2.5 text-center text-xs text-ink-mute">Sold out — we'll keep it saved</p>
            )}
        </div>
    );
}
