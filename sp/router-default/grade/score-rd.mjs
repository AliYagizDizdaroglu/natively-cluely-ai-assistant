// score-rd.mjs: the scorer of router-default-r1 (PREREGISTER-router-default.md sections 5, 6, 7.3, 7.4, 7.7; SPEC 10.2, 11).
// It joins (a) the run reader's output (router-hour-read.mjs, a text file), (b) the blind export's key (keyhold\key-rd.json) with the blind grades, (c) the in-app export with its
// grades and the run's log, and prints each bar and the SPEC 11 verdict. NO MODEL IS CALLED. It never prints an answer, a question or the key's q-to-arm map; only roster ids,
// turn numbers, counts and ms.
//
//   node score-rd.mjs --run-dir <MAIN>\electron\test\golden\interview60.runs\<stamp>-router-default-r1 --reader-out <file with the reader's stdout>
//        [--grade-dir <LAB>\grade] [--key-dir <LAB>\keyhold] [--root <MAIN>]          exit 0 = scored (read the VERDICT line), exit 2 = refused (nothing scored)
//
// Rules applied (each is the registration's; this file may not change them):
//   * acceptable = BOTH graders give correctness 2 AND on_topic 2 (delivery not used); wrong = EITHER grader gives correctness 0 (SPEC 10 "Grade definitions"); no grade = neither.
//   * Safety  = the reader's text half is clean (4 counts 0) AND no Live answer shown is wrong: EVERY key entry whose arms include L (sEmpty and superseded included) is graded.
//   * Fallback / Speed / Routing = the reader's own bars, re-applied here from the printed numbers (and the printed flag must agree with them, else the reader output is refused).
//   * Quality = acceptable(L) >= acceptable(S) - 1 over the eligible pairs: a Live turn paired with the S of the SAME TURN; sEmpty, superseded and Live turns with no pipeline answer
//     are out of both sides (7.4). A key entry with arms ['S','A'] is the S of its turn.
//   * No regression = 0 wrong pipeline answers shown on HARD items: in-app grades only on turns whose decision line reads shown=pipeline (I-2, joined by the [Router] dispatch line right
//     after the pair's [Main] dispatch line), plus every key entry whose arms include A, plus the replacing text of every superseded turn (the first [Answer] full line after the
//     [Router] superseded line, found in the in-app export by its text).
//   * Integrity (reader counts) must all be 0, else INCONCLUSIVE unless a Safety FAIL stands on data that can be read (5 "Integrity").
//   * VERDICT order (SPEC 11): VOID, then SAFETY FAIL, then PASS (every bar met, integrity clean, grading clean), else INCONCLUSIVE.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { REGISTERED_RUN_LABEL, runFolderPattern } from '../build-blind-rd.mjs';

export const PIN = 'claude-opus-5-5';
const THRESH = { speedMs: 2500, easyMin: 13, hardMax: 1, qualitySlack: 1, downLimitMin: 2, easyN: 20, hardN: 27, voidFloor: 10 };   // SPEC 10.2; registration 6.2 (down limit 2.0 min), 3 (20 EASY / 27 HARD), SPEC 11 (10th dispatch)   // SPEC 10.2
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const sha12 = (b) => sha256(b).slice(0, 12);
const GRADE_DIR = path.dirname(fileURLToPath(import.meta.url));
const READER_FILE = path.join(GRADE_DIR, '..', 'router-hour-read.mjs');
const OFFSET_MS = 1150;                                                       // the reader's play-window offset (registration 3)

// ---------------------------------------------------------------- definitions
export const accept = (g) => !!g && g.g1.correctness === 2 && g.g1.on_topic === 2 && g.g2.correctness === 2 && g.g2.on_topic === 2;
export const isWrong = (g) => !!g && (g.g1?.correctness === 0 || g.g2?.correctness === 0);   // one grader's 0 settles it even when the other grade is missing
const accept1 = (g) => !!g && g.correctness === 2 && g.on_topic === 2;          // single-grader arms (reported only)
const wrong1 = (g) => !!g && g.correctness === 0;
const readGrade = (g) => (isWrong(g) ? 'wrong' : g && g.g1 && g.g2 ? 'ok' : 'none');
const okScore = (s) => !!s && [s.correctness, s.on_topic, s.delivery].every((x) => [0, 1, 2].includes(x));
/** null when `vv` is a verdict file with a valid verdict for every key and nothing else; else why not. */
export function verdictProblem(vv, keys) {
    if (!vv || typeof vv !== 'object' || Array.isArray(vv)) return 'not a JSON object';
    const extra = Object.keys(vv).filter((k) => !keys[k]);
    if (extra.length) return `grades keys that are not in the pairs file: ${extra.join(', ')}`;
    for (const k of Object.keys(keys)) if (!okScore(vv[k])) return `no valid verdict for ${k}`;
    return null;
}

