import { Head, Link, router } from '@inertiajs/react';
import { useRef } from 'react';
import CartSummary from '@/Components/product/CartSummary';
import InteractionWarnings from '@/Components/product/InteractionWarnings';
import ProductImage from '@/Components/product/ProductImage';
import QuantityStepper from '@/Components/product/QuantityStepper';
import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import EmptyState from '@/Components/ui/EmptyState';
import Icon from '@/Components/ui/Icon';
import { collapse, photoIn, transfer } from '@/lib/fly';
import { money } from '@/lib/format';
import Breadcrumbs from '@/Components/ui/Breadcrumbs';

export default function CartIndex({ cart, alternatives = {} }) {
    const update = (line, quantity) =>
        router.patch(route('cart.update', line.slug), { quantity }, { preserveScroll: true, preserveState: true });

    // The request never waits on the animation: the row folds away while it is in flight.
    const remove = (line, row) => {
        collapse(row);
        router.delete(route('cart.destroy', line.slug), { preserveScroll: true });
    };

    // Bag → wishlist: a heart flies to the header wishlist while the row folds away.
    const saveForLater = (line, row) => {
        transfer('cart', 'wishlist', { from: row.querySelector('img') ?? row, image: photoIn(row) });
        collapse(row);
        router.post(route('cart.save', line.slug), {}, { preserveScroll: true });
    };

    return (
        <section className="container-x pb-10 pt-10 md:pt-16">
            <Head title="Your bag" />
            <Breadcrumbs items={[{ label: 'Bag' }]} className="mb-6" />
            <p className="eyebrow text-ink-mute">Your bag</p>
            <h1 className="mt-4 font-display text-title">
                {cart.count ? (
                    <>
                        {cart.count} {cart.count === 1 ? 'item' : 'items'}, <span className="italic">ready.</span>
                    </>
                ) : (
                    'Your bag is empty.'
                )}
            </h1>

            {!cart.lines.length ? (
                <div className="mt-12">
                    <EmptyState
                        title="Nothing here yet"
                        body="Browse 1,000+ authentic medicines and wellness essentials — your picks will wait here."
                        action={<Button href={route('shop.index')} icon={<Icon name="arrow" size={16} />}>Start shopping</Button>}
                    />
                </div>
            ) : (
                <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-12">
                    <div className="min-w-0 space-y-8 lg:col-span-8">
                    <InteractionWarnings warnings={cart.warnings} />
                    <ul className="divide-y divide-line border-y border-line">
                        {cart.lines.map((line) => (
                            <BagLine key={line.id} line={line} alternatives={alternatives[line.id]} onUpdate={update} onRemove={remove} onSave={saveForLater} />
                        ))}
                    </ul>
                    </div>

                    <aside className="lg:col-span-4">
                        <div className="lg:sticky lg:top-24">
                            <CartSummary cart={cart}>
                                {cart.requires_prescription && (
                                    <p className="mt-6 flex gap-2 rounded-2xl bg-mint-soft p-4 text-sm">
                                        <Icon name="rx" size={18} className="shrink-0" />
                                        Your bag has prescription medicine — you'll attach the prescription at checkout.
                                    </p>
                                )}
                                <Button href={route('checkout.create')} size="lg" className="mt-6 w-full" icon={<Icon name="arrow" size={18} />}>
                                    Checkout
                                </Button>
                                <Link href={route('shop.index')} className="mt-4 block text-center text-sm underline underline-offset-4">
                                    Continue shopping
                                </Link>
                            </CartSummary>
                        </div>
                    </aside>
                </div>
            )}
        </section>
    );
}

/** Sold-out line: offer in-stock substitutes and swap in one tap. */
function Substitutes({ line, options }) {
    const swap = (alt) =>
        router.post(route('cart.store'), { product_id: alt.id, quantity: 1 }, {
            preserveScroll: true,
            onSuccess: () => router.delete(route('cart.destroy', line.slug), { preserveScroll: true }),
        });

    return (
        <div className="mt-4 rounded-3xl border border-coral/25 bg-coral/5 p-4 md:ml-38">
            <p className="flex items-center gap-2 text-sm font-medium">
                <Icon name="swap" size={16} className="text-coral" /> {line.name} sold out — swap for:
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-3">
                {options.map((alt) => (
                    <li key={alt.id} className="flex items-center gap-3 rounded-2xl bg-card p-2 pr-3">
                        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-plate">
                            <ProductImage product={alt} alt="" sizes="48px" className="size-[80%] object-contain mix-blend-multiply" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="line-clamp-1 text-xs">{alt.name}</span>
                            <span className="font-mono text-xs text-ink-mute">{money(alt.current_price)}</span>
                        </span>
                        <button type="button" onClick={() => swap(alt)} className="rounded-full bg-ink px-3 py-1.5 text-xs text-paper transition-colors hover:bg-teal">
                            Swap
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function BagLine({ line, alternatives, onUpdate, onRemove, onSave }) {
    const row = useRef(null);

    return (
        <li ref={row} className="overflow-hidden py-6">
            <div className="flex gap-4 md:gap-6">
                <Link href={route('products.show', line.slug)} className="grid size-24 shrink-0 place-items-center rounded-3xl bg-card md:size-32">
                    <ProductImage product={line} alt="" sizes="128px" dim={!line.in_stock} className="size-[80%] object-contain mix-blend-multiply" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div className="min-w-0">
                        <p className="eyebrow text-ink-mute">{line.brand}</p>
                        <Link href={route('products.show', line.slug)} className="mt-1 block font-medium hover:underline">
                            {line.name}
                        </Link>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-mute">
                            {money(line.current_price, { precise: true })} each
                            {line.requires_prescription && <Badge tone="ink">Rx</Badge>}
                            {!line.in_stock && <Badge tone="coral">Out of stock</Badge>}
                        </div>
                        <button
                            type="button"
                            onClick={() => onSave(line, row.current)}
                            className="mt-3 inline-flex items-center gap-1.5 text-xs text-ink-mute underline decoration-line-strong underline-offset-4 transition-colors hover:text-coral hover:decoration-coral"
                        >
                            <Icon name="heart" size={13} /> Save for later
                        </button>
                    </div>
                    <div className="flex items-center justify-between gap-4 md:justify-end">
                        <QuantityStepper size="sm" value={line.quantity} max={line.max_quantity} min={1} onChange={(q) => onUpdate(line, q)} />
                        <p className="w-24 text-right font-medium sm:w-28">{money(line.line_total, { precise: true })}</p>
                        <button
                            type="button"
                            onClick={() => onRemove(line, row.current)}
                            className="grid size-9 place-items-center rounded-full text-ink-mute transition hover:bg-coral hover:text-white"
                            aria-label={`Remove ${line.name}`}
                        >
                            <Icon name="close" size={16} />
                        </button>
                    </div>
                </div>
            </div>
            {alternatives?.length > 0 && <Substitutes line={line} options={alternatives} />}
        </li>
    );
}
