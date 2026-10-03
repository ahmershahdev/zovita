import { usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import Icon from '@/Components/ui/Icon';
import { cn } from '@/lib/cn';
import useT from '@/hooks/useT';

/**
 * Pharmacy location on an OpenStreetMap embed: no API key, no ad tracking, and allowed by the CSP
 * (frame-src www.openstreetmap.org). The iframe loads only when the section scrolls near, the tiles
 * are re-tinted to match the site in dark mode, and a floating card carries the address, hours and
 * one-tap directions.
 */
export default function StoreMap({ className }) {
    const t = useT();
    const { app } = usePage().props;
    const store = app.store;
    const box = useRef(null);
    const [near, setNear] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (!box.current) return undefined;
        const io = new IntersectionObserver(([e]) => e.isIntersecting && (setNear(true), io.disconnect()), { rootMargin: '400px' });
        io.observe(box.current);
        return () => io.disconnect();
    }, []);

    if (!store) return null;
    const d = 0.012;
    const bbox = [store.lng - d * 1.6, store.lat - d, store.lng + d * 1.6, store.lat + d].map((n) => n.toFixed(5)).join(',');
    const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${store.lat},${store.lng}`;
    const directions = `https://www.openstreetmap.org/directions?to=${store.lat},${store.lng}#map=16/${store.lat}/${store.lng}`;
    const address = `${store.street}, ${store.city} ${store.postal_code}`;

    return (
        <section ref={box} className={cn('relative overflow-hidden rounded-5xl border border-line bg-paper-deep', className)} aria-labelledby="visit-title">
            <div className="relative h-[26rem] md:h-[32rem]">
                {near && (
                    <iframe
                        title={t('Map showing Zovita at :address', { address })}
                        src={src}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onLoad={() => setLoaded(true)}
                        className={cn('map-tiles absolute inset-0 size-full border-0 transition-opacity duration-700', loaded ? 'opacity-100' : 'opacity-0')}
                    />
                )}
                {!loaded && (
                    <div className="absolute inset-0 grid place-items-center">
                        <span className="flex items-center gap-2 text-sm text-ink-mute">
                            <span className="size-2 animate-ping rounded-full bg-teal" /> Loading map…
                        </span>
                    </div>
                )}
                {/* Soft vignette so the card reads on any tile */}
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,var(--color-paper)_0%,transparent_45%)] opacity-70 max-md:hidden" />
            </div>

            <div className="relative -mt-24 p-3 md:absolute md:left-6 md:top-6 md:mt-0 md:w-[23rem] md:p-0">
                <div className="glass rounded-4xl border border-line p-6 shadow-[0_30px_70px_-30px_rgb(0_0_0/0.45)]">
                    <p className="eyebrow flex items-center gap-2 text-teal">
                        <span className="relative flex size-2">
                            <span className="absolute inline-flex size-full animate-ping rounded-full bg-teal opacity-60" />
                            <span className="relative inline-flex size-2 rounded-full bg-teal" />
                        </span>
                        Dispatch pharmacy
                    </p>
                    <h2 id="visit-title" className="mt-3 font-display text-3xl leading-tight">
                        Where your order <span className="italic">is packed.</span>
                    </h2>
                    <address className="mt-4 not-italic text-ink-soft">{address}</address>
                    <p className="mt-2 flex items-center gap-2 text-sm text-ink-mute">
                        <Icon name="clock" size={14} /> {app.support.hours}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                        <a href={directions} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm text-paper transition-transform hover:-translate-y-0.5">
                            <Icon name="arrowUpRight" size={14} /> Get directions
                        </a>
                        <a href={`tel:${app.support.phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-2 rounded-full border border-line-strong px-4 py-2.5 text-sm hover:border-ink">
                            <Icon name="phone" size={14} /> Call ahead
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}
