import { usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import useTheme from '@/hooks/useTheme';
import { loadRecaptcha } from '@/lib/recaptcha';
import { cn } from '@/lib/cn';

const WIDTH = 304;
const HEIGHT = 78;

/**
 * reCAPTCHA v2 "I'm not a robot" checkbox. Calls onChange(token) on success and onChange('') on expiry.
 * Change `resetKey` after a failed submit to get a fresh challenge (tokens are single-use).
 *
 * Google's widget is a fixed 304×78 iframe with a theme chosen at render time, so this wrapper:
 *  - re-renders it when the site theme flips (the old token is dropped; the user just re-ticks)
 *  - scales it down to fit narrow containers instead of overflowing on small phones
 *  - shows a skeleton while Google's script loads and a retry button if it can't be reached
 */
export default function RecaptchaCheckbox({ onChange, error, resetKey }) {
    const { v2: siteKey, v3: v3Key } = usePage().props.recaptcha ?? {};
    const { isDark } = useTheme();
    const frame = useRef(null);
    const container = useRef(null);
    const widgetId = useRef(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const [status, setStatus] = useState('loading'); // loading | ready | failed
    const [scale, setScale] = useState(1);
    const [attempt, setAttempt] = useState(0);

    // Render (again) whenever the key, theme or retry attempt changes.
    useEffect(() => {
        if (!siteKey || !frame.current) return undefined;
        let cancelled = false;
        setStatus('loading');

        // Fresh child node per render: grecaptcha cannot render twice into the same element.
        const host = document.createElement('div');
        frame.current.replaceChildren(host);
        container.current = host;
        widgetId.current = null;
        onChangeRef.current('');

        loadRecaptcha(v3Key)
            .then((grecaptcha) => {
                if (cancelled) return;
                widgetId.current = grecaptcha.render(host, {
                    sitekey: siteKey,
                    theme: isDark ? 'dark' : 'light',
                    callback: (token) => onChangeRef.current(token),
                    'expired-callback': () => onChangeRef.current(''),
                    'error-callback': () => {
                        onChangeRef.current('');
                        setStatus('failed');
                    },
                });
                setStatus('ready');
            })
            .catch(() => !cancelled && setStatus('failed'));

        return () => {
            cancelled = true;
        };
    }, [siteKey, v3Key, isDark, attempt]);

    useEffect(() => {
        if (resetKey && widgetId.current !== null && window.grecaptcha) {
            window.grecaptcha.reset(widgetId.current);
            onChangeRef.current('');
        }
    }, [resetKey]);

    // Fit the fixed-width widget into whatever width the form gives it.
    useEffect(() => {
        const el = frame.current?.parentElement;
        if (!el) return undefined;
        const ro = new ResizeObserver(([entry]) => setScale(Math.min(1, entry.contentRect.width / WIDTH)));
        ro.observe(el);
        return () => ro.disconnect();
    }, [siteKey]);

    if (!siteKey) return null;

    return (
        <div>
            <div className="relative w-full overflow-hidden" style={{ height: HEIGHT * scale }}>
                <div ref={frame} className="origin-top-left" style={{ width: WIDTH, height: HEIGHT, transform: scale < 1 ? `scale(${scale})` : undefined }} />

                {status === 'loading' && (
                    <div className="absolute inset-y-0 left-0 flex items-center gap-3 rounded-[3px] border border-line bg-card px-3" style={{ width: WIDTH * scale }} aria-hidden="true">
                        <span className="size-7 animate-pulse rounded-sm bg-paper-deep" />
                        <span className="h-3 w-28 animate-pulse rounded bg-paper-deep" />
                    </div>
                )}

                {status === 'failed' && (
                    <div className={cn('absolute inset-0 flex items-center justify-between gap-3 rounded-2xl border border-coral/40 bg-coral/5 px-4 text-sm')}>
                        <span>The security check couldn't load.</span>
                        <button type="button" onClick={() => setAttempt((a) => a + 1)} className="rounded-full bg-ink px-3 py-1.5 text-xs text-paper">
                            Retry
                        </button>
                    </div>
                )}
            </div>
            {error && <p className="mt-2 text-sm text-coral">{error}</p>}
        </div>
    );
}

/**
 * Google allows hiding the floating v3 badge when this attribution is shown near the form.
 * The badge otherwise collides with the back-to-top orb and chat button.
 */
export function RecaptchaNotice({ className }) {
    const { v3, v2 } = usePage().props.recaptcha ?? {};
    if (!v3 && !v2) return null;
    return (
        <p className={cn('text-xs leading-relaxed text-ink-mute', className)}>
            Protected by reCAPTCHA — Google's{' '}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
                Privacy Policy
            </a>{' '}
            and{' '}
            <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
                Terms
            </a>{' '}
            apply.
        </p>
    );
}
