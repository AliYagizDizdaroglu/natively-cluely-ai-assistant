// Reviewer's scratch model (read-only review of the early-close spec and plan, 2026-09-30).
// - `built`: the v2 dist's parser (today's behaviour), required as the brief allows.
// - `stripCueBlockNew`: a line-for-line copy of the built stripCueBlock plus the plan's Edit C,
//   so "after the change" can be evaluated without touching the project. `opts.trim` picks
//   'trim' (the plan) or 'trimStart' (the final review's sketch); `opts.prefix` swaps the regex.
const path = require('node:path');
const WT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn';
const built = require(path.join(WT, 'dist-electron/electron/llm/verbalStreamFilter.js'));

const CUES_SENTINEL = '__CUES__';
const CUE_LINE = /^(\d+)\s*\|\s*(.+)$/;
const CUE_LINE_PREFIX = /^\d+\s*(\|.*)?$/;          // the spec's value, verbatim
const cuePhrase = (m) => m[2].trim().replace(/^["'`]|["'`]$/g, '');

async function* stripCueBlockNew(source, onCues, opts = {}) {
    const trimKind = opts.trim ?? 'trim';
    const PREFIX = opts.prefix ?? CUE_LINE_PREFIX;
    let phase = 'prefix';
    let pending = '';
    const cues = [];
    let reported = false;
    const report = () => { if (reported) return; reported = true; onCues?.(cues.slice()); };

    for await (const chunk of source) {
        if (phase === 'prose') { yield chunk; continue; }
        pending += chunk;
        if (phase === 'prefix') {
            const lead = pending.replace(/^\s+/, '');
            if (lead.startsWith(CUES_SENTINEL)) {
                phase = 'block';
                pending = lead.slice(CUES_SENTINEL.length);
            } else if (CUES_SENTINEL.startsWith(lead)) {
                continue;
            } else {
                phase = 'prose';
                report();
                yield pending;
                pending = '';
                continue;
            }
        }
        let nl;
        while ((nl = pending.indexOf('\n')) !== -1) {
            const t = pending.slice(0, nl).trim();
            if (t === '') { pending = pending.slice(nl + 1); continue; }
            const m = t.match(CUE_LINE);
            if (m) {
                const phrase = cuePhrase(m);
                if (phrase) cues.push(phrase);
                pending = pending.slice(nl + 1);
                continue;
            }
            phase = 'prose';
            report();
            yield pending;
            pending = '';
            break;
        }
        // ---- the plan's Edit C ----
        if (phase === 'block') {
            const head = trimKind === 'trim' ? pending.trim() : pending.trimStart();
            if (head !== '' && !PREFIX.test(head)) {
                phase = 'prose';
                report();
                yield pending;
                pending = '';
            }
        }
    }

    if (phase === 'prefix') {
        report();
        if (pending) yield pending;
        return;
    }
    if (phase === 'block') {
        const m = pending.trim().match(CUE_LINE);
        if (m) { const phrase = cuePhrase(m); if (phrase) cues.push(phrase); pending = ''; }
        report();
        if (pending.trim()) yield pending;
    }
}

/** The plan's runCuesTimed, against any implementation. */
async function runCuesTimed(impl, chunks, opts) {
    let seen = 0, reportedAfter = -1, cues = null, calls = 0;
    async function* source() { for (const c of chunks) { seen++; yield c; } }
    const out = [];
    for await (const p of impl(source(), (x) => { cues = x; calls++; reportedAfter = seen; }, opts)) out.push(p);
    return { out, cues, calls, reportedAfter };
}

const show = (s) => JSON.stringify(s);
module.exports = { WT, built, stripCueBlockNew, runCuesTimed, CUE_LINE, CUE_LINE_PREFIX, CUES_SENTINEL, cuePhrase, show };
