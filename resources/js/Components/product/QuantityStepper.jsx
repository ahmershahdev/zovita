import Icon from '@/Components/ui/Icon';
import { cn } from '@/lib/cn';

export default function QuantityStepper({ value, onChange, max = 20, min = 1, disabled, size = 'md', className }) {
    const btn = cn(
        'grid place-items-center rounded-full transition hover:bg-ink hover:text-paper disabled:pointer-events-none disabled:opacity-30',
        size === 'sm' ? 'size-8' : 'size-11',
    );

    return (
        <div className={cn('inline-flex items-center rounded-full border border-line-strong p-1', className)}>
            <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={disabled || value <= min} aria-label="Decrease quantity">
                <Icon name="minus" size={16} />
            </button>
            <span className={cn('text-center font-mono tabular-nums', size === 'sm' ? 'w-7 text-sm' : 'w-10')} aria-live="polite">
                {value}
            </span>
            <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={disabled || value >= max} aria-label="Increase quantity">
                <Icon name="plus" size={16} />
            </button>
        </div>
    );
}
