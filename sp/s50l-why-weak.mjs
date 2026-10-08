// What are the weak answers, and is the cause the model or the pipeline?
//
// The captured arms replay the APP'S OWN prompt bytes for the same id, so the comparison is
// clean: an id the arms get right but the live hour got wrong is pipeline-or-draw; an id the
// arms also miss is model ceiling. Six reps (3x 3.1 LOW + 3x 3.5 HIGH) give the arms' rate.
import { readFileSync, existsSync } from 'node:fs';

const S = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-21T08-22-34-s50l';
const verdictOf = (v) => (v.correctness === 0 || v.on_topic === 0) ? 'wrong'
    : (v.correctness === 2 && v.on_topic === 2 && v.delivery >= 1) ? 'acceptable' : 'weak';
const load = (t) => { const f = `${S}/s50l-verdicts-${t}.json`; return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null; };

const LOWS = ['captured-low', 'captured-low-r2', 'captured-low-r3'];
const HIGHS = ['captured-high', 'captured-high-r2', 'captured-high-r3'];
const V = Object.fromEntries([...LOWS, ...HIGHS, 'inapp'].map((t) => [t, load(t)]));

// ---------- 1. WHY IS ANY ANSWER NOT ACCEPTABLE? ----------
// verdictOf makes length alone harmless (delivery 1 still passes), so a weak verdict must
// come from correctness 1 or on_topic 1 — or delivery 0, unspeakable text. Count which.
console.log('=== WHAT MAKES AN ANSWER WEAK, across every arm and the live hour ===');
let c1 = 0, o1 = 0, d0 = 0, weakTotal = 0, accTotal = 0, wrongTotal = 0, all = 0;
for (const t of [...LOWS, ...HIGHS, 'inapp']) {
    for (const v of Object.values(V[t])) {
        all++;
        const r = verdictOf(v);
        if (r === 'acceptable') { accTotal++; continue; }
        if (r === 'wrong') { wrongTotal++; continue; }
        weakTotal++;
        if (v.delivery === 0) d0++;
        if (v.correctness === 1) c1++;
        if (v.on_topic === 1) o1++;
    }
}
console.log(`graded answers ${all}: acceptable ${accTotal}, weak ${weakTotal}, wrong ${wrongTotal}`);
console.log(`of the ${weakTotal} weak:  correctness 1 (omitted sub-part) ${c1}   on_topic 1 (partial) ${o1}   delivery 0 (unspeakable) ${d0}`);
console.log('(length alone can never make an answer weak — delivery 1 still counts as acceptable)');

// ---------- 2. THE LIVE HOUR'S OWN MISSES, against the arms on the SAME bytes ----------
console.log('\n=== THE LIVE HOUR\'S MISSES — model ceiling or pipeline? ===');
const inapp = V['inapp'];
const armRate = (id) => {
    const hit = (ts) => ts.filter((t) => V[t][id] && verdictOf(V[t][id]) === 'acceptable').length;
    const has = (ts) => ts.filter((t) => V[t][id]).length;
    return { lo: hit(LOWS), loN: has(LOWS), hi: hit(HIGHS), hiN: has(HIGHS) };
};
const misses = Object.entries(inapp).filter(([, v]) => verdictOf(v) !== 'acceptable');
if (!misses.length) console.log('  none');
for (const [id, v] of misses) {
    const a = armRate(id);
    const armsSeen = a.loN + a.hiN;
    const armsOk = a.lo + a.hi;
    let verdict;
    if (!armsSeen) verdict = 'NO ARM COVERAGE — cannot attribute';
    else if (armsOk === 0) verdict = 'MODEL CEILING — every arm missed it too, on the same bytes';
    else if (armsOk === armsSeen) verdict = 'PIPELINE OR DRAW — every arm got it right on the same bytes';
    else verdict = `COIN-FLIP QUESTION — arms ${armsOk}/${armsSeen}, the live sample drew a miss`;
    console.log(`\n  ${id}  ${verdictOf(v)}  (c${v.correctness} t${v.on_topic} d${v.delivery})`);
    console.log(`    grader: ${v.reason}`);
    console.log(`    same bytes offline: 3.1 LOW ${a.lo}/${a.loN}   3.5 HIGH ${a.hi}/${a.hiN}`);
    console.log(`    => ${verdict}`);
}

// ---------- 3. THE HARD QUESTIONS, ranked by how often the six arms miss them ----------
console.log('\n=== HARDEST IDS across the six captured reps (model capability, pipeline removed) ===');
const ids = Object.keys(V['captured-low']);
const rows = ids.map((id) => {
    const a = armRate(id);
    const ok = a.lo + a.hi, n = a.loN + a.hiN;
    return { id, ok, n, rate: n ? ok / n : null, lo: a.lo, loN: a.loN, hi: a.hi, hiN: a.hiN, live: inapp[id] ? verdictOf(inapp[id]) : '-' };
}).filter((r) => r.rate !== null).sort((x, y) => x.rate - y.rate);
console.log('  id        arms ok   3.1 LOW  3.5 HIGH   live');
for (const r of rows.slice(0, 12)) {
    console.log(`  ${r.id.padEnd(9)} ${String(r.ok).padStart(2)}/${r.n}      ${r.lo}/${r.loN}      ${r.hi}/${r.hiN}      ${r.live}`);
}
const solid = rows.filter((r) => r.rate === 1).length;
const never = rows.filter((r) => r.rate === 0).length;
const flip = rows.length - solid - never;
console.log(`\n  solid 6/6: ${solid}    coin-flip: ${flip}    never: ${never}   of ${rows.length} ids`);
