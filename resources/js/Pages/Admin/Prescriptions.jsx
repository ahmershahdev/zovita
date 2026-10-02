import { Link, router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import Icon from '@/Components/ui/Icon';
import AdminLayout, { PageGuide, Pager, Panel, StatusPill } from '@/Layouts/AdminLayout';
import { cn } from '@/lib/cn';

const TABS = [
    ['pending', 'Pending'],
    ['approved', 'Approved'],
    ['rejected', 'Rejected'],
    ['all', 'All'],
];

/** Counts down to the automatic 24-hour approval. */
function useCountdown(iso) {
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        if (!iso) return undefined;
        const t = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(t);
    }, [iso]);
    if (!iso) return null;
    const ms = new Date(iso).getTime() - now;
    if (ms <= 0) return { label: 'Auto-approving now', ratio: 1 };
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return { label: `Auto-approves in ${h}h ${m}m`, ratio: 1 - ms / (24 * 3600000), urgent: ms < 3 * 3600000 };
}

export default function Prescriptions({ prescriptions, tab, counts, autoHours }) {
    return (
        <AdminLayout title="Prescriptions">
            <p className="-mt-6 mb-8 max-w-2xl text-sm text-ink-mute">
                Accept, reject or mark a prescription as in review. Anything still undecided {autoHours} hours after it was submitted is approved automatically, so customers are never left waiting.
            </p>
            <PageGuide
                id="prescriptions"
                steps={[
                    "New prescriptions appear under “Pending”, oldest first. Click the picture to see it full size.",
                    "Press “Accept” if it is valid. The customer’s order is confirmed automatically and they get an email.",
                    "Press “Reject” if it is not valid and write a short reason — the customer sees it and their order is cancelled (stock goes back).",
                    "If nobody decides within 24 hours, the prescription is accepted automatically. The bar shows how much time is left.",
                ]}
            />
            <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Status">
                {TABS.map(([value, label]) => (
                    <Link
                        key={value}
                        href={route('admin.prescriptions.index', { status: value })}
                        role="tab"
                        aria-selected={tab === value}
                        preserveScroll
                        className={cn('flex items-center gap-2 rounded-full border px-4 py-2 text-sm', tab === value ? 'border-ink bg-ink text-paper' : 'border-line-strong hover:border-ink')}
                    >
                        {label}
                        {counts[value] !== undefined && <span className="font-mono text-xs opacity-70">{counts[value]}</span>}
                    </Link>
                ))}
            </div>

            <div className="space-y-4">
                {prescriptions.data.map((p) => (
                    <PrescriptionCard key={p.id} p={p} />
                ))}
                {!prescriptions.data.length && (
                    <Panel>
                        <p className="py-10 text-center text-sm text-ink-mute">{tab === 'pending' ? 'All caught up — nothing waiting for review.' : 'Nothing here yet.'}</p>
                    </Panel>
                )}
            </div>
            <Pager paginator={prescriptions} />
        </AdminLayout>
    );
}

Prescriptions.layout = (page) => page;

