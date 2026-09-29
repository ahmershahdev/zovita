import { Head, Link, router, usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';
import ProductRail from '@/Components/product/ProductRail';
import QuantityStepper from '@/Components/product/QuantityStepper';
import WishlistButton from '@/Components/product/WishlistButton';
import Badge from '@/Components/ui/Badge';
import Breadcrumbs from '@/Components/ui/Breadcrumbs';
import Button from '@/Components/ui/Button';
import Icon from '@/Components/ui/Icon';
import Price from '@/Components/ui/Price';
import SectionHeading from '@/Components/ui/SectionHeading';
import useReveal from '@/hooks/useReveal';
import { cn } from '@/lib/cn';
import { money } from '@/lib/format';

export default function ProductShow({ product, related }) {
    const { app } = usePage().props;
    const scope = useRef(null);
    const zoom = useRef(null);
    const [qty, setQty] = useState(1);
    const [adding, setAdding] = useState(false);
    useReveal(scope, [product.slug]);

    const add = () =>
        router.post(route('cart.store'), { product_id: product.id, quantity: qty }, {
            preserveScroll: true,
            onStart: () => setAdding(true),
            onFinish: () => setAdding(false),
        });

    const buyNow = () =>
        router.post(route('cart.store'), { product_id: product.id, quantity: qty }, { onSuccess: () => router.visit(route('checkout.create')) });

    // Hover zoom: shift the transform origin to follow the pointer.
    const onZoom = (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        zoom.current.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
    };

    const sections = [
        { id: 'overview', title: 'Overview', body: product.description || product.summary },
        { id: 'uses', title: 'Uses', body: product.indication },
        { id: 'dosage', title: 'Dosage', body: product.dosage },
        { id: 'precautions', title: 'Precautions', body: product.precautions },
    ].filter((s) => s.body);

    const lowStock = product.stock > 0 && product.stock <= 5;
    const savings = (product.price - product.current_price) * qty;

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        image: product.image,
        brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
        description: product.summary ?? undefined,
        offers: {
            '@type': 'Offer',
            priceCurrency: 'PKR',
            price: product.current_price,
            availability: product.in_stock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            url: route('products.show', product.slug),
        },
    };

    return (
        <div ref={scope}>
            <Head title={product.name}>
                <meta name="description" content={(product.summary ?? `Buy ${product.name} online at Zovita.`).slice(0, 158)} />
                <meta property="og:title" content={product.name} />
                <meta property="og:image" content={product.image} />
                <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
            </Head>

            <section className="container-x pt-8 md:pt-12">
                <Breadcrumbs
                    items={[
                        { label: 'Shop', href: route('shop.index') },
                        { label: product.department.name, href: route('shop.department', product.department.slug) },
                        { label: product.category, href: route('shop.department', { department: product.department.slug, category: product.category_slug }) },
                        { label: product.name },
                    ]}
                />

                <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-16">
                    {/* Gallery */}
                    <div className="lg:col-span-7">
                        <div
                            className="group relative aspect-square cursor-zoom-in overflow-hidden rounded-5xl bg-card"
                            onPointerMove={onZoom}
                            data-cursor="Zoom"
                        >
                            <img
                                ref={zoom}
                                src={product.image}
                                alt={product.name}
                                className="absolute inset-0 m-auto size-[72%] object-contain mix-blend-multiply transition-transform duration-700 ease-[var(--ease-expo)] group-hover:scale-[1.6]"
                            />
                            <div className="absolute left-5 top-5 flex gap-2">
                                {product.discount_percent > 0 && <Badge tone="coral">Save {product.discount_percent}%</Badge>}
                                {product.requires_prescription && <Badge tone="ink">Prescription required</Badge>}
                            </div>
                            <WishlistButton product={product} className="absolute right-5 top-5 size-12" />
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
                            {[
                                ['shield', '100% authentic'],
                                ['truck', `Free over ${money(app.freeDeliveryOver)}`],
                                ['package', 'Sealed & batch-checked'],
                            ].map(([icon, label]) => (
                                <div key={label} className="flex flex-col items-center gap-2 rounded-3xl border border-line p-4">
                                    <Icon name={icon} size={20} />
                                    <span>{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Buy box */}
                    <div className="lg:col-span-5">
                        <div className="lg:sticky lg:top-24">
                            <Link href={route('shop.index', { brand: product.brand_slug })} className="eyebrow text-ink-mute hover:text-ink">
                                {product.brand}
                            </Link>
                            <h1 className="mt-3 font-display text-4xl leading-[1.02] tracking-[-0.04em] md:text-5xl">{product.name}</h1>
                            {product.generics && (
                                <p className="mt-4 text-ink-soft">
                                    <span className="eyebrow mr-2 text-ink-mute">Contains</span>
                                    {product.generics}
                                </p>
                            )}

                            <div className="mt-8 flex items-end justify-between gap-4 border-y border-line py-6">
                                <div>
                                    <Price price={product.price} current={product.current_price} size="lg" />
                                    <p className="mt-1 text-sm text-ink-mute">
                                        Per {product.pack} · incl. taxes
                                    </p>
                                </div>
                                <p className={cn('flex items-center gap-2 text-sm', product.in_stock ? 'text-teal' : 'text-coral')}>
                                    <span className={cn('size-2 rounded-full', product.in_stock ? 'bg-teal' : 'bg-coral')} />
                                    {product.in_stock ? (lowStock ? `Only ${product.stock} left` : 'In stock') : 'Out of stock'}
                                </p>
                            </div>

                            {product.requires_prescription && (
                                <div className="mt-6 flex gap-3 rounded-3xl bg-mint-soft p-5 text-sm">
                                    <Icon name="rx" size={22} className="shrink-0" />
                                    <p>
                                        This medicine needs a valid prescription. You can attach it at checkout, or{' '}
                                        <Link href={route('prescriptions.create')} className="font-medium underline underline-offset-4">
                                            upload it now
                                        </Link>{' '}
                                        and a pharmacist will call you.
                                    </p>
                                </div>
                            )}

                            {product.in_stock ? (
                                <div className="mt-6 space-y-3">
                                    <div className="flex gap-3">
                                        <QuantityStepper value={qty} onChange={setQty} max={Math.max(1, product.max_quantity)} />
                                        <Button onClick={add} loading={adding} className="flex-1" icon={<Icon name="bag" size={18} />}>
                                            Add to bag · {money(product.current_price * qty)}
                                        </Button>
                                    </div>
                                    <Button onClick={buyNow} variant="ghost" className="w-full">
                                        Buy now
                                    </Button>
                                    {savings > 0 && <p className="text-center text-sm text-teal">You save {money(savings)} on this item</p>}
                                    <p className="text-center text-xs text-ink-mute">Max {product.max_quantity} per order · Cash on delivery</p>
                                </div>
                            ) : (
                                <div className="mt-6 rounded-3xl border border-line p-5 text-sm text-ink-mute">
                                    This item is temporarily unavailable. Save it to your wishlist and check back soon, or{' '}
                                    <Link href={route('contact')} className="underline underline-offset-4">
                                        ask our pharmacist
                                    </Link>{' '}
                                    about alternatives.
                                </div>
                            )}

                            {/* Details */}
                            <div className="mt-10">
                                {sections.map((s, i) => (
                                    <details key={s.id} open={i === 0} className="group border-b border-line py-5">
                                        <summary className="flex cursor-pointer list-none items-center justify-between">
                                            <span className="font-display text-2xl">{s.title}</span>
                                            <Icon name="plus" size={18} className="transition-transform duration-500 group-open:rotate-45" />
                                        </summary>
                                        <p className="prose-care mt-3 whitespace-pre-line">{s.body}</p>
                                    </details>
                                ))}
                                <p className="mt-6 text-xs leading-relaxed text-ink-mute">
                                    Information is provided for reference only and is not a substitute for medical advice. Always read the label and follow your doctor's or pharmacist's directions.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {related.length > 0 && (
                <section className="container-x py-24 md:py-32">
                    <SectionHeading
                        eyebrow={`More in ${product.department.name}`}
                        title={
                            <>
                                You may also <span className="italic">need.</span>
                            </>
                        }
                    />
                    <ProductRail products={related} className="mt-12" />
                </section>
            )}
        </div>
    );
}
