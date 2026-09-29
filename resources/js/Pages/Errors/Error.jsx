import { Head } from '@inertiajs/react';
import Button from '@/Components/ui/Button';
import Icon from '@/Components/ui/Icon';

const copy = {
    403: ['Not allowed.', "You don't have access to this page."],
    404: ['Lost the prescription?', "We couldn't find that page. It may have moved, or the link might be mistyped."],
    429: ['Easy there.', 'Too many requests in a short time. Please wait a minute and try again.'],
    500: ['Something went wrong.', 'Our team has been notified. Please try again in a moment.'],
    503: ['Back shortly.', "We're doing a little maintenance. Please check back soon."],
};

export default function ErrorPage({ status }) {
    const [title, body] = copy[status] ?? copy[500];

    return (
        <section className="container-x flex min-h-[70vh] flex-col justify-center py-20">
            <Head title={title} />
            <p className="font-mono text-sm text-ink-mute">Error {status}</p>
            <h1 className="mt-4 font-display text-display">{title}</h1>
            <p className="mt-6 max-w-lg text-lg text-ink-soft">{body}</p>
            <div className="mt-10 flex flex-wrap gap-3">
                <Button href={route('home')} icon={<Icon name="arrow" size={16} />}>
                    Back home
                </Button>
                <Button href={route('shop.index')} variant="ghost">
                    Browse the pharmacy
                </Button>
            </div>
        </section>
    );
}
