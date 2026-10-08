// Throwaway, read-only, reported only (never part of the decision): where the cue arm gains or loses against control,
// per id, with the same tally as cuebench-score.mjs (acceptable = mean of the two graders' verdictOf; consensus-wrong =
// both correctness 0; an empty answer = 0/0/0 for both). Prints ids and numbers only, never answer text.
//   node per-id.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const { BLIND, REPS } = await import('./cuebench-pairs.mjs');
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const J = await import(pathToFileURL(`${MAIN}/electron/test/golden/interview60.judge.mjs`).href);
const per = new Map();   // id -> { control: [acc per rep], cue: [...], wrong: [] }
const totals = {};
for (const r of REPS) for (const h of [1, 2]) {
    const key = JSON.parse(fs.readFileSync(path.join(BLIND, `key.r${r}.h${h}.json`), 'utf8'));
    const g = ['g1', 'g2'].map((gr) => JSON.parse(fs.readFileSync(path.join(BLIND, `verdicts.r${r}.h${h}.${gr}.json`), 'utf8')));
    for (const [k, meta] of Object.entries(key)) {
        const vs = meta.empty ? [{ correctness: 0, on_topic: 0, delivery: 0 }, { correctness: 0, on_topic: 0, delivery: 0 }] : g.map((v) => v[k]);
        const acc = vs.filter((v) => J.verdictOf(v) === 'acceptable').length / 2;
        const e = per.get(meta.id) ?? { control: [0, 0, 0], cue: [0, 0, 0], wrong: [] };
        e[meta.arm][r - 1] = acc;
        if (vs.every((v) => v.correctness === 0)) e.wrong.push(`${meta.arm} r${r}${meta.empty ? ' (empty)' : ''}`);
        per.set(meta.id, e);
        totals[`${meta.arm} r${r}`] = (totals[`${meta.arm} r${r}`] ?? 0) + acc;
    }
}
console.log('totals (must equal cuebench-score.out.txt):', JSON.stringify(totals));
const rows = [...per].map(([id, e]) => ({ id, c: e.control.reduce((a, b) => a + b, 0), q: e.cue.reduce((a, b) => a + b, 0), e }));
const fmt = (a) => a.map((x) => x.toFixed(1)).join(' ');
console.log('\nids where the cue arm is LOWER over the three reps (control sum vs cue sum, per rep):');
for (const x of rows.filter((x) => x.q < x.c).sort((a, b) => (a.q - a.c) - (b.q - b.c))) console.log(`  ${x.id.padEnd(7)} control ${x.c.toFixed(1)} [${fmt(x.e.control)}]  cue ${x.q.toFixed(1)} [${fmt(x.e.cue)}]  diff ${(x.q - x.c).toFixed(1)}`);
console.log('ids where the cue arm is HIGHER:');
for (const x of rows.filter((x) => x.q > x.c).sort((a, b) => (b.q - b.c) - (a.q - a.c))) console.log(`  ${x.id.padEnd(7)} control ${x.c.toFixed(1)} [${fmt(x.e.control)}]  cue ${x.q.toFixed(1)} [${fmt(x.e.cue)}]  diff +${(x.q - x.c).toFixed(1)}`);
console.log(`equal: ${rows.filter((x) => x.q === x.c).length} ids`);
console.log('\nconsensus-wrong:');
for (const x of rows.filter((x) => x.e.wrong.length)) console.log(`  ${x.id}: ${x.e.wrong.join(', ')}`);
const net = rows.reduce((a, x) => a + (x.q - x.c), 0);
console.log(`\nnet over all ids and reps: ${net.toFixed(1)} (${rows.filter((x) => x.q < x.c).length} ids lower, ${rows.filter((x) => x.q > x.c).length} higher)`);
