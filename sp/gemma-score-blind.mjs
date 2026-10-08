// Throwaway: scores the BLINDED multi-arm grading (gemma-blind-pairs.mjs). Every arm's answers
// to a question were graded by the same grader instance in the same file, so arm differences
// are free of grader-to-grader severity (measured tonight at 7 of 39 on identical answers).
// Missing answers (holes, empty after the cut retry) count as NO ANSWER, never dropped.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
// BLIND_DIR: the calibration run (gemma-score-cal.mjs) points the same scorer at synthetic verdicts.
const BLIND = process.env.BLIND_DIR ?? `${SP}/gemma-arms/blind`;
const { ARM_FILES } = await import(pathToFileURL(`${SP}/gemma-blind-pairs.mjs`).href);
const IDS = 'S1Q01F,S1Q02,S1Q02F,S1Q03,S1Q03F,S1Q04,S1Q04F,S1Q05,S1Q05F,S1Q06,S1Q06F,S1Q07,S1Q07F,S1Q08,S1Q08F,S1Q09,S1Q09F,S1Q10,S1Q10F,S2Q01,S2Q01F,S2Q02,S2Q02F,S2Q03,S2Q03F,S2Q04,S2Q04F,S2Q05,S2Q05F,S2Q06,S2Q06F,S2Q07,S2Q07F,S2Q08,S2Q08F,S2Q09,S2Q09F,S2Q10,S2Q10F'.split(',');
const STRUGGLE = 'S2Q02,S2Q06F,S2Q07F,S1Q02,S1Q04F,S2Q02F,S2Q10F,S1Q04,S1Q06,S1Q06F,S1Q10,S2Q08F'.split(',');
const isFollow = (id) => id.endsWith('F');
const verdictOf = ({ correctness, on_topic, delivery }) =>
    correctness === 0 || on_topic === 0 ? 'wrong' : correctness === 2 && on_topic === 2 && delivery >= 1 ? 'acceptable' : 'weak';
const pct = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const secs = (ms) => (ms == null ? '-' : `${(ms / 1000).toFixed(1)}s`);

// grade[arm][rep][id] = { verdict, scores } from every blind file graded so far.
const grade = {};
let files = 0, graded = 0, pending = [];
for (const f of fs.readdirSync(BLIND).filter((x) => /^key\.blind-\d+\.json$/.test(x)).sort()) {
    const n = f.match(/\d+/)[0];
    const key = JSON.parse(fs.readFileSync(`${BLIND}/${f}`, 'utf8'));
    const vf = `${BLIND}/verdicts.blind-${n}.json`;
    if (!fs.existsSync(vf)) { pending.push(n); continue; }
    const V = JSON.parse(fs.readFileSync(vf, 'utf8'));
    const missingKeys = Object.keys(key).filter((k) => !V[k]);
    if (missingKeys.length) { console.error(`verdicts.blind-${n}.json lacks ${missingKeys.length} keys (${missingKeys.slice(0, 3).join(',')}) — refusing to score a half-graded file`); process.exit(3); }
    files++;
    for (const [k, { arm, rep, id }] of Object.entries(key)) {
        ((grade[arm] ??= {})[rep] ??= {})[id] = { verdict: verdictOf(V[k]), d0: V[k].delivery === 0, reason: V[k].reason };
        graded++;
    }
}
console.log(`blind files graded: ${files}${pending.length ? `  (pending: ${pending.join(',')})` : ''}   answers graded: ${graded}\n`);

const answers = Object.fromEntries(Object.entries(ARM_FILES).map(([arm, fl]) => [arm, fl.map((f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {}))]));
// Outcome of arm/rep/id: the blind verdict, or 'none' when the arm produced no answer.
const outcome = (arm, rep, id) => grade[arm]?.[rep]?.[id]?.verdict ?? (answers[arm][rep - 1]?.[id]?.spoken ? 'ungraded' : 'none');

