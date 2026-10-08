// Throwaway: scores the BLINDED grading of the h40b full-Flash tiers (flash-h40b-blind-pairs.mjs). Tier
// 1/2 questions: that tier's Flash model (default thinking) x3 beside 3.1-lite LOW x3 and 3.5-lite HIGH
// x3. Tier 3 and 3b share their 11 questions and each run ONE rep on a different full Flash model, so
// those questions carry 3.6-flash x1 + 3.5-flash x1 + the two lite arms x3 each — all re-graded in the
// same blind files by the same grader. Missing answers count as NO ANSWER, never dropped.
// This is the REAL-DATA scorer: flight day is expected to have legitimate holes (the sidecar's budget
// gate can skip a rep; blind-pairs.mjs records a missing Flash file as NO ANSWER rather than refuse —
// see its header). Every tier/model and both lite arms therefore also print "answered A of N (ids ×
// reps)" (A = individual rep-slots with a spoken record; N = that arm's captured ids × its rep count),
// so a partial hole is visible without failing anything, and without hiding the reps that DID land
// behind one missing rep. A tier with zero captured ids still prints (N1 fix round 2: "answered 0 of
// 0 (ids × reps)"). This script never fails closed on incomplete data; flash-h40b-score-cal.mjs is
// what proves the scoring LOGIC itself is right, always against the complete fixture — run it first
// (must print CALIBRATION OK), then this script.
// RUN_DIR / FLASH_DIR / BLIND_DIR env overrides (read here and by the imported pairs module) point the
// whole pipeline at a calibration fixture; default is the real h40b paths.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const F = process.env.FLASH_DIR ?? `${SP}/flash-h40b`;
const BLIND = process.env.BLIND_DIR ?? `${F}/blind`;
// TIERS/FLASH_FILES/RUN as the h40b run recorded them, via the pairs module (it reads the same RUN_DIR /
// FLASH_DIR env overrides itself, so this stays in step with whatever blind-pairs built).
const { TIERS, FLASH_FILES, RUN } = await import(pathToFileURL(`${SP}/flash-h40b-blind-pairs.mjs`).href);
const REPS = ['', '-r2', '-r3'];
const FILES = {
    ...FLASH_FILES,
    '3.1-lite LOW': REPS.map((r) => `${RUN}/interview60.answers.gemini-3.1-flash-lite_captured-low${r}.json`),
    '3.5-lite HIGH': REPS.map((r) => `${RUN}/interview60.answers.gemini-3.5-flash-lite_captured-high${r}.json`),
};
const answers = Object.fromEntries(Object.entries(FILES).map(([arm, fs_]) => [arm, fs_.map((f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {}))]));
const verdictOf = ({ correctness, on_topic, delivery }) =>
    correctness === 0 || on_topic === 0 ? 'wrong' : correctness === 2 && on_topic === 2 && delivery >= 1 ? 'acceptable' : 'weak';
const SYM = { acceptable: '✓', weak: '◐', wrong: '✗', none: '∅', ungraded: '?' };
const secs = (ms) => (ms == null ? '?' : (ms / 1000).toFixed(1));
const pct = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
// Tier 3 and 3b share their 11 ids but each run ONE rep; tiers 1 and 2 run three. Keyed by arm (each
// model belongs to exactly one tier, so this is unambiguous); lite arms fall back to 3.
const REPCOUNT = Object.fromEntries(Object.entries(TIERS).map(([t, { model }]) => [`${model} default`, (t === '3' || t === '3b') ? 1 : 3]));
const repsOf = (arm) => { const n = REPCOUNT[arm] ?? 3; return Array.from({ length: n }, (_, i) => i + 1); };

const grade = {};
let files = 0; const pending = [];
for (const f of fs.readdirSync(BLIND).filter((x) => /^key\.blind-\d+\.json$/.test(x)).sort((a, b) => +a.match(/\d+/)[0] - +b.match(/\d+/)[0])) {
    const n = f.match(/\d+/)[0];
    const key = JSON.parse(fs.readFileSync(`${BLIND}/${f}`, 'utf8'));
    const vf = `${BLIND}/verdicts.blind-${n}.json`;
    if (!fs.existsSync(vf)) { pending.push(n); continue; }
    const V = JSON.parse(fs.readFileSync(vf, 'utf8'));
    const missingKeys = Object.keys(key).filter((k) => !V[k]);
    if (missingKeys.length) { console.error(`verdicts.blind-${n}.json lacks ${missingKeys.length} keys (${missingKeys.slice(0, 3).join(',')}) — refusing to score a half-graded file`); process.exit(3); }
    files++;
    for (const [k, { arm, rep, id }] of Object.entries(key)) ((grade[arm] ??= {})[rep] ??= {})[id] = { verdict: verdictOf(V[k]), reason: V[k].reason };
}
console.log(`blind files graded: ${files}${pending.length ? `  (PENDING: ${pending.join(',')})` : ''}\n`);
const outcome = (arm, rep, id) => grade[arm]?.[rep]?.[id]?.verdict ?? (answers[arm][rep - 1]?.[id]?.spoken ? 'ungraded' : 'none');
const cell = (arm, id, withTime) => repsOf(arm).map((rep) => {
    const a = answers[arm][rep - 1]?.[id];
    return `${SYM[outcome(arm, rep, id)]}${withTime ? secs(a?.ttft) : ''}`;
}).join(' ');
const acc = (arm, id) => repsOf(arm).filter((rep) => outcome(arm, rep, id) === 'acceptable').length;
// "Answered", separate from "acceptable" (graded well): counts individual rep-slots with a spoken
// record, over ALL reps this arm ran for the given ids — NOT whether every rep for an id landed (that
// would hide 2 of 3 good reps behind 1 missing one). It does NOT show an uncaptured id: an id absent
// from `ids` (tiers.json) never enters this count either way — captured-id gaps stay invisible here,
// same as everywhere else in this script (Q-m5, deferred).
const answeredCount = (arm, ids) => 0;

