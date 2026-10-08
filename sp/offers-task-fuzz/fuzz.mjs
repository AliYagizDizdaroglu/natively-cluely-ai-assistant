// THROWAWAY (scratchpad only, never the repo): differential check of the shipped offers guard.
// Compares, over random texts x many chunkings:
//   P1  answer-first / no-sentinel texts: new stream == OLD stream, byte for byte (out, offers, calls); new whole-string == OLD whole-string
//   P2  leading-block texts: the sentinel never reaches the output; callback fires exactly once; one warn line iff the block leads
//   P5  streaming == whole-string definition (answer modulo outer whitespace, offers exact) for every chunking
// Calibration: the same checks run on mutant copies of the shipped source; each mutant must be caught.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const N = Number(process.argv[2] || 20000);
const SEED = Number(process.argv[3] || 12345);

function mutate(name, edit) {
    const src = fs.readFileSync(path.join(HERE, 'shipped.ts'), 'utf8');
    const out = edit(src);
    if (out === src) throw new Error('mutation ' + name + ' changed nothing');
    const file = path.join(HERE, name + '.ts');
    fs.writeFileSync(file, out);
    return file;
}
const PREFIX_SHIPPED = 'const CUE_LINE_PREFIX = /^\\d+\\s*(\\|\\s*.*)?$/;';
const PREFIX_DRAFT = 'const CUE_LINE_PREFIX = /^\\d+\\s*(\\|.*)?$/;';
const files = {
    old: path.join(HERE, 'old.ts'),
    shipped: path.join(HERE, 'shipped.ts'),
    m1_every_block_leads: mutate('m1', (s) => s.replace("if (spoke) { phase = 'tail'", "if (false) { phase = 'tail'")),
    m2_draft_predicate: mutate('m2', (s) => s.replace(PREFIX_SHIPPED, PREFIX_DRAFT)),
    m3_head_not_trimmed: mutate('m3', (s) => s.replace('const head = pending.trim();', 'const head = pending;')),
    m4_never_warns: mutate('m4', (s) => s.replace("if (!named) { named = true; console.warn(", "if (!named) { named = true; (() => {})(")),
    m5_leading_offers_lost: mutate('m5', (s) => s.replace('onSuggestions?.(leading.concat(phase', 'onSuggestions?.([].concat(phase')),
};
const mods = {};
for (const [k, f] of Object.entries(files)) mods[k] = await import(pathToFileURL(f).href);

