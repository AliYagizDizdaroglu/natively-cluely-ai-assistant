// The five properties of spec §2.4 and the log line, checked on the REAL files: work.ts (the working tree) against
// base.ts (18da7fa), both type-stripped by node. Calibrated by running the same checks on mutants of the real source.
//   P1  answer first (non-blank text before the first sentinel, or no sentinel): the stream's yield SEQUENCE (piece and
//       the chunk it came out on), offers and call count equal BASE's; the whole-string result equals BASE's
//   P2  the sentinel never reaches the output; RELEASE: on the char-by-char chunking of a leading text, the first
//       non-blank piece comes out on the chunk the spec's rule names (independent computation below)
//   P3  offers only (whole-string answer blank): nothing but whitespace shown
//   P4  the callback fires exactly once
//   P5  streaming equals whole-string (outer whitespace aside) and the offers are equal; no chunking dependence
//   LOG exactly one warn, with the exact text, iff the block leads; none otherwise
import fs from 'node:fs';
const here = (f) => new URL('./' + f, import.meta.url);
const SENT = '__MORE__';
const LINE = '[verbalStreamFilter] stripSuggestionBlock: offers block before the spoken answer (shown after it)';
const CUE_LINE = /^(\d+)\s*\|\s*(.+)$/;
const PREFIX = /^\d+\s*(\|\s*.*)?$/;
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const mode = process.argv[2] ?? 'full';            // 'full' | 'calibrate'

const W = await import('./work.mts');
const Bm = await import('./base.mts');
const workSrc = fs.readFileSync(here('work.ts'), 'utf8');
async function variant(name, pairs) {
    let s = workSrc;
    for (const [a, b] of pairs) { if (!s.includes(a)) throw new Error(`${name}: anchor missing: ${a}`); s = s.replace(a, () => b); }
    fs.writeFileSync(here(`v-${name}.mts`), s);
    return import(`./v-${name}.mts`);
}

async function run(M, chunks) {
    const pieces = []; let sugg = null, calls = 0, seen = 0; const warns = [];
    const orig = console.warn; console.warn = (...a) => warns.push(a.map(String).join(' '));
    try {
        async function* source() { for (const c of chunks) { seen++; yield c; } }
        for await (const p of M.stripSuggestionBlock(source(), (s) => { sugg = s; calls++; })) pieces.push([seen, p]);
    } finally { console.warn = orig; }
    const out = pieces.map((p) => p[1]).join('');
    const firstShown = (pieces.find((p) => p[1].trim() !== '') ?? [-1])[0];
    return { pieces, out, sugg, calls, warns, firstShown };
}
function lsps(s) { const max = Math.min(SENT.length - 1, s.length); for (let n = max; n > 0; n--) if (s.endsWith(SENT.slice(0, n))) return n; return 0; }
/** Spec §2.2 release rule, computed from the text alone, for the FIRST leading block: the 1-based char index at which
 *  the first non-blank piece must be yielded, or null when the answer line starts in a way this helper does not model
 *  (no answer line, or the release piece is all held as a sentinel prefix). */
function expectedRelease(text) {
    const i = text.indexOf(SENT);
    if (i === -1 || text.slice(0, i).trim() !== '') return null;
    let pos = i + SENT.length;
    for (;;) {
        const nl = text.indexOf('\n', pos);
        const line = nl === -1 ? text.slice(pos) : text.slice(pos, nl);
        const t = line.trim();
        if (t === '' || CUE_LINE.test(t)) { if (nl === -1) return null; pos = nl + 1; continue; }
        break;
    }
    const nl = text.indexOf('\n', pos);
    const end = nl === -1 ? text.length : nl;          // the answer line's own characters are pos..end-1
    for (let j = pos; j <= end && j < text.length; j++) {
        const pend = text.slice(pos, j + 1);
        const head = pend.trim();
        const closes = j === nl || (head !== '' && !PREFIX.test(head));
        if (!closes) continue;
        if (pend.includes(SENT)) return null;           // a second sentinel inside the release piece: not modelled
        const emitted = pend.slice(0, pend.length - lsps(pend));
        return emitted.trim() !== '' ? j + 1 : null;
    }
    return null;
}

function newStats() { return { texts: 0, lead: 0, runs: 0, released: 0, P1: 0, P1whole: 0, P2: 0, REL: 0, P3: 0, P4: 0, P5: 0, P5off: 0, VAR: 0, LOG: 0 }; }
async function check(M, text, cuts, st, ex) {
    st.texts++;
    const i = text.indexOf(SENT);
    const leads = i !== -1 && text.slice(0, i).trim() === '';
    if (leads) st.lead++;
    const note = (k, o) => { st[k]++; if (ex[k] === undefined) ex[k] = { text, ...o }; };
    const Wh = M.extractSuggestions(text);
    if (!leads && !eq(Wh, Bm.extractSuggestions(text))) note('P1whole', { Wh, Bh: Bm.extractSuggestions(text) });
    let first = null;
    for (const chunks of cuts) {
        st.runs++;
        const N = await run(M, chunks);
        if (!leads) {
            const B = await run(Bm, chunks);
            if (!eq(N.pieces, B.pieces) || !eq(N.sugg, B.sugg) || N.calls !== B.calls) note('P1', { chunks, N: [N.pieces, N.sugg, N.calls], B: [B.pieces, B.sugg, B.calls] });
        }
        if (N.out.includes(SENT)) note('P2', { chunks, out: N.out });
        if (Wh.answer.trim() === '' && N.out.trim() !== '') note('P3', { chunks, out: N.out });
        if (N.calls !== 1) note('P4', { chunks, calls: N.calls });
        if (N.out.trim() !== Wh.answer.trim()) note('P5', { chunks, out: N.out, whole: Wh.answer });
        if (!eq(N.sugg, Wh.suggestions)) note('P5off', { chunks, sugg: N.sugg, whole: Wh.suggestions });
        if (first && (first.out !== N.out || !eq(first.sugg, N.sugg))) note('VAR', { chunks, a: first.out, b: N.out });
        first = first ?? N;
        if (N.warns.length !== (leads ? 1 : 0) || N.warns.some((w) => w !== LINE)) note('LOG', { chunks, warns: N.warns });
        if (leads && chunks.length === text.length && chunks.every((c) => c.length === 1)) {
            const want = expectedRelease(text);
            if (want !== null) { st.released++; if (N.firstShown !== want) note('REL', { want, got: N.firstShown }); }
        }
    }
}

