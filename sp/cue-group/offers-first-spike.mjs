// Spike for the offers-before-answer fix, before any spec is written (global rule 2: prove the assumption that would
// kill the design). THROWAWAY: the candidate below is a sketch to measure with, not the code to ship.
//
// The defect: the model sometimes writes its __MORE__ offers block right after the cue block and BEFORE the spoken
// answer. The built stripSuggestionBlock suppresses everything from the sentinel on, so the answer is thrown away.
// The candidate rule: when the sentinel arrives before any spoken text, the block is only the run of offer lines
// (and blank lines) that follows it; the first other text is the spoken answer, and the normal path resumes there.
// When spoken text came first, nothing changes.
//
// What this measures:
//   1. the port is faithful: with the new branch switched off it equals the BUILT stripSuggestionBlock (every input);
//   2. on every saved raw reply (spikes 1-6, the repro), through the built chain up to the offers stage: which replies
//      change, and that a reply changes ONLY where today nothing is shown;
//   3. a fuzz of the three claims a spec would make: (a) streaming equals the whole-string definition for every
//      chunking; (b) where today shows any text, the candidate shows the same bytes and the same offers; (c) the
//      sentinel never reaches the output;
//   4. when the answer is released in the new branch: at its first character, not at the end of its first line.
// Prints ids, shapes, counts and offer labels. Never a reply's prose, never a prompt.
//   node offers-first-spike.mjs [fuzz cases]      (default 200000; deterministic seed)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { shape } from './repro-blockonly.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn';
const F = createRequire(`${WT}/package.json`)(`${WT}/dist-electron/electron/llm/verbalStreamFilter.js`);