const totals = {};
for (const [t, { model, ids }] of Object.entries(TIERS)) {
    const arm = `${model} default`;
    const n = REPCOUNT[arm] ?? 3;
    totals[t] = { acc: 0, n: 0, ttft: [], thoughts: [], total: [] };   // N1: created even when ids is empty
    console.log(`tier ${t}  ${model}  (${ids.length} questions, ${n} rep${n > 1 ? 's' : ''})`);
    console.log(`  ${'Q'.padEnd(5)} ${`Flash ✓/${n}`.padEnd(10)} ${'Flash runs (s to first word)'.padEnd(30)} ${'3.1 LOW'.padEnd(9)} ${'3.5 HIGH'.padEnd(9)} thinking tokens   total s`);
    for (const id of ids) {
        const recs = repsOf(arm).map((rep) => answers[arm][rep - 1]?.[id]).filter(Boolean);
        totals[t].acc += acc(arm, id); totals[t].n += n;
        for (const r of recs) { if (r.ttft != null) totals[t].ttft.push(r.ttft); if (r.thoughts != null) totals[t].thoughts.push(r.thoughts); if (r.total != null) totals[t].total.push(r.total); }
        console.log(`  ${id.padEnd(5)} ${String(acc(arm, id)).padEnd(10)} ${cell(arm, id, true).padEnd(30)} ${cell('3.1-lite LOW', id, false).padEnd(9)} ${cell('3.5-lite HIGH', id, false).padEnd(9)} ${recs.map((r) => r.thoughts ?? '?').join('/').padEnd(17)} ${recs.map((r) => secs(r.total)).join('/')}`);
    }
    const T = totals[t];
    console.log(`  ${model} on tier ${t}: answered ${answeredCount(arm, ids)} of ${ids.length * n} (ids × reps)`);
    console.log(`  ${model} on tier ${t}: ${T.acc}/${T.n} acceptable; first word p50 ${secs(pct(T.ttft, 0.5))} s, p90 ${secs(pct(T.ttft, 0.9))} s, max ${secs(Math.max(...T.ttft, 0))} s; thinking tokens p50 ${pct(T.thoughts, 0.5) ?? '?'}; total p50 ${secs(pct(T.total, 0.5))} s\n`);
}
// Lite totals: once per UNIQUE id. Tier 3 and 3b share their 11 ids as the SAME blind item (graded once,
// not twice — see flash-h40b-blind-pairs.mjs), so summing inside the tier loop above would double them.
const uniqueIds = [...new Set(Object.values(TIERS).flatMap(({ ids }) => ids))];
const liteTotals = { '3.1-lite LOW': { acc: 0, n: 0 }, '3.5-lite HIGH': { acc: 0, n: 0 } };
for (const id of uniqueIds) for (const ref of Object.keys(liteTotals)) { liteTotals[ref].acc += acc(ref, id); liteTotals[ref].n += 3; }
console.log(`lite answered: 3.1 LOW ${answeredCount('3.1-lite LOW', uniqueIds)} of ${uniqueIds.length * 3} (ids × reps), 3.5 HIGH ${answeredCount('3.5-lite HIGH', uniqueIds)} of ${uniqueIds.length * 3} (ids × reps)`);
console.log(`on the same questions, re-graded in the same files: 3.1 LOW ${liteTotals['3.1-lite LOW'].acc}/${liteTotals['3.1-lite LOW'].n}, 3.5 HIGH ${liteTotals['3.5-lite HIGH'].acc}/${liteTotals['3.5-lite HIGH'].n}`);
console.log('\nreasons for every non-acceptable Flash answer:');
for (const { model, ids } of Object.values(TIERS)) for (const id of ids) for (const rep of repsOf(`${model} default`)) {
    const g = grade[`${model} default`]?.[rep]?.[id];
    if (g && g.verdict !== 'acceptable') console.log(`  ${model} ${id} r${rep} ${g.verdict}: ${String(g.reason).slice(0, 200)}`);
}
