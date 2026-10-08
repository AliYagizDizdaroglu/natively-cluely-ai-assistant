// P8 score-r40.mjs: scores router40 (registration 5, 6.1, 7; A2.6 "the nine classes"): the routing tables, quality per arm (A, L, R, ORACLE), misroute costs, latency, health,
// test-retest of A, and the section 7 READING (first matching row wins). Prints ids, counts and ms only.
//   node score-r40.mjs [--grade-dir D] [--runs-dir D] [--l38base <labels.json>]
// Definitions (live40's): acceptable = BOTH graders correctness 2 AND on_topic 2; wrong = any grader correctness 0; no answer = not acceptable (and not wrong).
// R's grade of an item = RL's grade if R's class is `answer`, else L's grade. ORACLE = A on the 20 EASY + L on the 27 HARD.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { R40, L40, FR, readJson, loadItems, argOf, readerOutputSha } from '../r40-common.mjs';
import { readRun, CLASSES, confusion } from '../read-r.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
/** A8.4 step 4 (M-2 freeze by code): the reader's sha256 now vs the one build-blind recorded beside the key. */
export function readerFreeze(gradeDir, readerFile = path.join(HERE, '..', 'read-r.mjs')) {
    let rec = null; try { rec = readJson(`${gradeDir}/keyhold/build-record.json`); } catch { /* absent */ }
    const now = crypto.createHash('sha256').update(fs.readFileSync(readerFile)).digest('hex');
    if (!rec?.readRSha256) return { ok: false, now, built: null, msg: `no keyhold/build-record.json with readRSha256 (reader now ${now})` };
    return { ok: rec.readRSha256 === now, now, built: rec.readRSha256, msg: rec.readRSha256 === now ? 'same reader as the build' : `read-r.mjs sha256 differs: build record ${rec.readRSha256}, now ${now}` };
}
/** A8.4 step 4 (I2) + re-review I-A: every blind-N.gX slot's LAST launch needs at least one audit line, and every audit line of that session must be clean + ABSENT + pinned. Returns the problems (empty = ok). */
export function auditProblems(gradeDir, slots) {
    const lines = (f) => { try { return fs.readFileSync(f, 'utf8').split('\n').filter((l) => l.trim()).map((l) => { try { return JSON.parse(l); } catch { return null; } }); } catch { return []; } };
    const audits = lines(`${gradeDir}/audits.jsonl`), launches = lines(`${gradeDir}/blind/launches.jsonl`);
    const last = (arr, f) => arr.filter((r) => r && f(r)).at(-1);
    const out = [];
    for (const slot of slots) {
        // A8 re-review I-A: the slot's last launch decides the session; EVERY audit line of that session must be clean + ABSENT + pinned (a re-audit never clears a NOT CLEAN; only a re-grade, a new session, does)
        const l = last(launches, (r) => r.slot === slot);
        const mine = l ? audits.filter((r) => r && r.tag === slot && r.session === l.session_id) : [];
        if (!l) out.push(`${slot}: no launch record`);
        else if (!mine.length) out.push(`${slot}: no audit record for the slot's last launch`);
        else if (!mine.every((a) => a.clean === true && a.memory === 'ABSENT' && a.pinned === true)) out.push(`${slot}: an audit of the last launch is not CLEAN/ABSENT/PINNED`);
    }
    return out;
}
/** A8 re-review M-1: the per-item output of the reader now vs the sha build-blind recorded. */
export function outputFreeze(gradeDir, now) {
    let rec = null; try { rec = readJson(`${gradeDir}/keyhold/build-record.json`); } catch { /* absent */ }
    if (!rec?.readerOutputSha256) return { ok: false, msg: `no readerOutputSha256 in keyhold/build-record.json (output now ${now})` };
    return { ok: rec.readerOutputSha256 === now, msg: rec.readerOutputSha256 === now ? 'same reader output as the build' : `reader output sha256 differs: build record ${rec.readerOutputSha256}, now ${now}` };
}
export const GROUPS = ['EASY', 'HARD standalone', 'HARD follow-up'];
export const groupOf = (it) => (it.class === 'E' ? 'EASY' : it.class === 'H' ? 'HARD standalone' : 'HARD follow-up');
export const accept = (g) => !!g && g.g1.correctness === 2 && g.g1.on_topic === 2 && g.g2.correctness === 2 && g.g2.on_topic === 2;
export const isWrong = (g) => !!g && (g.g1.correctness === 0 || g.g2.correctness === 0);
/** live40's quantile (timing.mjs): element floor(p*(n-1)+0.5) of the ascending list. */
export const q = (a, p) => { const s = a.filter((x) => Number.isFinite(x)).sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))] : null; };
const NO_OUTPUT_MS = 30000; // R's no-output timeout: Live's "decision time" of an item that produced no first text (serial design only)

