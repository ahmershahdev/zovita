import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import Icon from '@/Components/ui/Icon';
import { cn } from '@/lib/cn';

/**
 * Themed dropdown (ARIA listbox pattern) used instead of the native <select>, whose open menu
 * can't be styled and ignores dark mode on most platforms.
 *
 *  - keyboard: ↑/↓, Home/End, type-ahead, Enter/Space to pick, Esc/Tab to close
 *  - opens upward when there isn't room below; scrolls the active option into view
 *  - `name` renders a hidden input so it still works inside plain forms
 *  - variants: "field" (form control, 56px) and "pill" (toolbar/sort control)
 *
 * options: [{ value, label, hint? }]   onChange(value)
 */
export default function Select({ value, onChange, options, placeholder = 'Choose…', variant = 'field', prefix, name, id, invalid, describedBy, ariaLabel, ariaLabelledBy, disabled, className, menuClassName }) {
    const autoId = useId();
    const buttonId = id ?? `${autoId}-button`;
    const listId = `${autoId}-list`;
    const button = useRef(null);
    const list = useRef(null);
    const typed = useRef({ text: '', at: 0 });
    const [open, setOpen] = useState(false);
    const [up, setUp] = useState(false);
    const selectedIndex = options.findIndex((o) => String(o.value) === String(value));
    const [active, setActive] = useState(Math.max(0, selectedIndex));
    const selected = options[selectedIndex];

    const close = useCallback((focus = true) => {
        setOpen(false);
        if (focus) button.current?.focus();
    }, []);

    const pick = (index) => {
        const option = options[index];
        if (!option) return;
        if (String(option.value) !== String(value)) onChange?.(option.value);
        close();
    };

    // Decide direction before paint so the menu never flashes in the wrong place.
    useLayoutEffect(() => {
        if (!open || !button.current) return;
        const r = button.current.getBoundingClientRect();
        const below = window.innerHeight - r.bottom;
        setUp(below < 280 && r.top > below);
        setActive(Math.max(0, selectedIndex));
    }, [open, selectedIndex]);

    useEffect(() => {
        if (!open) return undefined;
        const onDoc = (e) => {
            if (!button.current?.contains(e.target) && !list.current?.contains(e.target)) close(false);
        };
        document.addEventListener('pointerdown', onDoc);
        return () => document.removeEventListener('pointerdown', onDoc);
    }, [open, close]);

    useEffect(() => {
        if (open) list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
    }, [active, open]);

    const onKeyDown = (e) => {
        if (disabled) return;
        const last = options.length - 1;
        if (!open && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
            e.preventDefault();
            setOpen(true);
            return;
        }
        if (!open) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(last, a + 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
        } else if (e.key === 'Home') {
            e.preventDefault();
            setActive(0);
        } else if (e.key === 'End') {
            e.preventDefault();
            setActive(last);
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            pick(active);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            close();
        } else if (e.key === 'Tab') {
            close(false);
        } else if (e.key.length === 1) {
            // Type-ahead: jump to the first option starting with what was typed.
            const now = Date.now();
            typed.current.text = (now - typed.current.at > 600 ? '' : typed.current.text) + e.key.toLowerCase();
            typed.current.at = now;
            const match = options.findIndex((o) => String(o.label).toLowerCase().startsWith(typed.current.text));
            if (match >= 0) setActive(match);
        }
    };

    const field = variant === 'field';

    return (
        <div className={cn('relative', field ? 'w-full' : 'inline-block', className)}>
            {name && <input type="hidden" name={name} value={value ?? ''} />}
            <button
                ref={button}
                id={buttonId}
                type="button"
                role="combobox"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={listId}
                aria-activedescendant={open ? `${listId}-${active}` : undefined}
                aria-label={ariaLabel}
                aria-labelledby={ariaLabelledBy}
                aria-invalid={invalid ? 'true' : undefined}
                aria-describedby={describedBy}
                disabled={disabled}
                onClick={() => setOpen((o) => !o)}
                onKeyDown={onKeyDown}
                className={cn(
                    'group flex w-full items-center gap-2 text-left transition-[border-color,box-shadow,background-color] duration-300 focus:outline-none disabled:opacity-50',
                    field
                        ? 'h-14 rounded-2xl border border-line-strong bg-card px-4 text-[0.95rem] hover:border-ink/50 focus-visible:border-ink focus-visible:ring-4 focus-visible:ring-mint/40 aria-[invalid=true]:border-coral'
                        : 'h-11 rounded-full border border-line-strong bg-card pl-4 pr-3 text-sm hover:border-ink focus-visible:border-ink focus-visible:ring-4 focus-visible:ring-mint/40',
                    open && 'border-ink',
                )}
            >
                {prefix && <span className="shrink-0 text-ink-mute">{prefix}</span>}
                <span className={cn('min-w-0 flex-1 truncate', !selected && 'text-ink-mute/70', !field && 'font-medium')}>{selected?.label ?? placeholder}</span>
                <Icon name="plus" size={13} className={cn('shrink-0 text-ink-mute transition-transform duration-500 ease-[var(--ease-expo)]', open && 'rotate-45 text-ink')} />
            </button>

            <ul
                ref={list}
                id={listId}
                role="listbox"
                aria-labelledby={ariaLabelledBy ?? buttonId}
                tabIndex={-1}
                data-lenis-prevent
                className={cn(
                    'absolute z-50 max-h-72 min-w-full overflow-y-auto rounded-3xl border border-line bg-paper p-1.5 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.35)] transition-[opacity,transform] duration-300 ease-[var(--ease-expo)]',
                    up ? 'bottom-full mb-2 origin-bottom' : 'top-full mt-2 origin-top',
                    open ? 'visible scale-100 opacity-100' : 'invisible pointer-events-none scale-95 opacity-0',
                    !field && 'right-0 w-max max-w-[18rem]',
                    menuClassName,
                )}
            >
                {options.map((o, i) => {
                    const isSelected = i === selectedIndex;
                    return (
                        <li
                            key={String(o.value)}
                            id={`${listId}-${i}`}
                            data-index={i}
                            role="option"
                            aria-selected={isSelected}
                            onPointerEnter={() => setActive(i)}
                            onClick={() => pick(i)}
                            className={cn(
                                'flex cursor-pointer items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm transition-colors',
                                i === active ? 'bg-paper-deep text-ink' : 'text-ink-soft',
                            )}
                        >
                            <span className="min-w-0 flex-1">
                                <span className="block truncate">{o.label}</span>
                                {o.hint && <span className="block truncate text-xs text-ink-mute">{o.hint}</span>}
                            </span>
                            {isSelected && <Icon name="check" size={14} className="shrink-0 text-teal" />}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
