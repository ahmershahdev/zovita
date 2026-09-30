import { Head, Link } from '@inertiajs/react';
import OrderDetail from '@/Components/product/OrderDetail';
import OrderTracker from '@/Components/product/OrderTracker';
import Icon from '@/Components/ui/Icon';
import Breadcrumbs from '@/Components/ui/Breadcrumbs';

export default function AccountOrder({ order }) {
    return (
        <section className="container-x pb-10 pt-10 md:pt-16">
            <Head title={`Order ${order.number}`}>
                <meta head-key="robots" name="robots" content="noindex" />
            </Head>
            <Breadcrumbs items={[{ label: 'Account', href: route('account.dashboard') }, { label: order.number }]} className="mb-6" />
            <Link href={route('account.dashboard')} className="eyebrow inline-flex items-center gap-2 text-ink-mute hover:text-ink">
                <Icon name="arrowLeft" size={14} /> Your account
            </Link>
            <h1 className="mt-4 font-display text-title">
                {order.status_label}<span className="italic">.</span>
            </h1>
            <div className="mt-12">
                <OrderTracker order={order} />
                <div className="mt-10">
                    <OrderDetail order={order} hideTimeline />
                </div>
            </div>
        </section>
    );
}