/** The section 7 reading from the five numbers; returns { n, name, why }. */
export function decideReading({ complete, afAnswered, wrongR, wrongL, accR, accL, easyCaught, lead, M }) {
    if (!(complete.L && complete.R && complete.grading)) return { n: 1, name: 'INCOMPLETE', why: `complete: L ${complete.L}, R ${complete.R}, grading ${complete.grading}` };
    if (afAnswered >= 1 || wrongR > wrongL) return { n: 2, name: 'NOT SAFE', why: `AF answered ${afAnswered}; wrong R ${wrongR} vs L ${wrongL}` };
    if (accR <= accL - 3) return { n: 3, name: 'COSTS QUALITY', why: `acc R ${accR} <= acc L ${accL} - 3` };
    if (easyCaught < 10 || lead == null || lead < 1000 || M >= 3) return { n: 4, name: 'BUYS NOTHING', why: `EASY caught ${easyCaught} (need >= 10); lead ${lead == null ? 'n/a' : `${lead} ms`} (need >= 1000); M ${M} (need <= 2)` };
    return { n: 5, name: 'CANDIDATE', why: `acc R ${accR} >= acc L ${accL} - 2; no AF answered; wrong R ${wrongR} <= L ${wrongL}; EASY caught ${easyCaught}; lead ${lead} ms; M ${M}` };
}

/**
 * data: { items, grades: { A, L, RL }: { id: { g1, g2 } }, rc: { id: class }, firstText: { R, A }: { id: ms|null }, ttft: { L }: { id: ms|null },
 *         complete: { L, R, grading }, health?, orig?: { id: bool }, l38?: { id: 'EASY'|'HARD'|'split' } }
 */
