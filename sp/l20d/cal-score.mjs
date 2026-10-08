// Rule-8 calibration of l20d/score.mjs (PREREGISTER-l20d.md) on SYNTHETIC verdicts over calibration batches built from
// earlier runs: L20's bare-Live runs (L20b rN + L20c rN merged to 38 items) stand in for the three new reps (111 answered,
// first word p50 1.8 s / p90 6.4 s over 114 = L20c's old-arm numbers, a known case); the app's four samples and the anchor
// are the real ones (holes registered). Each case writes eight verdict files, runs score.mjs and checks the clause lines,
// the verdict, the table's rates (against an independent mini-model written here) and the numbers of clauses 4 and 5
// (against an independent recomputation from the files). Every clause is flipped at least once. Then the MUTATION pass:
// copies of score.mjs / mechanics-l20d.mjs with one rule deliberately broken must make at least one case fail.
// No real answer and no real verdict is involved. Prints clauses, verdicts and counts only.
//   node cal-score.mjs [--no-mutations]
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const L = `${SP}/l20d`, CAL = `${L}/cal-score`;
const J = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const mergedAnswers = (r) => ({ ...J(`${SP}/l20b/runs/live38-r${r}.answers.json`), ...J(`${SP}/l20c/runs/live38-r${r}.answers.json`) });
const mergedRun = (r) => { const b = J(`${SP}/l20b/runs/live38-r${r}.json`), c = J(`${SP}/l20c/runs/live38-r${r}.json`); return { t0Iso: b.t0Iso, sessions: [...b.sessions, ...c.sessions], events: [...b.events, ...c.events] }; };
const APOLOGY = 'I am sorry, I ran into a system error and cannot answer that.';
const IDS = J(`${L}/items.json`).pairs.flat();
const NEW = ['l20d-r1', 'l20d-r2', 'l20d-r3'], APPS = ['app35-inapp', 'app35-twin1', 'app35-twin2', 'app35-twin3'], OLD = ['live38-r1', 'live38-r2', 'live38-r3'];

// ---- calibration batches --------------------------------------------------------------------------------------
fs.rmSync(CAL, { recursive: true, force: true });
fs.mkdirSync(CAL, { recursive: true });
const state = () => [1, 2, 3].map((r) => ({ A: mergedAnswers(r), R: mergedRun(r) }));
const answeredFirst = (reps) => reps.flatMap((x, ri) => IDS.filter((id) => x.A[id]?.played && x.A[id].answer?.trim() && !/system error/i.test(x.A[id].answer) && Number.isFinite(x.A[id].ttftMs)).map((id) => ({ ri, id, t: x.A[id].ttftMs }))).sort((a, b) => a.t - b.t || a.ri - b.ri || (a.id < b.id ? -1 : 1));
const setRatio = (R, id, ratio) => { R.events.push({ t: 1, item: id, kind: 'clipStart', seconds: 10 }, { t: 1 + Math.round(10000 * ratio), item: id, kind: 'clipEnd' }); };
/** A variant folder: the base's items and blind packets, runs written from `edit(reps)`. */
function variant(name, edit = () => {}) {
    const dir = `${CAL}/${name}`;
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(`${dir}/runs`, { recursive: true });
    fs.copyFileSync(`${L}/items.json`, `${dir}/items.json`);
    const reps = state();
    edit(reps);
    reps.forEach((x, i) => { if (x) { fs.writeFileSync(`${dir}/runs/l20d-r${i + 1}.answers.json`, JSON.stringify(x.A)); fs.writeFileSync(`${dir}/runs/l20d-r${i + 1}.json`, JSON.stringify(x.R)); } });
    if (fs.existsSync(`${CAL}/base/blind`)) fs.cpSync(`${CAL}/base/blind`, `${dir}/blind`, { recursive: true });
    return dir;
}
const base = variant('base');
{ const r = spawnSync(process.execPath, [`${L}/blind.mjs`, '--dir', base, '--keydir', `${base}/key`], { encoding: 'utf8' }); if (r.status !== 0) throw new Error(`blind failed: ${r.stdout}${r.stderr}`); }
const K = J(`${base}/key/key.json`);
const baseKeyDir = `${base}/key`;
for (const v of [base]) { /* the base got its blind folder from blind.mjs itself */ }
const keysOf = (arm) => Object.keys(K.key).filter((k) => K.key[k] === arm).sort();
const nOf = (arm) => keysOf(arm).length;

