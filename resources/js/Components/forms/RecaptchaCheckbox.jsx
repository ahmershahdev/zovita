import { usePage } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import { loadRecaptcha } from '@/lib/recaptcha';

/**
 * reCAPTCHA v2 "I'm not a robot" checkbox. Calls onChange(token) on success and onChange('') on expiry.
 * Change `resetKey` after a failed submit to get a fresh challenge (tokens are single-use).
 */
export default function RecaptchaCheckbox({ onChange, error, resetKey }) {
    const { v2: siteKey, v3: v3Key } = usePage().props.recaptcha ?? {};
    const container = useRef(null);
    const widgetId = useRef(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    useEffect(() => {
        if (!siteKey || !container.current) return undefined;
        let cancelled = false;

        loadRecaptcha(v3Key)
            .then((grecaptcha) => {
                if (cancelled || widgetId.current !== null || !container.current) return;
                widgetId.current = grecaptcha.render(container.current, {
                    sitekey: siteKey,
                    theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
                    callback: (token) => onChangeRef.current(token),
                    'expired-callback': () => onChangeRef.current(''),
                });
            })
            .catch(() => {});

        return () => {
            cancelled = true;
        };
    }, [siteKey, v3Key]);

    useEffect(() => {
        if (resetKey && widgetId.current !== null && window.grecaptcha) {
            window.grecaptcha.reset(widgetId.current);
            onChangeRef.current('');
        }
    }, [resetKey]);

    if (!siteKey) return null;

    return (
        <div>
            <div ref={container} className="min-h-[78px]" />
            {error && <p className="mt-2 text-sm text-coral">{error}</p>}
        </div>
    );
}
