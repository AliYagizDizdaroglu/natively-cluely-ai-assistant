// Differential: app (bundled from WT, read-only) vs reference, on generated inputs. Prints counts only.
//   node diff.mjs            -> app-eq.mjs
//   EQ_APP=./mutant.mjs node diff.mjs   (calibration: a known-different module must show diffs)
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = await import(pathToFileURL(path.join(HERE, process.env.EQ_APP || 'app-eq.mjs')).href);
const QR = await import(pathToFileURL(path.join(HERE, 'app-qr.mjs')).href);
const REF = await import(pathToFileURL(path.join(HERE, '../../earlierQuestion.ref.mjs')).href);
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const { SCENARIO50 } = await import(pathToFileURL(`${MAIN}/electron/test/golden/scenario50.questions.mjs`).href);

// deterministic PRNG
let s = 0x9e3779b9;
const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 2 ** 32; };
const pick = (a) => a[Math.floor(rnd() * a.length)];

const roster = SCENARIO50.map((i) => i.q);
const invented = [
    'Why that one?', 'Why?', 'And in production?', 'Does that scale?', 'What about Redis instead?', 'Okay, and if it fails?',
    'Describe how you would shard the telemetry store by tenant.', 'How would you rebalance those shards after a tenant doubles in size?',
    'Explain the CAP theorem.', 'Going back to the micro-batcher, how would you shard it?', 'How would your design change?',
    '', '   ', '\n', 'a', 'ab', 'abc', 'Describe how you would shard\nthe telemetry store by tenant.', '  x\t\ty  ',
    'Which eviction policy would you pick for the session cache, so that hot users stay resident?',
    'store by tenant.', 'the telemetry store', 'ÇÖĞ şü — what about it?', '😀 does it work 😀', 'That.',
];
const long = () => Array.from({ length: 30 + Math.floor(rnd() * 120) }, () => pick(['shard', 'tenant', 'ordering', 'the', 'guarantee', 'queue', '\n', '  ', 'it', '😀', 'é', 'x'])).join(' ');
const text = () => { const r = rnd(); if (r < 0.45) return pick(roster); if (r < 0.8) return pick(invented); if (r < 0.9) return long(); const a = pick(roster); return r < 0.95 ? `${a} ${pick(invented)}` : `${pick(invented)} ${a}`; };
const frag = (t) => { const w = t.split(/\s+/); const i = Math.floor(rnd() * w.length); return w.slice(i, i + 1 + Math.floor(rnd() * 8)).join(' '); };
const tid = () => pick([null, 0, 1, 2, 3, 4, 5]);
const ledger = () => { if (rnd() < 0.01) return pick([null, undefined]); const n = Math.floor(rnd() * 5); return Array.from({ length: n }, (_, i) => ({ text: rnd() < 0.03 ? pick([null, 42, undefined]) : text(), turnId: tid(), seq: i + 1 })); };
const promptLines = (led) => { if (rnd() < 0.01) return undefined; const n = Math.floor(rnd() * 6); const out = []; for (let i = 0; i < n; i++) { const r = rnd(); const last = Array.isArray(led) && led.length ? led[led.length - 1].text : null; if (typeof last === 'string' && r < 0.3) out.push(r < 0.15 ? last : frag(last)); else if (r < 0.32) out.push(null); else out.push(text()); } return out; };

const J = (v) => JSON.stringify(v, (k, x) => (x === undefined ? '__undef__' : x));
let n = 0, diffs = {}; const bump = (k) => { diffs[k] = (diffs[k] || 0) + 1; };
const whys = {};
const N = Number(process.env.N || 20000);
for (let i = 0; i < N; i++) {
    const led = ledger();
    const input = {};
    if (rnd() < 0.9) input.question = rnd() < 0.05 ? pick([null, undefined, 7]) : text();
    if (rnd() < 0.85) input.turnId = tid();
    if (rnd() < 0.5) input.supersede = rnd() < 0.3;
    if (rnd() < 0.3) input.enabled = rnd() < 0.85;
    if (rnd() < 0.97) input.ledger = led;
    const pl = promptLines(led); if (pl !== undefined) input.promptLines = pl;
    const a = APP.buildEarlierQuestion(input), r = REF.buildEarlierQuestion(input);
    n++; if (J(a) !== J(r)) bump('buildEarlierQuestion'); whys[r.why] = (whys[r.why] || 0) + 1;
    // recordAsked on valid ledgers
    if (Array.isArray(led)) {
        const w = { text: rnd() < 0.1 ? pick([null, undefined, '', '  ']) : text(), seq: 100 + i };
        if (rnd() < 0.85) w.turnId = tid();
        if (rnd() < 0.3) w.enabled = rnd() < 0.8;
        const ra = APP.recordAsked(led, w), rr = REF.recordAsked(led, w);
        if (J(ra) !== J(rr) || (ra === led) !== (rr === led)) bump('recordAsked');
    }
    const t = text();
    if (APP.clip(t) !== REF.clip(t)) bump('clip');
    if (APP.formatBlock(t) !== REF.formatBlock(t)) bump('formatBlock');
    const b = rnd() < 0.5 ? frag(t) : text();
    if (QR.sameAnchor(t, b) !== REF.sameAnchor(t, b)) bump('sameAnchor');
}
// long-text clip boundaries
for (let len = 440; len <= 470; len++) for (const ch of ['x', ' x', '😀']) { const t = ch.repeat(len); if (APP.clip(t) !== REF.clip(t)) bump('clip-boundary'); }
for (const k of ['LEDGER_DEPTH', 'PARENT_MAX_CHARS', 'CLIP_HEAD', 'CLIP_TAIL', 'LABEL']) if (APP[k] !== REF[k]) bump(`const:${k}`);
console.log(`cases ${n}; LABEL length ${APP.LABEL.length}; ref why distribution ${J(whys)}`);
console.log(`diffs ${J(diffs)}`);