export function scoreAll(data) {
    const { items, grades, rc, firstText, ttft, complete } = data;
    const rGrade = (id) => {
        if (rc[id] === 'answer') { if (!grades.RL[id]) { if (!complete.grading) return undefined; throw new Error(`${id}: R class is answer but no RL grade`); } return grades.RL[id]; }
        return grades.L[id];
    };
    const gradeOf = { A: (id) => grades.A[id], L: (id) => grades.L[id], R: rGrade, ORACLE: (id) => (items.find((i) => i.id === id).route === 'EASY' ? grades.A[id] : grades.L[id]) };
    const arms = ['A', 'L', 'R', 'ORACLE'];
    // quality per arm per group
    const quality = {};
    for (const arm of arms) {
        const rows = {};
        for (const g of [...GROUPS, 'HARD (both)', 'ALL']) rows[g] = { n: 0, answered: 0, acceptable: 0, wrong: 0 };
        for (const it of items) {
            const gr = gradeOf[arm](it.id);
            for (const key of [groupOf(it), it.route === 'HARD' ? 'HARD (both)' : null, 'ALL']) if (key) { const r = rows[key]; r.n++; if (gr) r.answered++; if (accept(gr)) r.acceptable++; if (isWrong(gr)) r.wrong++; }
        }
        quality[arm] = rows;
    }
    const accR = quality.R.ALL.acceptable, accL = quality.L.ALL.acceptable, wrongR = quality.R.ALL.wrong, wrongL = quality.L.ALL.wrong;
    // routing
    const rows = items.map((it) => ({ id: it.id, route: it.route, cls: it.class, rc: rc[it.id] }));
    const byClass = confusion(rows, (r) => r.cls, ['E', 'H', 'QF', 'AF']);
    const byGroup = confusion(rows, (r) => groupOf({ class: r.cls }), GROUPS);
    const byL38 = data.l38 ? confusion(rows, (r) => data.l38[r.id] ?? 'split', ['EASY', 'HARD', 'split']) : null;
    const answered = rows.filter((r) => r.rc === 'answer');
    const easyCaught = answered.filter((r) => r.cls === 'E').length;
    const afAnswered = answered.filter((r) => r.cls === 'AF').length;
    const M = rows.filter((r) => r.rc === 'missing').length;
    // latency
    const liveFirst = answered.map((r) => firstText.R[r.id]).filter(Number.isFinite);
    const lOn = answered.map((r) => ttft.L[r.id]).filter(Number.isFinite);
    const aOn = answered.map((r) => firstText.A[r.id]).filter(Number.isFinite);
    const lead = answered.length && lOn.length && liveFirst.length ? q(lOn, 0.5) - q(liveFirst, 0.5) : null;
    const hardTimes = rows.filter((r) => r.rc === 'hard').map((r) => firstText.R[r.id]);
    const lByGroup = Object.fromEntries([...GROUPS, 'ALL'].map((g) => [g, { p50: q(items.filter((it) => g === 'ALL' || groupOf(it) === g).map((it) => ttft.L[it.id]), 0.5), p90: q(items.filter((it) => g === 'ALL' || groupOf(it) === g).map((it) => ttft.L[it.id]), 0.9) }]));
    const parallel = items.map((it) => (rc[it.id] === 'answer' ? firstText.R[it.id] : ttft.L[it.id]));
    const serial = items.map((it) => (rc[it.id] === 'answer' ? firstText.R[it.id] : (Number.isFinite(firstText.R[it.id]) ? firstText.R[it.id] : NO_OUTPUT_MS) + (ttft.L[it.id] ?? NaN)));
    const latency = { liveOnAnswered: { n: liveFirst.length, p50: q(liveFirst, 0.5), p90: q(liveFirst, 0.9) }, aOnSame: { n: aOn.length, p50: q(aOn, 0.5), p90: q(aOn, 0.9) },
        hardDecision: { n: hardTimes.filter(Number.isFinite).length, p50: q(hardTimes, 0.5), p90: q(hardTimes, 0.9) }, lOnAnswered: { p50: q(lOn, 0.5), p90: q(lOn, 0.9) }, lByGroup, lead,
        composedParallel: { p50: q(parallel, 0.5), p90: q(parallel, 0.9) }, composedSerial: { p50: q(serial, 0.5), p90: q(serial, 0.9) } };
    // misroute costs
    const delta = (id) => ({ id, rAcc: accept(rGrade(id)), lAcc: accept(grades.L[id]), dAcc: +accept(rGrade(id)) - +accept(grades.L[id]), dWrong: +isWrong(rGrade(id)) - +isWrong(grades.L[id]) });
    const falseEasy = answered.filter((r) => r.route === 'HARD').map((r) => ({ ...delta(r.id), cls: r.cls })).sort((a, b) => (a.cls === 'AF' ? 0 : a.cls === 'QF' ? 2 : 1) - (b.cls === 'AF' ? 0 : b.cls === 'QF' ? 2 : 1));
    const falseHard = rows.filter((r) => r.route === 'EASY' && r.rc !== 'answer').map((r) => ({ id: r.id, rc: r.rc, latencyCost: Number.isFinite(ttft.L[r.id]) && Number.isFinite(firstText.A[r.id]) ? ttft.L[r.id] - firstText.A[r.id] : null, lAcc: accept(grades.L[r.id]), aAcc: accept(grades.A[r.id]) }));
    // paired lists
    const differ = (f1, f2) => items.filter((it) => accept(f1(it.id)) !== accept(f2(it.id)) || isWrong(f1(it.id)) !== isWrong(f2(it.id))).map((it) => it.id);
    const paired = { RvsL: differ(rGrade, (id) => grades.L[id]), RvsAonHard: items.filter((it) => it.route === 'HARD' && (accept(rGrade(it.id)) !== accept(grades.A[it.id]))).map((it) => it.id), AvsL: differ((id) => grades.A[id], (id) => grades.L[id]) };
    // health
    const health = data.health ?? null;
    // test-retest: A's new consensus vs live40's original grading
    let retest = null;
    if (data.orig) {
        const ids = items.filter((it) => grades.A[it.id] && it.id in data.orig).map((it) => it.id);
        const diff = ids.filter((id) => accept(grades.A[id]) !== data.orig[id]);
        retest = { n: ids.length, same: ids.length - diff.length, different: diff, origAcceptable: ids.filter((id) => data.orig[id]).length, newAcceptable: ids.filter((id) => accept(grades.A[id])).length };
    }
    const reading = decideReading({ complete, afAnswered, wrongR, wrongL, accR, accL, easyCaught, lead, M });
    const den = (f) => rows.filter((r) => f(r) && r.rc !== 'missing').length; // `missing` items are excluded from the routing denominators (registration 5)
    return { quality, routing: { den: { E: den((r) => r.cls === 'E'), H: den((r) => r.cls === 'H'), QF: den((r) => r.cls === 'QF'), AF: den((r) => r.cls === 'AF'), HARD: den((r) => r.route === 'HARD') }, byClass, byGroup, byL38, easyCaught, afAnswered, qfAnswered: answered.filter((r) => r.cls === 'QF').length, hAnswered: answered.filter((r) => r.cls === 'H').length, M, missing: rows.filter((r) => r.rc === 'missing').map((r) => r.id), hardExact: rows.filter((r) => r.route === 'HARD' && r.rc === 'hard').length, hardNotAnswered: rows.filter((r) => r.route === 'HARD' && r.rc !== 'answer' && r.rc !== 'missing').length }, latency, falseEasy, falseHard, paired, health, retest, nums: { accR, accL, wrongR, wrongL, accA: quality.A.ALL.acceptable, accOracle: quality.ORACLE.ALL.acceptable }, reading };
}