// the items for the latency variants, from the stand-in answers
const reps0 = state();
const ranked = answeredFirst(reps0);                                            // answered items, fastest first
const apologize = (reps, picks) => { for (const { ri, id } of picks) reps[ri].A[id] = { ...reps[ri].A[id], answer: APOLOGY }; };
const setAllTtft = (reps, ms) => { for (const x of reps) for (const id of IDS) if (x.A[id]?.played && x.A[id].answer?.trim() && !/system error/i.test(x.A[id].answer)) x.A[id] = { ...x.A[id], ttftMs: ms }; };
const raise = (reps, picks, ms) => { for (const { ri, id } of picks) reps[ri].A[id] = { ...reps[ri].A[id], ttftMs: ms }; };
// 30 answered items: the 8 slowest (a slow feed explains a late first word) + 22 spread over the rest
const every3 = [...ranked.slice(-8), ...Array.from({ length: 22 }, (_, i) => ranked[Math.floor((i * (ranked.length - 8)) / 22)])];
if (new Set(every3.map((x) => `${x.ri}${x.id}`)).size !== 30) throw new Error('cal setup: the 30 slow-feed items are not distinct');

const V = {
    apol1: variant('apol1', (r) => apologize(r, ranked.slice(-1))),
    apol2: variant('apol2', (r) => apologize(r, ranked.slice(-2))),
    p50_28: variant('p50-2800', (r) => setAllTtft(r, 2800)),
    p50_32: variant('p50-3200', (r) => setAllTtft(r, 3200)),
    p90_top9: variant('p90-top9', (r) => raise(r, ranked.slice(-9), 7000)),
    p90_top8: variant('p90-top8', (r) => raise(r, ranked.slice(-8), 7000)),
    holes12: variant('holes12', (r) => apologize(r, ranked.filter((x) => x.ri === 1).slice(0, 9))),
    slow30: variant('slow30', (r) => raise(r, every3, 20000)),
    slow30x: variant('slow30x', (r) => { raise(r, every3, 20000); for (const { ri, id } of every3) setRatio(r[ri].R, id, 1.5); }),
    slowhole: variant('slowhole', (r) => { setRatio(r[0].R, 'S1Q02', 1.5); setRatio(r[1].R, ranked.find((x) => x.ri === 1).id, 1.5); }),
    slowedge: variant('slowedge', (r) => { const top = ranked.at(-1); setRatio(r[top.ri].R, top.id, 1.30); raise(r, [top], 20000); }),
    retry3: variant('retry3', (r) => { const pair = r[0].R.sessions[0].pair; r[0].R.sessions.push({ pair, attempt: 2, abnormal: true }, { pair, attempt: 3, abnormal: false }); }),
    two: variant('two-reps', (r) => { r[2] = null; }),
};

