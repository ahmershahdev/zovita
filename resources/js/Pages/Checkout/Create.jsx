import { Head, Link, useForm } from '@inertiajs/react';
import FileDrop from '@/Components/forms/FileDrop';
import CartSummary from '@/Components/product/CartSummary';
import Button from '@/Components/ui/Button';
import Field from '@/Components/ui/Field';
import Icon from '@/Components/ui/Icon';
import { useRecaptchaV3 } from '@/hooks/useRecaptcha';
import { money } from '@/lib/format';

export default function CheckoutCreate({ cart, cities, defaults }) {
    const getToken = useRecaptchaV3('checkout');
    const form = useForm({ ...defaults, postal_code: '', notes: '', prescription: null, recaptcha_token: '' });
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
            <Link href={route('cart.index')} className="eyebrow inline-flex items-center gap-2 text-ink-mute hover:text-ink">
                <Icon name="arrowLeft" size={14} /> Back to bag
            </Link>
            <h1 className="mt-4 font-display text-title">
                Almost <span className="italic">there.</span>
            </h1>

            {(errors.cart || errors.recaptcha_token) && (
                <p className="mt-8 rounded-2xl bg-coral/10 p-4 text-sm text-coral">{errors.cart || errors.recaptcha_token}</p>
            )}

            <form onSubmit={submit} className="mt-12 grid gap-10 lg:grid-cols-12" noValidate>
                <div className="space-y-12 lg:col-span-7">
                    <fieldset>
                        <legend className="flex items-center gap-3 font-display text-3xl">
                            <span className="font-mono text-sm text-ink-mute">01</span> Contact
                        </legend>
                        <div className="mt-6 grid gap-5 md:grid-cols-2">
                            <Field label="Full name" autoComplete="name" value={data.name} onChange={(e) => setData('name', e.target.value)} error={errors.name} className="md:col-span-2" required />
                            <Field label="Email" type="email" autoComplete="email" value={data.email} onChange={(e) => setData('email', e.target.value)} error={errors.email} hint="Order confirmation is sent here." required />
                            <Field label="Mobile number" type="tel" autoComplete="tel" placeholder="0300 1234567" value={data.phone} onChange={(e) => setData('phone', e.target.value)} error={errors.phone} hint="Our pharmacist may call to confirm." required />
                        </div>
                    </fieldset>

                    <fieldset>
                        <legend className="flex items-center gap-3 font-display text-3xl">
                            <span className="font-mono text-sm text-ink-mute">02</span> Delivery
                        </legend>
                        <div className="mt-6 grid gap-5 md:grid-cols-2">
                            <Field as="textarea" label="Street address" autoComplete="street-address" placeholder="House / flat, street, area" value={data.address} onChange={(e) => setData('address', e.target.value)} error={errors.address} className="md:col-span-2" rows={3} required />
                            <Field as="select" label="City" value={data.city} onChange={(e) => setData('city', e.target.value)} error={errors.city} required>
                                <option value="">Select a city</option>
                                {cities.map((c) => (
                                    <option key={c}>{c}</option>
                                ))}
                            </Field>
                            <Field label="Postal code" optional inputMode="numeric" autoComplete="postal-code" value={data.postal_code} onChange={(e) => setData('postal_code', e.target.value)} error={errors.postal_code} />
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
                        <label className="mt-6 flex items-center gap-4 rounded-3xl border-2 border-ink bg-card p-5">
                            <span className="grid size-6 place-items-center rounded-full border-2 border-ink">
                                <span className="size-2.5 rounded-full bg-ink" />
                            </span>
                            <span className="flex-1">
                                <span className="block font-medium">Cash on delivery</span>
                                <span className="text-sm text-ink-mute">Pay {money(cart.total)} when your order arrives.</span>
                            </span>
                            <Icon name="truck" size={26} />
                        </label>
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
                        <CartSummary cart={cart}>
                            <Button type="submit" size="lg" loading={processing} className="mt-6 w-full" icon={<Icon name="check" size={18} />}>
                                Place order · {money(cart.total)}
                            </Button>
                            <p className="mt-4 text-center text-xs text-ink-mute">
                                By placing your order you agree to our{' '}
                                <Link href={route('legal', 'terms')} className="underline">
                                    terms
                                </Link>
                                . Protected by reCAPTCHA.
                            </p>
                        </CartSummary>
                    </div>
                </aside>
            </form>
        </section>
    );
}