const SENTINEL = '__MORE__';
const OFFER_LINE = /^(\d+)\s*\|\s*(.+)$/;          // extractSuggestions' own expression (the same as CUE_LINE)
const OFFER_PREFIX = /^\d+\s*(\|\s*.*)?$/;        // the corrected prefix predicate of the early close
const offerOf = (m) => { const label = m[2].trim().replace(/^["'`]|["'`]$/g, ''); return label ? { n: Number(m[1]), label } : null; };
const words = (s) => (String(s).match(/\S+/g) ?? []).length;
const prefixSuffix = (s) => { for (let n = Math.min(SENTINEL.length - 1, s.length); n > 0; n--) if (s.endsWith(SENTINEL.slice(0, n))) return n; return 0; };

/** The candidate's whole-string definition. */
function extractNew(text) {
    const i = text.indexOf(SENTINEL);
    if (i === -1) return { answer: text, suggestions: [] };
    const before = text.slice(0, i);
    if (before.trim() !== '') return F.extractSuggestions(text);           // spoken text came first: today's rule
    const lines = text.slice(i + SENTINEL.length).split('\n');
    const suggestions = [];
    let k = 0;
    for (; k < lines.length; k++) {
        const t = lines[k].trim();
        if (t === '') continue;
        const m = t.match(OFFER_LINE);
        if (!m) break;
        const o = offerOf(m); if (o) suggestions.push(o);
    }
    if (k === lines.length) return { answer: '', suggestions };               // offers and nothing else: no answer, as today
    const rest = extractNew(lines.slice(k).join('\n'));
    return { answer: rest.answer, suggestions: suggestions.concat(rest.suggestions) };
}

/** The candidate's streaming filter. `lead` false = the new branch switched off (must equal the built filter). */
function* stripNew(chunks, onSuggestions, lead = true, trace = null) {
    let pending = '', tail = '', mode = 'answer', spoke = false, seen = 0;
    const leading = [];
    const out = (s) => { if (s.trim()) { if (!spoke && trace) trace.firstSpokenAfterChunk = seen; spoke = true; } return s; };
    for (const chunk of chunks) {
        seen++;
        if (mode === 'tail') { tail += chunk; continue; }
        pending += chunk;
        for (;;) {
            if (mode === 'answer') {
                const at = pending.indexOf(SENTINEL);
                if (at !== -1) {
                    const before = pending.slice(0, at);
                    if (before) yield out(before);
                    pending = pending.slice(at + SENTINEL.length);
                    if (spoke || !lead) { mode = 'tail'; tail = pending; pending = ''; break; }
                    mode = 'lead'; if (trace) trace.leadBlocks = (trace.leadBlocks ?? 0) + 1;
                    continue;
                }
                const keep = prefixSuffix(pending);
                const emit = pending.slice(0, pending.length - keep);
                if (emit) yield out(emit);
                pending = pending.slice(pending.length - keep);
                break;
            }
            // mode === 'lead': offer lines and blank lines are consumed; the first other text is the answer
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
    onSuggestions(leading.concat(mode === 'tail' ? F.extractSuggestions(SENTINEL + tail).suggestions : []));
}
const runNew = (chunks, lead = true) => { let sugg = null, calls = 0; const trace = {}; let outS = ''; for (const p of stripNew(chunks, (s) => { sugg = s; calls++; }, lead, trace)) outS += p; return { out: outS, sugg, calls, trace }; };
const runBuilt = async (chunks) => { let sugg = null, calls = 0, outS = ''; for await (const p of F.stripSuggestionBlock((async function* () { for (const c of chunks) yield c; })(), (s) => { sugg = s; calls++; })) outS += p; return { out: outS, sugg, calls }; };
const cut = (text, size) => { const o = []; for (let i = 0; i < text.length; i += size) o.push(text.slice(i, i + size)); return o; };
const collect = async (gen) => { let s = ''; for await (const c of gen) s += c; return s; };
const agen = (chunks) => (async function* () { for (const c of chunks) yield c; })();
const J = JSON.stringify;

// ── 2. every saved raw reply ─────────────────────────────────────────────────────────────────────────────────────
const files = fs.readdirSync(HERE).filter((f) => /^(spike\d*|repro-blockonly)-.*\.json$/.test(f)).sort();
let total = 0, changed = 0, changedButShownToday = 0, offersDiffer = 0, portMismatch = 0, fracReplies = 0, sentinelInOut = 0, stillEmpty = [];
const changedRows = [];
for (const file of files) {
    const rows = JSON.parse(fs.readFileSync(path.join(HERE, file), 'utf8'));
    for (const r of (Array.isArray(rows) ? rows : Object.values(rows))) {
        if (typeof r?.raw !== 'string' || !r.raw.trim()) continue;
        total++;
        if (r.raw.includes('\\frac')) fracReplies++;
        // the built chain up to the offers stage, as the app runs it
        const s3 = await collect(F.filterVerbalLines(F.filterCodeFences(F.stripCueBlock(agen(cut(r.raw, 90)), () => {}))));
        for (const size of [1, 7, 90, 1e6]) {
            const chunks = cut(s3, size);
            const built = await runBuilt(chunks);
            const off = runNew(chunks, false);
            if (off.out !== built.out || J(off.sugg) !== J(built.sugg) || off.calls !== built.calls) portMismatch++;
            const cand = runNew(chunks, true);
            if (cand.out.includes(SENTINEL)) sentinelInOut++;
            if (size !== 90) { if ((cand.out !== built.out) !== (runNew(cut(s3, 90), true).out !== (await runBuilt(cut(s3, 90))).out)) changedButShownToday += 1e6; continue; }
            if (J(cand.sugg.map((o) => o.label)) !== J(built.sugg.map((o) => o.label))) offersDiffer++;
            if (cand.out !== built.out) {
                changed++;
                if (built.out.trim() !== '') changedButShownToday++;
                changedRows.push({ id: `${path.basename(file).slice(0, 6)} ${r.arm ?? '-'} | ${r.model ?? '-'} ${r.id ?? '?'}#${r.rep ?? '?'}`, today: words(built.out), after: words(cand.out), offers: cand.sugg.map((o) => o.label), shape: shape(r.raw).join(' '), whole: words(extractNew(s3).answer) });
            } else if (built.out.trim() === '') stillEmpty.push({ id: `${path.basename(file).slice(0, 6)} ${r.arm ?? '-'} | ${r.model ?? '-'} ${r.id ?? '?'}#${r.rep ?? '?'}`, shape: shape(r.raw).join(' ') });
        }
    }
}
console.log(`saved raw replies: ${total} in ${files.length} files (${files.map((f) => f.slice(0, 6)).join(', ')})`);
console.log(`port with the new branch OFF vs the BUILT stripSuggestionBlock, 4 chunk sizes each: ${portMismatch} mismatch(es)`);
console.log(`replies the candidate changes: ${changed}; of those, replies that show any text TODAY: ${changedButShownToday}; replies whose offers differ: ${offersDiffer}; outputs that contain the sentinel: ${sentinelInOut}`);
for (const c of changedRows) console.log(`   ${c.id}: shown words today ${c.today} -> candidate ${c.after} (whole-string definition ${c.whole}); offers ${J(c.offers)}\n      shape: ${c.shape}`);
console.log(`replies that stay empty with the candidate (no spoken answer in the reply): ${stillEmpty.length}`);
for (const e of stillEmpty) console.log(`   ${e.id}\n      shape: ${e.shape}`);
console.log(`replies that hold a typeset fraction (\\frac): ${fracReplies} of ${total}`);

// ── 3. fuzz ──────────────────────────────────────────────────────────────────────────────────────────────────────
let s = 20260930;
const rand = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (a) => a[Math.floor(rand() * a.length)];
const TOK = ['__MORE__', '__MORE__\n', '__MO', '_', '\n', '\n', ' ', '1| a', '2| b c\n', '1|', '1', '|', 'Ten million', 'x y.', '3.', '\r', '\u2028', '`q`', '10 m', '\n\n'];
const text = () => { let t = ''; const n = 1 + Math.floor(rand() * 9); for (let i = 0; i < n; i++) t += pick(TOK); return t; };
const chunking = (t) => { const o = []; let i = 0; while (i < t.length) { const len = 1 + Math.floor(rand() * (rand() < 0.5 ? 3 : 12)); o.push(t.slice(i, i + len)); i += len; } return o; };
const N = Number(process.argv[2] ?? 200000);
const bad = { streamVsWhole: [], shownChanged: [], offersChanged: [], sentinel: [], calls: [], offFuzz: 0 };
let leadCases = 0, changedCases = 0, offerLineShown = 0;
for (let k = 0; k < N; k++) {
    const t = text(), chunks = chunking(t);
    const cand = runNew(chunks, true), off = runNew(chunks, false), whole = extractNew(t);
    const ref = runNew([t], false);                                           // today's behaviour, by the port (calibrated below on a sample)
    if (k < 4000) { const built = await runBuilt(chunks); if (built.out !== off.out || J(built.sugg) !== J(off.sugg)) bad.offFuzz++; }
    if (cand.trace.leadBlocks) leadCases++;
    if (cand.calls !== 1 && bad.calls.length < 4) bad.calls.push(J(t));
    if ((cand.out.trim() !== whole.answer.trim() || J(cand.sugg) !== J(whole.suggestions)) && bad.streamVsWhole.length < 6) bad.streamVsWhole.push({ t: J(t), chunks: J(chunks), got: J({ out: cand.out, sugg: cand.sugg }), want: J(whole) });
    if (cand.out.trim() !== whole.answer.trim() || J(cand.sugg) !== J(whole.suggestions)) bad.streamVsWhole.n = (bad.streamVsWhole.n ?? 0) + 1;
    if (off.out.trim() !== '') {                                              // today shows text: nothing may change
        if (cand.out !== off.out) { bad.shownChanged.n = (bad.shownChanged.n ?? 0) + 1; if (bad.shownChanged.length < 6) bad.shownChanged.push({ t: J(t), chunks: J(chunks), today: J(off.out), cand: J(cand.out) }); }
        if (J(cand.sugg) !== J(off.sugg)) { bad.offersChanged.n = (bad.offersChanged.n ?? 0) + 1; if (bad.offersChanged.length < 6) bad.offersChanged.push({ t: J(t), today: J(off.sugg), cand: J(cand.sugg) }); }
    } else if (cand.out !== off.out) changedCases++;
    if (cand.out.includes(SENTINEL)) { bad.sentinel.n = (bad.sentinel.n ?? 0) + 1; if (bad.sentinel.length < 4) bad.sentinel.push(J(t)); }
    if (cand.trace.leadBlocks && cand.out.split('\n').some((l) => OFFER_LINE.test(l.trim()))) offerLineShown++;
    void ref;
}
console.log(`\nfuzz: ${N} cases; the port with the new branch OFF vs the BUILT filter on the first ${Math.min(N, 4000)}: ${bad.offFuzz} mismatch(es)`);
console.log(`   cases that enter the new branch: ${leadCases}; cases where the candidate shows text and today shows none: ${changedCases}`);
console.log(`   (a) streaming differs from the whole-string definition (outer whitespace aside): ${bad.streamVsWhole.n ?? 0}`);
for (const b of bad.streamVsWhole) console.log(`       text ${b.t}\n       chunks ${b.chunks}\n       got  ${b.got}\n       want ${b.want}`);
console.log(`   (b) today shows text and the candidate's text differs: ${bad.shownChanged.n ?? 0}; ...and the offers differ: ${bad.offersChanged.n ?? 0}`);
for (const b of bad.shownChanged) console.log(`       text ${b.t}\n       chunks ${b.chunks}\n       today ${b.today}\n       cand  ${b.cand}`);
for (const b of bad.offersChanged) console.log(`       text ${b.t}\n       today ${b.today}\n       cand  ${b.cand}`);
console.log(`   (c) the sentinel reaches the output: ${bad.sentinel.n ?? 0}${bad.sentinel.length ? ` e.g. ${bad.sentinel.join(' ; ')}` : ''}`);
console.log(`   the callback fires other than once: ${bad.calls.length}`);
console.log(`   known edge, not a failure of the rule: an offer-shaped line AFTER the answer began, with no second sentinel, is answer text: ${offerLineShown} case(s)`);

// ── 4. when the answer is released in the new branch ─────────────────────────────────────────────────────────────
const PROSE = 'Ten million vectors take about thirty gigabytes in float32, so I would quantise to int8 first.';
const FIRST = `__MORE__\n1| cold start mitigation\n2| GPU node pools\n\n${PROSE}`;
console.log('\nrelease point, offers first then one line of prose with no newline (chunk size: first chunk with a spoken character / chunks in all):');
for (const size of [1, 3, 7, 40]) { const chunks = cut(FIRST, size); const r = runNew(chunks, true); const firstProseChunk = Math.floor(FIRST.indexOf('Ten') / size) + 1; console.log(`   size ${String(size).padStart(2)}: released after chunk ${r.trace.firstSpokenAfterChunk} of ${chunks.length} (the chunk that carries the first prose character: ${firstProseChunk}); text ${r.out.trim() === PROSE ? 'equals the prose' : 'DIFFERS'}; offers ${J(r.sugg.map((o) => o.label))}`); }
for (const [name, t] of [['answer first (today\'s order)', `${PROSE}\n__MORE__\n1| cold start mitigation\n`], ['offers first, then the answer, then offers again', `__MORE__\n1| a b\n${PROSE}\n__MORE__\n2| c d\n`], ['offers only', '__MORE__\n1| a b\n2| c d\n'], ['offers first, a digit-led answer', '__MORE__\n1| a b\n10 million vectors fit.'], ['an offer-shaped line after the answer began', `__MORE__\n1| a b\n${PROSE}\n2| c d\n`]]) {
    const r = runNew(cut(t, 5), true), b = await runBuilt(cut(t, 5));
    console.log(`   ${name}: today ${words(b.out)} words, offers ${J(b.sugg.map((o) => o.label))}; candidate ${words(r.out)} words, offers ${J(r.sugg.map((o) => o.label))}${r.out.split('\n').some((l) => OFFER_LINE.test(l.trim())) ? '  <- an offer-shaped line is shown' : ''}`);
}

// ── the reviewer's I3: is stripSpokenNotation piece-sensitive for a typeset fraction? (built filter) ─────────────
const FRAC = 'The ratio is $\\frac{3,000}{9,500}$ overall and more.';
console.log(`\nstripSpokenNotation (built) on a typeset fraction: whole ${J(await collect(F.stripSpokenNotation(agen([FRAC]))))}; one character at a time ${J(await collect(F.stripSpokenNotation(agen(cut(FRAC, 1)))))}`);
