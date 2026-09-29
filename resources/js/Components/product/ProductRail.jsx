import { useEffect, useRef, useState } from 'react';
import Icon from '@/Components/ui/Icon';
import { cn } from '@/lib/cn';
import ProductCard from './ProductCard';

/** Horizontally scrolling, snap-aligned product row with prev/next controls and drag-to-scroll. */
export default function ProductRail({ products, className }) {
    const track = useRef(null);
    const [edges, setEdges] = useState({ start: true, end: false });

    const update = () => {
        const el = track.current;
        if (!el) return;
        setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
    };

    useEffect(() => {
        update();
        const el = track.current;
        if (!el || !window.matchMedia('(pointer: fine)').matches) return undefined;

        // Mouse drag scrolling (touch devices already scroll natively).
        let down = false;
        let startX = 0;
        let startScroll = 0;
        let moved = false;
        const onDown = (e) => {
            down = true;
            moved = false;
            startX = e.clientX;
            startScroll = el.scrollLeft;
        };
        const onMove = (e) => {
            if (!down) return;
            const dx = e.clientX - startX;
            if (Math.abs(dx) > 5) {
                moved = true;
                el.style.scrollSnapType = 'none';
                el.scrollLeft = startScroll - dx;
            }
        };
        const onUp = () => {
            down = false;
            el.style.scrollSnapType = '';
        };
        const onClick = (e) => {
            if (moved) {
                e.preventDefault();
                e.stopPropagation();
            }
        };
        el.addEventListener('pointerdown', onDown);
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        el.addEventListener('click', onClick, true);
        return () => {
            el.removeEventListener('pointerdown', onDown);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            el.removeEventListener('click', onClick, true);
        };
    }, []);

    const scroll = (dir) => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.8, behavior: 'smooth' });

    return (
        <div className={cn('relative', className)}>
            <div
                ref={track}
                onScroll={update}
                className="scrollbar-none -mx-[clamp(1rem,3.2vw,3rem)] flex snap-x snap-mandatory scroll-px-[clamp(1rem,3.2vw,3rem)] gap-5 overflow-x-auto px-[clamp(1rem,3.2vw,3rem)] pb-4 select-none"
            >
                {products.map((product) => (
                    <ProductCard key={product.id} product={product} className="w-[70vw] shrink-0 snap-start sm:w-[42vw] md:w-[30vw] lg:w-[22vw] xl:w-[18.5vw]" />
                ))}
            </div>
            <div className="mt-6 flex justify-end gap-2">
                {[-1, 1].map((dir) => (
                    <button
                        key={dir}
                        type="button"
                        onClick={() => scroll(dir)}
                        disabled={dir < 0 ? edges.start : edges.end}
                        aria-label={dir < 0 ? 'Scroll left' : 'Scroll right'}
                        className="grid size-12 place-items-center rounded-full border border-line-strong transition hover:bg-ink hover:text-paper disabled:pointer-events-none disabled:opacity-30"
                    >
                        <Icon name={dir < 0 ? 'arrowLeft' : 'arrow'} size={18} />
                    </button>
                ))}
            </div>
        </div>
    );
}
