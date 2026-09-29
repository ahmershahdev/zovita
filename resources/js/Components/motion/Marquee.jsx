import { cn } from '@/lib/cn';

/** Infinite CSS marquee. Content is duplicated once; the track slides by -50%. Pauses on hover. */
export default function Marquee({ children, duration = 32, reverse = false, className, itemClassName }) {
    return (
        <div className={cn('group relative flex overflow-hidden', className)}>
            <div
                className="flex w-max shrink-0 animate-marquee group-hover:[animation-play-state:paused]"
                style={{ '--marquee-duration': `${duration}s`, animationDirection: reverse ? 'reverse' : 'normal' }}
            >
                {[0, 1].map((copy) => (
                    <div key={copy} className={cn('flex shrink-0 items-center', itemClassName)} aria-hidden={copy === 1}>
                        {children}
                    </div>
                ))}
            </div>
        </div>
    );
}
