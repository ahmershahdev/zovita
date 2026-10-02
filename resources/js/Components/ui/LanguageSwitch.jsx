import { router } from '@inertiajs/react';
import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { useLocale } from '@/hooks/useT';
import { cn } from '@/lib/cn';
import { setTranslations } from '@/lib/domTranslate';

/**
 * EN ⇄ اردو. Switching re-renders the current page in the other language (with its scroll
 * position) and flips the document direction.
 */
export default function LanguageSwitch({ className }) {
    const { code } = useLocale();
    const next = code === 'ur' ? 'en' : 'ur';

    return (
        <button
            type="button"
            onClick={() => router.post(route('locale.update'), { locale: next }, { preserveScroll: true })}
            lang={next}
            aria-label={next === 'ur' ? 'اردو میں دیکھیں — View in Urdu' : 'View in English'}
            className={cn('grid h-10 min-w-10 place-items-center rounded-full px-2.5 text-sm transition-colors duration-300 hover:bg-ink hover:text-paper', className)}
            data-cursor-magnetic
        >
            <span className={next === 'ur' ? 'font-urdu text-base leading-none' : 'font-mono text-xs'}>{next === 'ur' ? 'اردو' : 'EN'}</span>
        </button>
    );
}

/** Keeps <html lang/dir> in sync when the language changes without a full page load. */
export function LocaleSync() {
    const { code, dir } = useLocale();
    const { messages } = usePage().props;
    useEffect(() => {
        document.documentElement.lang = code;
        document.documentElement.dir = dir;
    }, [code, dir]);
    // After React commits, translate the interface (and keep translating as it updates).
    useEffect(() => {
        setTranslations(code === 'en' ? null : messages);
    }, [code, messages]);
    return null;
}
