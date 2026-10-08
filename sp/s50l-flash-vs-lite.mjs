// Do the BIGGER Flash models solve what the lites miss? The focused arms replay the app's
// own captured prompt on the hard ids, so this is the same-bytes comparison.
// Also pulls TTFT per arm, because a model that answers better but arrives after the 10 s
// stall budget cannot be the primary — quality and latency have to be read together.
import { readFileSync, existsSync } from 'node:fs';

const S = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-21T08-22-34-s50l';
const verdictOf = (v) => (v.correctness === 0 || v.on_topic === 0) ? 'wrong'
    : (v.correctness === 2 && v.on_topic === 2 && v.delivery >= 1) ? 'acceptable' : 'weak';
const load = (t) => { const f = `${S}/s50l-verdicts-${t}.json`; return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null; };

const LOWS = ['captured-low', 'captured-low-r2', 'captured-low-r3'];
const HIGHS = ['captured-high', 'captured-high-r2', 'captured-high-r3'];
const FLASH = [['3.8-flash', 'flash38', 'gemini-3.8-flash'], ['3.7-flash', 'flash37', 'gemini-3.7-flash'],
    ['3.6-flash', 'flash36', 'gemini-3.6-flash'], ['3.5-flash', 'flash35', 'gemini-3.5-flash']];
const V = Object.fromEntries([...LOWS, ...HIGHS, 'inapp', ...FLASH.map((f) => f[1])].map((t) => [t, load(t)]));

const ttftOf = (file) => {
    const p = `${R}/interview60.answers.${file}.json`;
    if (!existsSync(p)) return {};
    const j = JSON.parse(readFileSync(p, 'utf8'));
    return Object.fromEntries(Object.entries(j).map(([k, r]) => [k, r && typeof r.ttft === "number" ? r.ttft : null]));
};
const T = Object.fromEntries(FLASH.map((f) => [f[1], ttftOf(f[2])]));

// Every id any flash arm touched.
const ids = [...new Set(FLASH.flatMap((f) => (V[f[1]] ? Object.keys(V[f[1]]) : [])))].sort();
const hit = (ts, id) => ts.filter((t) => V[t][id] && verdictOf(V[t][id]) === 'acceptable').length;
const has = (ts, id) => ts.filter((t) => V[t][id]).length;

console.log('=== THE FOCUSED IDS: big Flash against the two lites, on the app\'s own prompt ===');
console.log('    (a = acceptable, w = weak; lites shown as reps-acceptable out of reps-run)\n');
console.log('  id       3.1LOW  3.5HIGH | 3.8-flash      3.7-flash      3.6-flash      3.5-flash   | live');
for (const id of ids) {
    const lo = `${hit(LOWS, id)}/${has(LOWS, id)}`, hi = `${hit(HIGHS, id)}/${has(HIGHS, id)}`;
    const cells = FLASH.map(([, tag]) => {
        const v = V[tag] ? V[tag][id] : null;
        if (!v) return '   -        ';
        const ms = T[tag][id];
        return `${verdictOf(v) === 'acceptable' ? 'a' : 'w'} ${ms == null ? '   ?  ' : (ms / 1000).toFixed(1) + 's'}`.padEnd(12);
    });
    const live = V['inapp'][id] ? verdictOf(V['inapp'][id])[0] : '-';
    console.log(`  ${id.padEnd(8)} ${lo.padStart(5)}  ${hi.padStart(6)}  | ${cells.join('  ')} | ${live}`);
}

console.log('\n=== DOES BIG FLASH RESCUE WHAT THE LITES MISS? ===');
let rescued = 0, alsoMissed = 0, bothFine = 0, flashWorse = 0, cmp = 0;
for (const id of ids) {
    const liteOk = hit(LOWS, id) + hit(HIGHS, id);
    const liteN = has(LOWS, id) + has(HIGHS, id);
    if (!liteN) continue;
    const liteRate = liteOk / liteN;
    for (const [name, tag] of FLASH.map((f) => [f[0], f[1]])) {
        const v = V[tag] ? V[tag][id] : null;
        if (!v) continue;
        cmp++;
        const ok = verdictOf(v) === 'acceptable';
        if (liteRate < 1 && ok) { rescued++; console.log(`  RESCUED  ${id} by ${name}  (lites ${liteOk}/${liteN})`); }
        else if (liteRate < 1 && !ok) { alsoMissed++; console.log(`  ALSO MISSED  ${id} by ${name}  (lites ${liteOk}/${liteN}) — ${v.reason}`); }
        else if (liteRate === 1 && !ok) { flashWorse++; console.log(`  FLASH WORSE  ${id} by ${name}  (lites ${liteOk}/${liteN} perfect) — ${v.reason}`); }
        else bothFine++;
    }
}
console.log(`\n  of ${cmp} flash-vs-lite comparisons: rescued ${rescued}, also missed ${alsoMissed}, flash worse ${flashWorse}, both fine ${bothFine}`);

console.log('\n=== LATENCY, which decides whether any of this is usable live ===');
console.log('  the app abandons a primary at 10 s (stall budget) and the gate bar is TTFT p90 <= 10 s');
for (const [name, tag] of FLASH.map((f) => [f[0], f[1]])) {
    const xs = Object.values(T[tag]).filter((x) => typeof x === 'number').sort((a, b) => a - b);
    if (!xs.length) { console.log(`  ${name.padEnd(10)} no timing`); continue; }
    const p = (q) => (xs[Math.min(xs.length - 1, Math.floor(q * xs.length))] / 1000).toFixed(1);
    const over = xs.filter((x) => x > 10_000).length;
    console.log(`  ${name.padEnd(10)} n=${xs.length}  p50 ${p(0.5)}s  p90 ${p(0.9)}s  max ${(xs[xs.length - 1] / 1000).toFixed(1)}s   over 10 s: ${over}/${xs.length}`);
}
for (const [name, tags] of [['3.1-lite LOW', LOWS], ['3.5-lite HIGH', HIGHS]]) {
    const xs = tags.flatMap((t) => Object.values(ttftOf(t === 'captured-low' ? 'gemini-3.1-flash-lite_captured-low'
        : t === 'captured-low-r2' ? 'gemini-3.1-flash-lite_captured-low-r2'
        : t === 'captured-low-r3' ? 'gemini-3.1-flash-lite_captured-low-r3'
        : t === 'captured-high' ? 'gemini-3.5-flash-lite_captured-high'
        : t === 'captured-high-r2' ? 'gemini-3.5-flash-lite_captured-high-r2'
        : 'gemini-3.5-flash-lite_captured-high-r3'))).filter((x) => typeof x === 'number').sort((a, b) => a - b);
    const p = (q) => (xs[Math.min(xs.length - 1, Math.floor(q * xs.length))] / 1000).toFixed(1);
    console.log(`  ${name.padEnd(10)} n=${xs.length}  p50 ${p(0.5)}s  p90 ${p(0.9)}s  max ${(xs[xs.length - 1] / 1000).toFixed(1)}s   over 10 s: ${xs.filter((x) => x > 10_000).length}/${xs.length}`);
}
