import { Head } from '@inertiajs/react';
import { useRef } from 'react';
import Button from '@/Components/ui/Button';
import Icon from '@/Components/ui/Icon';
import { faqGroups } from '@/content/faq';
import useReveal from '@/hooks/useReveal';

export default function Faq() {
    const scope = useRef(null);
    useReveal(scope);

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqGroups.flatMap((g) => g.items).map((i) => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a } })),
    };

    return (
        <section ref={scope} className="container-x pb-10 pt-10 md:pt-16">
            <Head title="FAQ">
                <meta name="description" content="Answers about ordering, delivery, prescriptions, returns and your Zovita account." />
                <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
            </Head>
            <p className="eyebrow text-ink-mute">Help centre</p>
            <h1 className="mt-4 font-display text-title" data-split="now">
                Questions, <span className="italic">answered.</span>
            </h1>

            <div className="mt-16 space-y-16">
                {faqGroups.map((group) => (
                    <div key={group.title} className="grid gap-6 lg:grid-cols-12" data-reveal>
                        <h2 className="font-display text-3xl lg:col-span-4">{group.title}</h2>
                        <div className="border-t border-ink lg:col-span-8">
                            {group.items.map((item) => (
                                <details key={item.q} className="group border-b border-line">
                                    <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-lg">
                                        {item.q}
                                        <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line-strong transition duration-500 group-open:rotate-45 group-open:bg-ink group-open:text-paper">
                                            <Icon name="plus" size={16} />
                                        </span>
                                    </summary>
                                    <p className="max-w-2xl pb-6 text-ink-soft">{item.a}</p>
                                </details>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-24 flex flex-col items-start justify-between gap-6 rounded-5xl bg-mint p-8 md:flex-row md:items-center md:p-12">
                <h2 className="font-display text-4xl md:text-5xl">Still wondering about something?</h2>
                <Button href={route('contact')} icon={<Icon name="arrow" size={16} />}>
                    Talk to our care team
                </Button>
            </div>
        </section>
    );
}