const s2 = (ms) => (ms == null || !Number.isFinite(ms) ? '-' : (ms / 1000).toFixed(2));
export function renderReport(res, say = console.log) {
    say(`READING ${res.reading.n}: ${res.reading.name}  (${res.reading.why})`);
    say(`numbers: acc A ${res.nums.accA}, L ${res.nums.accL}, R ${res.nums.accR}, ORACLE ${res.nums.accOracle}; wrong L ${res.nums.wrongL}, R ${res.nums.wrongR}`);
    say('\nquality (acceptable / answered / wrong, per group)');
    say(`  ${'group'.padEnd(18)}${['A', 'L', 'R', 'ORACLE'].map((a) => a.padStart(16)).join('')}`);
    for (const g of [...GROUPS, 'HARD (both)', 'ALL']) say(`  ${g.padEnd(18)}${['A', 'L', 'R', 'ORACLE'].map((a) => { const r = res.quality[a][g]; return `${r.acceptable}/${r.answered}/${r.wrong} of ${r.n}`.padStart(16); }).join('')}`);
    const tbl = (title, t) => { say(`\n${title}`); say(`  ${'row'.padEnd(18)}${CLASSES.map((c) => c.padStart(10)).join('')}   n`); for (const [k, v] of Object.entries(t)) say(`  ${k.padEnd(18)}${CLASSES.map((c) => String(v[c]).padStart(10)).join('')}  ${String(Object.values(v).reduce((a, b) => a + b, 0)).padStart(2)}`); };
    tbl('routing by live40 class (nine class columns)', res.routing.byClass);
    tbl('routing by live40 group', res.routing.byGroup);
    if (res.routing.byL38) tbl('routing by l38base consensus label', res.routing.byL38); else say('\nl38base axis: not provided (descriptive only)');
    const dn = res.routing.den;
    say(`EASY caught ${res.routing.easyCaught}/${dn.E}; AF answered ${res.routing.afAnswered}/${dn.AF}; QF answered ${res.routing.qfAnswered}/${dn.QF}; H answered ${res.routing.hAnswered}/${dn.H}; exact "hard" on HARD ${res.routing.hardExact}/${dn.HARD}; HARD not answered ${res.routing.hardNotAnswered}/${dn.HARD} (denominators exclude missing); M ${res.routing.M} [${res.routing.missing.join(',')}]`);
    const L = res.latency;
    say('\nlatency (seconds)');
    say(`  Live first text on R's answered items: n ${L.liveOnAnswered.n}, p50 ${s2(L.liveOnAnswered.p50)}, p90 ${s2(L.liveOnAnswered.p90)}; A on the same items: p50 ${s2(L.aOnSame.p50)}, p90 ${s2(L.aOnSame.p90)}`);
    say(`  "hard" decision time: n ${L.hardDecision.n}, p50 ${s2(L.hardDecision.p50)}, p90 ${s2(L.hardDecision.p90)}`);
    say(`  L TTFT on R's answered items: p50 ${s2(L.lOnAnswered.p50)}, p90 ${s2(L.lOnAnswered.p90)}; by group: ${Object.entries(L.lByGroup).map(([g, v]) => `${g} ${s2(v.p50)}/${s2(v.p90)}`).join('; ')}`);
    say(`  lead = p50 L TTFT - p50 Live first text on R's answered items = ${L.lead == null ? 'n/a' : `${L.lead} ms`}`);
    say(`  composed R first text: parallel p50 ${s2(L.composedParallel.p50)} p90 ${s2(L.composedParallel.p90)}; serial p50 ${s2(L.composedSerial.p50)} p90 ${s2(L.composedSerial.p90)}`);
    say('\nmisroute costs');
    say(`  false EASY (a HARD item R answered), AF first then H then QF: ${res.falseEasy.length ? res.falseEasy.map((x) => `${x.id}[${x.cls}] dAcc ${x.dAcc} dWrong ${x.dWrong}`).join('; ') : 'none'}`);
    say(`  false HARD (an EASY item not answered): ${res.falseHard.length}; ${res.falseHard.map((x) => `${x.id}(${x.rc}) latency cost ${s2(x.latencyCost)} s, L ${x.lAcc ? 'acc' : 'not-acc'} vs A ${x.aAcc ? 'acc' : 'not-acc'}`).join('; ')}`);
    say(`\npaired lists: R vs L differ on [${res.paired.RvsL.join(',')}]; R vs A differ on HARD [${res.paired.RvsAonHard.join(',')}]; A vs L differ on [${res.paired.AvsL.join(',')}]`);
    if (res.health) say(`health: ${JSON.stringify(res.health)}`);
    if (res.retest) say(`test-retest of A: ${res.retest.same}/${res.retest.n} items graded the same (original ${res.retest.origAcceptable}/${res.retest.n} acceptable, new ${res.retest.newAcceptable}/${res.retest.n}); different [${res.retest.different.join(',')}]`);
}