// ---------------------------------------------------------------- the reader's output
/** Parses router-hour-read.mjs's stdout. `problems` lists every line that is missing or contradicts itself; the caller refuses a reader output with any. */
export function parseReader(text) {
    const problems = [];
    const lines = String(text).split(/\r?\n/);
    const find = (rx, what) => { const m = lines.map((l) => rx.exec(l)).find(Boolean); if (!m) problems.push(`missing line: ${what}`); return m; };
    const n = (s) => (s === '-' ? null : Number(s));
    const r = { problems, void: false, voidWhy: [] };
    let m;
    if ((m = find(/^BAR Safety \(text half\): (PASS|FAIL) live_hard_first=(\d+) live_router_marker=(\d+) pipeline_unknown_marker=(\d+) pipeline_bare_routing_token=(\d+)/, 'BAR Safety (text half)'))) {
        r.safetyText = { flag: m[1], liveHard: +m[2], liveMarker: +m[3], pipeUnknown: +m[4], pipeBare: +m[5] };
        if ((r.safetyText.liveHard + r.safetyText.liveMarker + r.safetyText.pipeUnknown + r.safetyText.pipeBare === 0) !== (m[1] === 'PASS')) problems.push('BAR Safety (text half): its flag disagrees with its counts');
    }
    if ((m = find(/^BAR Fallback: (PASS|FAIL) missing_appended=(\d+) unflagged_live_failures=(\d+) row4_with_live_capture=(\d+) dispatched_nothing_shown=(\d+) pipeline_no_token=(\d+)/, 'BAR Fallback'))) {
        r.fallback = { flag: m[1], counts: m.slice(2, 7).map(Number) };
        if (r.fallback.counts.every((x) => x === 0) !== (m[1] === 'PASS')) problems.push('BAR Fallback: its flag disagrees with its counts');
    }
    if ((m = find(/^BAR Speed: (PASS|FAIL) p50=(\S+) limit=(\d+) n=(\d+)/, 'BAR Speed'))) {
        r.speed = { flag: m[1], p50: n(m[2]), limit: +m[3], n: +m[4] };
        if (r.speed.limit !== THRESH.speedMs) problems.push(`BAR Speed: the reader's limit ${r.speed.limit} is not the registered ${THRESH.speedMs}`);
        if ((r.speed.p50 !== null && r.speed.n > 0 && r.speed.p50 <= THRESH.speedMs) !== (m[1] === 'PASS')) problems.push('BAR Speed: its flag disagrees with its numbers');
    }
    if ((m = find(/^BAR Routing: (PASS|FAIL) EASY caught (\d+)\/(\d+) \(>= (\d+)\); HARD misrouted (\d+)\/(\d+) \(<= (\d+)\)/, 'BAR Routing'))) {
        r.routing = { flag: m[1], easyCaught: +m[2], easyN: +m[3], easyMin: +m[4], hardMis: +m[5], hardN: +m[6], hardMax: +m[7] };
        if (r.routing.easyMin !== THRESH.easyMin || r.routing.hardMax !== THRESH.hardMax) problems.push('BAR Routing: the reader\'s thresholds are not the registered 13 / 1');
        if (r.routing.easyN !== THRESH.easyN || r.routing.hardN !== THRESH.hardN) problems.push(`BAR Routing: the denominators ${r.routing.easyN} EASY / ${r.routing.hardN} HARD are not the registered ${THRESH.easyN} / ${THRESH.hardN}`);   // DENOM
        if ((r.routing.easyCaught >= THRESH.easyMin && r.routing.hardMis <= THRESH.hardMax) !== (m[1] === 'PASS')) problems.push('BAR Routing: its flag disagrees with its numbers');
    }
    r.integrity = {};
    if ((m = find(/^INTEGRITY dispatched turns with no decision line: (\d+)/, 'INTEGRITY no decision line'))) r.integrity.noDecision = +m[1];
    if ((m = find(/^INTEGRITY decision lines without a dispatch line=(\d+) duplicate decision lines=(\d+) duplicate dispatch lines=(\d+)/, 'INTEGRITY decision lines without a dispatch line'))) Object.assign(r.integrity, { noDispatch: +m[1], dupDecision: +m[2], dupDispatch: +m[3] });
    if ((m = find(/^INTEGRITY unparsed_decision_lines=(\d+) decisions_without_q_at=(\d+)/, 'INTEGRITY unparsed_decision_lines'))) Object.assign(r.integrity, { unparsed: +m[1], noQ: +m[2] });
    if ((m = find(/^CAPTURES check: (MATCH|MISMATCH)/, 'CAPTURES check'))) r.integrity.capMismatch = m[1] === 'MISMATCH';
    if ((m = find(/^CAPTURE FILES: (MATCH|MISMATCH)/, 'CAPTURE FILES'))) r.integrity.fileMismatch = m[1] === 'MISMATCH';
    if ((m = find(/^SUPERSEDE superseded_turns=\d+ .*superseded_record_defects=(\d+)/, 'SUPERSEDE superseded_record_defects'))) r.integrity.supDefects = +m[1];
    const down = find(/^VOID CHECK router-down-minutes: (VOID|clear) \((\S+) vs limit (\S+)\)/, 'VOID CHECK router-down-minutes');
    const failed = find(/^VOID CHECK session-failed-before-dispatch-(\d+): (VOID|clear)/, 'VOID CHECK session-failed-before-dispatch');
    const vin = find(/^VOID_INPUT router_down_minutes=(\S+) limit=(\S+)/, 'VOID_INPUT router_down_minutes');
    if (vin && Number(vin[2]) !== THRESH.downLimitMin) problems.push(`VOID_INPUT: the down-time limit ${vin[2]} is not the registered ${THRESH.downLimitMin} minutes`);   // DOWN-LIMIT
    if (down && Number(down[3]) !== THRESH.downLimitMin) problems.push(`VOID CHECK router-down-minutes: the limit ${down[3]} is not the registered ${THRESH.downLimitMin}`);
    if (vin && down) { const d = Number(vin[1]), c = down[1] === 'VOID'; if ((d > THRESH.downLimitMin + 0.005 && !c) || (d < THRESH.downLimitMin - 0.005 && c)) problems.push(`VOID CHECK router-down-minutes: ${down[1]} disagrees with ${vin[1]} minutes against ${THRESH.downLimitMin}`); }   // DOWN-RECOMPUTE
    if (failed && Number(failed[1]) !== THRESH.voidFloor) problems.push(`VOID CHECK: the dispatch floor ${failed[1]} is not the registered ${THRESH.voidFloor}`);
    const vline = lines.map((l) => /^VERDICT VOID \(the re-fly is not spent\): (.*)$/.exec(l)).find(Boolean);
    const checkVoid = !!down && !!failed && (down[1] === 'VOID' || failed[2] === 'VOID');
    if (!!vline !== checkVoid) problems.push('the VOID CHECK lines and the VERDICT VOID line disagree');
    r.void = !!vline || checkVoid;
    if (vline) r.voidWhy = [vline[1]];
    return r;
}