// ---- deterministic PRNG ----
let st = SEED >>> 0;
const rand = () => { st = (st + 0x6D2B79F5) >>> 0; let t = st; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const rnd = (n) => Math.floor(rand() * n);
const pick = (a) => a[rnd(a.length)];

const LABELS = ['a b', 'c d', 'cold start mitigation', 'GPU node pools', '"quoted one"', "'single'", '`tick`', 'x', 'a later thought'];
const PROSE = ['Ten million vectors take about thirty gigabytes.', 'So I would quantise to int8 first', 'Bloom filters answer membership fast.', '10 million vectors fit.', '2. First point', '- a bullet', 'snake_case and __init__ are names', '_x', 'Here is what I left out:', '1 is the loneliest number', '3|', '4| ', '5|x', '__MORE__ inline 1| x'];
const NL = ['\n', '\n', '\n', '\r\n', '\n\n', '  \n'];
const offerLine = () => `${1 + rnd(9)}${pick(['| ', '|', ' | ', '|\r', '| \t'])}${pick(LABELS)}`;
const piece = () => {
    switch (rnd(8)) {
        case 0: case 1: return offerLine();
        case 2: return '__MORE__';
        case 3: case 4: return pick(PROSE);
        case 5: return '';
        case 6: return pick(['  ', '\t', ' ']);
        default: return pick(['1| "', '2|', '3| ', '__MO', '_', '__MORE_', '__MORE__ x', '2|\rc d']);
    }
};
function genText() {
    const lead = rnd(3) === 0 ? pick(['', '\n', '  ', '\n\n', ' \n']) : '';
    const parts = [];
    if (rnd(4) <= 1) {   // biased: a leading block, maybe an answer, maybe a second block
        parts.push('__MORE__');
        for (let i = rnd(4); i > 0; i--) parts.push(offerLine());
        if (rnd(2)) parts.push('');
        if (rnd(5) > 0) parts.push(pick(PROSE) + (rnd(2) ? ' ' + pick(PROSE) : ''));
        if (rnd(3) === 0) { parts.push('__MORE__'); for (let i = rnd(3); i > 0; i--) parts.push(offerLine()); }
    } else {
        for (let i = rnd(9); i > 0; i--) parts.push(piece());
    }
    let s = lead;
    parts.forEach((p, idx) => { s += p; if (idx < parts.length - 1) s += pick(NL); });
    if (rnd(3) === 0) s += pick(NL);
    return s;
}
const cut = (t, size) => { const o = []; for (let i = 0; i < t.length; i += size) o.push(t.slice(i, i + size)); return o; };
function chunkings(t) {
    const out = [];
    for (const size of [1, 2, 3, 5, 8, 13, 500]) out.push(cut(t, size));
    for (let k = 0; k < 3; k++) {
        const cs = []; let i = 0;
        while (i < t.length) { const len = 1 + rnd(9); cs.push(t.slice(i, i + len)); if (rnd(6) === 0) cs.push(''); i += len; }
        out.push(cs);
    }
    return out;
}

async function run(mod, chunks) {
    let out = '', sugg = null, calls = 0, warns = 0;
    const realWarn = console.warn;
    console.warn = () => { warns++; };
    try {
        async function* src() { for (const c of chunks) yield c; }
        for await (const p of mod.stripSuggestionBlock(src(), (s) => { sugg = s; calls++; })) out += p;
    } finally { console.warn = realWarn; }
    return { out, sugg, calls, warns };
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const SENT = '__MORE__';
const leads = (t) => { const i = t.indexOf(SENT); return i !== -1 && t.slice(0, i).trim() === ''; };
const answerFirstOrNone = (t) => { const i = t.indexOf(SENT); return i === -1 || t.slice(0, i).trim() !== ''; };

// ---- one text, one variant: returns the set of violated property names ----
// oldRuns: the OLD guard's result per chunking, computed once per text (only used for answer-first / no-sentinel texts)
async function check(variant, t, chunkSets, oldRuns) {
    const bad = new Set();
    const mod = mods[variant];
    const whole = mod.extractSuggestions(t);
    if (answerFirstOrNone(t)) {
        const ow = mods.old.extractSuggestions(t);
        if (!same(ow, whole)) bad.add('P1 whole-string differs from old on an answer-first text');
    }
    for (let c = 0; c < chunkSets.length; c++) {
        const r = await run(mod, chunkSets[c]);
        if (r.calls !== 1) bad.add('P4 callback calls != 1');
        if (r.out.includes(SENT)) bad.add('P2 sentinel reached the output');
        if (r.warns !== (leads(t) ? 1 : 0)) bad.add('P2 warn count != (block leads ? 1 : 0)');
        if (r.out.trim() !== whole.answer.trim()) bad.add('P5 streamed answer != whole-string answer');
        if (!same(r.sugg, whole.suggestions)) bad.add('P5 streamed offers != whole-string offers');
        if (oldRuns) {
            const o = oldRuns[c];
            if (r.out !== o.out) bad.add('P1 answer-first output not byte-identical to old');
            if (!same(r.sugg, o.sugg)) bad.add('P1 answer-first offers differ from old');
            if (r.calls !== o.calls) bad.add('P1 answer-first call count differs from old');
        }
    }
    return bad;
}

// ---- main: each text has its own seed, so every variant sees the same text and chunkings, and nothing is stored ----
const VARIANTS = ['shipped', 'm1_every_block_leads', 'm2_draft_predicate', 'm3_head_not_trimmed', 'm4_never_warns', 'm5_leading_offers_lost'];
const res = Object.fromEntries(VARIANTS.map((v) => [v, { badCases: 0, tally: new Map(), first: null }]));
const reach = { cases: N, lead: 0, leadWithAnswer: 0, twoBlocks: 0, answerFirst: 0, noSentinel: 0, chunkings: 0, maxLen: 0 };
for (let i = 0; i < N; i++) {
    st = (SEED + Math.imul(i + 1, 2654435761)) >>> 0;
    const t = genText();
    const cs = chunkings(t);
    reach.chunkings += cs.length; reach.maxLen = Math.max(reach.maxLen, t.length);
    if (leads(t)) { reach.lead++; const w = mods.shipped.extractSuggestions(t); if (w.answer.trim()) reach.leadWithAnswer++; if ((t.match(/__MORE__/g) || []).length >= 2) reach.twoBlocks++; }
    else if (t.includes(SENT)) reach.answerFirst++; else reach.noSentinel++;
    let oldRuns = null;
    if (answerFirstOrNone(t)) { oldRuns = []; for (const c of cs) oldRuns.push(await run(mods.old, c)); }
    for (const v of VARIANTS) {
        const bad = await check(v, t, cs, oldRuns);
        if (bad.size) { const R = res[v]; R.badCases++; if (!R.first) R.first = { text: t, bad: [...bad] }; for (const b of bad) R.tally.set(b, (R.tally.get(b) || 0) + 1); }
    }
}
console.log('reach:', JSON.stringify(reach));
for (const v of VARIANTS) {
    const R = res[v];
    console.log(`${v.padEnd(24)} violating texts: ${R.badCases} of ${N}`);
    for (const [k, n] of R.tally) console.log(`    ${String(n).padStart(6)}  ${k}`);
    if (R.first && v === 'shipped') console.log('    first violating text:', JSON.stringify(R.first.text), R.first.bad);
}
