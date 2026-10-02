import { useId, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { money } from '@/lib/format';

/**
 * Admin charts — plain SVG, no chart library. Rules (see the dataviz method):
 *  - magnitude is one hue (--color-viz); two-series comparisons use --color-viz and --color-viz-2
 *  - one y-axis only, recessive grid, 2px lines, 4px rounded bar ends on the baseline
 *  - every chart has a hover layer (crosshair + tooltip, or per-bar tooltip)
 *  - text is always ink tokens, never the series colour; a table view backs each chart
 */

export const fmt = (value, format) => (format === 'money' ? money(value) : new Intl.NumberFormat().format(Math.round(value)));

function niceMax(max) {
    if (max <= 0) return 1;
    const pow = 10 ** Math.floor(Math.log10(max));
    const n = max / pow;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

/** Single-series area/line over time with a crosshair tooltip. */
export function AreaChart({ data, valueKey, format = 'number', label, height = 260 }) {
    const id = useId();
    const box = useRef(null);
    const [hover, setHover] = useState(null);
    const W = 800;
    const H = height;
    const pad = { l: 56, r: 12, t: 12, b: 28 };
    const values = data.map((d) => d[valueKey]);
    const max = niceMax(Math.max(...values, 0));
    const x = (i) => pad.l + (i / Math.max(1, data.length - 1)) * (W - pad.l - pad.r);
    const y = (v) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
    const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d[valueKey]).toFixed(1)}`).join(' ');
    const area = `${line} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
    const every = Math.ceil(data.length / 7);

    const onMove = (e) => {
        const r = box.current.getBoundingClientRect();
        const px = ((e.clientX - r.left) / r.width) * W;
        const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (data.length - 1));
        setHover(Math.max(0, Math.min(data.length - 1, i)));
    };

    const h = hover !== null ? data[hover] : null;
    return (
        <figure className="relative" aria-label={label}>
            <svg ref={box} viewBox={`0 0 ${W} ${H}`} className="w-full touch-none" role="img" aria-label={`${label}: line chart`} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
                <defs>
                    <linearGradient id={`g${id}`} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-viz)" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="var(--color-viz)" stopOpacity="0" />
                    </linearGradient>
                </defs>
                {ticks.map((t) => (
                    <g key={t}>
                        <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeDasharray={t ? '3 4' : undefined} />
                        <text x={pad.l - 10} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink-mute font-mono text-[11px]">
                            {format === 'money' ? `${t >= 1000 ? `${Math.round(t / 1000)}k` : Math.round(t)}` : Math.round(t)}
                        </text>
                    </g>
                ))}
                {data.map((d, i) =>
                    i % every === 0 ? (
                        <text key={d.date} x={x(i)} y={H - 6} textAnchor="middle" className="fill-ink-mute font-mono text-[11px]">
                            {new Date(d.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                        </text>
                    ) : null,
                )}
                <path d={area} fill={`url(#g${id})`} />
                <path d={line} fill="none" stroke="var(--color-viz)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                {h && (
                    <g>
                        <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={y(0)} stroke="var(--color-ink-mute)" strokeWidth="1" />
                        <circle cx={x(hover)} cy={y(h[valueKey])} r="5" fill="var(--color-viz)" stroke="var(--color-card)" strokeWidth="2" />
                    </g>
                )}
            </svg>
            {h && (
                <div
                    className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-xl border border-line bg-paper px-3 py-2 text-xs shadow-lg"
                    style={{ left: `${(x(hover) / W) * 100}%` }}
                >
                    <p className="text-ink-mute">{new Date(h.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                    <p className="mt-0.5 font-mono text-sm text-ink">{fmt(h[valueKey], format)}</p>
                </div>
            )}
        </figure>
    );
}

