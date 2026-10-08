// twin-diagnostics.mjs — read-only diagnostics over a flight's twin arms. No API calls.
//
//   node twin-diagnostics.mjs <run-dir>
//
// Part A: TTFT drift across the three reps WITHIN each model. Declared in the s50m
//         pre-registration amendment as the control on the arm-order confound.
// Part B: does the candidate's advantage concentrate on the mains where it thought hardest?
//         A diagnostic on the deliberation mechanism. It decides nothing.
//
// Calibration: run it on s50l first, where the mains reps are known to be 3.1 15/16/16 and
// 3.5 17/17/18. If Part B's per-rep line does not reproduce those, the script is wrong.
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];
if (!dir || !fs.existsSync(dir)) { console.error('usage: twin-diagnostics.mjs <run-dir>'); process.exit(1); }

const LOW = ['captured-low', 'captured-low-r2', 'captured-low-r3'];
const HIGH = ['captured-high', 'captured-high-r2', 'captured-high-r3'];
const MODEL = { low: 'gemini-3.1-flash-lite', high: 'gemini-3.5-flash-lite' };

const load = (kind, tag) => {
    const a = path.join(dir, `interview60.answers.${MODEL[kind]}_${tag}.json`);
    const j = path.join(dir, `interview60.judge.${MODEL[kind]}_${tag}.json`);
    if (!fs.existsSync(a) || !fs.existsSync(j)) return null;
    const answers = JSON.parse(fs.readFileSync(a, 'utf8'));
    const items = JSON.parse(fs.readFileSync(j, 'utf8')).items ?? {};
    return { answers, items };
};

const arms = { low: LOW.map((t) => load('low', t)), high: HIGH.map((t) => load('high', t)) };
for (const [k, v] of Object.entries(arms)) {
    if (v.some((x) => !x)) { console.error(`missing one or more ${k} twin arms in ${dir}`); process.exit(2); }
}

// ids present in all six arms
const all = [...arms.low, ...arms.high];
const shared = Object.keys(all[0].items).filter((id) => all.every((a) => a.items[id] && a.answers[id]));
const mains = shared.filter((id) => all[0].items[id].level !== 'followup');
const verdicts = new Set(all.flatMap((a) => shared.map((id) => a.items[id].verdict)));
const ACCEPT = 'acceptable';
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);

console.log(`run: ${path.basename(dir)}`);
console.log(`shared ids ${shared.length}, of which mains ${mains.length}, follow-ups ${shared.length - mains.length}`);
console.log(`verdict values seen: ${[...verdicts].join(', ')}\n`);

// ---- Part A: TTFT drift across reps within each model -------------------------------------
console.log('PART A — TTFT p50 / p90 by rep, within each model (the arm-order control)');
const pct = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
for (const kind of ['low', 'high']) {
    const line = arms[kind].map((arm, i) => {
        const t = shared.map((id) => arm.answers[id].ttft).filter((x) => typeof x === 'number');
        return `rep${i + 1} ${pct(t, 0.5)} / ${pct(t, 0.9)} ms`;
    });
    console.log(`  ${MODEL[kind]}:  ${line.join('   ')}`);
}
console.log('  Read: a flat line inside BOTH models means batch drift is small and cross-model');
console.log('  latency is worth reporting. A trend inside either discounts it to nothing.\n');

// ---- Part B: does the advantage sit where the candidate thought hardest? -------------------
const acc = (kind, id) => arms[kind].filter((a) => a.items[id].verdict === ACCEPT).length;
const reps = (kind) => arms[kind].map((a) => mains.filter((id) => a.items[id].verdict === ACCEPT).length);
console.log('PART B — mains only, thinking volume against the per-question gap');
console.log(`  mains reps  3.1 LOW ${reps('low').join(' / ')}   3.5 HIGH ${reps('high').join(' / ')}`);
console.log('  (calibration: on s50l these must read 15 / 16 / 16 and 17 / 17 / 18)\n');

const rows = mains.map((id) => ({
    id,
    d: acc('high', id) - acc('low', id),
    thHigh: med(arms.high.map((a) => a.answers[id].thoughts ?? 0)),
    thLow: med(arms.low.map((a) => a.answers[id].thoughts ?? 0)),
})).sort((a, b) => b.thHigh - a.thHigh);

const cut = med(rows.map((r) => r.thHigh));
const hi = rows.filter((r) => r.thHigh >= cut), lo = rows.filter((r) => r.thHigh < cut);
console.log(`  split at the candidate's median thoughts (${cut}):`);
console.log(`    thought MORE  n=${hi.length}  mean gap ${mean(hi.map((r) => r.d)).toFixed(2)}  (gap = 3.5 acceptable reps minus 3.1, out of 3)`);
console.log(`    thought LESS  n=${lo.length}  mean gap ${mean(lo.map((r) => r.d)).toFixed(2)}`);
console.log('  If deliberation is the mechanism, the top half should carry the gap.\n');

console.log('  every main, most thinking first:');
console.log('  id            3.5 thoughts   3.1 thoughts   gap');
for (const r of rows) console.log(`  ${r.id.padEnd(12)}  ${String(r.thHigh).padStart(10)}   ${String(r.thLow).padStart(12)}   ${r.d > 0 ? '+' : ''}${r.d}`);
console.log('\n  This is a diagnostic. It is not part of any rule and cannot rescue one.');
