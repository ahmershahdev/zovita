import { cn } from '@/lib/cn';
import { money } from '@/lib/format';

export default function Price({ price, current, className, size = 'md' }) {
    const discounted = current < price;
    return (
        <div className={cn('flex items-baseline gap-2', className)}>
            <span className={cn('font-semibold tracking-tight text-ink', size === 'lg' ? 'text-3xl' : 'text-[1.02rem]')}>
                {money(current, { precise: size === 'lg' })}
            </span>
            {discounted && (
                <span className={cn('text-ink-mute line-through decoration-coral/60', size === 'lg' ? 'text-lg' : 'text-xs')}>
                    {money(price)}
                </span>
            )}
        </div>
    );
}