// ---- the independent mini-model --------------------------------------------------------------------------------
const ACC = { correctness: 2, on_topic: 2, delivery: 2, reason: 'synthetic' };
const WEAK = { correctness: 1, on_topic: 2, delivery: 2, reason: 'synthetic' };
const WRONG = { correctness: 0, on_topic: 2, delivery: 2, reason: 'synthetic' };
/** spec: { arm: { weak, wrong, wrong1 } }; weak = the first keys (sorted) both graders give correctness 1; wrong = the last keys both give 0; wrong1 = the keys before those that only grader 1 gives 0. */
function gradeFn(spec) {
    const map = {};
    for (const [arm, s] of Object.entries(spec)) {
        const ks = keysOf(arm), w = s.weak ?? 0, x = s.wrong ?? 0, y = s.wrong1 ?? 0;
        ks.slice(0, w).forEach((k) => { map[k] = 'weak'; });
        ks.slice(ks.length - x).forEach((k) => { map[k] = 'wrong'; });
        ks.slice(ks.length - x - y, ks.length - x).forEach((k) => { map[k] = 'wrong1'; });
    }
    return (k, slot) => { const m = map[k]; return m === 'weak' ? WEAK : m === 'wrong' ? WRONG : m === 'wrong1' ? (slot === 0 ? WRONG : ACC) : ACC; };
}
const rateOf = (arm, s = {}) => (nOf(arm) - (s.weak ?? 0) - (s.wrong ?? 0) - 0.5 * (s.wrong1 ?? 0)) / nOf(arm);
const specAll = (arms, s) => Object.fromEntries(arms.map((a) => [a, s]));
const meanOf = (a) => a.reduce((x, y) => x + y, 0) / a.length;
/** The clause numbers the rule gives for a spec, by the arithmetic of the pre-registration, written out again here. */
function model(spec) {
    const nr = NEW.map((a) => rateOf(a, spec[a])), ar = APPS.map((a) => rateOf(a, spec[a]));
    const newCW = NEW.reduce((n, a) => n + (spec[a]?.wrong ?? 0), 0), appCW = APPS.reduce((n, a) => n + (spec[a]?.wrong ?? 0), 0);
    return { newMean: meanOf(nr), appMean: meanOf(ar), newWorst: Math.min(...nr), appWorst: Math.min(...ar), newCW, appCW, bar: 1 + Math.floor(appCW * 0.75), rates: Object.fromEntries([...NEW, ...APPS, ...OLD].map((a) => [a, rateOf(a, spec[a])])) };
}
/** Clause 5 and clause 4 recomputed from a variant's files (not through mechanics-l20d.mjs). */
function files(dir) {
    const out = { answered: 0, pop: [] };
    for (const r of [1, 2, 3]) {
        const A = J(`${dir}/runs/l20d-r${r}.answers.json`), R = J(`${dir}/runs/l20d-r${r}.json`);
        const start = {}, ratio = {};
        for (const e of R.events) { if (!e.item || String(e.item).includes('~')) continue; if (e.kind === 'clipStart') start[e.item] = e; else if (e.kind === 'clipEnd' && start[e.item]) ratio[e.item] = (e.t - start[e.item].t) / 1000 / start[e.item].seconds; }
        for (const id of IDS) {
            const a = A[id], ok = !!(a?.played && a.answer?.trim() && !/system error/i.test(a.answer));
            if (ok) out.answered++;
            const slow = Math.round((ratio[id] ?? 0) * 1000) / 1000 > 1.3;
            if (ok && slow) continue;
            out.pop.push(ok && Number.isFinite(a.ttftMs) ? a.ttftMs : Infinity);
        }
    }
    out.pop.sort((x, y) => x - y);
    const n = out.pop.length;
    out.n = n; out.p50 = out.pop[Math.min(n - 1, Math.floor(n * 0.5))]; out.p90 = out.pop[Math.min(n - 1, Math.floor(n * 0.9))];
    out.noFirst = out.pop.filter((x) => !Number.isFinite(x)).length;
    return out;
}
const s1 = (ms) => (Number.isFinite(ms) ? `${(ms / 1000).toFixed(1)} s` : '-');