const rows = [];
for (const arm of Object.keys(ARM_FILES)) {
    const r1 = IDS.map((id) => outcome(arm, 1, id));
    const cnt = (ids, rep, v) => ids.filter((id) => outcome(arm, rep, id) === v).length;
    const strug = [1, 2, 3].reduce((s, rep) => s + cnt(STRUGGLE, rep, 'acceptable'), 0);
    const a1 = answers[arm][0];
    const answered = IDS.map((id) => a1[id]).filter((x) => x?.spoken);
    const allRecs = answers[arm].flatMap((s, i) => (i === 0 ? IDS : STRUGGLE).map((id) => s[id]).filter(Boolean));
    rows.push({
        arm, acc: r1.filter((v) => v === 'acceptable').length, mains: cnt(IDS.filter((i) => !isFollow(i)), 1, 'acceptable'), fu: cnt(IDS.filter(isFollow), 1, 'acceptable'),
        weak: r1.filter((v) => v === 'weak').length, wrong: r1.filter((v) => v === 'wrong').length, none: r1.filter((v) => v === 'none').length, ungraded: r1.filter((v) => v === 'ungraded').length,
        d0: IDS.filter((id) => grade[arm]?.[1]?.[id]?.d0).length, strug, rest: cnt(IDS.filter((i) => !STRUGGLE.includes(i)), 1, 'acceptable'),
        words: pct(answered.map((x) => x.words), 0.5), ttft50: pct(answered.map((x) => x.ttft).filter((x) => x != null), 0.5), ttft90: pct(answered.map((x) => x.ttft).filter((x) => x != null), 0.9),
        total50: pct(answered.map((x) => x.total), 0.5), thoughts: pct(answered.map((x) => x.thoughts ?? 0), 0.5),
        cuts: allRecs.filter((x) => x.cutRetried).length, holes: allRecs.filter((x) => !x.spoken).length, calls: allRecs.length,
    });
}
console.log('arm                  acc/39 mains/19 fu/20 weak wrong none d0 | struggle 12x3 /36 | other 27 /27 | words 1st-answer p50/p90   total thoughts | cuts holes/calls');
for (const r of rows) console.log(`${r.arm.padEnd(20)} ${String(r.acc).padStart(4)}   ${String(r.mains).padStart(4)}   ${String(r.fu).padStart(4)} ${String(r.weak).padStart(4)} ${String(r.wrong).padStart(4)} ${String(r.none).padStart(4)} ${String(r.d0).padStart(2)} | ${String(r.strug).padStart(8)}          | ${String(r.rest).padStart(6)}       | ${String(r.words ?? '-').padStart(4)}  ${secs(r.ttft50).padStart(6)} / ${secs(r.ttft90).padEnd(7)} ${secs(r.total50).padStart(6)} ${String(r.thoughts ?? '-').padStart(6)} | ${String(r.cuts).padStart(3)}  ${r.holes}/${r.calls}${r.ungraded ? `  (${r.ungraded} ungraded)` : ''}`);

// Exact two-sided sign test on the discordant pairs. Indicative only: the struggle reps of one
// question are not independent of each other.
const signP = (up, down) => {
    const n = up + down, k = Math.min(up, down);
    if (!n) return 1;
    let c = 1, s = 0; // c = C(n, i)
    for (let i = 0; i <= k; i++) { s += c; c = (c * (n - i)) / (i + 1); }
    return Math.min(1, (2 * s) / 2 ** n);
};
// Paired, same grader: each Gemma config against each reference, on every (question, rep) both answered.
console.log('\nPAIRED vs the references (same grader, same file). "rep 1" = the 39; "all" = rep 1 + reps 2-3 on the struggle 12');
const PAIR_SETS = { 'rep 1': IDS.map((id) => [id, 1]), all: [...IDS.map((id) => [id, 1]), ...STRUGGLE.flatMap((id) => [[id, 2], [id, 3]])] };
for (const g of Object.keys(ARM_FILES).filter((a) => a.startsWith('Gemma'))) {
    for (const ref of ['3.1-lite LOW', '3.5-lite HIGH']) for (const [set, pairs] of Object.entries(PAIR_SETS)) {
        let up = 0, down = 0, n = 0, gNone = 0;
        for (const [id, rep] of pairs) {
            const a = outcome(g, rep, id), b = outcome(ref, rep, id);
            if (b === 'none' || b === 'ungraded' || a === 'ungraded') continue;
            n++;
            if (a === 'none') gNone++;
            const ga = a === 'acceptable', rb = b === 'acceptable';
            if (ga && !rb) up++; else if (!ga && rb) down++;
        }
        const p = signP(up, down);
        console.log(`  ${g.padEnd(18)} vs ${ref.padEnd(13)} ${set.padEnd(5)} n=${String(n).padStart(2)}  net ${up - down >= 0 ? '+' : ''}${up - down}  (${up} up / ${down} down, sign-test p=${p < 0.001 ? p.toExponential(1) : p.toFixed(3)})${gNone ? `  incl. ${gNone} Gemma no-answers as not acceptable` : ''}`);
    }
}

console.log('\nSTRUGGLE SET per question, reps 1/2/3 (A acceptable, w weak, X wrong, 0 no answer, ? ungraded)');
const sym = (v) => ({ acceptable: 'A', weak: 'w', wrong: 'X', none: '0', ungraded: '?' })[v];
console.log('id       ' + Object.keys(ARM_FILES).map((a) => a.padEnd(19)).join(''));
for (const id of STRUGGLE) console.log(`${id.padEnd(9)}${Object.keys(ARM_FILES).map((a) => [1, 2, 3].map((r) => sym(outcome(a, r, id))).join('').padEnd(19)).join('')}`);
fs.writeFileSync(`${BLIND}/score.json`, JSON.stringify({ rows, grade }, null, 1));