// ---------------------------------------------------------------- the log
/** The facts the join needs, from the log's session covering the hour (turn ids restart per app process; same slicing as router-hour-read.mjs and build-blind-rd.mjs). */
export function parseLog(logText, timeline) {
    const raw = String(logText).split(/\r?\n/);
    const HDR = /^=== Natively session started (\S+) ===/;
    let from = -1;
    raw.forEach((l, i) => { const m = HDR.exec(l); if (m && Date.parse(m[1]) <= timeline.startedMs) from = i; });
    if (from < 0) throw new Error('the log does not cover the hour: no "=== Natively session started <ISO> ===" line at or before the hour start');
    let to = raw.length;
    raw.forEach((l, i) => { const m = HDR.exec(l); if (!m) return; const t = Date.parse(m[1]); if (t > timeline.startedMs && t <= timeline.endedMs) throw new Error('the app restarted inside the hour (a second session header inside the hour)'); if (i > from && i < to) to = i; });
    const kv = (msg) => { const o = {}; for (const m of msg.matchAll(/(\w+)=(\S+)/g)) if (!(m[1] in o)) o[m[1]] = m[2]; return o; };
    const log = { mainAnswers: [], routerDispatch: [], decisions: new Map(), superseded: [], fulls: [] };
    const supSeen = new Set();
    const first = timeline.items?.length ? timeline.startedMs + OFFSET_MS + Math.min(...timeline.items.map((i) => i.startSec)) * 1000 : null;   // before it: the probe's turns
    const wins = (timeline.items ?? []).map((i) => ({ id: i.id, at: timeline.startedMs + OFFSET_MS + i.startSec * 1000 })).sort((a, b) => a.at - b.at);
    const itemAt = (q) => { let id = null; if (q === null) return null; for (const w of wins) if (q >= w.at) id = w.id; return id; };   // the reader's play-window mapping
    for (const l of raw.slice(from, to)) {
        const m = /^(\d{4}-\d\d-\d\dT[\d:.]+Z) \[[A-Z]+\] (.*)$/.exec(l);
        if (!m) continue;
        const ts = Date.parse(m[1]), msg = m[2];
        let x;
        if (msg.startsWith('[Main] dispatch: answer ')) log.mainAnswers.push(ts);
        else if ((x = /^\[Router\] dispatch turn=(\d+)/.exec(msg))) log.routerDispatch.push({ turn: +x[1], ts });
        else if ((x = /^\[Router\] superseded turn=(\d+) phase=(streaming|done)\b/.exec(msg))) { if (!supSeen.has(+x[1])) { supSeen.add(+x[1]); log.superseded.push({ turn: +x[1], ts, phase: x[2] }); } }
        else if (msg.startsWith('[Router] turn=')) {
            const o = kv(msg), turn = /^\d+$/.test(o.turn ?? '') ? +o.turn : null;
            if (turn !== null && (o.shown === 'live' || o.shown === 'pipeline') && !log.decisions.has(turn)) { const q = /^-?\d+$/.test(o.q_at ?? '') ? +o.q_at : null; log.decisions.set(turn, { shown: o.shown, reason: o.reason, superseded: o.superseded === 'yes', q, item: itemAt(q), inHour: first === null || q === null || q >= first }); }
        } else if (msg.startsWith('[Answer] full: ')) { try { const t = JSON.parse(msg.slice('[Answer] full: '.length)); if (typeof t === 'string') log.fulls.push({ ts, text: t }); } catch { /* an unparseable line is the reader's integrity matter */ } }
    }
    return log;
}

/** Joins each in-app pair to its turn: the [Main] dispatch: answer line whose timestamp is the pair's dispatchedAt, then the FIRST [Router] dispatch line at or after it and before the
 *  next answer line (main.ts logs the one, then calls routerWiring.answered(), which logs the other). Returns [{pair, turn} | {pair, defect}]. */
export function joinInapp(pairs, log) {
    const mains = log.mainAnswers;
    return pairs.map((pair) => {
        const t = Date.parse(pair.dispatchedAt);
        const idx = mains.map((x, i) => (x === t ? i : -1)).filter((i) => i >= 0);
        if (idx.length !== 1) return { pair, defect: `${idx.length} [Main] dispatch lines at the pair's dispatchedAt (need exactly 1)` };
        const k = idx[0];
        const next = mains[k + 1] ?? Infinity; // JOIN-BOUND
        const d = log.routerDispatch.find((x) => x.ts >= t && x.ts < next);
        if (!d) return { pair, defect: 'no [Router] dispatch line between this answer dispatch and the next' };
        return { pair, turn: d.turn };
    });
}

// ---------------------------------------------------------------- the scorer
function voidResult(r, L) {
    L.push(`VERDICT VOID (the re-fly is not spent): ${r.voidWhy.join('; ') || 'see the reader\'s VOID CHECK lines'}`);
    return { verdict: 'VOID', why: r.voidWhy, bars: null, lines: L, info: {} };
}

/** data: { reader (parseReader, no problems), roster: Map id -> {route}, key, blindGrades: {tag: {q: {g1,g2}}}, inapp: {pairs, grades: {key: {g1,g2}}}, log (parseLog),
 *          reported?: {high, low, capturedHigh: {n, acceptable, wrong}}, gradingProblems?: [string] } */
