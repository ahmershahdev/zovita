import { useId, useState } from 'react';
import Icon from '@/Components/ui/Icon';
import { cn } from '@/lib/cn';

const control =
    'peer block w-full rounded-2xl border border-line-strong bg-card px-4 text-[0.95rem] text-ink placeholder:text-ink-mute/55 ' +
    'transition-[border-color,box-shadow,background-color] duration-300 hover:border-ink/50 focus:border-ink focus:bg-paper focus:outline-none focus:ring-4 focus:ring-mint/40 ' +
    'aria-[invalid=true]:border-coral aria-[invalid=true]:ring-coral/15';

const chevron =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%238e9c95' stroke-width='1.6'/%3E%3C/svg%3E\")";

/**
 * Label + control + hint/error wrapper. `as` picks input | textarea | select.
 * `icon` adds a leading icon; password inputs get a show/hide toggle automatically.
 */
export default function Field({ label, error, hint, as = 'input', className, children, optional, icon, type, ...props }) {
    const id = useId();
    const [reveal, setReveal] = useState(false);
    const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
    const Control = as;
    const isPassword = as === 'input' && type === 'password';

    return (
        <div className={className}>
            {label && (
                <label htmlFor={id} className="mb-2 flex items-baseline justify-between text-sm font-medium text-ink">
                    <span>{label}</span>
                    {optional && <span className="eyebrow text-ink-mute">Optional</span>}
                </label>
            )}
            <div className="relative">
                <Control
                    id={id}
                    type={isPassword && reveal ? 'text' : type}
                    aria-invalid={error ? 'true' : undefined}
                    aria-describedby={describedBy}
                    className={cn(
                        control,
                        as === 'textarea' ? 'min-h-32 py-3.5' : 'h-14',
                        icon && 'pl-11',
                        isPassword && 'pr-12',
                        as === 'select' && 'appearance-none bg-[length:12px] bg-[right_1.1rem_center] bg-no-repeat pr-10',
                    )}
                    style={as === 'select' ? { backgroundImage: chevron } : undefined}
                    {...props}
                >
                    {children}
                </Control>
                {icon && (
                    <Icon name={icon} size={18} className="pointer-events-none absolute left-4 top-[1.15rem] text-ink-mute transition-colors peer-focus:text-ink" />
                )}
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setReveal((r) => !r)}
                        className="absolute right-2 top-2 grid size-10 place-items-center rounded-xl text-ink-mute transition-colors hover:bg-ink/5 hover:text-ink"
                        aria-label={reveal ? 'Hide password' : 'Show password'}
                        aria-pressed={reveal}
                        aria-controls={id}
                    >
                        <Icon name={reveal ? 'eyeOff' : 'eye'} size={18} />
                    </button>
                )}
            </div>
            {error ? (
                <p id={`${id}-error`} className="mt-2 flex items-center gap-1.5 text-sm text-coral [animation:fade-up_0.4s_var(--ease-expo)]" role="alert">
                    <Icon name="alert" size={14} /> {error}
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
            <label className="group flex cursor-pointer items-start gap-3 text-sm text-ink-soft">
                <span className="relative mt-0.5 grid size-5 shrink-0 place-items-center">
                    <input type="checkbox" className="peer absolute inset-0 cursor-pointer appearance-none rounded-md border border-line-strong transition-colors checked:border-ink checked:bg-ink" {...props} />
                    <Icon name="check" size={13} strokeWidth={2.4} className="pointer-events-none relative scale-0 text-paper transition-transform duration-300 peer-checked:scale-100" />
                </span>
                <span>{label}</span>
            </label>
            {error && <p className="mt-2 text-sm text-coral">{error}</p>}
        </div>
    );
}

/** Four-segment password strength meter (length, mixed case, digits, symbols). */
export function PasswordStrength({ value }) {
    const checks = [value.length >= 8, /[a-z]/.test(value) && /[A-Z]/.test(value), /\d/.test(value), /[^A-Za-z0-9]/.test(value)];
    const score = value ? checks.filter(Boolean).length : 0;
    const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
    const tones = ['bg-coral', 'bg-coral', 'bg-amber-400', 'bg-teal', 'bg-teal'];

    return (
        <div className="mt-3" aria-live="polite">
            <div className="flex gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                    <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-line">
                        <span className={cn('block h-full origin-left transition-transform duration-500 ease-[var(--ease-expo)]', tones[score], i < score ? 'scale-x-100' : 'scale-x-0')} />
                    </span>
                ))}
            </div>
            {value && <p className="mt-1.5 text-xs text-ink-mute">Password strength: <span className="text-ink">{labels[score]}</span></p>}
        </div>
    );
}
