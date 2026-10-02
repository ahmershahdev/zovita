import { Head, Link, usePage } from '@inertiajs/react';
import Icon from '@/Components/ui/Icon';

/** Shown to banned accounts (after they are signed out) and to devices/networks under a deep ban. */
export default function Suspended({ ban = {} }) {
    const { app } = usePage().props;

    return (
        <section className="container-x flex min-h-[70vh] flex-col justify-center py-20">
            <Head title="Access suspended">
                <meta head-key="robots" name="robots" content="noindex,nofollow" />
            </Head>
            <span className="grid size-14 place-items-center rounded-full bg-coral/10 text-coral">
                <Icon name="lock" size={24} />
            </span>
            <h1 className="mt-6 max-w-3xl font-display text-title">{ban.deep ? 'Access from this connection is suspended.' : 'This account is suspended.'}</h1>
            <p className="mt-6 max-w-xl text-lg text-ink-soft">
                {ban.until
                    ? `The suspension ends on ${new Date(ban.until).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })}. You can sign in again after that.`
                    : 'Our team suspended access after reviewing this account’s activity.'}
            </p>
            <p className="mt-4 max-w-xl text-ink-mute">
                If you believe this is a mistake, email{' '}
                <a href={`mailto:${app.support.email}`} className="underline underline-offset-4">
                    {app.support.email}
                </a>{' '}
                with your name and the email on your account.
            </p>
            <div className="mt-10 flex flex-wrap gap-3 text-sm">
                <Link href={route('legal', 'terms')} className="rounded-full border border-line-strong px-4 py-2 hover:border-ink">
                    Terms of service
                </Link>
                <Link href={route('legal', 'privacy')} className="rounded-full border border-line-strong px-4 py-2 hover:border-ink">
                    Privacy policy
                </Link>
            </div>
        </section>
    );
}
