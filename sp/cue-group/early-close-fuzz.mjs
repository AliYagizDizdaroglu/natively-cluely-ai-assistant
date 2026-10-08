// Spike for the early close (spec 2026-09-30 cue-early-close), before any implementer writes it (global rule 2: prove
// the assumption that would kill the design). The spec claims: for every input and every chunking, the patched
// stripCueBlock gives the same cues and the same prose bytes as extractCues; only the moment of the report moves.
// This fuzzes that claim against the BUILT extractCues, with a port of the built stripCueBlock plus the spec's early
// close, for two candidate predicates:
//   spec   /^\d+\s*(\|.*)?$/        the spec's CUE_LINE_PREFIX
//   wide   /^\d+\s*(\|\s*.*)?$/     the same with \s* after the bar, as CUE_LINE itself has
// Calibration of the harness itself: the port WITHOUT the early close must equal the built stripCueBlock's behaviour
// (0 mismatches against extractCues), or the port is wrong and nothing below means anything.
//   node early-close-fuzz.mjs [cases]      (default 200000; deterministic seed)
import { createRequire } from 'node:module';
const WT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn';
const F = createRequire(`${WT}/package.json`)(`${WT}/dist-electron/electron/llm/verbalStreamFilter.js`);

const CUES_SENTINEL = '__CUES__';
const CUE_LINE = /^(\d+)\s*\|\s*(.+)$/;
const cuePhrase = (m) => m[2].trim().replace(/^["'`]|["'`]$/g, '');
/** A line-for-line port of the built stripCueBlock (dist verbalStreamFilter.js:266-333); `prefix` = the early close's predicate, or null for today's code. */
function* strip(chunks, onCues, prefix) {
    let phase = 'prefix', pending = '', reported = false;
    const cues = [];
    const report = () => { if (reported) return; reported = true; onCues(cues.slice()); };
    for (const chunk of chunks) {
        if (phase === 'prose') { yield chunk; continue; }
        pending += chunk;
        if (phase === 'prefix') {
            const lead = pending.replace(/^\s+/, '');
            if (lead.startsWith(CUES_SENTINEL)) { phase = 'block'; pending = lead.slice(CUES_SENTINEL.length); }
            else if (CUES_SENTINEL.startsWith(lead)) continue;
            else { phase = 'prose'; report(); yield pending; pending = ''; continue; }
        }
        let nl;
        while ((nl = pending.indexOf('\n')) !== -1) {
            const t = pending.slice(0, nl).trim();
            if (t === '') { pending = pending.slice(nl + 1); continue; }
            const m = t.match(CUE_LINE);
            if (m) { const phrase = cuePhrase(m); if (phrase) cues.push(phrase); pending = pending.slice(nl + 1); continue; }
            phase = 'prose'; report(); yield pending; pending = ''; break;
        }
        if (prefix && phase === 'block') {                       // the early close, as the spec writes it
            const head = pending.trim();
            if (head !== '' && !prefix.test(head)) { phase = 'prose'; report(); yield pending; pending = ''; }
        }
    }
    if (phase === 'prefix') { report(); if (pending) yield pending; return; }
    if (phase === 'block') {
        const m = pending.trim().match(CUE_LINE);
        if (m) { const phrase = cuePhrase(m); if (phrase) cues.push(phrase); pending = ''; }
        report();
        if (pending.trim()) yield pending;
    }
}
const run = (chunks, prefix) => {
    let cues = null, calls = 0, seen = 0, reportedAfter = -1;
    function* src() { for (const c of chunks) { seen++; yield c; } }
    const out = [];
    for (const p of strip(src(), (x) => { cues = x; calls++; reportedAfter = seen; }, prefix)) out.push(p);
    return { prose: out.join(''), cues, calls, reportedAfter, firstOut: out.length ? out[0] : null, pieces: out.length };
};

// deterministic PRNG (mulberry32)
let s = 20260930;
const rand = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (a) => a[Math.floor(rand() * a.length)];
const TOK = ['1', '2', '12', '|', '|', ' ', ' ', '\t', '\r', '\n', '\n', 'a', 'Ten', 'x y', '.', '-', '"', '`', '\u2028', '__CUES__', '__CU', '1| a\n', '2| b c\n', '10 million', '3.'];
const text = () => {
    let t = rand() < 0.85 ? `${pick(['', '', ' ', '\n', '  \n'])}__CUES__${pick(['\n', '\n', '', ' ', '\r\n'])}` : '';
    const n = 1 + Math.floor(rand() * 10);
    for (let i = 0; i < n; i++) t += pick(TOK);
    return t;
};
const chunking = (t) => {
    const out = [];
    let i = 0;
    while (i < t.length) { const len = 1 + Math.floor(rand() * (rand() < 0.5 ? 3 : 12)); out.push(t.slice(i, i + len)); i += len; }
    return out;
};

const N = Number(process.argv[2] ?? 200000);
const PRED = { none: null, spec: /^\d+\s*(\|.*)?$/, wide: /^\d+\s*(\|\s*.*)?$/ };
const bad = { none: [], spec: [], wide: [] };
const stat = { spec: { earlier: 0, later: 0, same: 0 }, wide: { earlier: 0, later: 0, same: 0 } };
let builtMismatch = 0;
for (let k = 0; k < N; k++) {
    const t = text();
    const chunks = chunking(t);
    const want = F.extractCues(t);
    const base = run(chunks, null);
    for (const [name, prefix] of Object.entries(PRED)) {
        const r = name === 'none' ? base : run(chunks, prefix);
        const ok = r.calls === 1 && r.prose === want.prose && JSON.stringify(r.cues) === JSON.stringify(want.cues);
        if (!ok && bad[name].length < 8) bad[name].push({ text: JSON.stringify(t), chunks: JSON.stringify(chunks), got: JSON.stringify({ cues: r.cues, prose: r.prose, calls: r.calls }), want: JSON.stringify(want) });
        if (!ok) bad[name].n = (bad[name].n ?? 0) + 1;
        if (name !== 'none') { if (r.reportedAfter < base.reportedAfter) stat[name].earlier++; else if (r.reportedAfter > base.reportedAfter) stat[name].later++; else stat[name].same++; }
    }
    if (k < 3000) {   // the port against the BUILT generator itself, on a sample (it is async, so keep it small)
        const built = { prose: '', cues: null, calls: 0 };
        const gen = F.stripCueBlock((async function* () { for (const c of chunks) yield c; })(), (x) => { built.cues = x; built.calls++; });
        for await (const p of gen) built.prose += p;
        if (built.prose !== base.prose || JSON.stringify(built.cues) !== JSON.stringify(base.cues) || built.calls !== base.calls) builtMismatch++;
    }
}
console.log(`cases ${N}; the port without the early close vs the BUILT stripCueBlock on the first ${Math.min(N, 3000)}: ${builtMismatch} mismatch(es)`);
for (const name of Object.keys(PRED)) {
    console.log(`\n[${name}] ${PRED[name] ?? 'no early close (today)'}: ${bad[name].n ?? 0} case(s) differ from extractCues${name !== 'none' ? `; report earlier than today in ${stat[name].earlier}, same ${stat[name].same}, LATER ${stat[name].later}` : ''}`);
    for (const b of bad[name]) console.log(`   text ${b.text}\n   chunks ${b.chunks}\n   got  ${b.got}\n   want ${b.want}`);
}

// The named counterexample, by hand: a line terminator in the whitespace right after the bar.
console.log('\nnamed cases:');
for (const h of ['1|\rabc', '1| \u2028x', '1|\r', '1| Spa\r', '1| Sp\ra', '1 2', '1 |', ' 1| x', '10 million | shards'])
    console.log(`   ${JSON.stringify(h).padEnd(24)} trimmed ${JSON.stringify(h.trim()).padEnd(22)} CUE_LINE ${String(CUE_LINE.test(h.trim())).padEnd(5)} spec-prefix ${String(PRED.spec.test(h.trim())).padEnd(5)} wide-prefix ${PRED.wide.test(h.trim())}`);
const ce = ['__CUES__\n1| a\n', '2|\rb', '\nZ'];
for (const name of ['none', 'spec', 'wide']) { const r = run(ce, PRED[name]); console.log(`   chunks ${JSON.stringify(ce)} [${name}]: cues ${JSON.stringify(r.cues)} prose ${JSON.stringify(r.prose)} reported after chunk ${r.reportedAfter}`); }
console.log(`   extractCues: ${JSON.stringify(F.extractCues(ce.join('')))}`);
