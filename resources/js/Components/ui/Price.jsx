import Icon from '@/Components/ui/Icon';
import { cn } from '@/lib/cn';
import { money } from '@/lib/format';

/**
 * Price with optional strike-through. `personal` (% off from this visitor's automatic offers)
 * shows "your price" in teal with the regular price struck through.
 */
export default function Price({ price, current, personal = 0, className, size = 'md' }) {
    const yours = personal > 0 ? Math.round(current * (1 - personal / 100) * 100) / 100 : current;
    const discounted = yours < price;
    const lg = size === 'lg';

    return (
        <div translate="no" className={cn('flex flex-wrap items-baseline gap-x-2 gap-y-1', className)}>
            <span className={cn('font-semibold tracking-tight', personal > 0 ? 'text-teal' : 'text-ink', lg ? 'text-3xl' : 'text-[1.02rem]')}>
                {money(yours, { precise: lg || personal > 0 })}
            </span>
            {discounted && <span className={cn('text-ink-mute line-through decoration-coral/60', lg ? 'text-lg' : 'text-xs')}>{money(price)}</span>}
            {personal > 0 && (
                <span className={cn('inline-flex items-center gap-1 rounded-full bg-mint-soft font-mono uppercase tracking-wider text-teal', lg ? 'px-2.5 py-1 text-[0.68rem]' : 'px-1.5 py-0.5 text-[0.58rem]')}>
                    <Icon name="sparkle" size={lg ? 12 : 10} /> Your price −{personal}%
                </span>
            )}
        </div>
    );
}