export function scoreRd(data) {
    const r = data.reader, L = [], P = (s) => L.push(s);
    const roster = data.roster ?? new Map(), key = data.key ?? {}, bg = data.blindGrades ?? {};
    const gradeOf = (tag, q) => { const g = bg[tag]?.[q]; return g && g.g1 && g.g2 ? g : null; };

    // ---- Safety
    const wrongLive = []; let liveN = 0, liveUnread = 0;
    for (const [tag, km] of Object.entries(key)) for (const [q, m] of Object.entries(km)) {
        if (!m.arms.includes('L')) continue; // SAFETY-SCOPE
        liveN++;
        const st = readGrade(bg[tag]?.[q]);
        if (st === 'none') { liveUnread++; continue; }
        if (st === 'wrong') wrongLive.push({ id: m.id, turn: m.turn });
    }
    const textOk = r.safetyText.liveHard + r.safetyText.liveMarker + r.safetyText.pipeUnknown + r.safetyText.pipeBare === 0;
    const safety = { state: !textOk || wrongLive.length > 0 ? 'FAIL' : liveUnread > 0 ? 'UNREADABLE' : 'PASS', textOk, wrongLive, liveN, liveUnread };
    if (r.void && data.voidNote) P(`INFO grades not read in a VOID run (${data.voidNote}); only the reader's text half of Safety is known`);
    if (r.void) P(`INFO Safety as read in a VOID run (reported; it does not change the verdict, registration 6.3): text half ${r.safetyText.flag}; wrong Live answers shown ${wrongLive.length} of ${liveN - liveUnread} graded`);
    if (r.void) return voidResult(r, L);

    // ---- Fallback, Speed, Routing: the reader's bars re-applied from its numbers
    const fbOk = r.fallback.counts.every((n) => n === 0);
    const fallback = { state: fbOk ? 'PASS' : 'FAIL' };
    const spOk = r.speed.p50 !== null && r.speed.n > 0 && r.speed.p50 <= THRESH.speedMs;
    const speed = { state: spOk ? 'PASS' : 'FAIL' };
    const roOk = r.routing.easyCaught >= THRESH.easyMin && r.routing.hardMis <= THRESH.hardMax;
    const routing = { state: roOk ? 'PASS' : 'FAIL' };

    // ---- Quality (7.4): pairs by TURN
    const lByTurn = new Map(), sByTurn = new Map(), turnsOfId = new Map();
    for (const [tag, km] of Object.entries(key)) for (const [q, m] of Object.entries(km)) {
        if (m.arms.includes('L')) {
            if (lByTurn.has(m.turn)) throw new Error(`the key holds two Live entries for turn ${m.turn}`);
            lByTurn.set(m.turn, { q, tag, m });
            (turnsOfId.get(m.id) ?? turnsOfId.set(m.id, new Set()).get(m.id)).add(m.turn);
        }
        if (m.arms.includes('S') && sByTurn.has(m.turn)) throw new Error(`the key holds two pipeline (S) entries for turn ${m.turn}`);
        if (m.arms.includes('S')) sByTurn.set(m.turn, { q, tag, m });
    }
    for (const t of sByTurn.keys()) if (!lByTurn.has(t)) throw new Error(`the key holds a pipeline (S) entry for turn ${t} with no Live entry: a corrupt key`);
    const qual = { n: 0, accL: 0, accS: 0, unread: 0 }, excl = { sEmpty: 0, superseded: 0, noPipeline: 0 };
    for (const [turn, e] of lByTurn) {
        const mL = e.m;
        if (mL.sEmpty || mL.superseded) { excl.sEmpty += mL.sEmpty ? 1 : 0; excl.superseded += mL.superseded ? 1 : 0; continue; }
        const s = sByTurn.get(turn); // PAIR-BY-TURN
        if (!s) { excl.noPipeline++; continue; }
        const gL = gradeOf(e.tag, e.q), gS = gradeOf(s.tag, s.q);
        if (!gL || !gS) { qual.unread++; continue; }
        qual.n++; if (accept(gL)) qual.accL++; if (accept(gS)) qual.accS++;
    }
    const multiTurnIds = [...turnsOfId.values()].filter((s) => s.size > 1).length;
    const quality = { state: qual.unread > 0 ? 'UNREADABLE' : qual.n > 0 && qual.accL >= qual.accS - THRESH.qualitySlack ? 'PASS' : qual.n > 0 ? 'FAIL' : 'UNREADABLE', ...qual, excl };

    // ---- No regression (7.3)
    const hard = (id) => roster.get(id)?.route === 'HARD';
    const noreg = { checked: 0, wrong: [], unreadable: 0 };
    const inapp = data.inapp ?? { pairs: [], grades: {} };
    const ingrade = (k) => inapp.grades?.[k];
    const log = data.log;
    const src = { inapp: 0, appended: 0, superseded: 0 };
    let inappLiveIgnored = 0;
    const info = { joinDefects: 0, easyPipelineWrong: 0, easyAppendedWrong: 0, easyReplacingWrong: 0, pipelineNoGrade: 0, unclaimedHard: 0, supNoGrade: 0, mappingDisagree: 0, supCrossTurn: 0 };
    const joins = joinInapp(inapp.pairs, log);
    const joinedTurns = new Set();
    for (const j of joins) {
        const pr = j.pair;
        if (j.defect) info.joinDefects++;
        if (j.defect) { if (hard(pr.id)) noreg.unreadable++; continue; }
        joinedTurns.add(j.turn);
        const dec = log.decisions.get(j.turn);
        if (!dec) { info.joinDefects++; if (hard(pr.id)) noreg.unreadable++; continue; }
        if (dec.shown !== 'pipeline') { inappLiveIgnored++; continue; }
        const g = ingrade(pr.key), st = readGrade(g);
        const winHard = dec.item === null || hard(dec.item);          // I-3: the play-window item (the reader's mapping) too; an unmappable item counts as HARD
        if (hard(pr.id) !== winHard) info.mappingDisagree++;
        if (hard(pr.id) || winHard) {
            if (st === 'none') { noreg.unreadable++; continue; }
            noreg.checked++; src.inapp++;
            if (st === 'wrong') noreg.wrong.push({ src: 'inapp', id: pr.id, turn: j.turn });
        } else if (st === 'wrong') info.easyPipelineWrong++;
    }
    // an in-hour shown=pipeline turn nobody claimed: on a HARD item (or one whose item cannot be mapped) its answer was never graded, so No-regression cannot be read; on an EASY item a warning
    for (const [turn, d] of log.decisions) if (d.shown === 'pipeline' && d.inHour && !joinedTurns.has(turn)) {
        info.pipelineNoGrade++;
        if (d.item === null || hard(d.item)) { info.unclaimedHard++; noreg.unreadable++; // UNCLAIMED-HARD
        }
    }
    for (const [tag, km] of Object.entries(key)) for (const [q, m] of Object.entries(km)) {
        if (!m.arms.includes('A')) continue; // NOREG-A
        const st = readGrade(bg[tag]?.[q]);
        if (hard(m.id)) {
            if (st === 'none') { noreg.unreadable++; continue; }
            noreg.checked++; src.appended++;
            if (st === 'wrong') noreg.wrong.push({ src: 'appended', id: m.id, turn: m.turn });
        } else if (st === 'wrong') info.easyAppendedWrong++;
    }
    // Supersede phases (m-2): phase=streaming never put the Live text in history (routerArbiter.ts), so the first [Answer] full line after it IS the replacing text and the judge's pair carries it: graded.
    // phase=done leaves the Live text first; the replacing text is in the export only when a main supersede dispatch made the judge claim it, else it is UNREADABLE on a HARD item.
    const supTurns = new Set(log.superseded.map((s) => s.turn)), supPhase = { streaming: 0, done: 0 };
    for (const sp of log.superseded) { // NOREG-SUP
        const sd = log.decisions.get(sp.turn);
        if (sd && !sd.inHour) continue; // SUP-INHOUR
        supPhase[sp.phase]++;
        const id = lByTurn.get(sp.turn)?.m.id ?? joins.find((j) => j.turn === sp.turn)?.pair.id;
        const supUnreadable = () => { if (id === undefined || hard(id)) noreg.unreadable++; // SUP-UNREADABLE
        };
        const mine = log.routerDispatch.find((d) => d.turn === sp.turn);
        const nextTs = log.routerDispatch.find((d) => d.turn !== sp.turn && d.ts > (mine?.ts ?? sp.ts))?.ts ?? Infinity;
        const full = log.fulls.find((f) => f.ts >= sp.ts && f.ts < nextTs);
        if (!full) { info.supNoGrade++; supUnreadable(); continue; }
        const pair = inapp.pairs.find((p) => p.answer === full.text);
        const jn = pair ? joins.find((j) => j.pair === pair) : null;
        const crossTurn = !!pair && (jn?.turn === undefined || (jn.turn !== sp.turn && !supTurns.has(jn.turn))); // SUP-CROSSTURN: the text-matched pair must belong to this very turn
        const st = pair && !crossTurn ? readGrade(ingrade(pair.key)) : 'none';
        if (st === 'none') { info.supNoGrade++; if (crossTurn) info.supCrossTurn++; supUnreadable(); continue; }
        if (hard(id)) {
            noreg.checked++; src.superseded++;
            if (st === 'wrong') noreg.wrong.push({ src: 'superseded', id, turn: sp.turn });
        } else if (st === 'wrong') info.easyReplacingWrong++;
    }
    noreg.state = noreg.wrong.length > 0 ? 'FAIL' : noreg.unreadable > 0 ? 'UNREADABLE' : 'PASS';

    // ---- Integrity (the reader's counts)
    const integrity = {
        problems: [
            ...(r.integrity.capMismatch ? ['capture MISMATCH'] : []),
            ...(r.integrity.fileMismatch ? ['capture-file MISMATCH'] : []),
            ...[[r.integrity.noDecision, 'dispatched turns with no decision line'], [r.integrity.noDispatch, 'decision lines without a dispatch line'], [r.integrity.dupDecision, 'duplicate decision lines'],
                [r.integrity.dupDispatch, 'duplicate dispatch lines'], [r.integrity.unparsed, 'unparsed decision lines'], [r.integrity.noQ, 'decisions without q_at'], [r.integrity.supDefects, 'superseded record defects']]
                .filter(([c]) => c > 0).map(([, l]) => l),
        ],
    };
    const gradingProblems = data.gradingProblems ?? [];

    // ---- the bars and the verdict
    const bars = [safety, fallback, quality, speed, routing, noreg];
    let verdict;
    if (safety.state === 'FAIL') verdict = 'SAFETY FAIL';
    else if (bars.every((b) => b.state === 'PASS') && integrity.problems.length === 0 && gradingProblems.length === 0) verdict = 'PASS';
    else verdict = 'INCONCLUSIVE';
    const why = [];
    for (const [name, b] of [['Safety', safety], ['Fallback', fallback], ['Quality', quality], ['Speed', speed], ['Routing', routing], ['No-regression', noreg]]) if (b.state !== 'PASS') why.push(`${name} ${b.state}`);
    for (const p of integrity.problems) why.push(`integrity: ${p}`);
    for (const p of gradingProblems) why.push(`grading: ${p}`);

    // ---- print
    P(`BAR Safety: ${safety.state} text_half=${textOk ? 'PASS' : 'FAIL'} live_hard_first=${r.safetyText.liveHard} live_router_marker=${r.safetyText.liveMarker} pipeline_unknown_marker=${r.safetyText.pipeUnknown} pipeline_bare_routing_token=${r.safetyText.pipeBare} wrong_live_shown=${wrongLive.length} of ${liveN - liveUnread} graded (ungraded ${liveUnread})`);
    if (wrongLive.length) P(`SAFETY wrong Live answers shown: ${wrongLive.map((w) => `${w.id}@turn${w.turn}`).join(', ')}`);
    P(`BAR Fallback: ${fallback.state} missing_appended=${r.fallback.counts[0]} unflagged_live_failures=${r.fallback.counts[1]} row4_with_live_capture=${r.fallback.counts[2]} dispatched_nothing_shown=${r.fallback.counts[3]} pipeline_no_token=${r.fallback.counts[4]}`);
    P(`BAR Quality: ${quality.state} acceptable(L)=${qual.accL} acceptable(S)=${qual.accS} over ${qual.n} eligible pairs (needs L >= S - ${THRESH.qualitySlack}); ungraded pairs ${qual.unread}`);
    P(`QUALITY excluded (graded for Safety only): sEmpty=${excl.sEmpty} superseded=${excl.superseded} live_without_pipeline=${excl.noPipeline}; ids_with_more_than_one_live_turn=${multiTurnIds}`);
    P(`BAR Speed: ${speed.state} p50=${r.speed.p50 === null ? '-' : r.speed.p50} limit=${THRESH.speedMs} n=${r.speed.n}`);
    P(`BAR Routing: ${routing.state} EASY caught ${r.routing.easyCaught}/${r.routing.easyN} (>= ${THRESH.easyMin}); HARD misrouted ${r.routing.hardMis}/${r.routing.hardN} (<= ${THRESH.hardMax})`);
    P(`BAR No-regression: ${noreg.state} wrong=${noreg.wrong.length} checked=${noreg.checked} (in-app shown=pipeline ${src.inapp}, appended ${src.appended}, superseded replacing ${src.superseded}) unreadable=${noreg.unreadable}`);
    if (noreg.wrong.length) P(`NOREG wrong pipeline answers shown on HARD items: ${noreg.wrong.map((w) => `${w.id}@turn${w.turn}(${w.src})`).join(', ')}`);
    P(`INTEGRITY ${integrity.problems.length ? `${integrity.problems.length} problem(s): ${integrity.problems.join('; ')}` : '0 problems (the reader counts are all 0 / MATCH)'}`);
    for (const p of gradingProblems) P(`GRADING PROBLEM ${p}`);
    P(`INFO in-app pairs ${inapp.pairs.length}: ignored as shown=live ${inappLiveIgnored} (they carry the Live text, I-2); join defects ${info.joinDefects}; superseded replacing texts without an in-app grade ${info.supNoGrade}`);
    P(`INFO in-app pairs whose judge item (text overlap) and play-window item disagree on HARD/EASY: ${info.mappingDisagree} (a turn is gated if EITHER says HARD, I-3)`);
    P(`INFO superseded turns in the hour: streaming ${supPhase.streaming}, done ${supPhase.done}. A streaming-phase supersede never put the Live text in history, so the first [Answer] full line after it is the replacing text and the judge's pair carries it: graded. A done-phase one is graded only when a main supersede dispatch made the judge claim the replacing text; otherwise it is UNREADABLE on a HARD item. Cross-turn text matches refused: ${info.supCrossTurn}`);
    P(`INFO reported, not gated: EASY pipeline-shown wrong ${info.easyPipelineWrong}; EASY appended wrong ${info.easyAppendedWrong}; EASY replacing wrong ${info.easyReplacingWrong}`);
    if (info.unclaimedHard) P(`UNCLAIMED ${info.unclaimedHard} in-hour shown=pipeline turn(s) on a HARD item (or an unmappable one) have no in-app pair: their answers were never graded, No-regression is UNREADABLE (coordinator ruling)`);
    if (info.pipelineNoGrade - info.unclaimedHard) P(`WARNING ${info.pipelineNoGrade - info.unclaimedHard} in-hour shown=pipeline turn(s) on an EASY item have no in-app pair (undelivered or claimed by nobody); reported only, check them by hand`);
    for (const p of data.reportedProblems ?? []) P(`REPORTED PROBLEM ${p} (a reported-only arm: printed, gates nothing)`);
    const rp = data.reported;
    if (rp) for (const [name, label] of [['high', 'high'], ['low', 'low'], ['capturedHigh', 'captured-high']]) P(rp[name] ? `REPORTED ${label} (one grader, 31 mains for high/low): acceptable ${rp[name].acceptable} wrong ${rp[name].wrong} of ${rp[name].n}` : `REPORTED ${label}: not graded`);
    else P('REPORTED high, low, captured-high: not graded');
    if (data.graderModels) { const ms = [...new Set(data.graderModels.flatMap((g) => g.models))]; P(`GRADER MODEL ${ms.length ? ms.join(' + ') : 'none read'} (pin ${PIN}; read from the transcript of the last launch of each of ${data.graderModels.length} graded file slots; a slot on any other model is refused)`); if (data.aliasModel) P(`GRADER ALIAS PROBE cwdprobe-3: \`opus\` resolved to ${data.aliasModel} (reported only)`); }
    P(`VERDICT ${verdict}${why.length ? ` (${why.join('; ')})` : ''}`);
    if (verdict === 'INCONCLUSIVE') P('NOTE registration 6.1/6.3: INCONCLUSIVE has one re-fly (label router-default-r2, seed blind:router-default:r2); a second INCONCLUSIVE has no automatic outcome, the controller reports and the user rules');
    if (verdict === 'SAFETY FAIL') P('NOTE registration 6.1: Safety FAIL: the router stays behind the flag, default OFF');
    if (verdict === 'PASS') P('NOTE registration 6.1: PASS: the flag defaults ON in its own reviewed commit; NATIVELY_LIVE_ROUTER=0 then turns it off');
    return { verdict, why, bars: { safety, fallback, quality, speed, routing, noreg, integrity }, lines: L, info: { ...info, inappLiveIgnored } };
}

