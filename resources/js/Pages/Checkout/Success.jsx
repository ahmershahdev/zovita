import { Head } from '@inertiajs/react';
import { useLayoutEffect, useRef } from 'react';
import OrderDetail from '@/Components/product/OrderDetail';
import Button from '@/Components/ui/Button';
import Icon from '@/Components/ui/Icon';
import { gsap, prefersReducedMotion } from '@/lib/gsap';

export default function CheckoutSuccess({ order }) {
    const mark = useRef(null);

    useLayoutEffect(() => {
        if (prefersReducedMotion()) return;
        gsap.from(mark.current, { scale: 0, rotate: -90, duration: 1.4, ease: 'elastic.out(1, 0.45)' });
    }, []);

    return (
        <section className="container-x pb-10 pt-10 md:pt-16">
            <Head title="Order confirmed" />
            <div className="flex flex-col items-start gap-8 md:flex-row md:items-end md:justify-between">
                <div>
                    <span ref={mark} className="grid size-20 place-items-center rounded-full bg-mint">
                        <Icon name="check" size={36} strokeWidth={2} />
                    </span>
                    <h1 className="mt-8 font-display text-title">
                        Thank you, <span className="italic">{order.customer_name.split(' ')[0]}.</span>
                    </h1>
                    <p className="mt-4 max-w-xl text-lg text-ink-soft">
                        Order <strong className="font-mono">{order.number}</strong> is in. A confirmation is on its way to {order.email}, and a pharmacist
                        will review it before dispatch.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button href={route('orders.track', { number: order.number, email: order.email })} variant="ghost">
                        Track order
                    </Button>
                    <Button href={route('shop.index')} icon={<Icon name="arrow" size={16} />}>
                        Keep shopping
                    </Button>
                </div>
            </div>
            <div className="mt-14">
                <OrderDetail order={order} />
            </div>
        </section>
    );
}
