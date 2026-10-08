// Throwaway: scores the Gemma thinking-level arms against s50m's reference bands, on the same
// captured bytes, with the judge's own verdict rule (interview60.judge.mjs verdictOf).
// A question with no answer (a transient hole, or an empty answer after the cut retry) is
// counted as NO ANSWER, never dropped: the judge's export skips it, which would flatter an arm.
// Works on whatever verdict files exist, so it can be run while grading is in progress.
import fs from 'node:fs';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const ARMS = `${SP}/gemma-arms`;
const RUN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m';
const IDS = 'S1Q01F,S1Q02,S1Q02F,S1Q03,S1Q03F,S1Q04,S1Q04F,S1Q05,S1Q05F,S1Q06,S1Q06F,S1Q07,S1Q07F,S1Q08,S1Q08F,S1Q09,S1Q09F,S1Q10,S1Q10F,S2Q01,S2Q01F,S2Q02,S2Q02F,S2Q03,S2Q03F,S2Q04,S2Q04F,S2Q05,S2Q05F,S2Q06,S2Q06F,S2Q07,S2Q07F,S2Q08,S2Q08F,S2Q09,S2Q09F,S2Q10,S2Q10F'.split(',');
const STRUGGLE = 'S2Q02,S2Q06F,S2Q07F,S1Q02,S1Q04F,S2Q02F,S2Q10F,S1Q04,S1Q06,S1Q06F,S1Q10,S2Q08F'.split(',');
const isFollow = (id) => id.endsWith('F');

const verdictOf = ({ correctness, on_topic, delivery }) =>
    correctness === 0 || on_topic === 0 ? 'wrong' : correctness === 2 && on_topic === 2 && delivery >= 1 ? 'acceptable' : 'weak';
const read = (p) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null);
const pct = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const secs = (ms) => (ms == null ? '-' : `${(ms / 1000).toFixed(1)}s`);

const ref = (arm) => ({ answers: `${RUN}/interview60.answers.${arm}.json`, verdicts: `${RUN}/interview60.judge.verdicts.${arm}.json` });
const gem = (arm) => ({ answers: `${ARMS}/interview60.answers.${arm}.json`, verdicts: `${ARMS}/verdicts.${arm}.json` });
const CONFIGS = [
    { name: '3.1-lite LOW  (s50m ref)', reps: ['', '-r2', '-r3'].map((r) => ref(`gemini-3.1-flash-lite_captured-low${r}`)) },
    { name: '3.5-lite HIGH (s50m ref)', reps: ['', '-r2', '-r3'].map((r) => ref(`gemini-3.5-flash-lite_captured-high${r}`)) },
    ...['gemma-4-31b-it', 'gemma-4-26b-a4b-it'].flatMap((m) => [['min', 'MINIMAL'], ['high', 'HIGH']].map(([t, L]) => ({
        name: `${m === 'gemma-4-31b-it' ? 'Gemma 31B' : 'Gemma 26B'} ${L}`, reps: ['', '-r2', '-r3'].map((r) => gem(`${m}_${t}${r}`)),
    }))),
];

// One rep: per-id outcome over the ids it was asked (a rep file may cover only the struggle set).
function scoreRep(rep, ids) {
    const A = read(rep.answers), V = read(rep.verdicts);
    if (!A) return null;
    const out = {};
    for (const id of ids) {
        const a = A[id];
        if (!a) { out[id] = { state: 'not-asked' }; continue; }
        if (!a.spoken) { out[id] = { state: 'no-answer', why: a.transientError ? `hole: ${a.transientError}` : 'empty' , cut: !!a.cutRetried }; continue; }
        const v = V?.[id];
        out[id] = { state: v ? verdictOf(v) : 'ungraded', delivery0: v?.delivery === 0, words: a.words, ttft: a.ttft, total: a.total, thoughts: a.thoughts ?? 0, cut: !!a.cutRetried };
    }
    return out;
}