// ---------------------------------------------------------------- provenance and loading
/** null when the LAST launch record of `slot` is a clean, pinned, memory-ABSENT, exit-0 attempt in its own slug folder; else why not. */
const modelIsPin = (m) => typeof m === 'string' && m.split('+').every((x) => x === PIN);   // exactly the pin: no alias, no other model, no suffix
const GATED_TOOLS = ['Read', 'Write', 'Edit'];
export function provenanceProblem(records, slot, opts = {}) {
    const rec = records.filter((x) => x.slot === slot).at(-1);
    if (!rec) return 'no launch record';
    if (rec.exit !== 0) return `the last launch exited ${rec.exit}`;
    if (rec.slugJsonl !== 1) return `slugJsonl ${rec.slugJsonl} (the cwd's projects folder is not its own single transcript)`;
    if (rec.memoryDir === 'non-empty') return 'the projects folder holds a non-empty memory';
    if (rec.memory !== 'ABSENT') return `memory ${rec.memory} (not ABSENT)`;
    if (!modelIsPin(rec.model)) return `the CLI model ${rec.model} is not exactly ${PIN}`; // PIN-MODEL
    if (!Array.isArray(rec.models) || !rec.models.length || !rec.models.every(modelIsPin)) return `the transcript models ${JSON.stringify(rec.models)} are not exactly ${PIN}`; // PIN-TRANSCRIPT
    if (rec.pinned !== true) return `the model is not the pin ${PIN}`;
    if (!rec.tools || typeof rec.tools !== 'object' || !Object.keys(rec.tools).every((t) => GATED_TOOLS.includes(t))) return `tools ${JSON.stringify(rec.tools)} are not within Read/Write/Edit`; // TOOLS
    if (opts.launcherSha !== undefined && rec.launcher !== opts.launcherSha) return `launched by another launcher version (${rec.launcher ?? 'none'}, the registered file is ${opts.launcherSha})`; // LAUNCHER-VERSION
    if (opts.pairsFile && fs.existsSync(opts.pairsFile) && sha12(fs.readFileSync(opts.pairsFile)) !== rec.pairsSha12) return 'the pairs file differs from the one this launch graded (pairsSha12)'; // PAIRS-HASH
    if (opts.verdictsFile && fs.existsSync(opts.verdictsFile) && sha12(fs.readFileSync(opts.verdictsFile)) !== rec.verdictsSha12) return 'the verdicts file differs from the one this launch wrote (verdictsSha12)'; // VERDICTS-HASH
    return null;
}

