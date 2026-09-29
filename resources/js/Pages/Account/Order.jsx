import { Head, Link } from '@inertiajs/react';
import OrderDetail from '@/Components/product/OrderDetail';
import Icon from '@/Components/ui/Icon';

export default function AccountOrder({ order }) {
    return (
        <section className="container-x pb-10 pt-10 md:pt-16">
            <Head title={`Order ${order.number}`}>
                <meta name="robots" content="noindex" />
            </Head>
            <Link href={route('account.dashboard')} className="eyebrow inline-flex items-center gap-2 text-ink-mute hover:text-ink">
                <Icon name="arrowLeft" size={14} /> Your account
            </Link>
            <h1 className="mt-4 font-display text-title">
                {order.status_label}<span className="italic">.</span>
            </h1>
            <div className="mt-12">
                <OrderDetail order={order} />
            </div>
        </section>
    );
}
