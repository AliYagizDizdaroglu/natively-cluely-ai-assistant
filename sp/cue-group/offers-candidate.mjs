// The spike's THROWAWAY candidate for the offers-before-answer fix, as a module, so that old-vs-new-replay.mjs can
// calibrate itself on a known answer (the spike counted 9 changed replies). It is the same rule as in
// offers-first-spike.mjs. It is not the code to ship and no implementer sees it.
const SENTINEL = '__MORE__';
const OFFER_LINE = /^(\d+)\s*\|\s*(.+)$/;
const OFFER_PREFIX = /^\d+\s*(\|\s*.*)?$/;
const offerOf = (m) => { const label = m[2].trim().replace(/^["'`]|["'`]$/g, ''); return label ? { n: Number(m[1]), label } : null; };
const prefixSuffix = (s) => { for (let n = Math.min(SENTINEL.length - 1, s.length); n > 0; n--) if (s.endsWith(SENTINEL.slice(0, n))) return n; return 0; };

/** Returns a drop-in for F.stripSuggestionBlock (an async generator over an async source) that uses F.extractSuggestions for a trailing block. */
export const stripCandidate = (F) => async function* (source, onSuggestions) {
    let pending = '', tail = '', mode = 'answer', spoke = false, warned = false;
    const leading = [];
    const out = (s) => { if (s.trim()) spoke = true; return s; };
    for await (const chunk of source) {
        if (mode === 'tail') { tail += chunk; continue; }
        pending += chunk;
        for (;;) {
            if (mode === 'answer') {
                const at = pending.indexOf(SENTINEL);
                if (at !== -1) {
                    const before = pending.slice(0, at);
                    if (before) yield out(before);
                    pending = pending.slice(at + SENTINEL.length);
                    if (spoke) { mode = 'tail'; tail = pending; pending = ''; break; }
                    mode = 'lead';
                    if (!warned) { warned = true; console.warn('[verbalStreamFilter] stripSuggestionBlock: offers block before the spoken answer (shown after it)'); }   // the spec's line, once per stream
                    continue;
                }
                const keep = prefixSuffix(pending);
                const emit = pending.slice(0, pending.length - keep);
                if (emit) yield out(emit);
                pending = pending.slice(pending.length - keep);
                break;
            }
            let nl, closed = false;
            while ((nl = pending.indexOf('\n')) !== -1) {
                const t = pending.slice(0, nl).trim();
                if (t === '') { pending = pending.slice(nl + 1); continue; }
                const m = t.match(OFFER_LINE);
                if (m) { const o = offerOf(m); if (o) leading.push(o); pending = pending.slice(nl + 1); continue; }
                closed = true; break;
            }
            if (!closed) { const head = pending.trim(); if (head !== '' && !OFFER_PREFIX.test(head)) closed = true; }
            if (closed) { mode = 'answer'; continue; }
            break;
        }
    }
    if (mode === 'answer' && pending) yield out(pending);
    if (mode === 'lead') {
        const t = pending.trim(), m = t.match(OFFER_LINE);
        if (m) { const o = offerOf(m); if (o) leading.push(o); } else if (t) yield out(pending);
    }
    if (onSuggestions) onSuggestions(leading.concat(mode === 'tail' ? F.extractSuggestions(SENTINEL + tail).suggestions : []));
};