const refusal = (m) => { const e = new Error(m); e.refuse = true; return e; };
const readJson = (p, what) => { if (!fs.existsSync(p)) throw refusal(`${what} is missing: ${p}`); try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { throw refusal(`${what} is not JSON: ${p}`); } };

export async function loadReal({ runDir, gradeDir, keyDir, root, readerScript = READER_FILE, launcherFile = path.join(GRADE_DIR, 'launch-grader-rd.mjs') }) {
    const run = path.resolve(runDir);
    const folder = path.basename(run);
    if (!runFolderPattern(REGISTERED_RUN_LABEL).test(folder)) throw refusal(`only a run folder named <stamp>-${REGISTERED_RUN_LABEL} is scored (got "${folder}"); a smoke, a retried or suffixed run or any other folder is never scored`);
    if (!fs.existsSync(run)) throw refusal(`the run folder does not exist: ${run}`);
    // I-2: the scorer runs the reader itself, with the registered down limit, on THIS run folder (no reader-output file is trusted)
    if (!fs.existsSync(readerScript)) throw refusal(`the reader is missing: ${readerScript}`);
    const sp = spawnSync(process.execPath, [readerScript, run, '--down-limit-min', String(THRESH.downLimitMin), '--root', root], { encoding: 'utf8', timeout: 180000, maxBuffer: 64 << 20 });
    if (sp.status !== 0 && sp.status !== 3) throw refusal(`the reader exited ${sp.status} (2 = unreadable input): ${String(sp.stderr).split('\n')[0].slice(0, 160)}`);
    const reader = parseReader(sp.stdout);
    if (reader.problems.length) throw refusal(`the reader output is unusable: ${reader.problems.join('; ')}`);
    if ((sp.status === 3) !== reader.void) throw refusal(`the reader exit code ${sp.status} and its VOID lines disagree`);
    const readerSha = `script ${sha12(fs.readFileSync(readerScript))}, output ${sha12(Buffer.from(sp.stdout))}`;
    const launcherSha = fs.existsSync(launcherFile) ? sha12(fs.readFileSync(launcherFile)) : null;
    if (launcherSha === null) throw refusal(`the launcher file is missing: ${launcherFile}`);
    // a VOID run is read first and needs no grades; if its grades can be read they are, so a Safety breach seen in a VOID run is reported (6.3)
    if (reader.void) { try { return { ...(await loadGrades({ run, folder, reader, readerSha, gradeDir, keyDir, root, launcherSha })), void: true }; } catch (e) { return { folder, reader, readerSha, void: true, voidNote: e.message }; } }
    return loadGrades({ run, folder, reader, readerSha, gradeDir, keyDir, root, launcherSha });
}

