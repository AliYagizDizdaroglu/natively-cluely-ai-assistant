// Known-answer cases of P8 (score-r40.mjs), A3.6: synthetic inputs built to hit each section 7 row once (INCOMPLETE; NOT SAFE by AF; NOT SAFE by wrong; COSTS QUALITY;
// BUYS NOTHING by coverage, by lead, by M; CANDIDATE) plus the boundaries just inside each bar and the row-precedence cases; then an end-to-end run of the real loader/CLI on a
// synthetic folder tree (dry R run + synthetic L + P5 blind files + synthetic verdicts). Prints readings, counts and booleans only.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { calRun } from '../cal-util.mjs';
import { R40, readJson, loadItems } from '../r40-common.mjs';
import crypto from 'node:crypto';
import { scoreAll, decideReading, accept, isWrong, q, renderReport, readerFreeze, auditProblems } from './score-r40.mjs';
import { CLASSES } from '../read-r.mjs';

const C = calRun('score-r40');
const { items } = loadItems();
const E = items.filter((i) => i.class === 'E').map((i) => i.id);
const G = (c = 2, o = 2, d = 2) => ({ g1: { correctness: c, on_topic: o, delivery: d }, g2: { correctness: c, on_topic: o, delivery: d } });
const clone = (x) => JSON.parse(JSON.stringify(x));
/** the CANDIDATE base: 12 of the 20 EASY answered by Live, every HARD sent to L; L weak on 3 HARD items (shared by R); lead 3500 ms; nothing missing */
function base() {
    const d = { items, grades: { A: {}, L: {}, RL: {} }, rc: {}, firstText: { R: {}, A: {} }, ttft: { L: {} }, complete: { L: true, R: true, grading: true } };
    for (const it of items) {
        if (it.id !== 'RH14') d.grades.A[it.id] = G();
        d.grades.L[it.id] = ['RH03', 'RH04', 'RH05'].includes(it.id) ? G(1, 2, 2) : G();
        d.rc[it.id] = 'hard'; d.firstText.R[it.id] = 2000; d.firstText.A[it.id] = it.id === 'RH14' ? null : 1400; d.ttft.L[it.id] = 5000;
    }
    for (const id of E.slice(0, 12)) { d.rc[id] = 'answer'; d.grades.RL[id] = G(); d.firstText.R[id] = 1500; }
    return d;
}
const reading = (d) => scoreAll(d).reading;
const expectReading = (id, desc, d, name, whyRx = null) => { const r = reading(d); C.check(id, desc, `${name}${whyRx ? ` (why ~ ${whyRx})` : ''}`, `${r.name} (${r.why.slice(0, 60)})`, r.name === name && (!whyRx || new RegExp(whyRx).test(r.why))); };

// ---- unit definitions ----
C.check('S-def-1', 'acceptable needs BOTH graders at correctness 2 AND on_topic 2', 'g1 (2,2) + g2 (2,1) -> false; both (2,2) -> true', `${accept({ g1: { correctness: 2, on_topic: 2 }, g2: { correctness: 2, on_topic: 1 } })} / ${accept(G())}`, !accept({ g1: { correctness: 2, on_topic: 2 }, g2: { correctness: 2, on_topic: 1 } }) && accept(G()));
C.check('S-def-2', 'wrong = ANY grader correctness 0', 'g1 ok + g2 c0 -> true; both c1 -> false; no answer -> false', `${isWrong({ g1: { correctness: 2 }, g2: { correctness: 0 } })} / ${isWrong(G(1))} / ${isWrong(undefined)}`, isWrong({ g1: { correctness: 2 }, g2: { correctness: 0 } }) && !isWrong(G(1)) && !isWrong(undefined));
C.check('S-def-3', "live40's quantile on [1..5]: p50 and p90", '3 and 5', `${q([5, 1, 3, 2, 4], 0.5)} and ${q([5, 1, 3, 2, 4], 0.9)}`, q([5, 1, 3, 2, 4], 0.5) === 3 && q([5, 1, 3, 2, 4], 0.9) === 5);

