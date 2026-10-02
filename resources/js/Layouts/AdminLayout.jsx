import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import Toasts from '@/Components/layout/Toasts';
import Icon from '@/Components/ui/Icon';
import ThemeToggle from '@/Components/ui/ThemeToggle';
import { cn } from '@/lib/cn';

const nav = [
    { label: 'Today', icon: 'pulse', route: 'admin.dashboard', match: 'admin.dashboard' },
    { label: 'Orders', icon: 'package', route: 'admin.orders.index', match: 'admin.orders.*' },
    { label: 'Prescriptions', icon: 'rx', route: 'admin.prescriptions.index', match: 'admin.prescriptions.*', badge: 'prescriptions' },
    { label: 'Customers', icon: 'user', route: 'admin.users.index', match: 'admin.users.*' },
    { label: 'Products', icon: 'cube', route: 'admin.products.index', match: 'admin.products.*' },
];

/**
 * Admin shell: a quiet sidebar (desktop) or scrolling tab bar (mobile), and a wide content area.
 * The storefront chrome (header, smooth scroll, cursor, assistant) is deliberately absent.
 */
export default function AdminLayout({ title, actions, children }) {
    const { auth, admin } = usePage().props;

    return (
        <div className="min-h-svh bg-paper lg:grid lg:grid-cols-[16rem_1fr]">
            <Head>
                <meta head-key="robots" name="robots" content="noindex,nofollow" />
            </Head>

            <aside className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur lg:flex lg:h-svh lg:flex-col lg:border-b-0 lg:border-r lg:p-5">
                <div className="flex items-center justify-between gap-3 px-4 py-3 lg:px-2 lg:py-0">
                    <Link href={route('admin.dashboard')} className="font-display text-2xl">
                        Zovita<span className="text-teal">+</span> <span className="eyebrow align-middle text-ink-mute">Admin</span>
                    </Link>
                    <ThemeToggle className="lg:hidden" />
                </div>

                <nav aria-label="Admin" className="scrollbar-none flex gap-1 overflow-x-auto px-3 pb-3 lg:mt-10 lg:flex-col lg:overflow-visible lg:px-0">
                    {nav.map((item) => {
                        const active = route().current(item.match);
                        const count = item.badge ? admin?.[item.badge] : 0;
                        return (
                            <Link
                                key={item.route}
                                href={route(item.route)}
                                aria-current={active ? 'page' : undefined}
                                className={cn(
                                    'flex shrink-0 items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm transition-colors duration-300',
                                    active ? 'bg-ink text-paper' : 'text-ink-mute hover:bg-paper-deep hover:text-ink',
                                )}
                            >
                                <Icon name={item.icon} size={17} />
                                <span className="flex-1">{item.label}</span>
                                {count > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-coral px-1.5 font-mono text-[0.65rem] text-white">{count}</span>}
                            </Link>
                        );
                    })}
                </nav>

                <div className="mt-auto hidden space-y-3 lg:block">
                    <ThemeToggle />
                    <Link href={route('home')} className="flex items-center gap-2 text-sm text-ink-mute hover:text-ink">
                        <Icon name="arrowLeft" size={15} /> Back to store
                    </Link>
                    <div className="rounded-2xl border border-line p-3">
                        <p className="truncate text-sm font-medium">{auth.user?.name}</p>
                        <p className="truncate text-xs text-ink-mute">{auth.user?.email}</p>
                        <button type="button" onClick={() => router.post(route('admin.logout'))} className="mt-3 flex items-center gap-2 text-xs text-ink-mute hover:text-coral">
                            <Icon name="logout" size={13} /> Sign out
                        </button>
                    </div>
                </div>
            </aside>

            <main id="main" className="min-w-0 px-4 pb-16 pt-8 md:px-8 lg:px-12 lg:pt-12">
                <Head title={title ? `${title} · Admin` : 'Admin'} />
                <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
                    <div>
                        <p className="eyebrow text-ink-mute">Admin</p>
                        <h1 className="mt-3 font-display text-5xl leading-none md:text-6xl">{title}</h1>
                    </div>
                    {actions}
                </div>
                {children}
            </main>
            <Toasts />
        </div>
    );
}

/** Rounded surface used for every admin panel/card. */
export function Panel({ title, description, help, aside, className, children }) {
    const [open, setOpen] = useState(false);
    return (
        <section className={cn('rounded-4xl border border-line bg-card p-5 md:p-7', className)}>
            {(title || aside) && (
                <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            {title && <h2 className="font-display text-2xl">{title}</h2>}
                            {help && (
                                <button
                                    type="button"
                                    onClick={() => setOpen((o) => !o)}
                                    aria-expanded={open}
                                    aria-label={`What is “${title}”?`}
                                    className={cn('grid size-7 place-items-center rounded-full border text-xs font-semibold transition-colors', open ? 'border-ink bg-ink text-paper' : 'border-line-strong text-ink-mute hover:border-ink hover:text-ink')}
                                >
                                    ?
                                </button>
                            )}
                        </div>
                        {description && <p className="mt-1 text-sm text-ink-mute">{description}</p>}
                    </div>
                    {aside}
                </header>
            )}
            {help && open && (
                <div className="-mt-2 mb-6 rounded-2xl bg-mint-soft p-4 text-sm leading-relaxed text-ink-soft" role="note">
                    {help}
                </div>
            )}
            {children}
        </section>
    );
}

/**
 * "How this page works" card at the top of every admin page: numbered, plain-language steps for
 * someone who isn't technical. Can be hidden (remembered on this browser) and shown again.
 */
export function PageGuide({ id, title = 'How this page works', steps }) {
    const key = `zv-admin-guide:${id}`;
    const [hidden, setHidden] = useState(() => {
        try {
            return localStorage.getItem(key) === '1';
        } catch {
            return false;
        }
    });
    const toggle = (value) => {
        setHidden(value);
        try {
            value ? localStorage.setItem(key, '1') : localStorage.removeItem(key);
        } catch {
            /* ignore */
        }
    };

    if (hidden) {
        return (
            <button type="button" onClick={() => toggle(false)} className="mb-6 inline-flex items-center gap-2 rounded-full border border-line-strong px-4 py-2 text-sm text-ink-mute hover:border-ink hover:text-ink">
                <span className="grid size-5 place-items-center rounded-full bg-ink text-[0.65rem] font-semibold text-paper">?</span> Show help for this page
            </button>
        );
    }

    return (
        <section className="mb-8 rounded-4xl border border-teal/25 bg-mint-soft p-5 md:p-7" aria-label={title}>
            <div className="flex items-start justify-between gap-4">
                <p className="flex items-center gap-2 font-medium">
                    <span className="grid size-7 place-items-center rounded-full bg-teal text-sm font-semibold text-white">?</span>
                    {title}
                </p>
                <button type="button" onClick={() => toggle(true)} className="shrink-0 text-sm text-ink-mute underline underline-offset-4 hover:text-ink">
                    Hide help
                </button>
            </div>
            <ol className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {steps.map((step, i) => (
                    <li key={i} className="flex gap-3 rounded-2xl bg-paper/70 p-4 text-sm leading-relaxed">
                        <span className="font-mono text-xs text-teal">{String(i + 1).padStart(2, '0')}</span>
                        <span>{step}</span>
                    </li>
                ))}
            </ol>
        </section>
    );
}

/** Status pill with a text label (never colour alone). */
export function StatusPill({ tone = 'neutral', children }) {
    const tones = {
        neutral: 'bg-paper-deep text-ink-soft',
        good: 'bg-mint-soft text-teal',
        warn: 'bg-[#fdf1d8] text-[#8a5a00] dark:bg-[#3a2c0d] dark:text-[#f2c66d]',
        bad: 'bg-coral/10 text-coral',
    };
    return <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs', tones[tone])}>{children}</span>;
}

/** Simple prev/next pager for Laravel paginators. */
export function Pager({ paginator }) {
    if (paginator.last_page <= 1) return null;
    return (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-between text-sm">
            <span className="text-ink-mute">
                {paginator.from}–{paginator.to} of {paginator.total}
            </span>
            <div className="flex gap-2">
                {paginator.prev_page_url && (
                    <Link href={paginator.prev_page_url} preserveScroll className="rounded-full border border-line-strong px-4 py-2 hover:border-ink">
                        Previous
                    </Link>
                )}
                {paginator.next_page_url && (
                    <Link href={paginator.next_page_url} preserveScroll className="rounded-full border border-line-strong px-4 py-2 hover:border-ink">
                        Next
                    </Link>
                )}
            </div>
        </nav>
    );
}