/** Horizontal bars, one hue, value labels in ink. `ordinal` adds % of the first bar (funnels). */
export function BarList({ items, format = 'number', ordinal = false, empty = 'No data yet' }) {
    const [hover, setHover] = useState(null);
    const max = Math.max(...items.map((i) => i.value), 0) || 1;
    if (!items.length || items.every((i) => !i.value)) return <p className="py-8 text-center text-sm text-ink-mute">{empty}</p>;

    return (
        <ul className="space-y-3">
            {items.map((item, i) => (
                <li key={item.label} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} className="relative">
                    <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                        <span className="truncate">{item.label}</span>
                        <span className="shrink-0 font-mono text-xs text-ink-soft">
                            {fmt(item.value, format)}
                            {ordinal && i > 0 && items[0].value > 0 && <span className="ml-2 text-ink-mute">{Math.round((item.value / items[0].value) * 100)}%</span>}
                        </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-paper-deep">
                        <div
                            className="h-full rounded-r-[4px] rounded-l-full transition-[width,opacity] duration-700 ease-[var(--ease-expo)]"
                            style={{ width: `${Math.max(1.5, (item.value / max) * 100)}%`, background: 'var(--color-viz)', opacity: hover === null || hover === i ? 1 : 0.45 }}
                        />
                    </div>
                    {hover === i && item.hint && (
                        <span className="absolute right-0 -top-7 z-10 rounded-lg border border-line bg-paper px-2 py-1 text-xs shadow">{item.hint}</span>
                    )}
                </li>
            ))}
        </ul>
    );
}

/** Two-variant comparison (A/B): paired bars per metric, legend + direct labels. */
export function PairedBars({ metrics, variants }) {
    const colors = ['var(--color-viz)', 'var(--color-viz-2)'];
    return (
        <div>
            <ul className="mb-4 flex flex-wrap gap-4 text-xs text-ink-soft" aria-label="Legend">
                {variants.map((v, i) => (
                    <li key={v} className="flex items-center gap-2">
                        <span className="size-2.5 rounded-sm" style={{ background: colors[i] }} /> Variant “{v}”
                    </li>
                ))}
            </ul>
            <div className="space-y-4">
                {metrics.map((m) => {
                    const max = Math.max(...m.values, 0) || 1;
                    return (
                        <div key={m.label}>
                            <p className="mb-1.5 text-xs text-ink-mute">{m.label}</p>
                            <div className="space-y-1">
                                {m.values.map((v, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div className="h-2 flex-1 rounded-full bg-paper-deep">
                                            <div className="h-full rounded-r-[4px] rounded-l-full" style={{ width: `${Math.max(1.5, (v / max) * 100)}%`, background: colors[i] }} />
                                        </div>
                                        <span className="w-14 text-right font-mono text-xs text-ink-soft">{m.suffix ? `${v}${m.suffix}` : v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/** Tiny trend line for KPI tiles. */
export function Sparkline({ values, className }) {
    const d = useMemo(() => {
        const max = Math.max(...values, 1);
        return values.map((v, i) => `${i ? 'L' : 'M'}${(i / Math.max(1, values.length - 1)) * 100},${30 - (v / max) * 28}`).join(' ');
    }, [values]);
    return (
        <svg viewBox="0 0 100 32" preserveAspectRatio="none" className={cn('h-8 w-full', className)} aria-hidden="true">
            <path d={d} fill="none" stroke="var(--color-viz)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </svg>
    );
}

/** Accessible table view behind a chart (toggled by the card). */
export function DataTable({ columns, rows }) {
    return (
        <div className="max-h-72 overflow-auto rounded-2xl border border-line" data-lenis-prevent>
            <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-paper-deep">
                    <tr>
                        {columns.map((c) => (
                            <th key={c.key} scope="col" className="px-3 py-2 font-mono text-[0.65rem] font-normal uppercase tracking-wider text-ink-mute">
                                {c.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-line">
                    {rows.map((r, i) => (
                        <tr key={i}>
                            {columns.map((c) => (
                                <td key={c.key} className="px-3 py-2 font-mono text-xs">
                                    {c.format ? fmt(r[c.key], c.format) : r[c.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