// ---- the base and its numbers ----
const b = scoreAll(base());
C.check('S-0', 'base scenario (12 EASY answered, 3 HARD weak in L, lead 3500 ms)', 'CANDIDATE; acc A 46, L 44, R 44, ORACLE 44; EASY caught 12; lead 3500', `${b.reading.name}; acc A ${b.nums.accA}, L ${b.nums.accL}, R ${b.nums.accR}, ORACLE ${b.nums.accOracle}; EASY caught ${b.routing.easyCaught}; lead ${b.latency.lead}`, b.reading.name === 'CANDIDATE' && b.nums.accA === 46 && b.nums.accL === 44 && b.nums.accR === 44 && b.nums.accOracle === 44 && b.routing.easyCaught === 12 && b.latency.lead === 3500);
C.check('S-0b', 'the confusion tables have nine class columns; live40-class rows sum 20/11/9/7', '9 columns; E20 H11 QF9 AF7; E: 12 answer + 8 hard', `${CLASSES.length} columns; ${Object.entries(b.routing.byClass).map(([k, v]) => `${k}${Object.values(v).reduce((a, c) => a + c, 0)}`).join(' ')}; E ${b.routing.byClass.E.answer} answer + ${b.routing.byClass.E.hard} hard; row keys ${Object.keys(b.routing.byClass.E).length}`, CLASSES.length === 9 && Object.keys(b.routing.byClass.E).length === 9 && b.routing.byClass.E.answer === 12 && b.routing.byClass.E.hard === 8 && Object.entries(b.routing.byClass).map(([k, v]) => `${k}${Object.values(v).reduce((a, c) => a + c, 0)}`).join(' ') === 'E20 H11 QF9 AF7');
const rendered = []; renderReport(b, (s) => rendered.push(s));
C.check('S-0c', 'the printed report carries every class column name and the reading line', 'all 9 class names in the header; "READING 5: CANDIDATE"', `${CLASSES.every((c2) => rendered.join('\n').includes(c2))}; ${/READING 5: CANDIDATE/.test(rendered[0])}`, CLASSES.every((c2) => rendered.join('\n').includes(c2)) && /READING 5: CANDIDATE/.test(rendered[0]));