const rows = [];
for (const c of CONFIGS) {
    const r1 = scoreRep(c.reps[0], IDS);
    const reps = [r1, scoreRep(c.reps[1], STRUGGLE), scoreRep(c.reps[2], STRUGGLE)];
    // The references ran all 39 in every rep; count their r2/r3 on all 39 for the band.
    const full = [r1, scoreRep(c.reps[1], IDS), scoreRep(c.reps[2], IDS)];
    const count = (rep, ids, st) => (rep ? ids.filter((id) => rep[id]?.state === st).length : null);
    const asked = (rep, ids) => (rep ? ids.filter((id) => rep[id] && rep[id].state !== 'not-asked').length : 0);
    const band = full.map((rep) => (rep && asked(rep, IDS) === IDS.length ? count(rep, IDS, 'acceptable') : null));
    const strugglePool = reps.reduce((s, rep) => s + (count(rep, STRUGGLE, 'acceptable') ?? 0), 0);
    const struggleAsked = reps.reduce((s, rep) => s + asked(rep, STRUGGLE), 0);
    const answered = r1 ? IDS.map((id) => r1[id]).filter((x) => x && x.words != null) : [];
    const all = reps.flatMap((rep) => (rep ? Object.values(rep) : []));
    rows.push({
        name: c.name, have: !!r1,
        acc: count(r1, IDS, 'acceptable'), accMains: count(r1, IDS.filter((i) => !isFollow(i)), 'acceptable'), accFollow: count(r1, IDS.filter(isFollow), 'acceptable'),
        weak: count(r1, IDS, 'weak'), wrong: count(r1, IDS, 'wrong'), noAnswer: count(r1, IDS, 'no-answer'), ungraded: count(r1, IDS, 'ungraded'),
        delivery0: r1 ? IDS.filter((id) => r1[id]?.delivery0).length : null,
        band, strugglePool, struggleAsked,
        wordsP50: pct(answered.map((x) => x.words), 0.5), ttftP50: pct(answered.map((x) => x.ttft).filter((x) => x != null), 0.5), ttftP90: pct(answered.map((x) => x.ttft).filter((x) => x != null), 0.9),
        totalP50: pct(answered.map((x) => x.total), 0.5), thoughtsP50: pct(answered.map((x) => x.thoughts), 0.5),
        cuts: all.filter((x) => x.cut).length, holes: all.filter((x) => x.state === 'no-answer').length, calls: all.filter((x) => x.state !== 'not-asked').length,
        perQ: Object.fromEntries(STRUGGLE.map((id) => [id, reps.map((rep) => rep?.[id]?.state ?? '-')])),
    });
}

console.log('ALL 39 QUESTIONS (rep 1; refs show their 3-rep band) and the 12-question STRUGGLE SET pooled over 3 reps\n');
console.log('arm                        acc/39  mains/19 fu/20  weak wrong none  d0 | band(3 reps)   | struggle/36 | words  1st-answer p50/p90  total  thoughts | cuts holes/calls');
for (const r of rows) {
    if (!r.have) { console.log(`${r.name.padEnd(26)} (no answers yet)`); continue; }
    const f = (x) => (x == null ? '-' : String(x));
    console.log(`${r.name.padEnd(26)} ${f(r.acc).padStart(4)}    ${f(r.accMains).padStart(4)}   ${f(r.accFollow).padStart(4)}  ${f(r.weak).padStart(4)} ${f(r.wrong).padStart(4)} ${f(r.noAnswer).padStart(4)} ${f(r.delivery0).padStart(3)} | ${r.band.map(f).join(' / ').padEnd(14)} | ${String(r.strugglePool).padStart(3)}/${String(r.struggleAsked).padEnd(3)}     | ${f(r.wordsP50).padStart(4)}   ${secs(r.ttftP50).padStart(6)} / ${secs(r.ttftP90).padEnd(7)}  ${secs(r.totalP50).padStart(6)}  ${f(r.thoughtsP50).padStart(6)} | ${String(r.cuts).padStart(3)}  ${r.holes}/${r.calls}${r.ungraded ? `  (${r.ungraded} ungraded)` : ''}`);
}

console.log('\nSTRUGGLE SET per question (rep1 / rep2 / rep3: A acceptable, w weak, X wrong, - none/not yet)');
const sym = (s) => ({ acceptable: 'A', weak: 'w', wrong: 'X', 'no-answer': '0', ungraded: '?' })[s] ?? '-';
console.log('id       ' + rows.map((r) => r.name.replace(/ \(s50m ref\)/, '').padEnd(15)).join(''));
for (const id of STRUGGLE) console.log(`${id.padEnd(9)}${rows.map((r) => r.perQ[id].map(sym).join('').padEnd(15)).join('')}`);

// Grader drift: tonight's re-grade of two s50m reference arms against their 09-22 grades.
console.log('\nGRADER DRIFT CHECK (same answers, same frozen instrument 8564ba96369a, graded 2026-09-22 vs tonight)');
for (const [label, orig, redo] of [
    ['3.1-lite captured-low', `${RUN}/interview60.judge.verdicts.gemini-3.1-flash-lite_captured-low.json`, `${ARMS}/control.verdicts.3.1-captured-low.json`],
    ['3.5-lite captured-high', `${RUN}/interview60.judge.verdicts.gemini-3.5-flash-lite_captured-high.json`, `${ARMS}/control.verdicts.3.5-captured-high.json`],
]) {
    const O = read(orig), N = read(redo);
    if (!O || !N) { console.log(`  ${label}: tonight's re-grade not in yet`); continue; }
    const keys = Object.keys(O).filter((k) => N[k]);
    const acc = (V) => keys.filter((k) => verdictOf(V[k]) === 'acceptable').length;
    const up = keys.filter((k) => verdictOf(O[k]) !== 'acceptable' && verdictOf(N[k]) === 'acceptable').length;
    const down = keys.filter((k) => verdictOf(O[k]) === 'acceptable' && verdictOf(N[k]) !== 'acceptable').length;
    console.log(`  ${label.padEnd(24)} ${keys.length} items: acceptable ${acc(O)} then, ${acc(N)} tonight  (${up} up, ${down} down)`);
}
fs.writeFileSync(`${ARMS}/score.json`, JSON.stringify(rows, null, 1));
