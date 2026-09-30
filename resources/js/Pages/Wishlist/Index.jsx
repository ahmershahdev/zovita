import { Head, usePage } from '@inertiajs/react';
import ProductCard from '@/Components/product/ProductCard';
import Button from '@/Components/ui/Button';
import EmptyState from '@/Components/ui/EmptyState';
import Icon from '@/Components/ui/Icon';
import Breadcrumbs from '@/Components/ui/Breadcrumbs';

export default function WishlistIndex({ products }) {
    const { auth } = usePage().props;

    return (
        <section className="container-x pb-10 pt-10 md:pt-16">
            <Head title="Wishlist" />
            <Breadcrumbs items={[{ label: 'Wishlist' }]} className="mb-6" />
            <p className="eyebrow text-ink-mute">Saved for later</p>
            <h1 className="mt-4 font-display text-title">
                Your <span className="italic">wishlist.</span>
            </h1>
            {!auth.user && products.length > 0 && (
                <p className="mt-6 text-sm text-ink-mute">
                    Saved on this device.{' '}
                    <a href={route('login')} className="underline underline-offset-4">
                        Sign in
                    </a>{' '}
                    to keep your wishlist across devices.
                </p>
            )}
            <div className="mt-12">
                {products.length ? (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 lg:grid-cols-4 md:gap-x-6">
                        {products.map((p) => (
                            <ProductCard key={p.id} product={p} />
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
