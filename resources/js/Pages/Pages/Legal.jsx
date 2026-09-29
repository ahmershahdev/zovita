import { Head, Link } from '@inertiajs/react';
import { legalPages } from '@/content/legal';
import { cn } from '@/lib/cn';
import { date } from '@/lib/format';

const nav = [
    ['shipping', 'Shipping'],
    ['returns', 'Returns & refunds'],
    ['privacy', 'Privacy'],
    ['terms', 'Terms'],
];

export default function Legal({ page }) {
    const content = legalPages[page];

    return (
        <section className="container-x pb-10 pt-10 md:pt-16">
            <Head title={content.title}>
                <meta name="description" content={content.intro} />
            </Head>
            <p className="eyebrow text-ink-mute">Policies</p>
            <h1 className="mt-4 font-display text-title">{content.title}</h1>
            <p className="mt-6 max-w-2xl text-lg text-ink-soft">{content.intro}</p>
            <p className="eyebrow mt-4 text-ink-mute">Last updated {date(content.updated)}</p>

            <div className="mt-14 grid gap-12 lg:grid-cols-12">
                <nav className="lg:col-span-3" aria-label="Policies">
                    <ul className="flex flex-wrap gap-2 lg:sticky lg:top-24 lg:flex-col">
                        {nav.map(([slug, label]) => (
                            <li key={slug}>
                                <Link
                                    href={route('legal', slug)}
                                    className={cn('block rounded-full px-4 py-2 text-sm transition', slug === page ? 'bg-ink text-paper' : 'hover:bg-paper-deep')}
                                >
                                    {label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
                <article className="prose-care max-w-3xl lg:col-span-9">
                    {content.sections.map((s, i) => (
                        <section key={s.heading}>
                            <h2>
                                <span className="mr-3 font-mono text-sm text-ink-mute">{String(i + 1).padStart(2, '0')}</span>
                                {s.heading}
                            </h2>
                            {Array.isArray(s.body) ? (
                                <ul>
                                    {s.body.map((li) => (
                                        <li key={li}>{li}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p>{s.body}</p>
                            )}
                        </section>
                    ))}
                </article>
            </div>
        </section>
    );
}
