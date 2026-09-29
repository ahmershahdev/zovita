import { Head, Link, router } from '@inertiajs/react';
import CartSummary from '@/Components/product/CartSummary';
import QuantityStepper from '@/Components/product/QuantityStepper';
import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import EmptyState from '@/Components/ui/EmptyState';
import Icon from '@/Components/ui/Icon';
import { money } from '@/lib/format';

export default function CartIndex({ cart }) {
    const update = (line, quantity) =>
        router.patch(route('cart.update', line.slug), { quantity }, { preserveScroll: true, preserveState: true });

    const remove = (line) => router.delete(route('cart.destroy', line.slug), { preserveScroll: true });

    return (
        <section className="container-x pb-10 pt-10 md:pt-16">
            <Head title="Your bag" />
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
                        body="Browse 475+ authentic medicines and wellness essentials — your picks will wait here."
                        action={<Button href={route('shop.index')} icon={<Icon name="arrow" size={16} />}>Start shopping</Button>}
                    />
                </div>
            ) : (
                <div className="mt-12 grid gap-10 lg:grid-cols-12">
                    <ul className="divide-y divide-line border-y border-line lg:col-span-8">
                        {cart.lines.map((line) => (
                            <li key={line.id} className="flex gap-4 py-6 md:gap-6">
                                <Link href={route('products.show', line.slug)} className="grid size-24 shrink-0 place-items-center rounded-3xl bg-card md:size-32">
                                    <img src={line.image} alt="" className="size-[80%] object-contain mix-blend-multiply" loading="lazy" />
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
                                    </div>
                                    <div className="flex items-center justify-between gap-4 md:justify-end">
                                        <QuantityStepper size="sm" value={line.quantity} max={line.max_quantity} min={1} onChange={(q) => update(line, q)} />
                                        <p className="w-28 text-right font-medium">{money(line.line_total, { precise: true })}</p>
                                        <button type="button" onClick={() => remove(line)} className="grid size-9 place-items-center rounded-full text-ink-mute transition hover:bg-coral hover:text-white" aria-label={`Remove ${line.name}`}>
                                            <Icon name="close" size={16} />
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>

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
