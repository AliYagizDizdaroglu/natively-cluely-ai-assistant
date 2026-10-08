// Throwaway: scores the BLINDED grading of the full-Flash tiers (flash-h40a-blind-pairs.mjs). Per tier
// question: the tier's Flash model (default thinking) ×3 beside 3.1-lite LOW ×3 and 3.5-lite HIGH ×3,
// all re-graded in the same file by the same grader, so the comparison is free of grader severity.
// Each Flash answer shows its own first-token time and thinking tokens. Missing answers count as NO
// ANSWER, never dropped. BLIND_DIR: the calibration run points the same scorer at synthetic verdicts.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const BLIND = process.env.BLIND_DIR ?? `${SP}/flash-h40a/blind`;
const RUN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-24T08-20-12-h40a';
// TIERS as the run recorded them (tiers.json: a stand-in may have served tier 1), via the pairs module.
const { TIERS, FLASH_FILES } = await import(pathToFileURL(`${SP}/flash-h40a-blind-pairs.mjs`).href);
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
const cell = (arm, id, withTime) => [1, 2, 3].map((rep) => {
    const a = answers[arm][rep - 1]?.[id];
    return `${SYM[outcome(arm, rep, id)]}${withTime ? secs(a?.ttft) : ''}`;
}).join(' ');
const acc = (arm, id) => [1, 2, 3].filter((rep) => outcome(arm, rep, id) === 'acceptable').length;

const totals = {};
for (const [t, { model, ids }] of Object.entries(TIERS)) {
    const arm = `${model} default`;
    console.log(`tier ${t}  ${model}${TIERS[t].standInFor ? ` (STAND-IN for ${TIERS[t].standInFor}, which never answered)` : ''}  (${ids.length} questions)`);
    console.log(`  ${'Q'.padEnd(5)} ${'Flash ✓/3'.padEnd(10)} ${'Flash runs (s to first word)'.padEnd(30)} ${'3.1 LOW'.padEnd(9)} ${'3.5 HIGH'.padEnd(9)} thinking tokens   total s`);
    for (const id of ids) {
        const recs = [1, 2, 3].map((rep) => answers[arm][rep - 1]?.[id]).filter(Boolean);
        // Keyed by tier, not arm: a stand-in shares its model with another tier.
        (totals[t] ??= { acc: 0, n: 0, ttft: [], thoughts: [], total: [] });
        totals[t].acc += acc(arm, id); totals[t].n += 3;
        for (const r of recs) { if (r.ttft != null) totals[t].ttft.push(r.ttft); if (r.thoughts != null) totals[t].thoughts.push(r.thoughts); if (r.total != null) totals[t].total.push(r.total); }
        for (const ref of ['3.1-lite LOW', '3.5-lite HIGH']) { (totals[ref] ??= { acc: 0, n: 0 }); totals[ref].acc += acc(ref, id); totals[ref].n += 3; }
        console.log(`  ${id.padEnd(5)} ${String(acc(arm, id)).padEnd(10)} ${cell(arm, id, true).padEnd(30)} ${cell('3.1-lite LOW', id, false).padEnd(9)} ${cell('3.5-lite HIGH', id, false).padEnd(9)} ${recs.map((r) => r.thoughts ?? '?').join('/').padEnd(17)} ${recs.map((r) => secs(r.total)).join('/')}`);
    }
    const T = totals[t];
    console.log(`  ${model} on tier ${t}: ${T.acc}/${T.n} acceptable; first word p50 ${secs(pct(T.ttft, 0.5))} s, p90 ${secs(pct(T.ttft, 0.9))} s, max ${secs(Math.max(...T.ttft, 0))} s; thinking tokens p50 ${pct(T.thoughts, 0.5) ?? '?'}; total p50 ${secs(pct(T.total, 0.5))} s\n`);
}
console.log(`on the same questions, re-graded in the same files: 3.1 LOW ${totals['3.1-lite LOW'].acc}/${totals['3.1-lite LOW'].n}, 3.5 HIGH ${totals['3.5-lite HIGH'].acc}/${totals['3.5-lite HIGH'].n}`);
console.log('\nreasons for every non-acceptable Flash answer:');
for (const { model, ids } of Object.values(TIERS)) for (const id of ids) for (const rep of [1, 2, 3]) {
    const g = grade[`${model} default`]?.[rep]?.[id];
    if (g && g.verdict !== 'acceptable') console.log(`  ${model} ${id} r${rep} ${g.verdict}: ${String(g.reason).slice(0, 200)}`);
}
