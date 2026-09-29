import { Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import Icon from '@/Components/ui/Icon';
import { cn } from '@/lib/cn';

/** Shows session flash messages (success / error) as a toast. */
export default function Toasts() {
    const { flash } = usePage().props;
    const [toast, setToast] = useState(null);

    useEffect(() => {
        // Flash props are fresh on every response; show whichever is present.
        return router.on('success', (event) => {
            const f = event.detail.page.props.flash ?? {};
            if (f.success || f.error) {
                setToast({ id: Date.now(), type: f.success ? 'success' : 'error', message: f.success || f.error });
            }
        });
    }, []);

    useEffect(() => {
        if (flash.success || flash.error) {
            setToast({ id: Date.now(), type: flash.success ? 'success' : 'error', message: flash.success || flash.error });
        }
        // Only on first mount; later flashes arrive via the router listener.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!toast) return undefined;
        const t = setTimeout(() => setToast(null), 4200);
        return () => clearTimeout(t);
    }, [toast]);

    const isCart = toast?.message?.startsWith('Added to your bag');

    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[80] flex justify-center px-4" role="status" aria-live="polite">
            {toast && (
                <div
                    key={toast.id}
                    className={cn(
                        'pointer-events-auto flex max-w-lg items-center gap-3 rounded-full py-2 pl-2 pr-5 text-sm shadow-2xl',
                        'animate-[toast-in_.6s_var(--ease-expo)]',
                        toast.type === 'success' ? 'bg-ink text-paper' : 'bg-coral text-white',
                    )}
                >
                    <span className={cn('grid size-8 shrink-0 place-items-center rounded-full', toast.type === 'success' ? 'bg-mint text-ink' : 'bg-white/20')}>
                        <Icon name={toast.type === 'success' ? 'check' : 'close'} size={16} strokeWidth={2.2} />
                    </span>
                    <span className="line-clamp-2">{toast.message}</span>
                    {isCart && (
                        <Link href={route('cart.index')} className="ml-2 shrink-0 underline underline-offset-4">
                            View bag
                        </Link>
                    )}
                    <button type="button" onClick={() => setToast(null)} className="ml-1 shrink-0 opacity-60 hover:opacity-100" aria-label="Dismiss">
                        <Icon name="close" size={16} />
                    </button>
                </div>
            )}
            <style>{`@keyframes toast-in { from { opacity: 0; transform: translateY(24px) scale(.96) } to { opacity: 1; transform: none } }`}</style>
        </div>
    );
}
