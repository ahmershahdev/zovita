import { useId } from 'react';
import { cn } from '@/lib/cn';

const control =
    'block w-full rounded-2xl border border-line-strong bg-card px-4 text-[0.95rem] text-ink placeholder:text-ink-mute/60 ' +
    'transition-[border-color,box-shadow] duration-200 focus:border-ink focus:outline-none focus:ring-4 focus:ring-mint/50 ' +
    'aria-[invalid=true]:border-coral aria-[invalid=true]:ring-coral/15';

/** Label + control + hint/error wrapper. `as` picks input | textarea | select. */
export default function Field({ label, error, hint, as = 'input', className, children, optional, ...props }) {
    const id = useId();
    const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
    const Control = as;

    return (
        <div className={className}>
            {label && (
                <label htmlFor={id} className="mb-2 flex items-baseline justify-between text-sm font-medium text-ink">
                    <span>{label}</span>
                    {optional && <span className="eyebrow text-ink-mute">Optional</span>}
                </label>
            )}
            <Control
                id={id}
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={describedBy}
                className={cn(control, as === 'textarea' ? 'min-h-32 py-3' : 'h-13', as === 'select' && 'appearance-none bg-[length:12px] bg-[right_1.1rem_center] bg-no-repeat pr-10')}
                style={
                    as === 'select'
                        ? {
                              backgroundImage:
                                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%230b1b33' stroke-width='1.6'/%3E%3C/svg%3E\")",
                          }
                        : undefined
                }
                {...props}
            >
                {children}
            </Control>
            {error ? (
                <p id={`${id}-error`} className="mt-2 text-sm text-coral">
                    {error}
                </p>
            ) : (
                hint && (
                    <p id={`${id}-hint`} className="mt-2 text-sm text-ink-mute">
                        {hint}
                    </p>
                )
            )}
        </div>
    );
}

export function Checkbox({ label, error, className, ...props }) {
    return (
        <div className={className}>
            <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-soft">
                <input
                    type="checkbox"
                    className="mt-0.5 size-5 shrink-0 cursor-pointer rounded-md border-line-strong accent-ink"
                    {...props}
                />
                <span>{label}</span>
            </label>
            {error && <p className="mt-2 text-sm text-coral">{error}</p>}
        </div>
    );
}