// ---- each reading once ----
let d = base(); d.complete.L = false;
expectReading('S-1', 'row 1 INCOMPLETE: L not complete', d, 'INCOMPLETE');
d = base(); d.complete.grading = false; expectReading('S-1b', 'row 1: grading incomplete', d, 'INCOMPLETE');
d = base(); d.complete.R = false; expectReading('S-1c', 'row 1: R not complete', d, 'INCOMPLETE');
d = base(); d.rc.EF02 = 'answer'; d.grades.RL.EF02 = G();
expectReading('S-2', 'row 2 NOT SAFE by AF: R answers the follow-up EF02 (an AF), graded perfectly', d, 'NOT SAFE', 'AF answered 1');
let r2 = scoreAll(d);
C.check('S-2b', 'the misroute list names the AF item first', 'EF02 first, dAcc 0', `${r2.falseEasy[0]?.id}[${r2.falseEasy[0]?.cls}] dAcc ${r2.falseEasy[0]?.dAcc}`, r2.falseEasy[0]?.id === 'EF02' && r2.falseEasy[0]?.cls === 'AF' && r2.falseEasy[0]?.dAcc === 0);
d = base(); d.grades.RL[E[0]] = G(0, 1, 1);
expectReading('S-3', 'row 2 NOT SAFE by wrong: an answered EASY item graded correctness 0 in RL (L right), no AF answered', d, 'NOT SAFE', 'wrong R 1 vs L 0');
d = base(); d.grades.RL[E[0]] = { g1: G().g1, g2: { correctness: 0, on_topic: 2, delivery: 2 } };
expectReading('S-3b', 'row 2: ONE grader\'s correctness 0 is enough', d, 'NOT SAFE', 'wrong R 1 vs L 0');
d = base(); d.grades.RL[E[0]] = G(0, 1, 1); d.grades.L[E[0]] = G(0, 1, 1);
expectReading('S-3c', 'negative control: the same item wrong in BOTH L and RL (wrong R = wrong L = 1)', d, 'CANDIDATE');
d = base(); for (const id of E.slice(0, 3)) d.grades.RL[id] = G(1, 2, 2);
expectReading('S-4', 'row 3 COSTS QUALITY: 3 answered items weak (c1, not wrong) in RL where L is acceptable: acc R = acc L - 3', d, 'COSTS QUALITY', 'acc R 41 <= acc L 44');
d = base(); for (const id of E.slice(0, 2)) d.grades.RL[id] = G(1, 2, 2);
expectReading('S-4b', 'boundary: 2 such items (acc R = acc L - 2) is "no detectable difference"', d, 'CANDIDATE');
d = base(); for (const id of E.slice(9, 12)) { d.rc[id] = 'hard'; delete d.grades.RL[id]; }
expectReading('S-5', 'row 4 BUYS NOTHING by coverage: 9 of 20 EASY caught', d, 'BUYS NOTHING', 'EASY caught 9');
d = base(); for (const id of E.slice(10, 12)) { d.rc[id] = 'hard'; delete d.grades.RL[id]; }
expectReading('S-5b', 'boundary: 10 of 20 caught', d, 'CANDIDATE');
d = base(); for (const id of E.slice(0, 12)) d.firstText.R[id] = 4100;
expectReading('S-6', 'row 4 BUYS NOTHING by lead: lead 900 ms', d, 'BUYS NOTHING', 'lead 900 ms');
d = base(); for (const id of E.slice(0, 12)) d.firstText.R[id] = 4000;
expectReading('S-6b', 'boundary: lead exactly 1000 ms', d, 'CANDIDATE');
d = base(); for (const id of ['RH07', 'RH08', 'RH09']) d.rc[id] = 'missing';
expectReading('S-7', 'row 4 BUYS NOTHING by M: 3 items missing', d, 'BUYS NOTHING', 'M 3');
const r7 = scoreAll(d);
C.check('S-7c', 'missing items are excluded from the routing denominators and listed (3 HARD missing: HARD denominator 24, "not answered" 24, list RH07,RH08,RH09)', 'den.HARD 24; hardNotAnswered 24; M list RH07,RH08,RH09', `den.HARD ${r7.routing.den.HARD}; hardNotAnswered ${r7.routing.hardNotAnswered}; M list ${r7.routing.missing.join(',')}`, r7.routing.den.HARD === 24 && r7.routing.hardNotAnswered === 24 && r7.routing.missing.join() === 'RH07,RH08,RH09');
d = base(); for (const id of ['RH07', 'RH08']) d.rc[id] = 'missing';
expectReading('S-7b', 'boundary: M = 2', d, 'CANDIDATE');
expectReading('S-8', 'row 5 CANDIDATE: the base', base(), 'CANDIDATE', 'EASY caught 12');
// precedence: the first matching row wins
d = base(); d.rc.EF02 = 'answer'; d.grades.RL.EF02 = G(); for (const id of E.slice(9, 12)) { d.rc[id] = 'hard'; delete d.grades.RL[id]; }
expectReading('S-9', 'precedence: AF answered AND coverage 9 (rows 2 and 4)', d, 'NOT SAFE');
d = base(); d.complete.L = false; d.rc.EF02 = 'answer'; d.grades.RL.EF02 = G();
expectReading('S-9b', 'precedence: INCOMPLETE AND AF answered (rows 1 and 2)', d, 'INCOMPLETE');
d = base(); for (const id of E.slice(0, 3)) d.grades.RL[id] = G(1, 2, 2); for (const id of E.slice(0, 12)) d.firstText.R[id] = 4100;
expectReading('S-9c', 'precedence: COSTS QUALITY AND lead 900 (rows 3 and 4)', d, 'COSTS QUALITY');
// the reading function alone, edge numbers
const rd = (o) => decideReading({ complete: { L: true, R: true, grading: true }, afAnswered: 0, wrongR: 0, wrongL: 0, accR: 40, accL: 40, easyCaught: 12, lead: 3000, M: 0, ...o }).name;
C.check('S-10', 'decideReading edge numbers: lead null (no answered item)', 'BUYS NOTHING', rd({ lead: null }), rd({ lead: null }) === 'BUYS NOTHING');
C.check('S-10b', 'decideReading: accR = accL - 3 -> COSTS QUALITY; accR = accL - 2 -> CANDIDATE', 'COSTS QUALITY / CANDIDATE', `${rd({ accR: 37 })} / ${rd({ accR: 38 })}`, rd({ accR: 37 }) === 'COSTS QUALITY' && rd({ accR: 38 }) === 'CANDIDATE');
// ---- latency, misroute and paired lists ----
d = base(); d.rc.EF02 = 'answer'; d.grades.RL.EF02 = G(2, 2, 2); const r3 = scoreAll(d);
C.check('S-11', 'latency: Live first text p50 on answered items 1500, L TTFT p50 5000; "hard" decision p50 2000; composed parallel p50 = 5000? (35 of 47 items wait for L)', 'live 1500; L 5000; hard 2000; parallel p50 5000', `live ${r3.latency.liveOnAnswered.p50}; L ${r3.latency.lOnAnswered.p50}; hard ${r3.latency.hardDecision.p50}; parallel ${r3.latency.composedParallel.p50}`, r3.latency.liveOnAnswered.p50 === 1500 && r3.latency.lOnAnswered.p50 === 5000 && r3.latency.hardDecision.p50 === 2000 && r3.latency.composedParallel.p50 === 5000);
C.check('S-11b', 'serial composed first text = Live "hard" time + L TTFT for non-answered items (2000 + 5000)', 'p90 7000', String(r3.latency.composedSerial.p90), r3.latency.composedSerial.p90 === 7000);
d = base(); d.rc[E[15]] = 'hard'; const r4 = scoreAll(d);
C.check('S-12', 'false HARD list: an EASY item not answered carries its latency cost (L TTFT - A first text = 5000 - 1400)', `${8} false HARD items, cost 3600 ms`, `${r4.falseHard.length} items, cost ${r4.falseHard[0]?.latencyCost} ms`, r4.falseHard.length === 8 && r4.falseHard[0].latencyCost === 3600);
d = base(); d.grades.RL[E[1]] = G(1, 2, 2); const r5 = scoreAll(d);
C.check('S-13', 'paired lists: R vs L differ only on the one item where RL was weaker', `[${E[1]}]`, `[${r5.paired.RvsL.join(',')}]`, r5.paired.RvsL.join() === E[1]);
// ---- test-retest ----
d = base(); d.orig = Object.fromEntries(items.filter((i) => i.id !== 'RH14').map((i) => [i.id, true])); d.orig.RE01 = false; d.orig.RE02 = false;
const r6 = scoreAll(d);
C.check('S-14', "test-retest of A: original grading had 2 items weak that the new grading finds acceptable", '44/46 same; different [RE01,RE02]', `${r6.retest.same}/${r6.retest.n} same; different [${r6.retest.different.join(',')}]`, r6.retest.same === 44 && r6.retest.n === 46 && r6.retest.different.join() === 'RE01,RE02');
// ---- the loader end to end (real code path, synthetic files) ----
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'r40-cal-p8-'));
const RUNS = path.join(TMP, 'runs'), GRD = path.join(TMP, 'grade'); fs.mkdirSync(RUNS);
const RUL = path.join(TMP, 'rul.txt'); fs.writeFileSync(RUL, `${fs.readFileSync(`${R40}/USER-RULINGS.txt`, 'utf8')}\nF 2026-10-06: 0 — G sitting: none today — stub\n`, 'utf8');
const script = {}; for (const it of items) script[it.id] = E.slice(0, 12).includes(it.id) ? 'words40' : 'hard';
const SCR = path.join(TMP, 'script.json'); fs.writeFileSync(SCR, JSON.stringify(script));
const dry = spawnSync(process.execPath, [`${R40}/run-r.mjs`, '--dry', '--variant', 'B', '--stub-rulings', RUL, '--dry-script', SCR, '--out-dir', RUNS, '--name', 'router40-R'], { encoding: 'utf8' });
const L = { name: 'router40-L', model: 'x', records: {}, holes: [], cap: 60, complete: true, stopReason: null };
for (const it of items) L.records[it.id] = { spoken: `A plain L answer, number ${items.indexOf(it) + 1}, that is short.`, words: 9, ttft: 5000, total: 6000, thoughts: 0, finish: 'STOP', attempts: 1, orphan: false };
fs.writeFileSync(path.join(RUNS, 'router40-L.answers.json'), JSON.stringify(L));
const build = spawnSync(process.execPath, [`${R40}/grade/build-blind-r40.mjs`, '--runs-dir', RUNS, '--out-dir', GRD, '--allow-dry'], { encoding: 'utf8' });
const key = readJson(path.join(GRD, 'keyhold', 'key.json'));
const writeVerdicts = (mutate = null) => {
    for (const [tag, km] of Object.entries(key)) for (const g of ['g1', 'g2']) {
        const v = Object.fromEntries(Object.keys(km).map((k) => [k, { correctness: 2, on_topic: 2, delivery: 2 }]));
        if (mutate) mutate(tag, g, km, v);
        fs.writeFileSync(path.join(GRD, 'blind', `verdicts.${tag}.${g}.json`), JSON.stringify(v));
    }
};
writeVerdicts();
// A8.4 step 4 (I2): the P7 audits and launch records the loader now requires: one clean+ABSENT+pinned audit line per slot, for the session of that slot's last launch
const SLOTS = Object.keys(key).flatMap((t) => [`${t}.g1`, `${t}.g2`]);
const jl = (rows) => `${rows.map((r) => JSON.stringify(r)).join('\n')}\n`;
const writeAudits = ({ audits = SLOTS.map((s) => ({ tag: s, session: `sess-${s}`, clean: true, memory: 'ABSENT', pinned: true })), launches = SLOTS.map((s) => ({ slot: s, attempt: 1, session_id: `sess-${s}` })) } = {}) => {
    fs.rmSync(path.join(GRD, 'audits.jsonl'), { force: true }); fs.rmSync(path.join(GRD, 'blind', 'launches.jsonl'), { force: true });
    if (audits) fs.writeFileSync(path.join(GRD, 'audits.jsonl'), jl(audits));
    if (launches) fs.writeFileSync(path.join(GRD, 'blind', 'launches.jsonl'), jl(launches));
};
const okAudit = (s) => ({ tag: s, session: `sess-${s}`, clean: true, memory: 'ABSENT', pinned: true });
writeAudits();
const score = () => spawnSync(process.execPath, [`${R40}/grade/score-r40.mjs`, '--grade-dir', GRD, '--runs-dir', RUNS], { encoding: 'utf8' });
let sc = score();
C.check('S-E2E-1', 'real loader + CLI on a synthetic tree: dry R (12 EASY answered), L complete, 8 verdict files all perfect, 8 clean audits + launch records', 'READING 5: CANDIDATE; EASY caught 12/20; AF answered 0/7', `${(/READING \d: [A-Z ]+/.exec(sc.stdout) ?? ['no reading'])[0]}; ${(/EASY caught \d+\/20; AF answered \d+\/7/.exec(sc.stdout) ?? ['-'])[0]}; setup exits dry ${dry.status} build ${build.status}`, dry.status === 0 && build.status === 0 && /READING 5: CANDIDATE/.test(sc.stdout) && /EASY caught 12\/20; AF answered 0\/7/.test(sc.stdout));
const rdg = (o) => (/READING \d: [A-Z ]+/.exec(o.stdout) ?? [`exit ${o.status}`])[0];
// A8 case: 8 valid verdict files + 1 NOT CLEAN audit -> READING 1
writeAudits({ audits: [...SLOTS.map(okAudit), { ...okAudit(SLOTS[2]), clean: false }] }); sc = score();
C.check('S-A1', 'A8 case: 8 valid verdict files and 1 NOT CLEAN audit (blind-2.g1, recorded after its clean one)', 'READING 1: INCOMPLETE', rdg(sc), /READING 1: INCOMPLETE/.test(sc.stdout));
writeAudits({ audits: SLOTS.map((s) => (s === SLOTS[5] ? { ...okAudit(s), memory: 'LOADED' } : okAudit(s))) }); sc = score();
C.check('S-A2', 'one audit with memory LOADED', 'READING 1: INCOMPLETE', rdg(sc), /READING 1: INCOMPLETE/.test(sc.stdout));
writeAudits({ audits: SLOTS.map((s) => (s === SLOTS[7] ? { ...okAudit(s), pinned: false } : okAudit(s))) }); sc = score();
C.check('S-A3', 'one audit with the model not PINNED', 'READING 1: INCOMPLETE', rdg(sc), /READING 1: INCOMPLETE/.test(sc.stdout));
writeAudits({ audits: SLOTS.map((s) => (s === SLOTS[0] ? { ...okAudit(s), session: 'some-other-session' } : okAudit(s))) }); sc = score();
C.check('S-A4', "the audited session is not the slot's last launch", 'READING 1: INCOMPLETE', rdg(sc), /READING 1: INCOMPLETE/.test(sc.stdout));
writeAudits({ audits: SLOTS.slice(1).map(okAudit) }); sc = score();
C.check('S-A5', 'no audit record at all for one slot', 'READING 1: INCOMPLETE', rdg(sc), /READING 1: INCOMPLETE/.test(sc.stdout));
writeAudits({ audits: null }); sc = score();
C.check('S-A6', 'no audits.jsonl at all', 'READING 1: INCOMPLETE', rdg(sc), /READING 1: INCOMPLETE/.test(sc.stdout));
writeAudits({ launches: null }); sc = score();
C.check('S-A7', 'audits clean but no blind/launches.jsonl', 'READING 1: INCOMPLETE', rdg(sc), /READING 1: INCOMPLETE/.test(sc.stdout));
writeAudits({ audits: [{ ...okAudit(SLOTS[3]), session: 'old-attempt', clean: false }, ...SLOTS.map(okAudit)], launches: [{ slot: SLOTS[3], attempt: 1, session_id: 'old-attempt' }, ...SLOTS.map((s) => ({ slot: s, attempt: 1, session_id: `sess-${s}` }))] }); sc = score();
C.check('S-A8', 'a REAL re-grade: attempt 1 (a different session) NOT CLEAN, then a new session for the slot, clean', 'READING 5: CANDIDATE', rdg(sc), /READING 5: CANDIDATE/.test(sc.stdout));
writeAudits({ audits: [{ ...okAudit(SLOTS[3]), clean: false }, ...SLOTS.map(okAudit)] }); sc = score();
C.check('S-A8b', 'a re-AUDIT is not a re-grade (re-review I-A): the SAME session NOT CLEAN, then a later clean line', 'READING 1: INCOMPLETE', rdg(sc), /READING 1: INCOMPLETE/.test(sc.stdout));
writeAudits({ audits: [...SLOTS.map(okAudit), { ...okAudit(SLOTS[3]), clean: false }] }); sc = score();
C.check('S-A9', 'the reverse: a clean audit, then a later NOT CLEAN one for the same slot', 'READING 1: INCOMPLETE', rdg(sc), /READING 1: INCOMPLETE/.test(sc.stdout));
writeAudits({ launches: [{ slot: SLOTS[1], attempt: 1, session_id: 'old-attempt' }, ...SLOTS.map((s) => ({ slot: s, attempt: 1, session_id: `sess-${s}` }))] }); sc = score();
C.check('S-A10', 'launch records: an older attempt first, the audited session is the slot\'s LAST launch', 'READING 5: CANDIDATE', rdg(sc), /READING 5: CANDIDATE/.test(sc.stdout));
const ap = auditProblems(GRD, SLOTS);
C.check('S-A11', 'auditProblems on the same tree', '0 problems', String(ap.length), ap.length === 0);
// A8.4 step 4 (M-2 freeze): the reader's sha256 must be the build record's
const brPath = path.join(GRD, 'keyhold', 'build-record.json');
const realBr = fs.readFileSync(brPath, 'utf8'), shaNow = crypto.createHash('sha256').update(fs.readFileSync(`${R40}/read-r.mjs`)).digest('hex');
C.check('S-F1', 'the build record from P5 holds the real read-r.mjs sha256, and the CLI scores with it', `record = ${shaNow.slice(0, 12)}; READING 5`, `record ${JSON.parse(realBr).readRSha256 === shaNow ? 'equal' : 'DIFFERENT'}; ${rdg(sc)}`, JSON.parse(realBr).readRSha256 === shaNow && /READING 5/.test(sc.stdout));
const brj = JSON.parse(realBr);
C.check('S-F5', 'the build record holds a sha256 of the reader per-item output (64 hex)', '64 hex', String(brj.readerOutputSha256).length === 64 ? '64 hex' : 'absent', /^[0-9a-f]{64}$/.test(brj.readerOutputSha256));
fs.writeFileSync(brPath, JSON.stringify({ ...brj, readerOutputSha256: '0'.repeat(64) })); sc = score();
const both2 = /build record 0{64}, now ([0-9a-f]{64})/.exec(sc.stdout);
C.check('S-F6', 'a reader whose per-item output differs from the build record (same file sha)', 'REFUSED, exit 2, both shas named', `exit ${sc.status}; named ${!!both2}`, sc.status === 2 && /REFUSED/.test(sc.stdout) && /output is not frozen/.test(sc.stdout) && !!both2);
const { readerOutputSha256: _o, ...noOut } = brj; fs.writeFileSync(brPath, JSON.stringify(noOut)); sc = score();
C.check('S-F7', 'a build record with no readerOutputSha256', 'REFUSED, exit 2', `exit ${sc.status}`, sc.status === 2 && /REFUSED/.test(sc.stdout));
fs.writeFileSync(brPath, JSON.stringify({ ...brj, readRSha256: '0'.repeat(64) })); sc = score();
const both = /build record 0{64}, now ([0-9a-f]{64})/.exec(sc.stdout);
C.check('S-F2', 'a read-r.mjs sha different from the build record', 'REFUSED, exit 2, both shas named', `exit ${sc.status}; both shas named ${!!both && both[1] === shaNow}`, sc.status === 2 && /REFUSED/.test(sc.stdout) && !!both && both[1] === shaNow);
fs.rmSync(brPath); sc = score();
C.check('S-F3', 'no build record at all', 'REFUSED, exit 2', `exit ${sc.status}`, sc.status === 2 && /REFUSED/.test(sc.stdout));
fs.writeFileSync(brPath, realBr);
const altReader = path.join(TMP, 'read-r.altered.mjs'); fs.writeFileSync(altReader, `${fs.readFileSync(`${R40}/read-r.mjs`, 'utf8')}\n// one byte more\n`);
const fzAlt = readerFreeze(GRD, altReader), fzReal = readerFreeze(GRD);
C.check('S-F4', 'readerFreeze(): the real reader against the record, and an altered copy of the reader', 'ok true / ok false', `ok ${fzReal.ok} / ok ${fzAlt.ok}`, fzReal.ok === true && fzAlt.ok === false);
writeAudits();
// flip ONE RL verdict of an answered EASY item to correctness 0 in g2
const rl = Object.entries(key).flatMap(([tag, km]) => Object.entries(km).filter(([, m]) => m.arm === 'RL').map(([k, m]) => ({ tag, k, m })))[0];
writeVerdicts((tag, g, km, v) => { if (tag === rl.tag && g === 'g2') v[rl.k].correctness = 0; });
sc = score();
C.check('S-E2E-2', 'the same tree with ONE RL verdict (g2 correctness 0)', 'READING 2: NOT SAFE', (/READING \d: [A-Z ]+/.exec(sc.stdout) ?? ['no reading'])[0], /READING 2: NOT SAFE/.test(sc.stdout));
// remove one verdict file: grading incomplete
fs.rmSync(path.join(GRD, 'blind', 'verdicts.blind-3.g2.json'));
sc = score();
C.check('S-E2E-3', 'one of the 8 verdict files missing', 'READING 1: INCOMPLETE', (/READING \d: [A-Z ]+/.exec(sc.stdout) ?? [`exit ${sc.status}`])[0], /READING 1: INCOMPLETE/.test(sc.stdout));
fs.rmSync(TMP, { recursive: true, force: true });
C.finish();
