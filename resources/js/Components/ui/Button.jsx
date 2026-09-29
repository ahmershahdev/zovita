import { Link } from '@inertiajs/react';
import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

const variants = {
    primary: 'bg-ink text-paper hover:bg-ink-soft',
    mint: 'bg-mint text-ink hover:bg-[#b5f5d1]',
    ghost: 'border border-line-strong text-ink hover:border-ink hover:bg-ink hover:text-paper',
    light: 'bg-paper text-ink hover:bg-white',
    outlineLight: 'border border-white/25 text-paper hover:bg-paper hover:text-ink',
    link: 'px-0! py-0! h-auto! underline decoration-line-strong underline-offset-4 hover:decoration-ink',
};

const sizes = {
    sm: 'h-9 px-4 text-sm',
    md: 'h-12 px-6 text-[0.95rem]',
    lg: 'h-14 px-8 text-base',
};

/**
 * Pill button with a rolling-label hover (text slides up and is replaced by a copy).
 * Renders an Inertia <Link> when `href` is given.
 */
const Button = forwardRef(function Button(
    { href, variant = 'primary', size = 'md', className, children, icon, loading = false, external = false, ...props },
    ref,
) {
    const classes = cn(
        'group/btn relative inline-flex shrink-0 items-center justify-center gap-2 overflow-hidden rounded-full font-medium tracking-tight',
        'transition-[background-color,color,border-color,transform] duration-300 ease-[var(--ease-expo)] active:scale-[0.97]',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
    );

    const label =
        variant === 'link' ? (
            children
        ) : (
            <span className="relative block overflow-hidden">
                <span className="block transition-transform duration-500 ease-[var(--ease-expo)] group-hover/btn:-translate-y-full">
                    {children}
                </span>
                <span
                    aria-hidden="true"
                    className="absolute inset-0 block translate-y-full transition-transform duration-500 ease-[var(--ease-expo)] group-hover/btn:translate-y-0"
                >
                    {children}
                </span>
            </span>
        );

    const content = (
        <>
            {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />}
            {label}
            {icon && (
                <span className="transition-transform duration-500 ease-[var(--ease-expo)] group-hover/btn:translate-x-0.5">
                    {icon}
                </span>
            )}
        </>
    );

    if (href && external) {
        return (
            <a ref={ref} href={href} className={classes} {...props}>
                {content}
            </a>
        );
    }

    if (href) {
        return (
            <Link ref={ref} href={href} className={classes} {...props}>
                {content}
            </Link>
        );
    }

    return (
        <button ref={ref} className={classes} disabled={loading || props.disabled} {...props}>
            {content}
        </button>
    );
});

export default Button;
