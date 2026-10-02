import { Head, Link, usePage } from '@inertiajs/react';
import { Fragment, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import Breadcrumbs from '@/Components/ui/Breadcrumbs';
import Button from '@/Components/ui/Button';
import Icon from '@/Components/ui/Icon';
import { faqGroups } from '@/content/faq';
import useReveal from '@/hooks/useReveal';
import useScrollSpy from '@/hooks/useScrollSpy';
import useStoreFacts from '@/hooks/useStoreFacts';
import { cn } from '@/lib/cn';

const itemId = (group, i) => `${group.id}-${i + 1}`;
const normalise = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

export default function Faq() {
    const scope = useRef(null);
    const search = useRef(null);
    const fill = useStoreFacts();
    const { app } = usePage().props;
    const [query, setQuery] = useState('');
    const deferred = useDeferredValue(query.trim());
    const [open, setOpen] = useState(() => new Set());
    useReveal(scope);

    // Fill tokens once; search runs over the filled text.
    const groups = useMemo(
        () => faqGroups.map((g) => ({ ...g, items: g.items.map((item, i) => ({ ...item, a: fill(item.a), id: itemId(g, i) })) })),
        [fill],
    );
    const total = groups.reduce((n, g) => n + g.items.length, 0);

    const terms = normalise(deferred).split(/\s+/).filter(Boolean);
    const filtered = useMemo(() => {
        if (!terms.length) return groups;
        return groups
            .map((g) => ({ ...g, items: g.items.filter((item) => terms.every((t) => normalise(`${item.q} ${item.a} ${g.title}`).includes(t))) }))
            .filter((g) => g.items.length);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [groups, terms.join(' ')]);
    const matches = filtered.reduce((n, g) => n + g.items.length, 0);

    const { active, jump } = useScrollSpy(filtered.map((g) => g.id), { offset: 110 });

    const toggle = (id, force) =>
        setOpen((prev) => {
            const next = new Set(prev);
            (force ?? !next.has(id)) ? next.add(id) : next.delete(id);
            return next;
        });

    const openAndJump = (id) => {
        toggle(id, true);
        requestAnimationFrame(() => jump(id));
    };

    // Deep link: /faq#delivery-1 opens that answer.
    useEffect(() => {
        const id = window.location.hash.slice(1);
        if (id && groups.some((g) => g.id === id || g.items.some((i) => i.id === id))) {
            if (!groups.some((g) => g.id === id)) toggle(id, true);
            setTimeout(() => jump(id), 300);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // "/" focuses search, like most help centres.
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === '/' && !e.target.closest('input, textarea, [contenteditable]')) {
                e.preventDefault();
                search.current?.focus();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const popular = groups.flatMap((g) => g.items.filter((i) => i.popular)).slice(0, 6);

    return (
        <div ref={scope} className="pb-10">
            <Head title="FAQ — help centre">
                <meta head-key="description" name="description" content="Answers about ordering, delivery, payment, prescriptions, returns, your account and privacy at Zovita." />
            </Head>

            {/* Hero + search */}
            <section className="container-x pt-10 md:pt-16">
                <Breadcrumbs items={[{ label: 'FAQ' }]} className="mb-6" />
                <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
                    <div className="lg:col-span-7">
                        <p className="eyebrow flex items-center gap-3 text-ink-mute">
                            <span className="size-2 rounded-full bg-teal" /> Help centre · {total} answers
                        </p>
                        <h1 className="mt-5 font-display text-title" data-split="now">
                            Questions, <span className="italic">answered.</span>
                        </h1>
                    </div>
                    <div className="lg:col-span-5">
                        <label htmlFor="faq-search" className="sr-only">
                            Search the help centre
                        </label>
                        <div className="group flex items-center gap-3 rounded-full border border-line-strong bg-card px-5 py-1.5 transition-colors focus-within:border-ink">
                            <Icon name="search" size={18} className="shrink-0 text-ink-mute" />
                            <input
                                ref={search}
                                id="faq-search"
                                type="search"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search e.g. “refund”, “prescription”"
                                autoComplete="off"
                                className="h-12 min-w-0 flex-1 bg-transparent text-base placeholder:text-ink-mute/70 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
                            />
                            {query ? (
                                <button type="button" onClick={() => setQuery('')} className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-paper-deep" aria-label="Clear search">
                                    <Icon name="close" size={14} />
                                </button>
                            ) : (
                                <kbd className="hidden rounded-md border border-line-strong px-1.5 font-mono text-[0.65rem] text-ink-mute sm:block">/</kbd>
                            )}
                        </div>
                        <p className="mt-3 h-5 px-5 text-sm text-ink-mute" aria-live="polite">
                            {terms.length ? (matches ? `${matches} ${matches === 1 ? 'answer' : 'answers'} for “${deferred}”` : `No answers for “${deferred}”`) : ''}
                        </p>
                    </div>
                </div>

                {/* Most asked */}
                {!terms.length && (
                    <div className="mt-10" data-reveal>
                        <p className="eyebrow text-ink-mute">Most asked</p>
                        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {popular.map((item) => (
                                <li key={item.id}>
                                    <button
                                        type="button"
                                        onClick={() => openAndJump(item.id)}
                                        className="group flex h-full w-full items-center justify-between gap-4 rounded-3xl border border-line bg-card px-5 py-4 text-left transition-colors duration-300 hover:border-ink"
                                    >
                                        <span className="text-[0.95rem]">{item.q}</span>
                                        <Icon name="arrow" size={15} className="shrink-0 text-ink-mute transition-transform duration-500 group-hover:translate-x-1 group-hover:text-ink" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </section>

            {/* Mobile topics */}
            <div className="sticky top-20 z-30 mt-10 lg:hidden">
                <div className="container-x">
                    <div className="glass scrollbar-none flex gap-1 overflow-x-auto rounded-full border border-line p-1">
                        {filtered.map((g) => (
                            <button
                                key={g.id}
                                type="button"
                                onClick={() => jump(g.id)}
                                className={cn('flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs transition-colors', active === g.id ? 'bg-ink text-paper' : 'text-ink-mute')}
                            >
                                {g.title} <span className="font-mono opacity-60">{g.items.length}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <section className="container-x mt-10 lg:mt-16">
                <div className="grid gap-12 lg:grid-cols-12">
                    <aside className="hidden lg:col-span-3 lg:block">
                        <nav aria-label="Topics" className="sticky top-28">
                            <p className="eyebrow text-ink-mute">Topics</p>
                            <ul className="mt-5 space-y-1">
                                {groups.map((g) => {
                                    const shown = filtered.find((f) => f.id === g.id);
                                    return (
                                        <li key={g.id}>
                                            <button
                                                type="button"
                                                disabled={!shown}
                                                onClick={() => jump(g.id)}
                                                aria-current={active === g.id ? 'location' : undefined}
                                                className={cn(
                                                    'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition-colors duration-300 disabled:opacity-35',
                                                    active === g.id && shown ? 'bg-ink text-paper' : 'text-ink-mute hover:bg-paper-deep hover:text-ink',
                                                )}
                                            >
                                                <Icon name={g.icon} size={16} />
                                                <span className="flex-1">{g.title}</span>
                                                <span className="font-mono text-xs opacity-60">{shown?.items.length ?? 0}</span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </nav>
                    </aside>

                    <div className="min-w-0 lg:col-span-9 xl:col-span-8">
                        {filtered.length ? (
                            <div className="space-y-14">
                                {filtered.map((g) => (
                                    <section key={g.id} id={g.id} className="scroll-mt-32">
                                        <div className="flex items-center gap-4">
                                            <span className="grid size-11 place-items-center rounded-full bg-mint-soft text-teal">
                                                <Icon name={g.icon} size={19} />
                                            </span>
                                            <h2 className="font-display text-3xl md:text-4xl">{g.title}</h2>
                                        </div>
                                        <div className="mt-6 border-t border-ink">
                                            {g.items.map((item) => (
                                                <QA key={item.id} item={item} terms={terms} open={open.has(item.id) || terms.length > 0} onToggle={() => toggle(item.id)} />
                                            ))}
                                        </div>
                                    </section>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-5xl border border-dashed border-line-strong p-10 text-center md:p-16">
                                <Icon name="search" size={32} className="mx-auto text-ink-mute" />
                                <p className="mt-5 font-display text-3xl">No answers for “{deferred}”.</p>
                                <p className="mx-auto mt-3 max-w-md text-ink-mute">Try a simpler word — or ask us directly, a pharmacist or care-team member will reply.</p>
                                <div className="mt-8 flex flex-wrap justify-center gap-3">
                                    <Button onClick={() => setQuery('')} variant="ghost">
                                        Clear search
                                    </Button>
                                    <Button href={route('contact')} icon={<Icon name="arrow" size={16} />}>
                                        Ask our team
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Contact channels */}
            <section className="container-x mt-20">
                <div className="grain relative overflow-hidden rounded-5xl bg-night p-8 text-snow md:p-14">
                    <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
                        <div className="lg:col-span-5">
                            <p className="eyebrow text-mint">Still wondering?</p>
                            <h2 className="mt-4 font-display text-4xl leading-tight md:text-6xl">
                                Talk to a <span className="italic text-mint">real</span> person.
                            </h2>
                            <p className="mt-4 text-snow/70">{app.support?.hours}</p>
                        </div>
                        <ul className="grid gap-3 sm:grid-cols-3 lg:col-span-7">
                            {[
                                { icon: 'phone', label: 'Call us', value: app.support?.phone, href: app.support?.phone && `tel:${app.support.phone.replace(/\s+/g, '')}` },
                                { icon: 'mail', label: 'Email', value: app.support?.email, href: app.support?.email && `mailto:${app.support.email}` },
                                { icon: 'file', label: 'Message', value: 'Contact form', href: route('contact'), inertia: true },
                            ].map((c) => {
                                const Tag = c.inertia ? Link : 'a';
                                return (
                                    <li key={c.label}>
                                        <Tag href={c.href} className="group flex h-full flex-col justify-between gap-8 rounded-4xl border border-snow/15 p-5 transition-colors duration-500 hover:border-mint hover:bg-snow/5">
                                            <span className="grid size-10 place-items-center rounded-full bg-mint text-night">
                                                <Icon name={c.icon} size={17} />
                                            </span>
                                            <span>
                                                <span className="eyebrow block text-snow/60">{c.label}</span>
                                                <span className="mt-1 block break-all text-sm">{c.value}</span>
                                            </span>
                                        </Tag>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </div>
            </section>
        </div>
    );
}

/** Wraps matches of the search terms in <mark>. */
function Highlight({ text, terms }) {
    if (!terms.length) return text;
    const pattern = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    return text.split(pattern).map((part, i) =>
        i % 2 ? (
            <mark key={i} className="rounded bg-mint px-0.5 text-night">
                {part}
            </mark>
        ) : (
            <Fragment key={i}>{part}</Fragment>
        ),
    );
}

function QA({ item, terms, open, onToggle }) {
    const [vote, setVote] = useState(() => {
        try {
            return localStorage.getItem(`faq-vote:${item.id}`);
        } catch {
            return null;
        }
    });
    const rate = (v) => {
        setVote(v);
        try {
            localStorage.setItem(`faq-vote:${item.id}`, v);
        } catch {
            /* storage unavailable */
        }
    };

    return (
        <div id={item.id} className="scroll-mt-32 border-b border-line">
            <h3>
                <button
                    type="button"
                    onClick={onToggle}
                    aria-expanded={open}
                    aria-controls={`${item.id}-answer`}
                    className="group flex w-full items-center justify-between gap-6 py-5 text-left text-base md:py-6 md:text-lg"
                >
                    <span className="transition-colors group-hover:text-teal">
                        <Highlight text={item.q} terms={terms} />
                    </span>
                    <span
                        className={cn(
                            'grid size-10 shrink-0 place-items-center rounded-full border transition duration-500 ease-[var(--ease-expo)]',
                            open ? 'rotate-45 border-ink bg-ink text-paper' : 'border-line-strong group-hover:border-ink',
                        )}
                    >
                        <Icon name="plus" size={16} />
                    </span>
                </button>
            </h3>
            {/* grid-rows 0fr → 1fr animates to the content's natural height */}
            <div
                id={`${item.id}-answer`}
                role="region"
                aria-hidden={!open}
                className={cn('grid transition-[grid-template-rows,opacity] duration-500 ease-[var(--ease-expo)]', open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}
            >
                <div className="overflow-hidden" inert={!open}>
                    <p className="max-w-2xl pb-4 leading-relaxed text-ink-soft">
                        <Highlight text={item.a} terms={terms} />
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pb-6 text-xs text-ink-mute">
                        {vote ? (
                            <span className="flex items-center gap-1.5 text-teal">
                                <Icon name="check" size={13} /> Thanks for the feedback{vote === 'no' && ' — '}
                                {vote === 'no' && (
                                    <Link href={route('contact')} className="underline underline-offset-4">
                                        ask us directly
                                    </Link>
                                )}
                            </span>
                        ) : (
                            <>
                                <span>Was this helpful?</span>
                                {['yes', 'no'].map((v) => (
                                    <button key={v} type="button" onClick={() => rate(v)} className="rounded-full border border-line-strong px-3 py-1 capitalize transition-colors hover:border-ink hover:text-ink">
                                        {v}
                                    </button>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