async function loadGrades({ run, folder, reader, readerSha, gradeDir, keyDir, root, launcherSha }) {
    // the build record and the key
    const rec = readJson(path.join(keyDir, 'build-record-rd.json'), 'the build record'), key = readJson(path.join(keyDir, 'key-rd.json'), 'the key');
    if (rec.runFolder !== folder || rec.runLabel !== REGISTERED_RUN_LABEL) throw refusal(`the build record is for another run (record ${rec.runFolder}, scoring ${folder})`);
    const fileSha = (p, what) => { if (!fs.existsSync(p)) throw refusal(`${what} is missing: ${p}`); return sha256(fs.readFileSync(p)); };
    if (fileSha(path.join(run, 'interview60.answers.router-live.json'), 'the live capture file') !== rec.liveSha256) throw refusal('the live capture file differs from the build record (changed after the export)');
    if (fileSha(path.join(run, 'interview60.answers.router-shadow.json'), 'the shadow capture file') !== rec.shadowSha256) throw refusal('the shadow capture file differs from the build record (changed after the export)');
    const rosterFile = path.join(root, 'electron', 'test', 'golden', 'live40.questions.mjs'), judgeFile = path.join(root, 'electron', 'test', 'golden', 'interview60.judge.mjs');
    if (fileSha(rosterFile, 'the roster') !== rec.rosterSha256) throw refusal('the roster differs from the build record (sha256)');
    if (fileSha(judgeFile, 'the judge file') !== rec.judgeSha256) throw refusal('the judge file differs from the build record (sha256)');
    const { LIVE40 } = await import(pathToFileURL(rosterFile).href);
    const roster = new Map(LIVE40.map((i) => [i.id, { id: i.id, route: i.route }]));
    for (const m of Object.values(key).flatMap((km) => Object.values(km))) if (!roster.has(m.id)) throw refusal(`the key names ${m.id}, which is not in the roster`);
    const tags = Object.keys(key);
    if (!Array.isArray(rec.sizes) || rec.sizes.length !== tags.length) throw refusal(`the build record's file count ${rec.sizes?.length} differs from the key's ${tags.length}`);

    // the grades: a missing, invalid or unclean file is dropped and listed (its bars read UNREADABLE), never silently used
    const records = fs.existsSync(path.join(gradeDir, 'launches.jsonl')) ? fs.readFileSync(path.join(gradeDir, 'launches.jsonl'), 'utf8').split('\n').filter((l) => l.trim()).map((l) => { try { return JSON.parse(l); } catch { return {}; } }) : [];
    const gradingProblems = [], reportedProblems = [];   // a problem in a GATING file blocks PASS; one in a reported-only arm is printed and gates nothing
    const graderModels = [];
    const loadVerdicts = (slot, vfile, pairsKeys, sink = gradingProblems, pairsFile = null) => {
        const p = provenanceProblem(records, slot, { launcherSha, pairsFile, verdictsFile: vfile });
        if (p) { sink.push(`${slot}: ${p}`); return null; }
        if (!fs.existsSync(vfile)) { sink.push(`${slot}: verdict file missing`); return null; }
        let v; try { v = JSON.parse(fs.readFileSync(vfile, 'utf8')); } catch { sink.push(`${slot}: verdict file is not JSON`); return null; }
        const vp = verdictProblem(v, pairsKeys);
        if (vp) { sink.push(`${slot}: verdict file invalid (${vp.slice(0, 80)})`); return null; }
        graderModels.push({ slot, models: [...new Set(records.filter((x) => x.slot === slot).at(-1).models)] });
        return v;
    };
    const sessionOf = (slot) => records.filter((x) => x.slot === slot).at(-1)?.session_id;
    const gradedBy = (base, pairsKeys, pairsFile) => {
        const out = {};
        if (sessionOf(`${base}.g1`) !== undefined && sessionOf(`${base}.g1`) === sessionOf(`${base}.g2`)) { gradingProblems.push(`${base}.g2: the same session graded both graders of this file`); return { g1: loadVerdicts(`${base}.g1`, path.join(gradeDir, 'verdicts', `verdicts.${base}.g1.json`), pairsKeys, gradingProblems, pairsFile), g2: null }; }
        for (const g of ['g1', 'g2']) out[g] = loadVerdicts(`${base}.${g}`, path.join(gradeDir, 'verdicts', `verdicts.${base}.${g}.json`), pairsKeys, gradingProblems, pairsFile);
        return out;
    };
    const blindGrades = {};
    for (const tag of tags) {
        const pairsFile = path.join(run, 'router-blind', `pairs.${tag}.json`);
        const pairs = readJson(pairsFile, `the blind pairs file ${tag}`);
        const keys = Object.fromEntries(pairs.items.map((i) => [i.key, 1]));
        if (JSON.stringify(Object.keys(keys).sort()) !== JSON.stringify(Object.keys(key[tag]).sort())) throw refusal(`the blind pairs file ${tag} and the key hold different entries`);
        const v = gradedBy(tag, keys, pairsFile);
        blindGrades[tag] = {};
        for (const q of Object.keys(key[tag])) blindGrades[tag][q] = { g1: v.g1?.[q], g2: v.g2?.[q] };
    }
    const inPairs = readJson(path.join(run, 'interview60.judge.pairs.json'), 'the in-app export');
    const inKeys = Object.fromEntries(inPairs.items.map((i) => [i.key, 1]));
    const iv = gradedBy('inapp', inKeys, path.join(run, 'interview60.judge.pairs.json'));
    const inGrades = {};
    for (const p of inPairs.items) inGrades[p.key] = { g1: iv.g1?.[p.key], g2: iv.g2?.[p.key] };

    // reported-only arms (one grader each; same thresholds on that one grader)
    const arm = (slot, pairsName) => {
        const pf = path.join(run, pairsName), vf = path.join(gradeDir, 'verdicts', `verdicts.${slot}.json`);
        if (!fs.existsSync(pf) || !fs.existsSync(vf)) return null;
        const items = JSON.parse(fs.readFileSync(pf, 'utf8')).items, v = loadVerdicts(slot, vf, Object.fromEntries(items.map((i) => [i.key, 1])), reportedProblems, pf);
        return v ? { n: items.length, acceptable: items.filter((i) => accept1(v[i.key])).length, wrong: items.filter((i) => wrong1(v[i.key])).length } : null;
    };
    const reported = { high: arm('high', 'interview60.judge.pairs.gemini-3.5-flash-lite_high.json'), low: arm('low', 'interview60.judge.pairs.gemini-3.1-flash-lite_low.json'), capturedHigh: arm('captured-high', 'interview60.judge.pairs.gemini-3.5-flash-lite_captured-high.json') };

    const timeline = readJson(path.join(run, 'interview60.timeline.json'), 'the timeline');
    if (!fs.existsSync(path.join(run, 'natively_debug.log'))) throw refusal('natively_debug.log is missing from the run folder');
    let log; try { log = parseLog(fs.readFileSync(path.join(run, 'natively_debug.log'), 'utf8'), timeline); } catch (e) { throw refusal(e.message); }
    const aliasRec = fs.existsSync(path.join(gradeDir, 'grader-cwd.launches.jsonl')) ? fs.readFileSync(path.join(gradeDir, 'grader-cwd.launches.jsonl'), 'utf8').split('\n').filter((l) => l.trim()).map((l) => { try { return JSON.parse(l); } catch { return {}; } }).filter((x) => x.slot === 'cwdprobe-3').at(-1) : null;
    return { folder, reader, readerSha, void: false, roster, key, blindGrades, inapp: { pairs: inPairs.items, grades: inGrades }, log, reported, gradingProblems, reportedProblems, graderModels, aliasModel: aliasRec?.models?.join('+') ?? null };
}

