import { Link, router, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '@/Components/ui/Icon';
import { cn } from '@/lib/cn';
import { gsap, prefersReducedMotion } from '@/lib/gsap';

const STORE = 'zv-assistant';

/**
 * Guided assistant. There is deliberately no text box: visitors pick a question, and the server
 * answers from their own orders, bag, offers and browsing (see App\Services\Assistant). The
 * conversation survives page visits (sessionStorage) and resets when the account changes.
 */
export default function Assistant() {
    const { auth, personal } = usePage().props;
    const userKey = auth.user?.id ?? 'guest';
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [chips, setChips] = useState([]);
    const [typing, setTyping] = useState(false);
    const log = useRef(null);
    const panel = useRef(null);
    const launcher = useRef(null);

    // Restore this tab's conversation (per account).
    useEffect(() => {
        try {
            const saved = JSON.parse(sessionStorage.getItem(STORE) || 'null');
            if (saved?.user === userKey) {
                setMessages(saved.messages ?? []);
                setChips(saved.chips ?? []);
                return;
            }
        } catch {
            /* ignore */
        }
        setMessages([]);
        setChips([]);
    }, [userKey]);

    useEffect(() => {
        try {
            sessionStorage.setItem(STORE, JSON.stringify({ user: userKey, messages: messages.slice(-30), chips }));
        } catch {
            /* storage unavailable */
        }
    }, [messages, chips, userKey]);

    const ask = useCallback(async (intent, label) => {
        if (label) setMessages((m) => [...m, { from: 'me', text: label, id: Date.now() }]);
        setChips([]);
        setTyping(true);
        const started = Date.now();
        let answer;
        try {
            const res = await fetch(route('assistant', intent), { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
            answer = res.ok ? await res.json() : { text: 'Something went wrong — please try again.', followups: [{ id: 'start', label: 'Start over' }] };
        } catch {
            answer = { text: "I can't reach the store right now. Check your connection and try again.", followups: [] };
        }
        // A short "typing" beat that scales with the reply length reads as natural, not slow.
        const wait = prefersReducedMotion() ? 0 : Math.min(1100, 350 + (answer.text?.length ?? 0) * 4) - (Date.now() - started);
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        setTyping(false);
        setMessages((m) => [...m, { from: 'bot', id: Date.now() + 1, ...answer }]);
        setChips(answer.followups ?? []);
    }, []);

    // First open greets the visitor.
    useEffect(() => {
        if (open && messages.length === 0 && !typing) ask('start');
    }, [open, messages.length, typing, ask]);

    // Keep the newest message in view; animate new bubbles in.
    useEffect(() => {
        const el = log.current;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
        const last = el.querySelector('[data-msg]:last-of-type');
        if (last && !prefersReducedMotion()) gsap.fromTo(last, { y: 14, opacity: 0, scale: 0.97 }, { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'expo.out' });
    }, [messages, typing, open]);

    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => e.key === 'Escape' && setOpen(false);
        window.addEventListener('keydown', onKey);
        panel.current?.focus();
        if (!prefersReducedMotion()) gsap.fromTo(panel.current, { y: 24, opacity: 0, scale: 0.96, transformOrigin: 'bottom left' }, { y: 0, opacity: 1, scale: 1, duration: 0.55, ease: 'expo.out' });
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    // Close when navigating via a link inside the assistant.
    useEffect(() => router.on('navigate', () => setOpen(false)), []);

    const reset = () => {
        setMessages([]);
        setChips([]);
    };

    return (
        <>
            <button
                ref={launcher}
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-controls="zv-assistant"
                aria-label={open ? 'Close the assistant' : 'Open the Zovita assistant'}
                className="group fixed bottom-5 left-5 z-[90] flex h-14 items-center gap-3 rounded-full bg-night pl-2 pr-5 text-snow shadow-[0_18px_40px_-14px_rgb(0_0_0/0.55)] transition-transform duration-500 ease-[var(--ease-expo)] hover:-translate-y-0.5 md:bottom-8 md:left-8 print:hidden"
                data-cursor-magnetic
            >
                <span className="relative grid size-10 place-items-center rounded-full bg-mint text-night">
                    <Icon name={open ? 'close' : 'sparkle'} size={18} className="transition-transform duration-500 group-hover:rotate-90" />
                    {!open && personal?.count > 0 && <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full bg-coral ring-2 ring-night" />}
                </span>
                <span className="hidden text-sm sm:inline">{open ? 'Close' : 'Ask Zovita'}</span>
            </button>

            {open && (
                <section
                    id="zv-assistant"
                    ref={panel}
                    role="dialog"
                    aria-label="Zovita assistant"
                    tabIndex={-1}
                    data-lenis-prevent
                    className="fixed inset-x-3 bottom-24 z-[95] flex max-h-[min(40rem,calc(100svh-8rem))] flex-col overflow-hidden rounded-[2rem] border border-line bg-paper shadow-[0_40px_90px_-30px_rgb(0_0_0/0.55)] outline-none sm:inset-x-auto sm:left-5 sm:w-[24rem] md:bottom-28 md:left-8"
                >
                    <header className="flex items-center gap-3 bg-night px-5 py-4 text-snow">
                        <span className="relative grid size-10 place-items-center rounded-full bg-mint text-night">
                            <Icon name="sparkle" size={18} />
                            <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-teal ring-2 ring-night" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="font-display text-xl leading-none">Zovita assistant</p>
                            <p className="mt-1 truncate text-xs text-snow/60">{auth.user ? `Answers from ${auth.user.name.split(' ')[0]}'s account` : 'Answers from your bag & browsing'}</p>
                        </div>
                        <button type="button" onClick={reset} className="grid size-9 place-items-center rounded-full text-snow/70 hover:bg-snow/10 hover:text-snow" aria-label="Start over" title="Start over">
                            <Icon name="swap" size={15} />
                        </button>
                        <button type="button" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-full text-snow/70 hover:bg-snow/10 hover:text-snow" aria-label="Close">
                            <Icon name="close" size={16} />
                        </button>
                    </header>

                    <div ref={log} role="log" aria-live="polite" className="scrollbar-none flex-1 space-y-3 overflow-y-auto px-4 py-5">
                        {messages.map((m) => (m.from === 'me' ? <Mine key={m.id} text={m.text} /> : <Reply key={m.id} message={m} />))}
                        {typing && (
                            <div data-msg className="flex w-fit items-center gap-1.5 rounded-3xl rounded-bl-md bg-card px-4 py-3.5" aria-label="Assistant is typing">
                                {[0, 1, 2].map((i) => (
                                    <span key={i} className="size-1.5 animate-bounce rounded-full bg-ink-mute" style={{ animationDelay: `${i * 0.15}s` }} />
                                ))}
                            </div>
                        )}
                    </div>

                    <footer className="border-t border-line bg-card/60 px-4 pb-4 pt-3">
                        <p className="eyebrow mb-2.5 text-ink-mute">{chips.length ? 'Choose a question' : typing ? 'Thinking…' : 'Pick up where you left off'}</p>
                        <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto">
                            {chips.map((c) => (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => ask(c.id, c.label)}
                                    className="rounded-full border border-line-strong bg-paper px-3.5 py-2 text-left text-[0.82rem] leading-snug transition-colors duration-300 hover:border-ink hover:bg-ink hover:text-paper"
                                >
                                    {c.label}
                                </button>
                            ))}
                            {!chips.length && !typing && messages.length > 0 && (
                                <button type="button" onClick={() => ask('start')} className="rounded-full bg-ink px-3.5 py-2 text-[0.82rem] text-paper">
                                    Show me the questions
                                </button>
                            )}
                        </div>
                    </footer>
                </section>
            )}
        </>
    );
}

function Mine({ text }) {
    return (
        <div data-msg className="ml-auto w-fit max-w-[85%] rounded-3xl rounded-br-md bg-ink px-4 py-3 text-sm text-paper">
            {text}
        </div>
    );
}

function Reply({ message }) {
    return (
        <div data-msg className="max-w-[92%] space-y-2">
            <p className="w-fit rounded-3xl rounded-bl-md bg-card px-4 py-3 text-sm leading-relaxed">{message.text}</p>
            {message.cards?.length > 0 && (
                <ul className="space-y-1.5">
                    {message.cards.map((c) => (
                        <li key={c.href + c.title}>
                            <Link href={c.href} className="flex items-center gap-3 rounded-2xl border border-line bg-paper p-2.5 pr-3.5 transition-colors hover:border-ink">
                                {c.image ? (
                                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-plate">
                                        <img src={c.image} alt="" loading="lazy" className="size-[82%] object-contain mix-blend-multiply" />
                                    </span>
                                ) : (
                                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-mint-soft text-teal">
                                        <Icon name="package" size={17} />
                                    </span>
                                )}
                                <span className="min-w-0 flex-1">
                                    <span className="line-clamp-1 text-[0.82rem] font-medium">{c.title}</span>
                                    <span className="line-clamp-1 text-xs text-ink-mute">{c.meta}</span>
                                </span>
                                <span className="shrink-0 font-mono text-xs">{c.value}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
            {message.links?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {message.links.map((l) =>
                        l.href.startsWith('tel:') ? (
                            <a key={l.href} href={l.href} className={linkClass}>
                                {l.label} <Icon name="phone" size={12} />
                            </a>
                        ) : (
                            <Link key={l.href} href={l.href} className={linkClass}>
                                {l.label} <Icon name="arrowUpRight" size={12} />
                            </Link>
                        ),
                    )}
                </div>
            )}
        </div>
    );
}

const linkClass = cn('inline-flex items-center gap-1.5 rounded-full bg-mint px-3 py-1.5 text-xs font-medium text-night transition-transform hover:-translate-y-0.5');