function PrescriptionCard({ p }) {
    const countdown = useCountdown(p.auto_decision_at);
    const form = useForm({ status: '', note: '' });
    const [rejecting, setRejecting] = useState(false);
    const pending = ['received', 'reviewing'].includes(p.status);

    const decide = (status) => {
        form.transform(() => ({ status, note: form.data.note || null }));
        form.patch(route('admin.prescriptions.update', p.id), { preserveScroll: true, onSuccess: () => setRejecting(false) });
    };
    const tone = p.status === 'approved' ? 'good' : p.status === 'rejected' ? 'bad' : 'warn';

    return (
        <Panel className="!p-0 overflow-hidden">
            <div className="grid md:grid-cols-[14rem_1fr]">
                <a href={p.file_url} target="_blank" rel="noopener" className="group relative grid min-h-48 place-items-center bg-paper-deep" aria-label={`Open ${p.original_name}`}>
                    {p.is_pdf ? (
                        <span className="flex flex-col items-center gap-2 text-ink-mute">
                            <Icon name="file" size={36} /> PDF
                        </span>
                    ) : (
                        <img src={p.file_url} alt={`Prescription ${p.reference}`} loading="lazy" className="absolute inset-0 size-full object-cover" />
                    )}
                    <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-night/80 px-3 py-1 text-xs text-snow opacity-0 transition-opacity group-hover:opacity-100">
                        Open full size <Icon name="arrowUpRight" size={12} />
                    </span>
                </a>
                <div className="p-5 md:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p className="font-mono text-xs text-ink-mute">{p.reference}</p>
                            <p className="mt-1 font-display text-2xl">{p.name}</p>
                            <p className="text-sm text-ink-mute">
                                {p.email} · {p.phone}
                            </p>
                        </div>
                        <div className="text-right">
                            <StatusPill tone={tone}>{p.status_label}</StatusPill>
                            <p className="mt-2 text-xs text-ink-mute">Submitted {new Date(p.submitted_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                            {p.orders > 0 && <p className="text-xs text-ink-mute">Linked to {p.orders} order(s)</p>}
                        </div>
                    </div>

                    {p.notes && <p className="mt-4 whitespace-pre-line rounded-2xl bg-paper-deep p-3 text-sm">{p.notes}</p>}

                    {countdown && (
                        <div className="mt-4">
                            <div className="flex justify-between text-xs">
                                <span className={countdown.urgent ? 'text-coral' : 'text-ink-mute'}>
                                    <Icon name="clock" size={12} className="mr-1 inline" />
                                    {countdown.label}
                                </span>
                            </div>
                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper-deep">
                                <div className={cn('h-full rounded-full', countdown.urgent ? 'bg-coral' : 'bg-teal')} style={{ width: `${Math.min(100, countdown.ratio * 100)}%` }} />
                            </div>
                        </div>
                    )}

                    {!pending && (
                        <p className="mt-4 text-sm text-ink-mute">
                            {p.auto_approved ? 'Approved automatically after 24 hours.' : `Decided by ${p.reviewer ?? 'a pharmacist'}`}
                            {p.reviewed_at && ` · ${new Date(p.reviewed_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`}
                            {p.review_note && !p.auto_approved && <span className="mt-1 block text-ink">“{p.review_note}”</span>}
                        </p>
                    )}

                    {rejecting && (
                        <div className="mt-4">
                            <label htmlFor={`note-${p.id}`} className="text-sm font-medium">
                                Reason for the customer
                            </label>
                            <textarea
                                id={`note-${p.id}`}
                                autoFocus
                                value={form.data.note}
                                onChange={(e) => form.setData('note', e.target.value)}
                                maxLength={500}
                                className="mt-2 min-h-20 w-full rounded-2xl border border-line-strong bg-paper p-3 text-sm focus:border-ink focus:outline-none"
                                placeholder="e.g. The prescription is older than 6 months — please upload a current one."
                            />
                            {form.errors.note && <p className="text-sm text-coral">{form.errors.note}</p>}
                        </div>
                    )}

                    <div className="mt-5 flex flex-wrap gap-2">
                        {pending && !rejecting && (
                            <>
                                <button type="button" disabled={form.processing} onClick={() => decide('approved')} className="inline-flex items-center gap-2 rounded-full bg-teal px-4 py-2 text-sm text-white disabled:opacity-60">
                                    <Icon name="check" size={14} /> Accept
                                </button>
                                <button type="button" onClick={() => setRejecting(true)} className="inline-flex items-center gap-2 rounded-full border border-coral/40 px-4 py-2 text-sm text-coral hover:bg-coral hover:text-white">
                                    <Icon name="close" size={14} /> Reject
                                </button>
                                {p.status !== 'reviewing' && (
                                    <button type="button" disabled={form.processing} onClick={() => decide('reviewing')} className="rounded-full border border-line-strong px-4 py-2 text-sm hover:border-ink">
                                        Mark in review
                                    </button>
                                )}
                            </>
                        )}
                        {rejecting && (
                            <>
                                <button type="button" disabled={form.processing} onClick={() => decide('rejected')} className="rounded-full bg-coral px-4 py-2 text-sm text-white disabled:opacity-60">
                                    Reject & notify customer
                                </button>
                                <button type="button" onClick={() => setRejecting(false)} className="rounded-full border border-line-strong px-4 py-2 text-sm">
                                    Cancel
                                </button>
                            </>
                        )}
                        {!pending && (
                            <button type="button" disabled={form.processing} onClick={() => decide('received')} className="rounded-full border border-line-strong px-4 py-2 text-sm hover:border-ink">
                                Move back to pending
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </Panel>
    );
}
