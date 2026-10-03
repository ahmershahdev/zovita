import Icon from '@/Components/ui/Icon';
import useT from '@/hooks/useT';
import { cn } from '@/lib/cn';

/**
 * Medicines in the bag (or on an order) that shouldn't normally be taken together. Shown to the
 * shopper in the bag and at checkout, and to the pharmacist on the order. Never colour alone:
 * every warning carries its level in words.
 */
export default function InteractionWarnings({ warnings, className, compact = false, children }) {
    const t = useT();
    if (!warnings?.length) return null;
    const major = warnings.some((w) => w.severity === 'major');

    return (
        <section
            aria-label={t('Medicine interaction check')}
            data-testid="interaction-warnings"
            className={cn('rounded-3xl border p-5', major ? 'border-coral/40 bg-coral/5' : 'border-[#e8c66d]/60 bg-[#fdf6e4] dark:bg-[#2c2410]', className)}
        >
            <p className="flex items-center gap-2 font-medium">
                <Icon name="alert" size={18} className={major ? 'text-coral' : 'text-[#8a5a00] dark:text-[#f2c66d]'} />
                {major ? t('Check with a pharmacist before taking these together') : t('Worth knowing about these medicines')}
            </p>
            <ul className="mt-4 space-y-4">
                {warnings.map((w) => (
                    <li key={w.title + w.products.join()} className="text-sm leading-relaxed">
                        <p className="flex flex-wrap items-center gap-2">
                            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', w.severity === 'major' ? 'bg-coral text-white' : 'bg-[#8a5a00] text-white')}>
                                {w.severity === 'major' ? t('Serious') : t('Caution')}
                            </span>
                            <span className="font-medium">{t(w.title)}</span>
                        </p>
                        <p className="mt-1 text-ink-soft">{w.products.join(' + ')}</p>
                        {!compact && (
                            <>
                                <p className="mt-1 text-ink-mute">{t(w.detail)}</p>
                                <p className="mt-1">
                                    <span className="font-medium">{t('What to do:')}</span> {t(w.advice)}
                                </p>
                            </>
                        )}
                    </li>
                ))}
            </ul>
            <p className="mt-4 text-xs text-ink-mute">{t('This is an automatic check, not medical advice. Our pharmacist reviews every order before it ships.')}</p>
            {children}
        </section>
    );
}