const LS = String.fromCharCode(0x2028), PS = String.fromCharCode(0x2029), NBSP = String.fromCharCode(0xa0), BOM = String.fromCharCode(0xfeff);
async function exhaustive(M, st, ex, maxLen) {
    const TOK = ['__MORE__', '\n', '1| a', '2| b', 'x', ' ', '_', '1', '|', '\r'];
    function* seqs(len, p = []) { if (p.length === len) { yield p; return; } for (const t of TOK) yield* seqs(len, p.concat([t])); }
    const cutBy = (t, n) => { const o = []; for (let i = 0; i < t.length; i += n) o.push(t.slice(i, i + n)); return o; };
    for (let len = 1; len <= maxLen; len++) for (const s of seqs(len)) {
        const text = s.join('');
        await check(M, text, [[text], text.split(''), cutBy(text, 2), cutBy(text, 3), cutBy(text, 5), s], st, ex);
    }
}
async function random(M, st, ex, n, seed0) {
    let seed = seed0;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const pick = (xs) => xs[Math.floor(rnd() * xs.length)];
    const RT = ['__MORE__', '__MORE__', '__MORE__\n', '\n__MORE__\n', '__MO', 'RE__', '__', '_', '\n', '\n', '\r\n', ' ', '  ', '\t', '1| one offer', '2| two offers', '3|', '4', '10 million vectors fit. ', 'Ten million vectors. ', 'Answer first. ', '1. First', '- a bullet', '"quoted"', '1| "', '2|\rc d', '5 |  spaced', 'x', '__CUES__', '__init__', LS, '|', '12',
        // this review's additions
        PS, NBSP, BOM, '2|' + LS + 'c', '2' + LS + '| c', '  __MORE__', '__MORE__\r\n', '2026 was the year. ', '_x', '___', 'MORE__', '7|\t"q"', '\r', '1 | z\r\n', '3| c d\r'];
    for (let t = 0; t < n; t++) {
        let text = rnd() < 0.6 ? pick(['__MORE__\n', '\n__MORE__\n', ' __MORE__\n1| a b\n', '__MORE__', '__MORE__ 1| a b\n', '\r\n__MORE__\r\n1| a b\r\n\r\n']) : '';
        const k = 1 + Math.floor(rnd() * 11);
        for (let i = 0; i < k; i++) text += pick(RT);
        const cuts = [[text], text.split('')];
        for (let c = 0; c < 4; c++) { const parts = []; let i = 0; while (i < text.length) { const len = 1 + Math.floor(rnd() * 9); parts.push(text.slice(i, i + len)); i += len; } cuts.push(parts); }
        await check(M, text, cuts, st, ex);
    }
}
const show = (st) => Object.entries(st).map(([k, v]) => `${k}=${v}`).join(' ');

if (mode === 'full') {
    let st = newStats(), ex = {};
    await exhaustive(W, st, ex, 5);
    console.log('WORK exhaustive (1-5 tokens, 6 chunkings):', show(st));
    for (const [k, v] of Object.entries(ex)) console.log(`  [${k}]`, JSON.stringify(v).slice(0, 500));
    st = newStats(); ex = {};
    await random(W, st, ex, 60000, 20260930);
    console.log('WORK random (60000 texts, 6 chunkings):', show(st));
    for (const [k, v] of Object.entries(ex)) console.log(`  [${k}]`, JSON.stringify(v).slice(0, 500));
} else {
    const MUT = {
        'a-draft-prefix': [['const CUE_LINE_PREFIX = /^\\d+\\s*(\\|\\s*.*)?$/;', 'const CUE_LINE_PREFIX = /^\\d+\\s*(\\|.*)?$/;']],
        'b-every-block-leads': [["if (spoke) { phase = 'tail';", "if (false) { phase = 'tail';"]],
        'c-warn-per-block': [['if (!named) { named = true; console.warn(', 'if (true) { named = true; console.warn(']],
        'd-old-tail-parse': [["onSuggestions?.(leading.concat(phase === 'tail' ? offersIn(tail.split('\\n')) : []));", "onSuggestions?.(leading.concat(phase === 'tail' ? extractSuggestions(SENTINEL + tail).suggestions : []));"]],
        'e-whitespace-is-spoken': [['if (emit) { if (emit.trim()) spoke = true; yield emit; }', 'if (emit) { spoke = true; yield emit; }']],
        'f-head-untrimmed': [['const head = pending.trim();', 'const head = pending;']],
        'g-no-lead-flush': [['else if (pending.trim()) yield pending;', 'else if (false) yield pending;']],
    };
    for (const [name, pairs] of Object.entries(MUT)) {
        const M = await variant(name, pairs);
        const st = newStats(), ex = {};
        await exhaustive(M, st, ex, 4);
        await random(M, st, ex, 6000, 777);
        console.log(`MUTANT ${name}:`, show(st));
    }
    const st = newStats(), ex = {};
    await exhaustive(W, st, ex, 4);
    await random(W, st, ex, 6000, 777);
    console.log('WORK (same inputs):', show(st));
}
