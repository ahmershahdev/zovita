import { usePage } from '@inertiajs/react';
import { useCallback, useEffect } from 'react';
import { loadRecaptcha } from '@/lib/recaptcha';

/**
 * v3 (invisible): `const getToken = useRecaptchaV3('checkout')` then `await getToken()` right before submit.
 * Resolves to null when reCAPTCHA is disabled server-side, which the backend then accepts.
 * `preload: false` defers loading Google's script until the first submit (used by the footer form).
 */
export function useRecaptchaV3(action, { preload = true } = {}) {
    const siteKey = usePage().props.recaptcha?.v3;

    useEffect(() => {
        if (siteKey && preload) loadRecaptcha(siteKey).catch(() => {});
    }, [siteKey, preload]);

    return useCallback(async () => {
        if (!siteKey) return null;
        try {
            const grecaptcha = await loadRecaptcha(siteKey);
            return await grecaptcha.execute(siteKey, { action });
        } catch {
            return null;
        }
    }, [siteKey, action]);
}
