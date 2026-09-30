import { useMemo, useState } from 'react';
import { money } from '@/lib/format';

const W = 800;
const H = 220;
const PAD = { l: 8, r: 8, t: 28, b: 34 };
const BINS = 24;

/**
 * Where this product's price sits in its category: a log-scale histogram of real catalog prices
 * (single series, so no legend), the product's bin highlighted and direct-labelled, min/median/max
 * on the axis, a per-bin hover/focus tooltip, and a table view for non-visual access.
 */
export default function PriceInsight({ stats }) {
    const [hover, setHover] = useState(null);

    const model = useMemo(() => {
        const lo = Math.log(Math.max(1, stats.min));
        const hi = Math.log(Math.max(stats.max, stats.min + 1));
        const span = hi - lo || 1;
        const bins = Array.from({ length: BINS }, (_, i) => ({
            i,
            from: Math.exp(lo + (span * i) / BINS),
            to: Math.exp(lo + (span * (i + 1)) / BINS),
            count: 0,
        }));
        const binOf = (p) => Math.min(BINS - 1, Math.max(0, Math.floor(((Math.log(Math.max(1, p)) - lo) / span) * BINS)));
        stats.prices.forEach((p) => bins[binOf(p)].count++);
        const peak = Math.max(...bins.map((b) => b.count));
        const x = (p) => PAD.l + ((Math.log(Math.max(1, p)) - lo) / span) * (W - PAD.l - PAD.r);
        const cheaper = stats.prices.filter((p) => p < stats.current).length;
        return { bins, peak, x, mine: binOf(stats.current), percentile: Math.round((cheaper / stats.prices.length) * 100) };
    }, [stats]);

    const plotH = H - PAD.t - PAD.b;
    const bw = (W - PAD.l - PAD.r) / BINS;
    const verdict =
        model.percentile <= 33 ? 'among the more affordable options' : model.percentile >= 67 ? 'at the premium end' : 'mid-range';
    const tip = hover !== null ? model.bins[hover] : null;

    return (
        <figure className="rounded-4xl border border-line bg-card p-6 md:p-8">
            <figcaption className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="eyebrow text-ink-mute">Price insight · {stats.category}</p>
                    <p className="mt-2 max-w-xl font-display text-3xl leading-tight">
                        {money(stats.current)} is <span className="italic">{verdict}</span> in this category.
                    </p>
                </div>
                <p className="text-sm text-ink-mute">
                    Cheaper than <strong className="text-ink">{100 - model.percentile}%</strong> of {stats.count} products
                </p>
            </figcaption>

            <div className="relative mt-8">
                <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full overflow-visible" role="img" aria-label={`Price distribution of ${stats.count} products in ${stats.category}`}>
                    {/* Recessive baseline */}
                    <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} stroke="var(--color-line-strong)" strokeWidth="1" />
                    {model.bins.map((b) => {
                        const h = b.count ? Math.max(4, (b.count / model.peak) * plotH) : 0;
                        const isMine = b.i === model.mine;
                        return (
                            <g key={b.i}>
                                {h > 0 && (
                                    <path
                                        // Bar with 4px rounded data-end, anchored square on the baseline; 2px gap between bars.
                                        d={roundedTop(PAD.l + b.i * bw + 1, H - PAD.b - h, bw - 2, h, 4)}
                                        fill={isMine ? 'var(--color-viz)' : 'var(--color-ink-mute)'}
                                        opacity={isMine ? 1 : hover === b.i ? 0.55 : 0.28}
                                        className="transition-opacity duration-200"
                                    />
                                )}
                                {/* Hit target larger than the mark: full column height. */}
                                <rect
                                    x={PAD.l + b.i * bw}
                                    y={PAD.t - 20}
                                    width={bw}
                                    height={plotH + 20}
                                    fill="transparent"
                                    tabIndex={b.count ? 0 : -1}
                                    onPointerEnter={() => setHover(b.i)}
                                    onPointerLeave={() => setHover(null)}
                                    onFocus={() => setHover(b.i)}
                                    onBlur={() => setHover(null)}
                                    aria-label={`${money(b.from)} to ${money(b.to)}: ${b.count} products`}
                                    className="outline-none"
                                />
                            </g>
                        );
                    })}

                    {/* This product: marker + direct label */}
                    <line x1={model.x(stats.current)} x2={model.x(stats.current)} y1={PAD.t - 6} y2={H - PAD.b} stroke="var(--color-viz)" strokeWidth="2" strokeDasharray="3 3" />
                    <text
                        x={Math.min(W - 90, Math.max(90, model.x(stats.current)))}
                        y={PAD.t - 12}
                        textAnchor="middle"
                        className="fill-ink font-mono text-[13px]"
                    >
                        This product · {money(stats.current)}
                    </text>

                    {/* Axis labels: min / median / max */}
                    {[
                        ['Lowest', stats.min, 'start'],
                        ['Median', stats.median, 'middle'],
                        ['Highest', stats.max, 'end'],
                    ].map(([label, v, anchor]) => (
                        <text key={label} x={model.x(v)} y={H - 10} textAnchor={anchor} className="fill-ink-mute font-mono text-[12px]">
                            {label} {money(v)}
                        </text>
                    ))}
                </svg>

                {tip && (
                    <div
                        className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-xl border border-line bg-paper px-3 py-2 text-xs shadow-lg"
                        style={{ left: `${((PAD.l + tip.i * bw + bw / 2) / W) * 100}%` }}
                        role="status"
                    >
                        <p className="font-mono text-sm font-medium text-ink">{tip.count} products</p>
                        <p className="text-ink-mute">
                            {money(tip.from)} – {money(tip.to)}
                        </p>
                    </div>
                )}
            </div>

            <details className="mt-6 text-sm">
                <summary className="cursor-pointer text-ink-mute underline decoration-line-strong underline-offset-4">View as table</summary>
                <table className="mt-4 w-full text-left">
                    <thead className="eyebrow text-ink-mute">
                        <tr>
                            <th className="py-2 font-normal">Price range</th>
                            <th className="py-2 text-right font-normal">Products</th>
                        </tr>
                    </thead>
                    <tbody className="font-mono">
                        {model.bins
                            .filter((b) => b.count)
                            .map((b) => (
                                <tr key={b.i} className="border-t border-line">
                                    <td className="py-1.5">
                                        {money(b.from)} – {money(b.to)} {b.i === model.mine && <span className="text-teal">← this product</span>}
                                    </td>
                                    <td className="py-1.5 text-right">{b.count}</td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </details>
        </figure>
    );
}

function roundedTop(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h);
    return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}
