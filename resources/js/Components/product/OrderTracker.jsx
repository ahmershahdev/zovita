import { lazy } from 'react';
import LazyScene from '@/Components/three/LazyScene';
import Icon from '@/Components/ui/Icon';
import useTheme from '@/hooks/useTheme';
import { cn } from '@/lib/cn';

const TrackScene = lazy(() => import('@/Components/three/TrackScene'));

const COPY = {
    pending: ['Order received', 'A pharmacist will confirm it shortly.'],
    confirmed: ['Confirmed by our pharmacist', 'We are picking your items from the shelf.'],
    packed: ['Packed & sealed', 'Batch-checked and waiting for a rider.'],
    shipped: ['Out for delivery', 'Your rider is on the way. Keep your phone nearby.'],
    delivered: ['Delivered', 'Thanks for choosing Zovita. Feel better soon.'],
    cancelled: ['Cancelled', 'This order was cancelled. Contact us if this is unexpected.'],
};

/** 3D delivery map + live status headline + progress rail for one order. */
export default function OrderTracker({ order }) {
    const { isDark } = useTheme();
    const [title, body] = COPY[order.status] ?? COPY.pending;
    const cancelled = order.status === 'cancelled';
    const reached = order.timeline.filter((s) => s.done).length;

    return (
        <div className="overflow-hidden rounded-5xl border border-line bg-card">
            <div className="relative h-[22rem] bg-[radial-gradient(ellipse_at_50%_30%,var(--color-card),var(--color-paper-deep))] md:h-[30rem]">
                <LazyScene
                    Scene={TrackScene}
                    interactive
                    status={order.status}
                    dark={isDark}
                    className="absolute inset-0"
                    fallback={
                        <div className="absolute inset-0 grid place-items-center text-ink-mute">
                            <Icon name="truck" size={56} />
                        </div>
                    }
                />
                <div className="glass absolute left-4 top-4 max-w-xs rounded-3xl border border-line p-4 md:left-6 md:top-6 md:p-5">
                    <p className={cn('eyebrow flex items-center gap-2', cancelled ? 'text-coral' : 'text-teal')}>
                        <span className="relative flex size-2">
                            {!cancelled && order.status !== 'delivered' && <span className="absolute inset-0 rounded-full bg-teal [animation:pulse-ring_1.8s_ease-out_infinite]" />}
                            <span className={cn('relative size-2 rounded-full', cancelled ? 'bg-coral' : 'bg-teal')} />
                        </span>
                        {order.number}
                    </p>
                    <p className="mt-2 font-display text-2xl leading-tight md:text-3xl">{title}</p>
                    <p className="mt-1 text-sm text-ink-mute">{body}</p>
                </div>
                <div className="pointer-events-none absolute bottom-4 left-4 flex gap-2 text-xs md:left-6">
                    <span className="flex items-center gap-1.5 rounded-full bg-paper/80 px-3 py-1.5 backdrop-blur">
                        <span className="size-2 rounded-full bg-teal" /> Zovita pharmacy
                    </span>
                    <span className="flex items-center gap-1.5 rounded-full bg-paper/80 px-3 py-1.5 backdrop-blur">
                        <span className="size-2 rounded-full bg-coral" /> {order.city}
                    </span>
                </div>
            </div>

            {!cancelled && (
                <ol className="grid grid-cols-5 border-t border-line">
                    {order.timeline.map((step, i) => (
                        <li key={step.key} className="relative px-2 py-5 text-center md:px-4">
                            <span className="absolute inset-x-0 top-0 h-0.5 bg-line">
                                <span className={cn('block h-full bg-teal transition-[width] duration-1000 ease-[var(--ease-expo)]', step.done ? 'w-full' : 'w-0')} />
                            </span>
                            <span className={cn('mx-auto grid size-8 place-items-center rounded-full font-mono text-xs', step.done ? 'bg-teal text-white' : 'border border-line-strong text-ink-mute', i === reached - 1 && 'ring-4 ring-teal/20')}>
                                {step.done ? <Icon name="check" size={14} /> : i + 1}
                            </span>
                            <span className={cn('mt-2 block text-[0.7rem] leading-tight md:text-sm', !step.done && 'text-ink-mute')}>{step.label}</span>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}
