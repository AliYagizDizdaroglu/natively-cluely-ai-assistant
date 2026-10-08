// Task 5 (throwaway): is a fresh extractor output deep-equal to a committed turns fixture?
//   node t5-compare-fixture.mjs <fresh.json> <committed.json>
// Compares EVERY key except `extractedAt` (which differs by design) with util.isDeepStrictEqual, and reports
// `finals`, `items` and `actual` (the three the plan names) separately. Calibrated in the same run: six
// single-value mutations of a deep clone of the fresh output (a dropped final, a changed final text, a
// shifted final timestamp, swapped items, a changed dispatch question, a shifted voice boundary) must each
// be reported as DIFFERENT, so the comparison can fail. Read-only.
import fs from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
const [freshPath, committedPath] = process.argv.slice(2);
if (!freshPath || !committedPath) { console.log('usage: node t5-compare-fixture.mjs <fresh.json> <committed.json>'); process.exit(2); }
const fresh = JSON.parse(fs.readFileSync(freshPath, 'utf8'));
const committed = JSON.parse(fs.readFileSync(committedPath, 'utf8'));
const IGNORED = new Set(['extractedAt']);
const keysOf = (o) => Object.keys(o).filter((k) => !IGNORED.has(k));
const compare = (a, b) => {
    const ka = keysOf(a), kb = keysOf(b);
    const diffs = [];
    if (!isDeepStrictEqual([...ka].sort(), [...kb].sort())) diffs.push(`key sets differ: ${ka.join(',')} vs ${kb.join(',')}`);
    for (const k of new Set([...ka, ...kb])) if (!isDeepStrictEqual(a[k], b[k])) diffs.push(k);
    return diffs;
};
const len = (v) => (Array.isArray(v) ? v.length : typeof v === 'object' && v ? Object.keys(v).length : String(v));
console.log(`fresh:     ${freshPath}`);
console.log(`committed: ${committedPath}`);
console.log(`keys (fresh):     ${Object.keys(fresh).join(', ')}`);
console.log(`keys (committed): ${Object.keys(committed).join(', ')}`);
for (const k of ['finals', 'items', 'actual', 'detections']) {
    console.log(`  ${k}: fresh ${len(fresh[k])}, committed ${len(committed[k])}, deep-equal ${isDeepStrictEqual(fresh[k], committed[k])}`);
}
for (const k of ['run', 'roster', 'offsetMs']) console.log(`  ${k}: fresh ${JSON.stringify(fresh[k])}, committed ${JSON.stringify(committed[k])}`);
console.log(`  extractedAt: fresh ${fresh.extractedAt}, committed ${committed.extractedAt} (differs by design: ${fresh.extractedAt !== committed.extractedAt})`);
const diffs = compare(fresh, committed);
console.log(`every key except extractedAt deep-equal: ${diffs.length === 0}${diffs.length ? ' — differing: ' + diffs.join('; ') : ''}`);

// Calibration: mutate a deep clone of `fresh`; each mutation must make the comparison report exactly its key.
const clone = () => JSON.parse(JSON.stringify(fresh));
const mutations = [
    ['drop finals[0]', 'finals', (o) => { o.finals.shift(); }],
    ['append a char to finals[5].text', 'finals', (o) => { o.finals[5].text += 'x'; }],
    ['shift finals[10].at by 1 ms', 'finals', (o) => { o.finals[10].at += 1; }],
    ['swap items[0] and items[1]', 'items', (o) => { [o.items[0], o.items[1]] = [o.items[1], o.items[0]]; }],
    ['change actual[3].question', 'actual', (o) => { o.actual[3].question += '?'; }],
    ['shift items[0].voice[0][0] by 20 ms', 'items', (o) => { o.items[0].voice[0][0] += 20; }],
];
let calibrationBad = 0;
for (const [name, key, fn] of mutations) {
    const m = clone();
    fn(m);
    const d = compare(m, committed);
    const ok = d.length === 1 && d[0] === key;
    if (!ok) calibrationBad++;
    console.log(`  calibration [${ok ? 'good' : 'BAD'}] ${name}: reported ${d.length ? d.join('; ') : 'NOTHING'}`);
}
const pass = diffs.length === 0 && calibrationBad === 0;
console.log(pass ? 'RESULT: deep-equal, and the comparison is calibrated (6/6 mutations detected)' : 'RESULT: PROBLEM (see above)');
process.exit(pass ? 0 : 1);