// ---- running one case ------------------------------------------------------------------------------------------
let nv = 0;
function runScore(scorePath, dir, grade, mutateVerdicts) {
    const vdir = `${CAL}/v-${++nv}`;
    fs.rmSync(vdir, { recursive: true, force: true });
    fs.mkdirSync(vdir, { recursive: true });
    for (const p of Object.keys(K.packets)) for (const [slot, g] of ['g1', 'g2'].entries()) {
        const want = Object.keys(K.key).filter((k) => K.packets[p].includes(k.split('#')[0]));
        fs.writeFileSync(`${vdir}/verdicts-${p}-${g}.json`, JSON.stringify(Object.fromEntries(want.map((k) => [k, grade(k, slot)]))));
    }
    if (mutateVerdicts) mutateVerdicts(vdir);
    const r = spawnSync(process.execPath, [scorePath, '--dir', dir, '--keydir', baseKeyDir, '--verdicts', vdir], { encoding: 'utf8' });
    return { code: r.status, out: r.stdout ?? '', err: r.stderr ?? '', vdir };
}
const f3 = (x) => x.toFixed(3);
/** A case: its variant folder, its grade spec, the clause states and verdict known BY HAND, extra regexes. */
function checkCase(c, scorePath = `${L}/score.mjs`, behaviouralOnly = false) {   // behaviouralOnly (mutation pass): the printed wording is not checked, only states, verdicts and numbers
    const spec = c.spec ?? {}, m = model(spec);
    const r = runScore(scorePath, c.dir ?? base, gradeFn(spec));
    const fails = [];
    if (r.code !== 0) return { ok: false, why: [`exit ${r.code}: ${r.err.slice(0, 200)}`], r };
    const lines = r.out.split('\n');
    const clause = (n) => lines.find((l) => l.startsWith(`${n}. `)) ?? '';
    const stateOf = (n) => clause(n).match(/-> (PASS|FAIL|NOT READABLE|INVALID)$/)?.[1];
    const want = c.states;                                                         // hand-specified: [q, band, safety, rel, speed]
    want.forEach((w, i) => { if (stateOf(i + 1) !== w) fails.push(`clause ${i + 1} reads ${stateOf(i + 1)}, known ${w}`); });
    const v = lines.find((l) => l.startsWith('**Verdict: ')) ?? '';
    if (!v.startsWith(`**Verdict: ${c.verdict} (`)) fails.push(`verdict line "${v.slice(0, 60)}", known ${c.verdict}`);
    // the model's own states (cross-check of my hand-specified ones, only for clauses 1-3)
    const mq = m.newMean >= m.appMean - 0.05 - 1e-9, mb = m.newWorst >= m.appWorst - 1e-9, ms = m.newCW <= m.bar;
    if (!c.noModel && JSON.stringify([mq, mb, ms].map((b) => (b ? 'PASS' : 'FAIL'))) !== JSON.stringify(want.slice(0, 3))) fails.push(`cal bug: the mini-model says ${[mq, mb, ms]} but the hand states are ${want.slice(0, 3)}`);
    // the printed numbers against the model
    const q = clause(1).match(/mean rate ([\d.-]+) >= app mean rate ([\d.-]+) - 0\.05 = ([\d.-]+)/);
    if (!c.noModel && (!q || q[1] !== f3(m.newMean) || q[2] !== f3(m.appMean) || q[3] !== f3(m.appMean - 0.05))) fails.push(`clause 1 numbers ${q?.slice(1)} vs model ${f3(m.newMean)} ${f3(m.appMean)} ${f3(m.appMean - 0.05)}`);
    const b = clause(2).match(/worst rep ([\d.-]+) >= app worst sample ([\d.-]+)/);
    if (!c.noModel && (!b || b[1] !== f3(m.newWorst) || b[2] !== f3(m.appWorst))) fails.push(`clause 2 numbers ${b?.slice(1)} vs model ${f3(m.newWorst)} ${f3(m.appWorst)}`);
    const s3 = clause(3).match(/consensus-wrong (\d+) .* <= 1 \+ floor\((\d+) x 0\.75\) = (\d+)/);
    if (!c.noModel && (!s3 || Number(s3[1]) !== m.newCW || Number(s3[2]) !== m.appCW || Number(s3[3]) !== m.bar)) fails.push(`clause 3 numbers ${s3?.slice(1)} vs model ${m.newCW} ${m.appCW} ${m.bar}`);
    for (const arm of [...NEW, ...APPS, ...OLD]) { const row = lines.find((l) => l.startsWith(`| ${arm}`)); const got = row?.split('|')[2]?.trim(); if (!c.noModel && got !== f3(m.rates[arm])) fails.push(`table rate ${arm} ${got} vs model ${f3(m.rates[arm])}`); }
    const f = files(c.dir ?? base);
    const c4 = clause(4).match(/answered (\d+)\/(\d+)/), c5 = clause(5).match(/p50 ([\d.-]+(?: s)?) <= [\d.]+ s and p90 ([\d.-]+(?: s)?) <= [\d.]+ s over (\d+) slots \((\d+) without a first word; (\d+) slow-feed answered/);
    if (!c4 || Number(c4[1]) !== f.answered) fails.push(`clause 4 answered ${c4?.[1]} vs files ${f.answered}`);
    if (!c5 || c5[1] !== s1(f.p50) || c5[2] !== s1(f.p90) || Number(c5[3]) !== f.n || Number(c5[4]) !== f.noFirst) fails.push(`clause 5 numbers ${c5?.slice(1)} vs files p50 ${s1(f.p50)} p90 ${s1(f.p90)} n ${f.n} noFirst ${f.noFirst}`);
    if (!behaviouralOnly) for (const re of c.expect ?? []) if (!re.test(r.out)) fails.push(`unmatched ${re}`);
    return { ok: fails.length === 0, why: fails, r, stateFail: fails.some((x) => /^clause \d reads|^verdict line/.test(x)) };
}
const apps = (s) => specAll(APPS, s), news = (s) => specAll(NEW, s);
const A8 = apps({ weak: 8 });
const A0 = {};                                                                // apps all acceptable
const P = 'PASS', F = 'FAIL';
const CASES = [
    { name: 'C1 PROCEED: apps weak 8 each, new all acceptable, 111 answered, p50 1.8 s / p90 6.4 s over 114 (= L20c\'s old-arm numbers)', spec: A8, states: [P, P, P, P, P], verdict: 'PROCEED',
        expect: [/p50 1\.8 s <= 3\.0 s and p90 6\.4 s <= 6\.6 s over 114 slots \(3 without a first word; 0 slow-feed answered items left out\) -> PASS/, /answered 111\/114, need >= 110 -> PASS/, /\*\*Verdict: PROCEED \(clauses 1-5 all pass\): earns the prototype:/] },
    { name: 'C2 clause 1 FAIL only: app mean 0.875 (one weak sample), new mean 0.811 < 0.825; the band (0.8 >= 0.5) holds -> STOP', spec: { 'app35-inapp': { weak: 19 }, ...news({ weak: 7 }) }, states: [F, P, P, P, P], verdict: 'STOP' },
    { name: 'C2b clause 1: mean 0.819 is below 0.825 -> FAIL (a margin of 0.06 would pass it)', spec: { 'app35-inapp': { weak: 19 }, 'l20d-r1': { weak: 8 }, 'l20d-r2': { weak: 6 }, 'l20d-r3': { weak: 6 } }, states: [F, P, P, P, P], verdict: 'STOP' },
    { name: 'C3 clause 1 PASS: mean 0.838 >= 0.825 -> PROCEED', spec: { 'app35-inapp': { weak: 19 }, ...news({ weak: 6 }) }, states: [P, P, P, P, P], verdict: 'PROCEED' },
    { name: 'C3b clause 1 PASS: mean 0.828 >= 0.825 (a margin of 0.04 would fail it) -> PROCEED', spec: { 'app35-inapp': { weak: 19 }, 'l20d-r1': { weak: 7 }, 'l20d-r2': { weak: 6 }, 'l20d-r3': { weak: 6 } }, states: [P, P, P, P, P], verdict: 'PROCEED' },
    { name: 'C4 clause 2 FAIL only: apps all acceptable, new rep 1 one weak (mean 0.990 passes, worst 0.971 < 1.000) -> STOP', spec: { 'l20d-r1': { weak: 1 } }, states: [P, F, P, P, P], verdict: 'STOP' },
    { name: 'C5 clause 2 at its edge: new worst rep equals the app\'s worst sample (37/38 both) -> PASS (>=) -> PROCEED', spec: { 'app35-inapp': { weak: 1 }, 'l20d-r2': { weak: 1 } }, states: [P, P, P, P, P], verdict: 'PROCEED' },
    { name: 'C6a clause 3 FAIL only: app consensus-wrong 5 (bar 1 + floor(3.75) = 4), new 5 -> STOP (floor, not round)', spec: { 'app35-inapp': { wrong: 3 }, 'app35-twin1': { wrong: 2 }, 'l20d-r1': { wrong: 2 }, 'l20d-r2': { wrong: 2 }, 'l20d-r3': { wrong: 1 } }, states: [P, P, F, P, P], verdict: 'STOP', expect: [/consensus-wrong 5 .* = 4 \(.*\) -> FAIL/] },
    { name: 'C6b clause 3 at its edge: same apps, new 4 <= 4 -> PASS -> PROCEED', spec: { 'app35-inapp': { wrong: 3 }, 'app35-twin1': { wrong: 2 }, 'l20d-r1': { wrong: 2 }, 'l20d-r2': { wrong: 1 }, 'l20d-r3': { wrong: 1 } }, states: [P, P, P, P, P], verdict: 'PROCEED' },
    { name: 'C6c clause 3: apps 0 wrong (bar 1), new 2 wrong by both graders -> FAIL -> STOP', spec: { ...A8, 'l20d-r2': { wrong: 1 }, 'l20d-r3': { wrong: 1 } }, states: [P, P, F, P, P], verdict: 'STOP', expect: [/consensus-wrong 2 .* = 1 \(.*\) -> FAIL/] },
    { name: 'C6d clause 3 at its edge: apps 0 wrong, new 1 -> PASS', spec: { ...A8, 'l20d-r2': { wrong: 1 } }, states: [P, P, P, P, P], verdict: 'PROCEED' },
    { name: 'C6e clause 3: six new answers wrong by ONE grader only are not consensus-wrong -> 0 -> PASS', spec: { ...A8, ...Object.fromEntries(NEW.map((a) => [a, { wrong1: 2 }])) }, states: [P, P, P, P, P], verdict: 'PROCEED', expect: [/consensus-wrong 0 /] },
    { name: 'C7a clause 4 FAIL only: 109 answered (the two slowest items turn into spoken apologies) -> WAIT', dir: V.apol2, spec: A8, states: [P, P, P, F, P], verdict: 'WAIT', expect: [/answered 109\/114, need >= 110 -> FAIL/] },
    { name: 'C7b clause 4 at its edge: 110 answered -> PASS -> PROCEED (the apology is graded and counted in clause 1-3, a hole for clause 4)', dir: V.apol1, spec: A8, states: [P, P, P, P, P], verdict: 'PROCEED', expect: [/answered 110\/114, need >= 110 -> PASS/] },
    { name: 'C8a clause 5 p50: every first word 3.2 s -> FAIL -> WAIT', dir: V.p50_32, spec: A8, states: [P, P, P, P, F], verdict: 'WAIT' },
    { name: 'C8b clause 5 p50: every first word 2.8 s -> PASS -> PROCEED', dir: V.p50_28, spec: A8, states: [P, P, P, P, P], verdict: 'PROCEED' },
    { name: 'C8c clause 5 p90: the nine slowest at 7.0 s (with the 3 holes: 12 above 6.6 s) -> FAIL -> WAIT', dir: V.p90_top9, spec: A8, states: [P, P, P, P, F], verdict: 'WAIT' },
    { name: 'C8d clause 5 p90 at its edge: the eight slowest at 7.0 s (11 above 6.6 s with the holes) -> p90 stays 6.4 s -> PASS', dir: V.p90_top8, spec: A8, states: [P, P, P, P, P], verdict: 'PROCEED' },
    { name: 'C8e clause 5: a hole is no first word: 12 holes (and 102 answered) -> p90 has no first word -> clause 5 FAIL and clause 4 FAIL -> WAIT', dir: V.holes12, spec: A8, states: [P, P, P, F, F], verdict: 'WAIT', expect: [/p90 - <= 6\.6 s/] },
    { name: 'C9a slow feed counted: 30 answered items at 20 s with a normal feed -> clause 5 FAIL -> WAIT', dir: V.slow30, spec: A8, states: [P, P, P, P, F], verdict: 'WAIT' },
    { name: 'C9b slow feed left out: the SAME 30 items at 20 s but sent at 1.5x their length are left out (n 84, 30 slow-feed answered items) -> clause 5 reads the rest', dir: V.slow30x, spec: A8, states: [P, P, P, P, P], verdict: 'PROCEED', expect: [/over 84 slots \(3 without a first word; 30 slow-feed answered items left out\)/] },
    { name: 'C9c a slow-feed HOLE stays in as no first word, a slow-feed ANSWERED item is left out: n 113 (not 112, not 114)', dir: V.slowhole, spec: A8, states: [P, P, P, P, P], verdict: 'PROCEED', expect: [/over 113 slots \(3 without a first word; 1 slow-feed answered items left out\)/] },
    { name: 'C9d slow feed at exactly 1.30x is NOT slow: the 20 s item stays in (n 114, 0 left out)', dir: V.slowedge, spec: A8, states: [P, P, P, P, P], verdict: 'PROCEED', expect: [/over 114 slots \(3 without a first word; 0 slow-feed answered items left out\)/] },
    { name: 'C10 the anchor is reported only: the old Live all weak (rate 0.000) changes no clause and no verdict', spec: { ...A8, ...Object.fromEntries(OLD.map((a) => [a, { weak: nOf(a) }])) }, states: [P, P, P, P, P], verdict: 'PROCEED', noModel: false,
        expect: [/new Live - old Live = 1\.000/, /old Live - app = -0\.788/] },
    { name: 'C11 the holes-as-not read is reported beside the rule: new mean 0.974, app mean 0.783 (and moves no verdict)', spec: A8, states: [P, P, P, P, P], verdict: 'PROCEED', expect: [/holes-as-not-acceptable read \(no verdict comes from it\): new Live mean 0\.974, app mean 0\.783; clause 1 would read PASS/] },
    { name: 'C12 STOP outranks WAIT: clause 1 fails and clause 4 fails -> STOP', dir: V.apol2, spec: { 'app35-inapp': { weak: 19 }, ...news({ weak: 8 }) }, states: [F, P, P, F, P], verdict: 'STOP', noModel: false, expect: [/STOP \(clauses 1, 4 fail\)/] },
];

let ok = true;
const report = (c, res) => { if (!res.ok) ok = false; console.log(`${res.ok ? 'OK ' : 'BAD'} ${c.name}${res.ok ? '' : `\n      ${res.why.join('\n      ')}`}`); };
for (const c of CASES) report(c, checkCase(c));

// ---- refusals (nonzero exit, a message naming what was violated) -----------------------------------------------
const refuse = (name, fn, re) => { const r = fn(); const good = r.code !== 0 && re.test(r.err + r.out); if (!good) ok = false; console.log(`${good ? 'OK ' : 'BAD'} refuses: ${name}${good ? '' : `  (exit ${r.code}; ${r.err.slice(0, 160)})`}`); };
refuse('a verdict file with a key missing', () => runScore(`${L}/score.mjs`, base, gradeFn(A8), (vd) => { const f = `${vd}/verdicts-A-g1.json`, v = J(f); delete v[Object.keys(v)[0]]; fs.writeFileSync(f, JSON.stringify(v)); }), /A-g1: missing/);
refuse('a verdict file with an extra key', () => runScore(`${L}/score.mjs`, base, gradeFn(A8), (vd) => { const f = `${vd}/verdicts-B-g2.json`, v = J(f); v['S9Q99#1'] = ACC; fs.writeFileSync(f, JSON.stringify(v)); }), /B-g2: .*extra S9Q99#1/);
refuse('a score of 3', () => runScore(`${L}/score.mjs`, base, gradeFn(A8), (vd) => { const f = `${vd}/verdicts-C-g1.json`, v = J(f), k = Object.keys(v)[0]; v[k] = { ...v[k], correctness: 3 }; fs.writeFileSync(f, JSON.stringify(v)); }), /C-g1 .*correctness=3/);
refuse('a verdict file that is absent', () => runScore(`${L}/score.mjs`, base, gradeFn(A8), (vd) => fs.rmSync(`${vd}/verdicts-D-g2.json`)), /ENOENT/);
refuse('two reps only', () => runScore(`${L}/score.mjs`, V.two, gradeFn(A8)), /2 l20d rep\(s\) .* the rule reads three/);
refuse('a pair retried more than once (clause 4 cannot be read)', () => runScore(`${L}/score.mjs`, V.retry3, gradeFn(A8)), /clause 4 cannot be read: pairs retried more than once/);
{
    const kd = `${CAL}/key-badarms`;
    fs.mkdirSync(kd, { recursive: true });
    fs.writeFileSync(`${kd}/key.json`, JSON.stringify({ ...K, arms: K.arms.slice(1) }));
    const r = spawnSync(process.execPath, [`${L}/score.mjs`, '--dir', base, '--keydir', kd, '--verdicts', `${CAL}/v-1`], { encoding: 'utf8' });
    const good = r.status !== 0 && /the key's arms are not the ten registered ones/.test(r.stderr);
    if (!good) ok = false; console.log(`${good ? 'OK ' : 'BAD'} refuses: a key with nine arms`);
}

// ---- the verdict sentences are the registered ones; the tolerance helper -------------------------------------
const prereg = fs.readFileSync(`${L}/PREREGISTER-l20d.md`, 'utf8').replace(/\*\*/g, '');
const src = fs.readFileSync(`${L}/score.mjs`, 'utf8');
const vt = new Function(`return ${src.match(/export const VERDICT_TEXT = (\{[\s\S]*?\n\});/)[1]}`)();
for (const [k, t] of Object.entries(vt)) { const good = prereg.includes(`${k}`) && prereg.includes(t); if (!good) ok = false; console.log(`${good ? 'OK ' : 'BAD'} the ${k} sentence in score.mjs is verbatim in PREREGISTER-l20d.md`); }
const ge = new Function('EPS', `return ${src.match(/export const (ge = [^;]+);/)[1].replace(/^ge = /, '')}`)(Number(src.match(/EPS = ([\d.e-]+);/)[1]));
const geOk = ge(0.1 + 0.2, 0.3) === true && ge(0.29999, 0.3) === false && ge(0.5, 0.5) === true;
if (!geOk) ok = false; console.log(`${geOk ? 'OK ' : 'BAD'} ge(): 0.1+0.2 >= 0.3 true (float noise), 0.29999 >= 0.3 false, equal true`);

// ---- mutations: one rule broken in a copy, at least one case must notice -----------------------------------------
const MUTATIONS = [
    ['score: band strict (>) instead of >=', 'score', 'const c = { q: ge(newMean, appMean - MARGIN), band: ge(newWorst, appWorst),', 'const c = { q: ge(newMean, appMean - MARGIN), band: newWorst > appWorst,'],
    ['score: margin 0.04 instead of 0.05', 'score', 'const MARGIN = 0.05,', 'const MARGIN = 0.04,'],
    ['score: margin 0.06 instead of 0.05', 'score', 'const MARGIN = 0.05,', 'const MARGIN = 0.06,'],
    ['score: round instead of floor in the safety bar', 'score', 'Math.floor(appCW * CW_RATIO)', 'Math.round(appCW * CW_RATIO)'],
    ['score: consensus-wrong needs ONE grader instead of both', 'score', 'slots.every((s) => s[keyOf(arm, id)].correctness === 0)', 'slots.some((s) => s[keyOf(arm, id)].correctness === 0)'],
    ['score: the rate divides by 38 instead of the graded items', 'score', 'return a.length ? count(arm, a) / a.length : NaN;', 'return a.length ? count(arm, a) / ids.length : NaN;'],
    ['score: WAIT needs clause 4 OR 5 to hold instead of both', 'score', "!(c.rel && c.speed) ? 'WAIT'", "!(c.rel || c.speed) ? 'WAIT'"],
    ['score: the safety clause left out of STOP', 'score', "!(c.q && c.band && c.safety) ? 'STOP'", "!(c.q && c.band) ? 'STOP'"],
    ['score: STOP and WAIT swapped in priority (clause 4 and 5 first)', 'score', "const verdictKey = !(c.q && c.band && c.safety) ? 'STOP' : !(c.rel && c.speed) ? 'WAIT' : 'PROCEED';", "const verdictKey = !(c.rel && c.speed) ? 'WAIT' : !(c.q && c.band && c.safety) ? 'STOP' : 'PROCEED';"],
    ['score: the worst app sample replaced by the best', 'score', 'appWorst = Math.min(...APPS.map((a) => S[a].rate))', 'appWorst = Math.max(...APPS.map((a) => S[a].rate))'],
    ['mechanics: reliability bar 111 instead of 110', 'mech', 'export const NEED = 110,', 'export const NEED = 111,'],
    ['mechanics: p50 bar 2500 ms instead of 3000', 'mech', 'P50_MS = 3000,', 'P50_MS = 2500,'],
    ['mechanics: p50 bar 3500 ms instead of 3000', 'mech', 'P50_MS = 3000,', 'P50_MS = 3500,'],
    ['mechanics: p90 bar 7000 ms instead of 6600', 'mech', 'P90_MS = 6600,', 'P90_MS = 7000,'],
    ['mechanics: p90 bar 6000 ms instead of 6600', 'mech', 'P90_MS = 6600,', 'P90_MS = 6000,'],
    ['mechanics: slow-feed threshold so high nothing is slow', 'mech', 'SLOW_FEED = 1.30,', 'SLOW_FEED = 9.0,'],
    ['mechanics: slow-feed threshold 1.25 instead of 1.30', 'mech', 'SLOW_FEED = 1.30,', 'SLOW_FEED = 1.25,'],
    ['mechanics: a hole is a fast first word instead of no first word', 'mech', 'A[id].ttftMs : Infinity)),', 'A[id].ttftMs : 0)),'],
    ['mechanics: ALL slow-feed items left out, holes too', 'mech', 'const timed = ids.filter((id) => !slowAnswered.includes(id));', 'const timed = ids.filter((id) => !slow.includes(id));'],
    ['mechanics: no slow-feed item left out', 'mech', 'const timed = ids.filter((id) => !slowAnswered.includes(id));', 'const timed = ids;'],
    ['mechanics: percentile index rounded up', 'mech', 'Math.floor(sorted.length * p)', 'Math.ceil(sorted.length * p)'],
    ['mechanics: an apology counts as answered', 'mech', "&& !/system error/i.test(a.answer));", ');'],
];
if (!process.argv.includes('--no-mutations')) {
    const mechSrc = fs.readFileSync(`${L}/mechanics-l20d.mjs`, 'utf8');
    let caught = 0;
    for (const [name, which, from, to] of MUTATIONS) {
        const text = which === 'score' ? src : mechSrc;
        if (text.split(from).length !== 2) { ok = false; console.log(`BAD mutation setup: "${name}": its anchor is in the source ${text.split(from).length - 1} time(s), not once`); continue; }
        fs.writeFileSync(`${L}/mechanics-l20d.mut.mjs`, which === 'mech' ? mechSrc.replace(from, () => to) : mechSrc);
        fs.writeFileSync(`${L}/score.mut.mjs`, (which === 'score' ? src.replace(from, () => to) : src).replace("'./mechanics-l20d.mjs'", "'./mechanics-l20d.mut.mjs'"));
        // every case is run: those where a clause state or the verdict came out wrong, and those where only a printed number did
        const byState = [], byNumber = [];
        for (const c of CASES) { const res = checkCase(c, `${L}/score.mut.mjs`, true); if (!res.ok) (res.stateFail ? byState : byNumber).push(c.name.split(' ')[0]); }
        const found = byState.length + byNumber.length > 0;
        if (found) caught++; else ok = false;
        console.log(`${found ? 'OK ' : 'BAD'} mutation "${name}": ${found ? `a state or verdict went wrong in ${byState.join(' ') || 'none'}; a printed number went wrong in ${byNumber.join(' ') || 'none'}` : 'NO CASE FAILED (the calibration cannot see this rule)'}`);
    }
    fs.rmSync(`${L}/score.mut.mjs`); fs.rmSync(`${L}/mechanics-l20d.mut.mjs`);
    console.log(`mutations caught: ${caught} of ${MUTATIONS.length}`);
}
console.log(ok ? `L20D SCORE CALIBRATION OK (${CASES.length} cases, ${MUTATIONS.length} mutations)` : 'L20D SCORE CALIBRATION FAILED');
process.exit(ok ? 0 : 1);
