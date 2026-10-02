/**
 * DOM translation layer for the interface. Components keep their English JSX; when the locale isn't
 * English, every text node and accessible attribute (placeholder, aria-label, title) whose exact
 * text is in the dictionary is swapped in place — including text React renders later (a
 * MutationObserver follows every update). Originals are remembered, so switching back to English
 * restores them without a reload.
 *
 * Opt out with translate="no" (or data-no-translate) on any element: product names, prices,
 * order numbers and codes stay exactly as they are. Sentences with live values use useT() instead.
 */
const ATTRS = ['placeholder', 'aria-label', 'title'];
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE', 'svg', 'NOSCRIPT']);

let dict = null;
let observer = null;
const textOriginals = new WeakMap();
const attrOriginals = new WeakMap();
const touched = new Set(); // weak refs aren't iterable; keep strong refs only to translated nodes

function skipped(el) {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
        if (SKIP_TAGS.has(n.nodeName) || n.getAttribute?.('translate') === 'no' || n.hasAttribute?.('data-no-translate')) return true;
    }
    return false;
}

function translateText(node) {
    const raw = node.nodeValue;
    if (!raw || !dict) return;
    const key = raw.trim();
    if (!key || !/[A-Za-z]/.test(key)) return;
    const value = dict[key];
    if (!value || value === key || !node.parentElement || skipped(node.parentElement)) return;
    const lead = raw.slice(0, raw.length - raw.trimStart().length);
    const trail = raw.slice(raw.trimEnd().length);
    textOriginals.set(node, raw);
    touched.add(node);
    node.nodeValue = lead + value + trail;
}

function translateAttrs(el) {
    if (!dict || skipped(el)) return;
    for (const attr of ATTRS) {
        const raw = el.getAttribute(attr);
        if (!raw) continue;
        const value = dict[raw.trim()];
        if (!value || value === raw) continue;
        const saved = attrOriginals.get(el) ?? {};
        saved[attr] = raw;
        attrOriginals.set(el, saved);
        touched.add(el);
        el.setAttribute(attr, value);
    }
}

function walk(root) {
    if (root.nodeType === Node.TEXT_NODE) return translateText(root);
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    translateAttrs(root);
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
        n.nodeType === Node.TEXT_NODE ? translateText(n) : translateAttrs(n);
    }
}

function restore() {
    for (const node of touched) {
        if (node.nodeType === Node.TEXT_NODE) {
            const raw = textOriginals.get(node);
            if (raw !== undefined) node.nodeValue = raw;
        } else {
            const saved = attrOriginals.get(node);
            if (saved) for (const [attr, raw] of Object.entries(saved)) node.setAttribute(attr, raw);
        }
    }
    touched.clear();
}

/** Apply a dictionary (or null for English). Safe to call on every page visit. */
export function setTranslations(messages) {
    const next = messages && Object.keys(messages).length ? messages : null;
    if (next === dict) return;
    observer?.disconnect();
    restore();
    dict = next;
    if (!dict) return;

    walk(document.body);
    observer = new MutationObserver((mutations) => {
        // Drop references to nodes React has since removed (long sessions must not leak).
        if (touched.size > 4000) for (const n of touched) if (!n.isConnected) touched.delete(n);
        for (const m of mutations) {
            if (m.type === 'characterData') translateText(m.target);
            else if (m.type === 'attributes') translateAttrs(m.target);
            else m.addedNodes.forEach(walk);
        }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