// ---------------------------------------------------------------- CLI
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const a = process.argv.slice(2), opt = (n) => { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : undefined; };
    const LAB_GRADE = path.dirname(fileURLToPath(import.meta.url));
    const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
    try {
        if (!opt('--run-dir')) throw refusal('usage: node score-rd.mjs --run-dir <run folder> [--grade-dir <dir>] [--key-dir <dir>] [--root <checkout>]   (the scorer runs router-hour-read.mjs itself with --down-limit-min 2)');
        if (a.includes('--reader-out')) throw refusal('--reader-out is gone: the scorer runs the reader itself (a reader-output file is never trusted)');
        if (a.includes('--reader-script') && process.env.SCORE_RD_CAL !== '1') throw refusal('--reader-script is a calibration seam (SCORE_RD_CAL=1 only): the real reader is always used');   // SEAM
        const gradeDir = path.resolve(opt('--grade-dir') ?? LAB_GRADE);
        const d = await loadReal({ runDir: opt('--run-dir'), readerScript: opt('--reader-script') ?? READER_FILE, gradeDir, keyDir: path.resolve(opt('--key-dir') ?? path.join(LAB_GRADE, '..', 'keyhold')), root: opt('--root') ?? MAIN });
        const res = scoreRd(d);
        const head = [`SCORE-RD run ${d.folder}; scorer sha256 ${sha12(fs.readFileSync(fileURLToPath(import.meta.url)))}; reader sha256 ${d.readerSha}; reader run with --down-limit-min ${THRESH.downLimitMin} on run folder ${d.folder}`];
        const text = [...head, ...res.lines].join('\n');
        console.log(text);
        if (!d.void) fs.writeFileSync(path.join(gradeDir, 'score-rd.out.txt'), `${text}\n`, 'utf8');
    } catch (e) {
        console.log(`REFUSED: ${e.message}`);
        process.exit(2);
    }
}