// ---------- the real loader ----------
export async function loadReal({ gradeDir = `${R40}/grade`, runsDir = `${R40}/runs`, l38Path = null } = {}) {
    const { verdictFileProblem } = await import(`file:///${FR}/legs-decide.mjs`);
    const { items } = loadItems();
    const key = readJson(`${gradeDir}/keyhold/key.json`);
    const grades = { A: {}, L: {}, RL: {} };
    let gradingOk = true;
    const slots = Object.keys(key).flatMap((t) => [`${t}.g1`, `${t}.g2`]);
    const gradingProblems = auditProblems(gradeDir, slots);
    if (gradingProblems.length) gradingOk = false;
    for (const [tag, km] of Object.entries(key)) {
        const pairs = readJson(`${gradeDir}/blind/pairs.${tag}.json`).items;
        for (const g of ['g1', 'g2']) {
            const vf = `${gradeDir}/blind/verdicts.${tag}.${g}.json`;
            if (!fs.existsSync(vf)) { gradingOk = false; continue; }
            const v = readJson(vf);
            if (verdictFileProblem(v, Object.fromEntries(pairs.map((p) => [p.key, 1])))) { gradingOk = false; continue; }
            for (const [k, m] of Object.entries(km)) { (grades[m.arm][m.id] ??= {})[g] = v[k]; }
        }
    }
    for (const arm of Object.keys(grades)) for (const id of Object.keys(grades[arm])) if (!(grades[arm][id].g1 && grades[arm][id].g2)) { delete grades[arm][id]; gradingOk = false; }
    const rRun = readJson(`${runsDir}/router40-R.json`), rAns = readJson(`${runsDir}/router40-R.answers.json`), lFile = readJson(`${runsDir}/router40-L.answers.json`);
    const aRun = readJson(`${L40}/runs/live40-r1.json`);
    const { rows } = readRun(rRun, rAns, { variant: 'B' });
    const rc = Object.fromEntries(rows.map((r) => [r.id, r.rc]));
    const firstText = { R: Object.fromEntries(items.map((i) => [i.id, rRun.metrics[i.id]?.firstOutputTextMs ?? null])), A: Object.fromEntries(items.map((i) => [i.id, aRun.metrics[i.id]?.firstOutputTextMs ?? null])) };
    const ttft = { L: Object.fromEntries(items.map((i) => [i.id, lFile.records[i.id]?.ttft ?? null])) };
    const finalS = rRun.sessions.filter((s) => !rRun.sessions.some((o) => o.chain === s.chain && o.attempt > s.attempt));
    const health = { chains: finalS.length, retried: rRun.sessions.filter((s) => s.attempt === 2).length, abnormalAttempts: rRun.health?.abnormalAttempts ?? null, closes: rRun.sessions.reduce((o, s) => { const c = s.closed?.code ?? s.closed ?? 'none'; o[c] = (o[c] ?? 0) + 1; return o; }, {}), missing: rows.filter((r) => r.rc === 'missing').length };
    let orig = null;
    try {
        const ok = readJson(`${L40}/grade/keyhold/key.json`);
        const V = ['g1', 'g2'].map((g) => readJson(`${L40}/grade/blind/verdicts.blind-1.${g}.json`));
        orig = Object.fromEntries(Object.entries(ok).map(([k, m]) => [m.id, accept({ g1: V[0][k], g2: V[1][k] })]));
    } catch { /* original grading unavailable */ }
    let l38 = null;
    if (l38Path) l38 = readJson(l38Path);
    return { items, grades, rc, firstText, ttft, complete: { L: lFile.complete === true, R: rRun.complete === true && rRun.name === 'router40-R', grading: gradingOk }, health, orig, l38, gradingProblems, readerOutSha: readerOutputSha(rows) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const argv = process.argv.slice(2);
    const gradeDir = argOf(argv, '--grade-dir') ?? `${R40}/grade`;
    const fz = readerFreeze(gradeDir);
    if (!fz.ok) { console.log(`REFUSED (exit 2): the reader is not frozen: ${fz.msg}`); process.exit(2); }
    const data = await loadReal({ gradeDir, runsDir: argOf(argv, '--runs-dir') ?? `${R40}/runs`, l38Path: argOf(argv, '--l38base') ?? null });
    const oz = outputFreeze(gradeDir, data.readerOutSha);
    if (!oz.ok) { console.log(`REFUSED (exit 2): the reader's output is not frozen: ${oz.msg}`); process.exit(2); }
    const res = scoreAll(data);
    const lines = []; renderReport(res, (s) => { console.log(s); lines.push(s); });
    if (data.gradingProblems.length) { const s = `grading problems (P7 audits): ${data.gradingProblems.join('; ')}`; console.log(s); lines.push(s); }
    fs.writeFileSync(path.join(gradeDir, 'score.out.txt'), `${lines.join('\n')}\n`, 'utf8');
}
