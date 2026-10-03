import { usePage } from '@inertiajs/react';
import { useCallback } from 'react';

/**
 * Interface translations. Keys are the English strings themselves (so untranslated text simply
 * stays English); the dictionary is lang/{locale}.json, shared once per language by the server.
 * Placeholders use Laravel's syntax: t('Add :count more', { count: 3 }).
 */
let current = {};
let currentLocale = 'en';

/** The interface language of the page being rendered (dates and other Intl formatting follow it). */
export const activeLocale = () => currentLocale;
export const setActiveLocale = (code) => {
    currentLocale = code || 'en';
};

export function translate(messages, key, replace) {
    let text = (messages && messages[key]) || key;
    if (replace) {
        for (const [k, v] of Object.entries(replace)) text = text.replaceAll(`:${k}`, String(v));
    }
    return text;
}

export default function useT() {
    const { messages, locale } = usePage().props;
    current = messages || {};
    currentLocale = locale?.code ?? 'en';
    return useCallback((key, replace) => translate(messages, key, replace), [messages]);
}

/** For code outside components (e.g. toasts built in event handlers). */
export const t = (key, replace) => translate(current, key, replace);

export function useLocale() {
    return usePage().props.locale ?? { code: 'en', dir: 'ltr', available: { en: 'English' } };
}
