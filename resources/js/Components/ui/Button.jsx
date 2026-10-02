import { Link } from '@inertiajs/react';
import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

/** Base colours + the colour of the disc that floods the button on hover. */
const variants = {
    primary: { base: 'bg-ink text-paper', fill: 'bg-teal', hover: 'hover:text-paper dark:hover:text-night' },
    mint: { base: 'bg-mint text-night', fill: 'bg-night', hover: 'hover:text-snow' },
    ghost: { base: 'border border-line-strong text-ink', fill: 'bg-ink', hover: 'hover:border-ink hover:text-paper' },
    light: { base: 'bg-snow text-night', fill: 'bg-mint', hover: 'hover:text-night' },
    outlineLight: { base: 'border border-white/25 text-snow', fill: 'bg-snow', hover: 'hover:border-snow hover:text-night' },
    danger: { base: 'border border-coral/40 text-coral', fill: 'bg-coral', hover: 'hover:text-white' },
    link: null,
};

const sizes = {
    sm: 'h-9 px-4 text-sm',
    md: 'h-12 px-6 text-[0.95rem]',
    lg: 'h-14 px-8 text-base',
};

/** Put the fill origin where the pointer crossed the edge, so the colour pours in from that side. */
const trackOrigin = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--x', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--y', `${e.clientY - r.top}px`);
};

function Roll({ children }) {
    return (
        <span className="roll relative block overflow-hidden">
            <span className="block transition-transform duration-500 ease-[var(--ease-expo)] group-hover/btn:-translate-y-full">{children}</span>
            <span aria-hidden="true" className="absolute inset-0 block translate-y-full transition-transform duration-500 ease-[var(--ease-expo)] group-hover/btn:translate-y-0">
                {children}
            </span>
        </span>
    );
}

/**
 * Pill button: colour-flood hover from the pointer's entry point, rolling label, and an icon that
 * slides out and back in. Renders an Inertia <Link> when `href` is given (or <a> with `external`).
 */
const Button = forwardRef(function Button(
    { href, variant = 'primary', size = 'md', className, children, icon, loading = false, external = false, ...props },
    ref,
) {
    const v = variants[variant];

    if (!v) {
        const classes = cn('inline-flex items-center gap-2 font-medium underline decoration-line-strong underline-offset-4 transition hover:decoration-ink', className);
        if (href) {
            return external ? <a ref={ref} href={href} className={classes} {...props}>{children}</a> : <Link ref={ref} href={href} className={classes} {...props}>{children}</Link>;
        }
        return <button ref={ref} className={classes} {...props}>{children}</button>;
    }

    const classes = cn(
        'group/btn relative isolate inline-flex shrink-0 items-center justify-center gap-2.5 overflow-hidden rounded-full font-medium tracking-tight',
        'transition-[color,border-color,transform,box-shadow] duration-500 ease-[var(--ease-expo)] active:scale-[0.97]',
        'disabled:pointer-events-none disabled:opacity-50',
        v.base,
        v.hover,
        sizes[size],
        className,
    );

    const content = (
        <>
            <span aria-hidden="true" className={cn('btn-fill -z-10', v.fill)} />
            {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />}
            <Roll>{children}</Roll>
            {icon && (
                <span className="relative -mr-1 grid size-6 place-items-center overflow-hidden">
                    <span className="transition-transform duration-500 ease-[var(--ease-expo)] group-hover/btn:translate-x-[160%] group-hover/btn:-translate-y-[160%]">{icon}</span>
                    <span aria-hidden="true" className="absolute -translate-x-[160%] translate-y-[160%] transition-transform duration-500 ease-[var(--ease-expo)] group-hover/btn:translate-x-0 group-hover/btn:translate-y-0">
                        {icon}
                    </span>
                </span>
            )}
        </>
    );

    const shared = { ref, className: classes, onPointerEnter: trackOrigin, onPointerLeave: trackOrigin, 'data-cursor-magnetic': true, ...props };

    if (href && external) {
        return <a href={href} {...shared}>{content}</a>;
    }

    if (href) {
        return <Link href={href} {...shared}>{content}</Link>;
    }

    return (
        <button {...shared} disabled={loading || props.disabled}>
            {content}
        </button>
    );
});

export default Button;
