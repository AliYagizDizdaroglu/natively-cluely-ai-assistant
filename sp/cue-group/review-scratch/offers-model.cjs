// Reviewer's model of the offers plan (docs/superpowers/plans/2026-09-30-offers-before-answer.md, Edits A, C, D),
// copied line for line from the plan's text, so "after the change" can be evaluated without touching the project.
// opts.prefix swaps CUE_LINE_PREFIX (mutant a: the draft predicate); opts.alwaysLead is mutant b (`if (false)`);
// opts.warn is called where the plan calls console.warn.
const { built } = require('./model.cjs');

const SENTINEL = '__MORE__';
const CUE_LINE = /^(\d+)\s*\|\s*(.+)$/;
const WIDE = /^\d+\s*(\|\s*.*)?$/;       // Task 1's corrected constant
const DRAFT = /^\d+\s*(\|.*)?$/;         // the first draft (mutant a)
const cuePhrase = (m) => m[2].trim().replace(/^["'`]|["'`]$/g, '');

const suggestionOf = (m) => {
    const label = cuePhrase(m);
    return label ? { n: Number(m[1]), label } : null;
};
const offersIn = (lines) => {
    const offers = [];
    for (const raw of lines) {
        const m = raw.trim().match(CUE_LINE);
        if (!m) continue;
        const s = suggestionOf(m);
        if (s) offers.push(s);
    }
    return offers;
};
function longestSentinelPrefixSuffix(s) {
    const max = Math.min(SENTINEL.length - 1, s.length);
    for (let n = max; n > 0; n--) if (s.endsWith(SENTINEL.slice(0, n))) return n;
    return 0;
}

function extractSuggestionsNew(text) {
    const i = text.indexOf(SENTINEL);
    if (i === -1) return { answer: text, suggestions: [] };
    if (text.slice(0, i).trim() !== '') {
        return { answer: text.slice(0, i).replace(/\s+$/, ''), suggestions: offersIn(text.slice(i + SENTINEL.length).split('\n')) };
    }
    const lines = text.slice(i + SENTINEL.length).split('\n');
    const suggestions = [];
    let k = 0;
    for (; k < lines.length; k++) {
        const t = lines[k].trim();
        if (t === '') continue;
        const m = t.match(CUE_LINE);
        if (!m) break;
        const s = suggestionOf(m);
        if (s) suggestions.push(s);
    }
    if (k === lines.length) return { answer: '', suggestions };
    const rest = extractSuggestionsNew(lines.slice(k).join('\n'));
    return { answer: rest.answer, suggestions: suggestions.concat(rest.suggestions) };
}

async function* stripSuggestionBlockNew(source, onSuggestions, opts = {}) {
    const CUE_LINE_PREFIX = opts.prefix ?? WIDE;
    let phase = 'answer';
    let pending = '';
    let tail = '';
    let spoke = false;
    let named = false;
    const leading = [];

    for await (const chunk of source) {
        if (phase === 'tail') { tail += chunk; continue; }
        pending += chunk;
        for (;;) {
            if (phase === 'answer') {
                const at = pending.indexOf(SENTINEL);
                if (at === -1) {
                    const keep = longestSentinelPrefixSuffix(pending);
                    const emit = pending.slice(0, pending.length - keep);
                    if (emit) { if (emit.trim()) spoke = true; yield emit; }
                    pending = pending.slice(pending.length - keep);
                    break;
                }
                const before = pending.slice(0, at);
                if (before) { if (before.trim()) spoke = true; yield before; }
                pending = pending.slice(at + SENTINEL.length);
                if (opts.alwaysLead ? false : spoke) { phase = 'tail'; tail = pending; pending = ''; break; }
                phase = 'lead';
                if (!named) { named = true; opts.warn?.('[verbalStreamFilter] stripSuggestionBlock: offers block before the spoken answer (shown after it)'); }
            }
            let nl;
            let closed = false;
            while ((nl = pending.indexOf('\n')) !== -1) {
                const t = pending.slice(0, nl).trim();
                if (t === '') { pending = pending.slice(nl + 1); continue; }
                const m = t.match(CUE_LINE);
                if (!m) { closed = true; break; }
                const s = suggestionOf(m);
                if (s) leading.push(s);
                pending = pending.slice(nl + 1);
            }
            if (!closed) {
                const head = pending.trim();
                if (head !== '' && !CUE_LINE_PREFIX.test(head)) closed = true;
            }
            if (!closed) break;
            phase = 'answer';
        }
    }

    if (phase === 'answer' && pending) yield pending;
    if (phase === 'lead') {
        const m = pending.trim().match(CUE_LINE);
        if (m) { const s = suggestionOf(m); if (s) leading.push(s); }
        else if (pending.trim()) yield pending;
    }
    onSuggestions?.(leading.concat(phase === 'tail' ? offersIn(tail.split('\n')) : []));
}

module.exports = { built, SENTINEL, CUE_LINE, WIDE, DRAFT, extractSuggestionsNew, stripSuggestionBlockNew, offersIn, suggestionOf, longestSentinelPrefixSuffix };
