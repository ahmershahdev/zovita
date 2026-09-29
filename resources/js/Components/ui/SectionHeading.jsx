import { cn } from '@/lib/cn';

/** Numbered editorial heading: "(03) — Label" eyebrow, big serif title, optional aside. */
export default function SectionHeading({ index, eyebrow, title, aside, className, dark = false }) {
    return (
        <div className={cn('grid gap-6 md:grid-cols-12 md:items-end', className)}>
            <div className="md:col-span-8">
                <p className={cn('eyebrow mb-5 flex items-center gap-3', dark ? 'text-mint' : 'text-ink-mute')} data-reveal>
                    {index && <span>({index})</span>}
                    <span className={cn('h-px w-10', dark ? 'bg-mint/40' : 'bg-line-strong')} />
                    <span>{eyebrow}</span>
                </p>
                <h2 className="font-display text-title" data-split>
                    {title}
                </h2>
            </div>
            {aside && (
                <div className={cn('md:col-span-4 md:justify-self-end', dark ? 'text-paper/70' : 'text-ink-mute')} data-reveal>
                    {aside}
                </div>
            )}
        </div>
    );
}
