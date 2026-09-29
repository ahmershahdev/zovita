import { cn } from '@/lib/cn';

const tones = {
    ink: 'bg-ink text-paper',
    mint: 'bg-mint text-ink',
    coral: 'bg-coral text-white',
    outline: 'border border-line-strong text-ink',
    soft: 'bg-paper-deep text-ink',
};

export default function Badge({ tone = 'soft', className, children }) {
    return (
        <span className={cn('eyebrow inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.64rem]!', tones[tone], className)}>
            {children}
        </span>
    );
}
