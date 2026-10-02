import { Head, Link } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import Breadcrumbs from '@/Components/ui/Breadcrumbs';
import Button from '@/Components/ui/Button';
import Icon from '@/Components/ui/Icon';
import { legalNav, legalPages } from '@/content/legal';
import useReveal from '@/hooks/useReveal';
import useScrollSpy from '@/hooks/useScrollSpy';
import useStoreFacts from '@/hooks/useStoreFacts';
import { cn } from '@/lib/cn';
import { date, pad } from '@/lib/format';

function readingMinutes(page) {
    const words = JSON.stringify(page.sections).split(/\s+/).length;
    return Math.max(1, Math.round(words / 220));
}

export default function Legal({ page }) {
    const content = legalPages[page];
    const fill = useStoreFacts();
    const scope = useRef(null);
    const ids = content.sections.map((s) => s.id);
    const { active, progress, jump } = useScrollSpy(ids);
    useReveal(scope, [page]);

    // Deep links (#section) land on the right section after the page renders.
    useEffect(() => {
        const id = window.location.hash.slice(1);
        if (id && ids.includes(id)) requestAnimationFrame(() => jump(id));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    return (
        <div ref={scope} className="pb-10">
            <Head title={content.title}>
                <meta head-key="description" name="description" content={content.intro} />
            </Head>

            {/* Hero */}
            <section className="container-x pt-10 md:pt-16">
                <Breadcrumbs items={[{ label: 'Policies' }, { label: content.title }]} className="mb-6" />
                <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
                    <div className="lg:col-span-8">
                        <p className="eyebrow flex items-center gap-3 text-ink-mute">
                            <span className="size-2 rounded-full bg-teal" /> {content.kicker}
                        </p>
                        <h1 key={page} className="mt-5 font-display text-title" data-split="now">
                            {content.title}
                        </h1>
                        <p className="mt-6 max-w-2xl text-lg text-ink-soft">{content.intro}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 font-mono text-xs uppercase tracking-[0.1em] text-ink-mute lg:col-span-4 lg:justify-end">
                        <span className="flex items-center gap-2">
                            <Icon name="clock" size={14} /> {readingMinutes(content)} min read
                        </span>
                        <span>Updated {date(content.updated)}</span>
                        <button type="button" onClick={() => window.print()} className="flex items-center gap-2 underline-offset-4 hover:text-ink hover:underline print:hidden">
                            <Icon name="file" size={14} /> Print
                        </button>
                    </div>
                </div>

                {/* Policy switcher */}
                <nav aria-label="Policies" className="scrollbar-none -mx-1 mt-10 overflow-x-auto px-1 print:hidden">
                    <ul className="flex w-max gap-2">
                        {legalNav.map(([slug, label, icon]) => (
                            <li key={slug}>
                                <Link
                                    href={route('legal', slug)}
                                    preserveScroll={false}
                                    aria-current={slug === page ? 'page' : undefined}
                                    className={cn(
                                        'flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm transition-colors duration-300',
                                        slug === page ? 'border-ink bg-ink text-paper' : 'border-line-strong hover:border-ink',
                                    )}
                                >
                                    <Icon name={icon} size={15} /> {label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Key facts */}
                <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4" data-stagger>
                    {content.facts.map((f) => (
                        <li key={f.label} className="rounded-4xl border border-line bg-card p-5 md:p-6">
                            <span className="grid size-10 place-items-center rounded-full bg-mint-soft text-teal">
                                <Icon name={f.icon} size={18} />
                            </span>
                            <p className="mt-5 font-display text-2xl leading-tight md:text-3xl">{fill(f.value)}</p>
                            <p className="mt-1 text-sm text-ink-mute">{fill(f.label)}</p>
                        </li>
                    ))}
                </ul>
            </section>

            {/* Mobile table of contents */}
            <div className="sticky top-20 z-30 mt-10 lg:hidden print:hidden">
                <div className="container-x">
                    <div className="glass relative overflow-hidden rounded-full border border-line">
                        <div className="scrollbar-none flex gap-1 overflow-x-auto p-1">
                            {content.sections.map((s, i) => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => jump(s.id)}
                                    className={cn('shrink-0 rounded-full px-3.5 py-2 text-xs transition-colors', active === s.id ? 'bg-ink text-paper' : 'text-ink-mute')}
                                >
                                    {pad(i + 1)} {s.heading}
                                </button>
                            ))}
                        </div>
                        <span className="absolute bottom-0 left-0 h-0.5 bg-teal transition-[width] duration-200" style={{ width: `${progress * 100}%` }} />
                    </div>
                </div>
            </div>

            <section className="container-x mt-10 lg:mt-16">
                <div className="grid gap-12 lg:grid-cols-12">
                    {/* Desktop table of contents */}
                    <aside className="hidden lg:col-span-3 lg:block print:hidden">
                        <nav aria-label="On this page" className="sticky top-28">
                            <p className="eyebrow text-ink-mute">On this page</p>
                            <div className="relative mt-5 pl-4">
                                <span className="absolute inset-y-0 left-0 w-px bg-line-strong" />
                                <span className="absolute left-0 top-0 w-px bg-teal transition-[height] duration-200" style={{ height: `${progress * 100}%` }} />
                                <ol className="space-y-1">
                                    {content.sections.map((s, i) => (
                                        <li key={s.id}>
                                            <a
                                                href={`#${s.id}`}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    jump(s.id);
                                                }}
                                                aria-current={active === s.id ? 'location' : undefined}
                                                className={cn(
                                                    'flex gap-3 rounded-xl px-3 py-2 text-sm transition-colors duration-300',
                                                    active === s.id ? 'bg-paper-deep text-ink' : 'text-ink-mute hover:text-ink',
                                                )}
                                            >
                                                <span className="font-mono text-xs leading-5">{pad(i + 1)}</span>
                                                {s.heading}
                                            </a>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                            <div className="mt-8 rounded-4xl bg-night p-6 text-snow">
                                <p className="eyebrow text-mint">Questions?</p>
                                <p className="mt-3 text-sm text-snow/75">Our care team answers in plain language.</p>
                                <Link href={route('contact')} className="mt-4 inline-flex items-center gap-2 text-sm underline underline-offset-4">
                                    Contact us <Icon name="arrow" size={14} />
                                </Link>
                            </div>
                        </nav>
                    </aside>

                    <article className="min-w-0 lg:col-span-9 xl:col-span-8">
                        {content.sections.map((s, i) => (
                            <section key={s.id} id={s.id} className="scroll-mt-32 border-t border-line py-10 first:border-t-0 first:pt-0 md:py-14">
                                <div className="flex items-start justify-between gap-4">
                                    <h2 className="font-display text-3xl leading-tight md:text-4xl">
                                        <span className="mr-3 align-top font-mono text-sm text-teal">{pad(i + 1)}</span>
                                        {s.heading}
                                    </h2>
                                    <CopyLink id={s.id} />
                                </div>
                                {s.summary && (
                                    <p className="mt-5 flex gap-3 rounded-3xl bg-mint-soft px-5 py-4 text-[0.95rem]">
                                        <span className="eyebrow shrink-0 pt-0.5 text-teal">In short</span>
                                        <span>{fill(s.summary)}</span>
                                    </p>
                                )}
                                <div className="mt-6 space-y-6">
                                    {s.blocks.map((b, j) => (
                                        <Block key={j} block={b} fill={fill} />
                                    ))}
                                </div>
                            </section>
                        ))}
                    </article>
                </div>
            </section>

            {/* Related + contact */}
            <section className="container-x mt-6 print:hidden">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {content.related.map((slug) => {
                        const r = legalPages[slug];
                        return (
                            <Link key={slug} href={route('legal', slug)} className="group rounded-4xl border border-line bg-card p-7 transition-colors duration-500 hover:border-ink">
                                <p className="eyebrow text-ink-mute">Related policy</p>
                                <p className="mt-4 font-display text-3xl">{r.title}</p>
                                <p className="mt-2 line-clamp-2 text-sm text-ink-mute">{r.intro}</p>
                                <span className="mt-6 inline-grid size-10 place-items-center rounded-full border border-line-strong transition duration-500 group-hover:-rotate-45 group-hover:bg-ink group-hover:text-paper">
                                    <Icon name="arrow" size={16} />
                                </span>
                            </Link>
                        );
                    })}
                    <div className="grain relative overflow-hidden rounded-4xl bg-mint p-7">
                        <p className="eyebrow">Still unsure?</p>
                        <p className="mt-4 font-display text-3xl">Ask a real person.</p>
                        <p className="mt-2 text-sm text-ink-soft">{fill('{hours}')}</p>
                        <div className="mt-6 flex flex-wrap gap-2">
                            <Button href={route('contact')} size="sm" icon={<Icon name="arrow" size={14} />}>
                                Contact
                            </Button>
                            <Button href={route('faq')} size="sm" variant="ghost">
                                FAQ
                            </Button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

function CopyLink({ id }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#${id}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
        } catch {
            /* clipboard unavailable */
        }
    };
    return (
        <button
            type="button"
            onClick={copy}
            className="mt-1 grid size-9 shrink-0 place-items-center rounded-full text-ink-mute transition-colors hover:bg-paper-deep hover:text-ink print:hidden"
            aria-label={copied ? 'Link copied' : 'Copy link to this section'}
            title={copied ? 'Link copied' : 'Copy link'}
        >
            <Icon name={copied ? 'check' : 'share'} size={15} />
        </button>
    );
}

const tones = {
    mint: 'border-teal/30 bg-mint-soft',
    coral: 'border-coral/30 bg-coral/5',
    ink: 'border-transparent bg-night text-snow',
};

function Block({ block, fill }) {
    if (block.p) return <p className="max-w-3xl leading-relaxed text-ink-soft">{fill(block.p)}</p>;

    if (block.list) {
        return (
            <ul className="max-w-3xl space-y-2.5">
                {block.list.map((item) => (
                    <li key={item} className="flex gap-3 text-ink-soft">
                        <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-teal" />
                        <span>{fill(item)}</span>
                    </li>
                ))}
            </ul>
        );
    }

    if (block.steps) {
        return (
            <ol className="relative max-w-3xl">
                {block.steps.map((step, i) => (
                    <li key={step.title} className="relative flex gap-5 pb-7 last:pb-0">
                        {i < block.steps.length - 1 && <span className="absolute left-5 top-11 bottom-1 w-px bg-line-strong" aria-hidden="true" />}
                        <span className="grid size-10 shrink-0 place-items-center rounded-full border border-ink font-mono text-xs">{pad(i + 1)}</span>
                        <div className="pt-1.5">
                            <p className="font-medium">{fill(step.title)}</p>
                            <p className="mt-1 text-ink-soft">{fill(step.text)}</p>
                        </div>
                    </li>
                ))}
            </ol>
        );
    }

    if (block.timeline) {
        return (
            <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {block.timeline.map((t) => (
                    <li key={t.title} className="relative rounded-3xl border border-line bg-card p-5">
                        <p className="font-mono text-xs uppercase tracking-[0.1em] text-teal">{fill(t.when)}</p>
                        <p className="mt-3 font-medium">{fill(t.title)}</p>
                        <p className="mt-1 text-sm text-ink-soft">{fill(t.text)}</p>
                    </li>
                ))}
            </ol>
        );
    }

    if (block.cards) {
        return (
            <ul className="grid gap-3 sm:grid-cols-2">
                {block.cards.map((c) => (
                    <li key={c.title} className="flex gap-4 rounded-3xl border border-line bg-card p-5">
                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-paper-deep text-teal">
                            <Icon name={c.icon} size={17} />
                        </span>
                        <div>
                            <p className="font-medium">{fill(c.title)}</p>
                            <p className="mt-1 text-sm text-ink-soft">{fill(c.text)}</p>
                        </div>
                    </li>
                ))}
            </ul>
        );
    }

    if (block.table) {
        const { head, rows } = block.table;
        return (
            <div className="overflow-hidden rounded-3xl border border-line">
                {/* Table on wider screens, stacked cards on phones. */}
                <table className="hidden w-full text-left text-sm sm:table">
                    <thead className="bg-paper-deep">
                        <tr>
                            {head.map((h) => (
                                <th key={h} scope="col" className="px-5 py-3.5 font-mono text-[0.68rem] font-normal uppercase tracking-[0.1em] text-ink-mute">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                        {rows.map((row) => (
                            <tr key={row.join('|')} className="align-top transition-colors hover:bg-paper-deep/50">
                                {row.map((cell, k) => (
                                    <td key={k} className={cn('px-5 py-4', k === 0 ? 'font-medium' : 'text-ink-soft')}>
                                        {fill(cell)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
                <ul className="divide-y divide-line sm:hidden">
                    {rows.map((row) => (
                        <li key={row.join('|')} className="p-4">
                            <p className="font-medium">{fill(row[0])}</p>
                            <dl className="mt-2 space-y-1 text-sm">
                                {row.slice(1).map((cell, k) => (
                                    <div key={k} className="flex justify-between gap-4">
                                        <dt className="text-ink-mute">{head[k + 1]}</dt>
                                        <dd className="text-right text-ink-soft">{fill(cell)}</dd>
                                    </div>
                                ))}
                            </dl>
                        </li>
                    ))}
                </ul>
            </div>
        );
    }

    if (block.callout) {
        const c = block.callout;
        return (
            <div className={cn('max-w-3xl rounded-3xl border p-5 md:p-6', tones[c.tone] ?? tones.mint)}>
                <p className="flex items-center gap-2 font-medium">
                    <Icon name={c.tone === 'coral' ? 'alert' : c.tone === 'ink' ? 'phone' : 'spark'} size={16} className={c.tone === 'coral' ? 'text-coral' : c.tone === 'ink' ? 'text-mint' : 'text-teal'} />
                    {fill(c.title)}
                </p>
                <p className={cn('mt-2 text-[0.95rem]', c.tone === 'ink' ? 'text-snow/80' : 'text-ink-soft')}>{fill(c.text)}</p>
            </div>
        );
    }

    return null;
}
