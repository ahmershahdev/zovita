import { Head, Link, useForm } from '@inertiajs/react';
import FileDrop from '@/Components/forms/FileDrop';
import InteractionWarnings from '@/Components/product/InteractionWarnings';
import CartSummary from '@/Components/product/CartSummary';
import Button from '@/Components/ui/Button';
import Field, { Checkbox } from '@/Components/ui/Field';
import { cn } from '@/lib/cn';
import Icon from '@/Components/ui/Icon';
import { useRecaptchaV3 } from '@/hooks/useRecaptcha';
import { money } from '@/lib/format';
import Breadcrumbs from '@/Components/ui/Breadcrumbs';
import { RecaptchaNotice } from '@/Components/forms/RecaptchaCheckbox';

export default function CheckoutCreate({ cart, cities, defaults, checkoutToken, payments }) {
    const getToken = useRecaptchaV3('checkout');
    const form = useForm({ ...defaults, postal_code: '', notes: '', prescription: null, recaptcha_token: '', checkout_token: checkoutToken, payment_method: 'cod', interactions_ack: false });
    const { data, setData, errors, processing } = form;

    const submit = async (e) => {
        e.preventDefault();
        const token = await getToken();
        form.transform((d) => ({ ...d, recaptcha_token: token ?? '' }));
        form.post(route('checkout.store'), { forceFormData: true, preserveScroll: true });
    };

    return (
        <section className="container-x pb-10 pt-10 md:pt-16">
            <Head title="Checkout" />
            <Breadcrumbs items={[{ label: 'Bag', href: route('cart.index') }, { label: 'Checkout' }]} className="mb-6" />
            <Link href={route('cart.index')} className="eyebrow inline-flex items-center gap-2 text-ink-mute hover:text-ink">
                <Icon name="arrowLeft" size={14} /> Back to bag
            </Link>
            <h1 className="mt-4 font-display text-title">
                Almost <span className="italic">there.</span>
            </h1>

            {(errors.cart || errors.recaptcha_token) && (
                <p className="mt-8 rounded-2xl bg-coral/10 p-4 text-sm text-coral">{errors.cart || errors.recaptcha_token}</p>
            )}

            <form onSubmit={submit} className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-12" noValidate>
                <div className="space-y-12 lg:col-span-7">
                    <fieldset>
                        <legend className="flex items-center gap-3 font-display text-3xl">
                            <span className="font-mono text-sm text-ink-mute">01</span> Contact
                        </legend>
                        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                            <Field label="Full name" placeholder="e.g. Ayesha Khan" autoComplete="name" value={data.name} onChange={(e) => setData('name', e.target.value)} error={errors.name} className="md:col-span-2" required />
                            <Field label="Email" placeholder="you@example.com" type="email" autoComplete="email" value={data.email} onChange={(e) => setData('email', e.target.value)} error={errors.email} hint="Order confirmation is sent here." required />
                            <Field label="Mobile number" type="tel" autoComplete="tel" placeholder="0300 1234567" value={data.phone} onChange={(e) => setData('phone', e.target.value)} error={errors.phone} hint="Our pharmacist may call to confirm." required />
                        </div>
                    </fieldset>

                    <fieldset>
                        <legend className="flex items-center gap-3 font-display text-3xl">
                            <span className="font-mono text-sm text-ink-mute">02</span> Delivery
                        </legend>
                        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                            <Field as="textarea" label="Street address" autoComplete="street-address" placeholder="House / flat, street, area" value={data.address} onChange={(e) => setData('address', e.target.value)} error={errors.address} className="md:col-span-2" rows={3} required />
                            <Field as="select" label="City" value={data.city} onChange={(e) => setData('city', e.target.value)} error={errors.city} required>
                                <option value="">Select a city</option>
                                {cities.map((c) => (
                                    <option key={c}>{c}</option>
                                ))}
                            </Field>
                            <Field label="Postal code" placeholder="e.g. 75600" optional inputMode="numeric" autoComplete="postal-code" value={data.postal_code} onChange={(e) => setData('postal_code', e.target.value)} error={errors.postal_code} />
                            <Field as="textarea" label="Delivery notes" optional placeholder="Landmark, preferred time…" value={data.notes} onChange={(e) => setData('notes', e.target.value)} error={errors.notes} className="md:col-span-2" rows={2} />
                        </div>
                    </fieldset>

                    <fieldset>
                        <legend className="flex items-center gap-3 font-display text-3xl">
                            <span className="font-mono text-sm text-ink-mute">03</span> Prescription {!cart.requires_prescription && <span className="eyebrow text-ink-mute">Optional</span>}
                        </legend>
                        <p className="mt-3 text-sm text-ink-mute">
                            {cart.requires_prescription
                                ? 'Your bag contains prescription medicine. Attach a clear photo or PDF of a valid prescription issued to the patient.'
                                : 'Have a prescription for something else? Attach it and our pharmacist will add it to this order after calling you.'}
                        </p>
                        <div className="mt-6">
                            <FileDrop file={data.prescription} onChange={(f) => setData('prescription', f)} accept={['jpg', 'jpeg', 'png', 'webp', 'pdf']} maxMb={5} error={errors.prescription} />
                        </div>
                    </fieldset>

                    <fieldset>
                        <legend className="flex items-center gap-3 font-display text-3xl">
                            <span className="font-mono text-sm text-ink-mute">04</span> Payment
                        </legend>
                        <div className="mt-6 grid grid-cols-1 gap-4" role="radiogroup" aria-label="Payment method">
                            <PayOption
                                checked={data.payment_method === 'cod'}
                                onSelect={() => setData('payment_method', 'cod')}
                                title="Cash on delivery"
                                body={`Pay ${money(cart.total)} when your order arrives.`}
                                icon="truck"
                            />
                            {payments?.card && (
                                <PayOption
                                    checked={data.payment_method === 'card'}
                                    onSelect={() => setData('payment_method', 'card')}
                                    title="Debit or credit card"
                                    body={`Pay ${money(cart.total)} now on a secure payment page. Your items are held for ${payments.expires_minutes} minutes while you pay.`}
                                    icon="lock"
                                    note={payments.sandbox ? 'Test mode: no real card is charged.' : null}
                                />
                            )}
                        </div>
                        {errors.payment_method && <p className="mt-2 text-sm text-coral">{errors.payment_method}</p>}
                    </fieldset>
                </div>

                <aside className="lg:col-span-5">
                    <div className="space-y-6 lg:sticky lg:top-24">
                        <ul className="max-h-80 space-y-4 overflow-y-auto rounded-4xl border border-line p-5" data-lenis-prevent>
                            {cart.lines.map((line) => (
                                <li key={line.id} className="flex items-center gap-4">
                                    <span className="relative grid size-16 shrink-0 place-items-center rounded-2xl bg-card">
                                        <img src={line.image} alt="" className="size-12 object-contain mix-blend-multiply" />
                                        <span className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-ink font-mono text-[0.65rem] text-paper">{line.quantity}</span>
                                    </span>
                                    <span className="min-w-0 flex-1 truncate text-sm">{line.name}</span>
                                    <span className="text-sm font-medium">{money(line.line_total)}</span>
                                </li>
                            ))}
                        </ul>
                        {cart.warnings?.length > 0 && (
                            <InteractionWarnings warnings={cart.warnings} compact>
                                {cart.warnings.some((w) => w.severity === 'major') && (
                                    <Checkbox
                                        className="mt-4"
                                        label="I've read this and will check with a pharmacist or doctor before taking these together."
                                        checked={data.interactions_ack}
                                        onChange={(e) => setData('interactions_ack', e.target.checked)}
                                        error={errors.interactions_ack}
                                    />
                                )}
                            </InteractionWarnings>
                        )}
                        <CartSummary cart={cart}>
                            <Button type="submit" size="lg" loading={processing} className="mt-6 w-full" icon={<Icon name="check" size={18} />}>
                                {data.payment_method === 'card' ? `Continue to payment · ${money(cart.total)}` : `Place order · ${money(cart.total)}`}
                            </Button>
                            <p className="mt-4 text-center text-xs text-ink-mute">
                                By placing your order you agree to our{' '}
                                <Link href={route('legal', 'terms')} className="underline">
                                    terms
                                </Link>
                                .
                            </p>
                            <RecaptchaNotice className="mt-2 text-center" />
                        </CartSummary>
                    </div>
                </aside>
            </form>
        </section>
    );
}

function PayOption({ checked, onSelect, title, body, icon, note }) {
    return (
        <label className={cn('flex cursor-pointer items-center gap-4 rounded-3xl border-2 bg-card p-5 transition-colors', checked ? 'border-ink' : 'border-line hover:border-ink/50')}>
            <input type="radio" name="payment_method" className="sr-only" checked={checked} onChange={onSelect} />
            <span className="grid size-6 shrink-0 place-items-center rounded-full border-2 border-ink">{checked && <span className="size-2.5 rounded-full bg-ink" />}</span>
            <span className="min-w-0 flex-1">
                <span className="block font-medium">{title}</span>
                <span className="text-sm text-ink-mute">{body}</span>
                {note && <span className="mt-1 block text-xs text-teal">{note}</span>}
            </span>
            <Icon name={icon} size={26} />
        </label>
    );
}
