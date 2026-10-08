// Throwaway: scores the BLINDED 3-arm grading of the h40a Gemma sidecar (gemma-h40a-blind-pairs.mjs).
// Same grader, same file for every arm's answers to a question, so arm differences are free of
// grader-to-grader severity. Missing answers count as NO ANSWER, never dropped.
// BLIND_DIR: the calibration run points the same scorer at synthetic verdicts.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const BLIND = process.env.BLIND_DIR ?? `${SP}/gemma-h40a/blind`;
const { ARM_FILES, IDS } = await import(pathToFileURL(`${SP}/gemma-h40a-blind-pairs.mjs`).href);
const ARMS = Object.keys(ARM_FILES), REF = ['3.1-lite LOW', '3.5-lite HIGH'], GEMMA = 'Gemma 26B MINIMAL';
const isFollow = (id) => /F\d*$/.test(id);
const verdictOf = ({ correctness, on_topic, delivery }) =>
    correctness === 0 || on_topic === 0 ? 'wrong' : correctness === 2 && on_topic === 2 && delivery >= 1 ? 'acceptable' : 'weak';
const pct = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const secs = (ms) => (ms == null ? '-' : `${(ms / 1000).toFixed(1)}s`);

const grade = {};
let files = 0, graded = 0; const pending = [];
for (const f of fs.readdirSync(BLIND).filter((x) => /^key\.blind-\d+\.json$/.test(x)).sort((a, b) => +a.match(/\d+/)[0] - +b.match(/\d+/)[0])) {
    const n = f.match(/\d+/)[0];
    const key = JSON.parse(fs.readFileSync(`${BLIND}/${f}`, 'utf8'));
    const vf = `${BLIND}/verdicts.blind-${n}.json`;
    if (!fs.existsSync(vf)) { pending.push(n); continue; }
    const V = JSON.parse(fs.readFileSync(vf, 'utf8'));
    const missingKeys = Object.keys(key).filter((k) => !V[k]);
    if (missingKeys.length) { console.error(`verdicts.blind-${n}.json lacks ${missingKeys.length} keys (${missingKeys.slice(0, 3).join(',')}) — refusing to score a half-graded file`); process.exit(3); }
    files++;
    for (const [k, { arm, rep, id }] of Object.entries(key)) { ((grade[arm] ??= {})[rep] ??= {})[id] = { verdict: verdictOf(V[k]), d0: V[k].delivery === 0 }; graded++; }
}
console.log(`blind files graded: ${files}${pending.length ? `  (PENDING: ${pending.join(',')})` : ''}   answers graded: ${graded}   ids ${IDS.length}\n`);

const answers = Object.fromEntries(ARMS.map((arm) => [arm, ARM_FILES[arm].map((f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {}))]));
const outcome = (arm, rep, id) => grade[arm]?.[rep]?.[id]?.verdict ?? (answers[arm][rep - 1]?.[id]?.spoken ? 'ungraded' : 'none');

console.log('arm                 acceptable/44 by rep   mean   mains  follow-ups | weak wrong none d0 (3 reps) | first answer p50/p90   words p50 | cuts  holes/calls');
const rows = [];
for (const arm of ARMS) {
    const acc = [1, 2, 3].map((rep) => IDS.filter((id) => outcome(arm, rep, id) === 'acceptable').length);
    const mean = acc.reduce((s, x) => s + x, 0) / 3;
    const cnt = (v) => [1, 2, 3].reduce((s, rep) => s + IDS.filter((id) => outcome(arm, rep, id) === v).length, 0);
    const mainsMean = [1, 2, 3].reduce((s, rep) => s + IDS.filter((id) => !isFollow(id) && outcome(arm, rep, id) === 'acceptable').length, 0) / 3;
    const fuMean = [1, 2, 3].reduce((s, rep) => s + IDS.filter((id) => isFollow(id) && outcome(arm, rep, id) === 'acceptable').length, 0) / 3;
    const recs = answers[arm].flatMap((s) => IDS.map((id) => s[id]).filter(Boolean));
    const ans = recs.filter((x) => x.spoken);
    const r = { arm, acc, mean, mainsMean, fuMean, weak: cnt('weak'), wrong: cnt('wrong'), none: cnt('none'), ungraded: cnt('ungraded'),
        d0: [1, 2, 3].reduce((s, rep) => s + IDS.filter((id) => grade[arm]?.[rep]?.[id]?.d0).length, 0),
        t50: pct(ans.map((x) => x.ttft).filter((x) => x != null), 0.5), t90: pct(ans.map((x) => x.ttft).filter((x) => x != null), 0.9),
        words: pct(ans.map((x) => x.words), 0.5), cuts: recs.filter((x) => x.cutRetried).length, holes: IDS.length * 3 - ans.length, calls: IDS.length * 3 };
    rows.push(r);
    console.log(`${arm.padEnd(19)} ${acc.join(' / ').padEnd(22)} ${mean.toFixed(1).padStart(5)}  ${mainsMean.toFixed(1).padStart(5)}  ${fuMean.toFixed(1).padStart(6)}     | ${String(r.weak).padStart(4)} ${String(r.wrong).padStart(5)} ${String(r.none).padStart(4)} ${String(r.d0).padStart(2)}          | ${secs(r.t50).padStart(6)} / ${secs(r.t90).padEnd(7)}       ${String(r.words ?? '-').padStart(4)} | ${String(r.cuts).padStart(4)}  ${r.holes}/${r.calls}${r.ungraded ? `  (${r.ungraded} UNGRADED)` : ''}`);
}

const signP = (up, down) => { const n = up + down, k = Math.min(up, down); if (!n) return 1; let c = 1, s = 0; for (let i = 0; i <= k; i++) { s += c; c = (c * (n - i)) / (i + 1); } return Math.min(1, (2 * s) / 2 ** n); };
console.log('\nPAIRED, same grader, same file: each (question, rep) both arms have. Reps of one question are not independent — the sign test is indicative.');
const pairsOf = (A, B) => {
    let up = 0, down = 0, n = 0, aNone = 0;
    for (const id of IDS) for (const rep of [1, 2, 3]) {
        const a = outcome(A, rep, id), b = outcome(B, rep, id);
        if (b === 'none' || b === 'ungraded' || a === 'ungraded') continue;
        n++; if (a === 'none') aNone++;
        const ga = a === 'acceptable', gb = b === 'acceptable';
        if (ga && !gb) up++; else if (!ga && gb) down++;
    }
    return { up, down, n, aNone };
};
for (const [A, B] of [[GEMMA, REF[0]], [GEMMA, REF[1]], [REF[1], REF[0]]]) {
    const { up, down, n, aNone } = pairsOf(A, B), p = signP(up, down);
    console.log(`  ${A.padEnd(18)} vs ${B.padEnd(13)} n=${String(n).padStart(3)}  net ${up - down >= 0 ? '+' : ''}${up - down}  (${up} up / ${down} down, sign p=${p < 0.001 ? p.toExponential(1) : p.toFixed(3)})${aNone ? `  incl. ${aNone} no-answers as not acceptable` : ''}`);
}
fs.writeFileSync(`${BLIND}/score.json`, JSON.stringify({ rows }, null, 1));
