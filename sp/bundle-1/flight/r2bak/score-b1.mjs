// score-b1.mjs: the scorer of the b1-final flight (PREREGISTER-b1-final.md sections 1, 2, 3.5, 4; USER-RULINGS item 9 = branch A). DERIVED from RD\grade\score-rd.mjs (sha12 50e0bc95bfb0).
// It applies the registration's bars and nothing else. NO MODEL IS CALLED. It prints only roster ids, turn numbers, counts and ms: never a question, an answer or a cue.
//
//   node score-b1.mjs --run-dir <MAIN>\electron\test\golden\interview60.runs\<stamp>-b1-final --q1 <yes|no|not-sure|none> --q2 <no|yes-before|yes-during|not-sure|none> --q3 <no|yes-during|not-sure|none>
//        [--grade-dir <dir>] [--root <MAIN>] [--out <file>]       exit 0 = scored (read the VERDICT line), exit 2 = refused (nothing scored)
//   --q1..--q3 are the user's answers to section 4, as the table there maps them; a missing flag = "not recorded" and the verdict is then NOT FINAL.
//   With no gating grades present it prints every bar it can and says the grade bars are PENDING (never PASS).
//
// It runs, itself and on the run folder: router-hour-read.mjs <run> --down-limit-min 2; check-smoke-cues.mjs (v5); gate-heard.mjs's own functions (that file has no run argument: its sha256 is
// checked, then its DISPATCH / readDispatches / idsForDispatches / wc / noCue source lines are loaded verbatim, so the gate is the tool's, not a copy); read-smoke-b1.mjs's analyze() for the
// S-H and OBS rows. Each tool's sha256 is checked against the registration first; a tool that is missing or differs refuses the scoring.
//
// Rules applied (each is the registration's; this file may not change them): section 1 verdict order VOID, FAIL, PASS, else INCONCLUSIVE; section 2 bars 1-6 (bar 7 is printed, never gates);
// acceptable = BOTH graders give correctness 2 AND on_topic 2; wrong = EITHER grader gives correctness 0; no answer = not acceptable; the grader pin, memory ABSENT, the launcher version and the
// pairs / verdicts hash binding of score-rd are kept (a clean, pinned, memory-ABSENT last launch record per slot, else that slot's grades are dropped and listed).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const PIN = 'claude-opus-5-5';
export const REGISTERED_RUN_LABEL = 'b1-final';
export const runFolderPattern = (label) => new RegExp(`^\\d{4}-\\d\\d-\\d\\dT\\d\\d-\\d\\d-\\d\\d-${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
// the registration's numbers (section 2 and 1)
export const THRESH = {
    accMet: 42, accFailMax: 39, roster: 47,                      // bar 1: >= 42 of 47 met; <= 39 FAIL; 40-41 INCONCLUSIVE
    p50: 4100, p90: 5400,                                        // bar 3
    cueWellFormedPct: 90, cueMaxLines: 3, cueMaxWords: 5,        // bar 4b
    doublesMax: 1, probes: 2,                                    // bar 5 (expected dispatches = 47 + 2 probes)
    downLimitMin: 2, voidFloor: 10, earEpisodeUtts: 5,           // bar 5, section 1
};
// section 3.4: the gating deadline is the later of run end + 24 h and the reset + 6 h (Mon 2026-10-12 16:00 TST + 6 h = 22:00 TST = 19:00Z); the reset term applies to a flight before the reset
export const RESET_PLUS_6H_MS = Date.parse('2026-10-12T19:00:00.000Z');
const OFFSET_MS = 1150;                                                       // the play-window offset of the reader and of r1 (registration binding details)
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const sha12 = (b) => sha256(b).slice(0, 12);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SP = path.resolve(HERE, '..', '..', '..');
const TOOLS = {                                                              // name -> { file, sha256 prefix named in the registration }
    reader: { file: path.join(SP, 'router-default', 'router-hour-read.mjs'), prefix: '2d17df40226e' },
    cues: { file: path.join(SP, 'bundle-1', 'check-smoke-cues.mjs'), prefix: 'c4b6a970' },
    gate: { file: path.join(SP, 'bundle-1', 'gate-heard.mjs'), prefix: '1a604cd2' },
    smoke: { file: path.join(SP, 'bundle-1', 'smoke', 'read-smoke-b1.mjs'), prefix: 'a2cb436e' },
};
const MAIN_DEFAULT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';

// ---------------------------------------------------------------- definitions (score-rd's, unchanged)
export const accept = (g) => !!g && g.g1?.correctness === 2 && g.g1?.on_topic === 2 && g.g2?.correctness === 2 && g.g2?.on_topic === 2;
export const isWrong = (g) => !!g && (g.g1?.correctness === 0 || g.g2?.correctness === 0);   // one grader's 0 settles it even when the other grade is missing
const accept1 = (g) => !!g && g.correctness === 2 && g.on_topic === 2;          // single-grader arms (reported only)
const wrong1 = (g) => !!g && g.correctness === 0;
const readGrade = (g) => (isWrong(g) ? 'wrong' : g && g.g1 && g.g2 ? 'ok' : 'none');
const okScore = (s) => !!s && [s.correctness, s.on_topic, s.delivery].every((x) => [0, 1, 2].includes(x));
export function verdictProblem(vv, keys) {
    if (!vv || typeof vv !== 'object' || Array.isArray(vv)) return 'not a JSON object';
    const extra = Object.keys(vv).filter((k) => !keys[k]);
    if (extra.length) return `grades keys that are not in the pairs file: ${extra.join(', ')}`;
    for (const k of Object.keys(keys)) if (!okScore(vv[k])) return `no valid verdict for ${k}`;
    return null;
}
const pctl = (arr, p) => { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); return s[Math.max(0, Math.ceil(p * s.length) - 1)]; };   // nearest rank (the reader's p90)
const median = (arr) => { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };   // the reader's p50 (I3)

// ---------------------------------------------------------------- the reader's output (score-rd's parse, adapted to bars 2, 3, 5 and the VOID lines)
/** Parses router-hour-read.mjs's stdout. `problems` lists every line that is missing or contradicts itself; the caller refuses a reader output with any. */
export function parseReader(text) {
    const problems = [];
    const lines = String(text).split(/\r?\n/);
    const find = (rx, what, optional = false) => { const m = lines.map((l) => rx.exec(l)).find(Boolean); if (!m && !optional) problems.push(`missing line: ${what}`); return m; };
    const n = (s) => (s === '-' ? null : Number(s));
    const r = { problems, void: false, voidWhy: [], voidChecks: {} };
    let m;
    if ((m = find(/^BAR Safety \(text half\): (PASS|FAIL) live_hard_first=(\d+) live_router_marker=(\d+) pipeline_unknown_marker=(\d+) pipeline_bare_routing_token=(\d+)/, 'BAR Safety (text half)'))) {
        r.safetyText = { flag: m[1], liveHard: +m[2], liveMarker: +m[3], pipeUnknown: +m[4], pipeBare: +m[5] };
        if ((r.safetyText.liveHard + r.safetyText.liveMarker + r.safetyText.pipeUnknown + r.safetyText.pipeBare === 0) !== (m[1] === 'PASS')) problems.push('BAR Safety (text half): its flag disagrees with its counts');
    }
    if ((m = find(/^BAR Fallback: (PASS|FAIL) missing_appended=(\d+) unflagged_live_failures=(\d+) row4_with_live_capture=(\d+) dispatched_nothing_shown=(\d+) pipeline_no_token=(\d+)/, 'BAR Fallback'))) {
        r.fallback = { flag: m[1], counts: m.slice(2, 7).map(Number) };
        if (r.fallback.counts.every((x) => x === 0) !== (m[1] === 'PASS')) problems.push('BAR Fallback: its flag disagrees with its counts');
    }
    if ((m = find(/^SPEED shadow_first_token q_src=all n=(\d+) p50=(\S+) p90=(\S+)/, 'SPEED shadow_first_token q_src=all'))) r.speed = { n: +m[1], p50: n(m[2]), p90: n(m[3]) };
    if ((m = find(/^APPENDS total=(\d+)/, 'APPENDS total'))) r.appends = +m[1];
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
    if (vin && Number(vin[2]) !== THRESH.downLimitMin) problems.push(`VOID_INPUT: the down-time limit ${vin[2]} is not the registered ${THRESH.downLimitMin} minutes`);
    if (down && Number(down[3]) !== THRESH.downLimitMin) problems.push(`VOID CHECK router-down-minutes: the limit ${down[3]} is not the registered ${THRESH.downLimitMin}`);
    if (vin && down) { const d = Number(vin[1]), c = down[1] === 'VOID'; if ((d > THRESH.downLimitMin + 0.005 && !c) || (d < THRESH.downLimitMin - 0.005 && c)) problems.push(`VOID CHECK router-down-minutes: ${down[1]} disagrees with ${vin[1]} minutes against ${THRESH.downLimitMin}`); }
    if (failed && Number(failed[1]) !== THRESH.voidFloor) problems.push(`VOID CHECK: the dispatch floor ${failed[1]} is not the registered ${THRESH.voidFloor}`);
    const vline = lines.map((l) => /^VERDICT VOID \(the re-fly is not spent\): (.*)$/.exec(l)).find(Boolean);
    const checkVoid = !!down && !!failed && (down[1] === 'VOID' || failed[2] === 'VOID');
    if (!!vline !== checkVoid) problems.push('the VOID CHECK lines and the VERDICT VOID line disagree');
    r.voidChecks = { routerDown: down?.[1] === 'VOID', sessionFailed: failed?.[2] === 'VOID', downMinutes: vin?.[1] ?? null };
    r.void = !!vline || checkVoid;
    if (vline) r.voidWhy = [vline[1]];
    // bar 7, reported only: optional lines (a reader that lacks them still scores)
    const ro = {};
    if ((m = find(/^BAR Routing: (?:PASS|FAIL) EASY caught (\d+)\/(\d+) .*?HARD misrouted (\d+)\/(\d+)/, 'BAR Routing', true))) Object.assign(ro, { easyCaught: +m[1], easyN: +m[2], hardMis: +m[3], hardN: +m[4] });
    if ((m = find(/^ROUTING HARD late \(not misrouted, M2\): (\d+)/, 'ROUTING late', true))) ro.late = +m[1];
    if ((m = find(/^ROUTING HARD no-router-turn \(not misrouted, M2\): (\d+)/, 'ROUTING no-router-turn', true))) ro.noRouterTurn = +m[1];
    if ((m = find(/^SPEED live_first_ms shown=live q_src=all n=(\d+) p50=(\S+)/, 'SPEED live_first_ms', true))) ro.liveFirstP50 = n(m[2]);
    r.routing = ro;
    return r;
}

// ---------------------------------------------------------------- the log
/** The lines of the log's session covering the hour (turn ids restart per app process; same slicing as router-hour-read.mjs). */
export function sessionSlice(logText, timeline) {
    const raw = String(logText).split(/\r?\n/);
    const HDR = /^=== Natively session started (\S+) ===/;
    let from = -1;
    raw.forEach((l, i) => { const m = HDR.exec(l); if (m && Date.parse(m[1]) <= timeline.startedMs) from = i; });
    if (from < 0) throw new Error('the log does not cover the hour: no "=== Natively session started <ISO> ===" line at or before the hour start');
    let to = raw.length;
    raw.forEach((l, i) => { const m = HDR.exec(l); if (!m) return; const t = Date.parse(m[1]); if (t > timeline.startedMs && t <= timeline.endedMs) throw new Error('the app restarted inside the hour (a second session header inside the hour)'); if (i > from && i < to) to = i; });
    return raw.slice(from, to);
}
/** The facts the join needs: decisions (with the play-window item), dispatches (with their item), main answer lines, supersedes, full lines, the ear and the silent-listener evidence. */
export function parseLog(logText, timeline) {
    const slice = sessionSlice(logText, timeline);
    const kv = (msg) => { const o = {}; for (const m of msg.matchAll(/(\w+)=(\S+)/g)) if (!(m[1] in o)) o[m[1]] = m[2]; return o; };
    const log = { mainAnswers: [], routerDispatch: [], decisions: new Map(), superseded: [], fulls: [], silentListener: 0, ev: [], slice };
    const supSeen = new Set();
    const first = timeline.items?.length ? timeline.startedMs + OFFSET_MS + Math.min(...timeline.items.map((i) => i.startSec)) * 1000 : null;   // before it: the probe's turns
    const wins = (timeline.items ?? []).map((i) => ({ id: i.id, at: timeline.startedMs + OFFSET_MS + i.startSec * 1000 })).sort((a, b) => a.at - b.at);
    const itemAt = (q) => { let id = null; if (q === null) return null; for (const w of wins) if (q >= w.at) id = w.id; return id; };   // the reader's play-window mapping
    const inHour = (q) => first === null || q === null || q >= first;
    for (const l of slice) {
        const m = /^(\d{4}-\d\d-\d\dT[\d:.]+Z) \[[A-Z]+\] (.*)$/.exec(l);
        if (!m) continue;
        const ts = Date.parse(m[1]), msg = m[2];
        let x;
        if (msg.startsWith('[Main] dispatch: answer ')) log.mainAnswers.push(ts);
        else if (msg.startsWith('[Router] dispatch turn=')) { const o = kv(msg), q = /^-?\d+$/.test(o.q_at ?? '') ? +o.q_at : null; log.routerDispatch.push({ turn: +o.turn, ts, q, item: itemAt(q), inHour: inHour(q) }); }
        else if ((x = /^\[Router\] superseded turn=(\d+) phase=(streaming|done)\b/.exec(msg))) { if (!supSeen.has(+x[1])) { supSeen.add(+x[1]); log.superseded.push({ turn: +x[1], ts, phase: x[2] }); } }
        else if (msg.startsWith('[Router] turn=')) {
            const o = kv(msg), turn = /^\d+$/.test(o.turn ?? '') ? +o.turn : null;
            if (turn !== null && (o.shown === 'live' || o.shown === 'pipeline') && !log.decisions.has(turn)) { const q = /^-?\d+$/.test(o.q_at ?? '') ? +o.q_at : null; log.decisions.set(turn, { shown: o.shown, reason: o.reason, superseded: o.superseded === 'yes', q, item: itemAt(q), inHour: inHour(q), shadow: /^\d+$/.test(o.shadow ?? '') ? +o.shadow : null }); }
        } else if (msg.startsWith('[Answer] full: ')) { try { const t = JSON.parse(msg.slice('[Answer] full: '.length)); if (typeof t === 'string') log.fulls.push({ ts, text: t }); } catch { /* an unparseable line is the reader's integrity matter */ } }
        if (msg.startsWith('[Router] ear failover') && msg.includes('reason=silent-listener')) log.silentListener++;
        if (msg.startsWith('[Main] turn: deepgram speech-started')) log.ev.push({ t: ts, k: 'S' });
        else if (msg.startsWith('[Main] turn: deepgram utterance-end')) log.ev.push({ t: ts, k: 'U' });
        else if (msg.startsWith('[LiveCaption] fragment')) log.ev.push({ t: ts, k: 'C' });
    }
    return log;
}
/** The ear-gap3.cjs method: the longest run of consecutive Deepgram utterances with no [LiveCaption] in [S - 2 s, U + 10 s], counted only after the run's first caption (needs >= 10 captions). */
export function earEpisode(ev) {
    const caps = ev.filter((e) => e.k === 'C').map((e) => e.t);
    if (caps.length < 10) return { maxConsec: 0, utts: 0, enough: false };
    let S = null, cur = 0, best = 0, utts = 0;
    for (const e of ev) {
        if (e.k === 'S' && S === null) S = e.t;
        if (e.k === 'U' && S !== null) {
            if (S >= caps[0]) { utts++; const has = caps.some((c) => c >= S - 2000 && c <= e.t + 10000); if (!has) { cur++; best = Math.max(best, cur); } else cur = 0; }
            S = null;
        }
    }
    return { maxConsec: best, utts, enough: true };
}

/** Joins each in-app pair to its turn: the [Main] dispatch: answer line whose timestamp is the pair's dispatchedAt, then the FIRST [Router] dispatch line at or after it and before the next answer line. */
export function joinInapp(pairs, log) {
    const mains = log.mainAnswers;
    return pairs.map((pair) => {
        const t = Date.parse(pair.dispatchedAt);
        const idx = mains.map((x, i) => (x === t ? i : -1)).filter((i) => i >= 0);
        if (idx.length !== 1) return { pair, defect: `${idx.length} [Main] dispatch lines at the pair's dispatchedAt (need exactly 1)` };
        const k = idx[0];
        const next = mains[k + 1] ?? Infinity;
        const d = log.routerDispatch.find((x) => x.ts >= t && x.ts < next);
        if (!d) return { pair, defect: 'no [Router] dispatch line between this answer dispatch and the next' };
        return { pair, turn: d.turn };
    });
}

// ---------------------------------------------------------------- bar 4a / 4b: the cue gate and the cue blocks, read per dispatch
const NOTATION = /`|\\[A-Za-z([{%]/;                                          // check-smoke-cues v5's rule: no notation left in a cue
/** Loads gate-heard.mjs's own source lines (sha256-checked by the caller) and returns { readDispatches, idsForDispatches, wc, noCue }. */
export function loadGate(text) {
    const pick = (rx, what) => { const l = text.split(/\r?\n/).find((x) => rx.test(x)); if (!l) throw new Error(`gate-heard.mjs has no ${what} line: the file is not the registered one`); return l; };
    const src = [pick(/^const DISPATCH = /, 'DISPATCH'), pick(/^const readDispatches = /, 'readDispatches'), pick(/^function idsForDispatches\(/, 'idsForDispatches'), pick(/^const wc = /, 'wc'), pick(/^const noCue = /, 'noCue')].join('\n');
    return new Function(`${src}\nreturn { DISPATCH, readDispatches, idsForDispatches, wc, noCue };`)();
}
/** Pairs every dispatch of the session with its `[Answer] cue rule:` line and its `[Answer] cues:` line (the order in the log is dispatch, rule, [block marker], cues, full). */
export function cueFacts(slice, gate, timeline) {
    const DISP = /^(\S+) \[LOG\] \[Main\] dispatch: (answer|supersede|extend) /;
    const Q = /question="((?:[^"\\]|\\.)*)"/;
    const ds = []; let cur = null; const f = { orphanRules: 0, dupRules: 0, orphanCues: 0, dupCues: 0 };
    for (const l of slice) {
        let m;
        if ((m = DISP.exec(l))) { const q = Q.exec(l); let question = null; if (q) { try { question = JSON.parse(`"${q[1]}"`); } catch { question = null; } } cur = { kind: m[2], at: m[1], question, rule: null, cues: null, words: null }; ds.push(cur); }
        else if ((m = /\[Answer\] cue rule: (sent|skipped)(?: words=(\d+))?/.exec(l))) { if (!cur) f.orphanRules++; else if (cur.rule !== null) f.dupRules++; else { cur.rule = m[1]; cur.words = m[2] === undefined ? null : +m[2]; } }
        else if (l.includes('[Answer] cues:')) { if (!cur) f.orphanCues++; else if (cur.cues !== null) f.dupCues++; else cur.cues = l.slice(l.indexOf('[Answer] cues:') + '[Answer] cues:'.length).trim(); }
    }
    let mismatch = 0, missingRule = 0, unverifiable = 0, wordsDisagree = 0, sent = 0, skipped = 0;
    const mismatchAt = [];
    ds.forEach((d, i) => {
        if (d.rule === null) { missingRule++; mismatch++; mismatchAt.push(i + 1); return; }
        if (d.rule === 'sent') sent++; else skipped++;
        if (d.question === null) { unverifiable++; return; }                 // an extend line carries no question= we can recompute from
        if ((d.rule === 'skipped') !== gate.noCue(d.question)) { mismatch++; mismatchAt.push(i + 1); }
        if (d.words !== null && d.words !== gate.wc(d.question)) wordsDisagree++;
    });
    mismatch += f.orphanRules + f.dupRules;                                    // one rule line per pipeline answer: a rule line with no dispatch, or two for one, breaks the count
    // 4b: per answer
    let nonEmptyOnSkipped = 0, emptyOnSent = 0, wellFormedSent = 0, over = 0, malformedSent = 0, noCuesLineSent = 0;
    for (const d of ds) {
        let arr = null, parsed = false;
        if (d.cues !== null) { try { arr = JSON.parse(d.cues); parsed = true; } catch { parsed = false; } }
        if (parsed && Array.isArray(arr) && (arr.length > THRESH.cueMaxLines || arr.some((s) => typeof s === 'string' && s.trim().split(/\s+/).length > THRESH.cueMaxWords))) over++;
        if (d.rule === 'skipped') { if (d.cues !== null && !(parsed && Array.isArray(arr) && arr.length === 0)) nonEmptyOnSkipped++; }
        else if (d.rule === 'sent') {
            if (d.cues === null) noCuesLineSent++;
            else if (parsed && Array.isArray(arr) && arr.length === 0) emptyOnSent++;
            else if (parsed && Array.isArray(arr) && arr.length > 0 && arr.length <= THRESH.cueMaxLines && arr.every((s) => typeof s === 'string' && s.trim() && s.trim().split(/\s+/).length <= THRESH.cueMaxWords && !NOTATION.test(s))) wellFormedSent++;
            else malformedSent++;
        }
    }
    // the gate-heard.mjs method on ids (LAST dispatch per id decides), reported against the roster's own text
    const answerDisp = gate.readDispatches(slice.join('\n'));
    const byId = gate.idsForDispatches(answerDisp, timeline), last = {}; for (const d of byId) last[d.id] = d.question;
    const heardNoCue = [], flipToCue = [], flipToNoCue = [];
    for (const it of timeline.items ?? []) { const h = last[it.id]; if (h === undefined) continue; if (gate.noCue(h)) heardNoCue.push(it.id); if (gate.noCue(it.q) && !gate.noCue(h)) flipToCue.push(it.id); if (!gate.noCue(it.q) && gate.noCue(h)) flipToNoCue.push(it.id); }
    return { dispatches: ds.length, sent, skipped, mismatch, mismatchAt, missingRule, unverifiable, wordsDisagree, ...f, nonEmptyOnSkipped, emptyOnSent, wellFormedSent, malformedSent, noCuesLineSent, over, heardNoCue, flipToCue, flipToNoCue };
}
/** check-smoke-cues v5's output, parsed the way read-smoke-b1.mjs's cueSmokeFor parses it (numbers only; the cue text it prints is never kept). */
export function parseCueCheck(stdout, status) {
    const out = String(stdout ?? '').split(/\r?\n/);
    const summary = out.find((l) => /answers \d+ \(real \d+, failed \d+\)/.test(l)) ?? '';
    const m = /answers (\d+) \(real (\d+), failed (\d+)\), superseded (\d+), cue lines (\d+) .*?malformed (\d+), block-only (\d+), trimmed (\d+), cue rule skipped (\d+) \(expected-empty cues (\d+)\)/.exec(summary);
    const verdict = out.find((l) => /^CUE SMOKE (NOT )?CLEAN/.test(l)) ?? `no verdict (exit ${status})`;
    let over = 0;
    for (const l of out) { const mm = /^\s+malformed: (.*)$/.exec(l); if (!mm) continue; try { const a = JSON.parse(mm[1]); if (Array.isArray(a) && (a.length > THRESH.cueMaxLines || a.some((s) => typeof s === 'string' && s.trim().split(/\s+/).length > THRESH.cueMaxWords))) over++; } catch { /* unparsable counts as malformed, not over */ } }
    const cueLines = m ? +m[5] : 0, malformed = m ? +m[6] : 0, expectedEmpty = m ? +m[10] : 0, bearing = Math.max(0, cueLines - expectedEmpty);
    return { status, verdict, clean: status === 0 && verdict === 'CUE SMOKE CLEAN', parsed: !!m, failedAnswers: m ? +m[3] : 0, answers: m ? +m[1] : 0, malformed, blockOnly: m ? +m[7] : 0, over, wellFormedPct: bearing === 0 ? 0 : (100 * (bearing - malformed)) / bearing, summaryDir: summary.split(':')[0] };
}

// ---------------------------------------------------------------- the scorer
const MET = 'MET', NOTMET = 'NOT MET', PENDING = 'PENDING', UNREADABLE = 'UNREADABLE';

/** d = { folder, now, human:{q1,q2,q3}, run:{ doneJson, exit, hourNotSpent, distPassedCount, distChangedLines }, reader, smoke:{ sh, obs }, cue:{ check, facts }, leaks:{ n, where }, ear, log, timeline,
 *        pairs, grading:{ state, problems, complete, grades, late }, reported:{ high, low, capturedHigh }, reportedProblems, graderModels, deadlineMs } */
export function scoreB1(d) {
    const r = d.reader, L = [], P = (s) => L.push(s);
    const voidWhy = [], failWhy = [], inconcWhy = [], notes = [];
    const q = d.human ?? {};

    // ---------- VOID (checked first)
    if (d.run.distPassedCount < 2 || d.run.distChangedLines > 0) voidWhy.push(`dist proofs after != before (launcher log: "B1 PROOFS: ALL PASSED" ${d.run.distPassedCount}x, need 2; "unchanged ... no" lines ${d.run.distChangedLines})`);
    if (r.voidChecks.sessionFailed) voidWhy.push(`[Router] session failed before the ${THRESH.voidFloor}th dispatch`);
    if (r.voidChecks.routerDown) voidWhy.push(`router down ${r.voidChecks.downMinutes} min in the run window (limit ${THRESH.downLimitMin})`);
    if (!d.smoke.obs.ok) voidWhy.push(`the automated OBS read failed (bar 6): ${d.smoke.obs.reading}`);
    if (d.run.hourNotSpent) voidWhy.push('the launcher log says the hour was NOT spent');
    if (!d.run.doneJson) voidWhy.push('interview60.flight.done.json is missing');
    if (d.run.exit !== 0) voidWhy.push(`the flight run exited ${d.run.exit === null ? 'with no RUN EXIT line' : d.run.exit}`);
    const humanRecorded = ['q1', 'q2', 'q3'].every((k) => q[k] !== undefined);
    if (q.q1 === 'no') voidWhy.push('Q1 no: the overlay was missing during playback');
    if (q.q2 === 'yes-during') voidWhy.push('Q2 yes: sound during playback (system audio hears everything)');
    if (q.q3 === 'yes-during') voidWhy.push('Q3 yes: the user typed or clicked during playback');
    for (const k of ['q1', 'q2', 'q3']) if (q[k] === 'none') voidWhy.push(`${k.toUpperCase()} unanswered within 12 h`);

    // ---------- the roster and per-item dispatch facts
    const log = d.log, items = d.timeline.items;
    const roster = new Map(items.map((i) => [i.id, i]));
    const hourDisp = log.routerDispatch.filter((x) => x.inHour);
    const byItem = new Map(); for (const x of hourDisp) { if (x.item === null) continue; (byItem.get(x.item) ?? byItem.set(x.item, []).get(x.item)).push(x); }
    for (const a of byItem.values()) a.sort((x, y) => x.ts - y.ts);
    const unmapped = hourDisp.filter((x) => x.item === null).length;

    // ---------- the in-app pairs: join, claim, grade
    const pairs = d.pairs ?? [], grades = d.grading.grades ?? {};
    const joins = joinInapp(pairs, log);
    const turnPair = new Map(); const unreadable = new Set(); const info = { joinDefects: 0, outOfHourPairs: 0, mappingDisagree: 0, doubleExtraUngraded: 0, supNoGrade: 0, supCrossTurn: 0 };
    for (const j of joins) {
        if (j.defect) { info.joinDefects++; unreadable.add(`pair:${j.pair.key}`); continue; }
        const dec = log.decisions.get(j.turn), disp = log.routerDispatch.find((x) => x.turn === j.turn);
        if (disp && !disp.inHour) { info.outOfHourPairs++; continue; }
        if (!dec) { info.joinDefects++; unreadable.add(`pair:${j.pair.key}`); continue; }
        if (dec.item !== null && j.pair.id !== dec.item) info.mappingDisagree++;
        turnPair.set(j.turn, j.pair);
    }
    const gradesIn = d.grading.complete;                                   // both gating graders clean
    const pairGrade = (p) => grades[p.key];
    // unclaimed in-hour dispatches: a double's extra answer (the item has another claimed pair) counts for bar 5 only; any other is UNREADABLE
    for (const x of hourDisp) {
        if (turnPair.has(x.turn)) continue;
        const sibling = x.item !== null && (byItem.get(x.item) ?? []).some((y) => y.turn !== x.turn && turnPair.has(y.turn));
        if (sibling) info.doubleExtraUngraded++; else unreadable.add(`turn:${x.turn}`);
    }
    // supersede (r1 7.3 applied verbatim, without the HARD qualifier: the registration says an unclaimed or ungradeable replacing answer is UNREADABLE)
    const supTurns = new Set(log.superseded.map((s) => s.turn)), supPhase = { streaming: 0, done: 0 };
    for (const sp of log.superseded) {
        const sd = log.decisions.get(sp.turn);
        if (sd && !sd.inHour) continue;
        supPhase[sp.phase]++;
        const mine = log.routerDispatch.find((x) => x.turn === sp.turn);
        const nextTs = log.routerDispatch.find((x) => x.turn !== sp.turn && x.ts > (mine?.ts ?? sp.ts))?.ts ?? Infinity;
        const full = log.fulls.find((f) => f.ts >= sp.ts && f.ts < nextTs);
        if (!full) { info.supNoGrade++; unreadable.add(`sup:${sp.turn}`); continue; }
        const pair = pairs.find((p) => p.answer === full.text);
        const jn = pair ? joins.find((j) => j.pair === pair) : null;
        const crossTurn = !!pair && (jn?.turn === undefined || (jn.turn !== sp.turn && !supTurns.has(jn.turn)));
        const st = pair && !crossTurn && gradesIn ? readGrade(pairGrade(pair)) : 'none';
        if (st === 'none') { info.supNoGrade++; if (crossTurn) info.supCrossTurn++; unreadable.add(`sup:${sp.turn}`); }
    }
    if (r.appends > 0) unreadable.add(`appends:${r.appends}`);              // an appended turn: the appended text is not in the in-app file, so the wrong half cannot be read

    // ---------- bar 1 (quality) and the wrong lists
    let accN = 0; const wrongShown = [], wrongLive = []; let liveN = 0, liveUngraded = 0;
    for (const p of pairs) { const st = readGrade(pairGrade(p)); if (st === 'wrong') wrongShown.push(p.key); }
    for (const [turn, p] of turnPair) { const dec = log.decisions.get(turn); if (dec?.shown === 'live') { liveN++; const st = readGrade(pairGrade(p)); if (st === 'wrong') wrongLive.push(p.key); else if (st === 'none') liveUngraded++; } }
    const itemRows = [];
    for (const it of items) {
        const ds = byItem.get(it.id) ?? [];
        const firstTurn = ds[0]?.turn;
        const pair = firstTurn !== undefined ? turnPair.get(firstTurn) : undefined;
        if (firstTurn !== undefined && !pair && ds.slice(1).some((y) => turnPair.has(y.turn))) unreadable.add(`first:${it.id}`);   // the claimed pair is not the item's first dispatch
        const acc = !!pair && accept(pairGrade(pair));
        if (acc) accN++;
        itemRows.push({ id: it.id, level: it.level, n: ds.length, dec: firstTurn !== undefined ? log.decisions.get(firstTurn) : undefined, acc, shown: firstTurn !== undefined ? log.decisions.get(firstTurn)?.shown : undefined });
    }
    const gradeState = d.grading.state;                                    // 'complete' | 'pending' | 'bad'
    const accKnown = gradeState === 'complete';
    let bar1;
    // review F1: a missed 3.4 deadline is INCONCLUSIVE and "no later grade changes that", so late grades never FAIL
    const lateGrades = !!d.grading.late;
    // review F2: an UNREADABLE entry may hide an acceptable answer, so the <= 39 FAIL counts each one (and each appended turn) as possibly acceptable
    const accCeiling = accN + unreadable.size + (r.appends > 0 ? r.appends : 0);
    if (!lateGrades && wrongShown.length > 0) failWhy.push(`wrong shown answer(s) by either grader: ${wrongShown.join(', ')}`);
    if (!lateGrades && accKnown && accCeiling <= THRESH.accFailMax) failWhy.push(`in-app acceptable ${accN} of ${THRESH.roster} (<= ${THRESH.accFailMax}, even counting ${accCeiling - accN} unreadable as acceptable)`);
    if (gradeState === 'pending') bar1 = PENDING;
    else if (!accKnown) bar1 = UNREADABLE;
    else if (unreadable.size > 0) bar1 = UNREADABLE;
    else bar1 = accN >= THRESH.accMet && wrongShown.length === 0 ? MET : NOTMET;
    // ---------- bar 2 (safety)
    const textOk = r.safetyText.liveHard + r.safetyText.liveMarker + r.safetyText.pipeUnknown + r.safetyText.pipeBare === 0;
    if (!textOk) failWhy.push(`text-half Safety count > 0 (live hard-first ${r.safetyText.liveHard}, live router-marker ${r.safetyText.liveMarker}, pipeline unknown-marker ${r.safetyText.pipeUnknown}, bare-routing-token ${r.safetyText.pipeBare})`);
    let bar2;
    if (!textOk || wrongLive.length > 0) bar2 = NOTMET;
    else if (gradeState === 'pending') bar2 = PENDING;
    else if (!accKnown || liveUngraded > 0 || unreadable.size > 0) bar2 = UNREADABLE;
    else bar2 = MET;
    // ---------- bar 3 (latency)
    const sp = r.speed;
    const bar3 = sp.n > 0 && sp.p50 !== null && sp.p90 !== null && sp.p50 <= THRESH.p50 && sp.p90 <= THRESH.p90 ? MET : NOTMET;
    // ---------- bar 4
    const cf = d.cue.facts, cc = d.cue.check;
    const bar4a = cf.mismatch === 0 && cf.dispatches > 0 ? MET : NOTMET;
    if (cf.mismatch > 0) failWhy.push(`cue-gate mismatch: ${cf.mismatch} (dispatch positions ${cf.mismatchAt.join(',') || 'n/a'}; missing rule lines ${cf.missingRule}, orphan rule lines ${cf.orphanRules}, duplicate rule lines ${cf.dupRules})`);
    const covPct = cf.sent === 0 ? 100 : (100 * cf.wellFormedSent) / cf.sent;
    const bar4b = cc.clean && cf.nonEmptyOnSkipped === 0 && cf.emptyOnSent === 0 && cf.noCuesLineSent === 0 && cf.malformedSent === 0 && cf.over === 0 && cc.over === 0 && covPct >= THRESH.cueWellFormedPct ? MET : NOTMET;
    const bar4c = d.leaks.n === 0 ? MET : NOTMET;
    if (d.leaks.n > 0) failWhy.push(`cue marker leaked into shown text: ${d.leaks.n} (${d.leaks.where.join(', ')})`);
    // ---------- bar 5 (reliability)
    const sh = d.smoke.sh;
    const answeredItems = itemRows.filter((x) => x.n > 0 && x.dec !== undefined).length;
    const neverDispatched = itemRows.filter((x) => x.n === 0).map((x) => x.id);
    const noDecisionFirst = itemRows.filter((x) => x.n > 0 && x.dec === undefined).map((x) => x.id);
    const doublesItem = itemRows.reduce((a, x) => a + Math.max(0, x.n - 1), 0);
    const nothingShown = r.fallback.counts[3] + r.fallback.counts[4];
    const silentNoEpisode = log.silentListener > 0 && !(d.ear.enough && d.ear.maxConsec >= THRESH.earEpisodeUtts);
    const bar5parts = [];
    if (answeredItems < THRESH.roster) bar5parts.push(`items answered ${answeredItems} of ${THRESH.roster}${neverDispatched.length ? ` (never dispatched: ${neverDispatched.join(',')})` : ''}${noDecisionFirst.length ? ` (first dispatch with no decision: ${noDecisionFirst.join(',')})` : ''}`);
    if (doublesItem > THRESH.doublesMax) bar5parts.push(`doubles by item ${doublesItem} (> ${THRESH.doublesMax})`);
    if (!sh.ok) bar5parts.push(`S-H row: ${sh.reading}`);
    if (nothingShown > 0) bar5parts.push(`dispatched turns with nothing shown ${nothingShown}`);
    if (cc.failedAnswers > 0) bar5parts.push(`failed answers ${cc.failedAnswers}`);
    if (silentNoEpisode) bar5parts.push(`reason=silent-listener failover x${log.silentListener} with no ear episode (longest uncaptioned run ${d.ear.maxConsec}, need >= ${THRESH.earEpisodeUtts})`);
    const bar5 = bar5parts.length === 0 ? MET : NOTMET;
    // ---------- bar 6 (observability): the automated half is a VOID line above; the human half is Q1
    let bar6;
    if (!d.smoke.obs.ok) bar6 = NOTMET;
    else if (q.q1 === 'yes') bar6 = MET;
    else if (q.q1 === undefined) bar6 = PENDING;
    else bar6 = NOTMET;
    // ---------- integrity (the reader's counts)
    const ig = r.integrity;
    const integrityProblems = [
        ...(ig.capMismatch ? ['capture MISMATCH'] : []), ...(ig.fileMismatch ? ['capture-file MISMATCH'] : []),
        ...[[ig.noDecision, 'dispatched turns with no decision line'], [ig.noDispatch, 'decision lines without a dispatch line'], [ig.dupDecision, 'duplicate decision lines'], [ig.dupDispatch, 'duplicate dispatch lines'], [ig.unparsed, 'unparsed decision lines'], [ig.noQ, 'decisions without q_at'], [ig.supDefects, 'superseded record defects']].filter(([c]) => c > 0).map(([, l]) => l),
    ];

    // ---------- the verdict (section 1: VOID, FAIL, PASS, else INCONCLUSIVE)
    const bars = { 1: bar1, 2: bar2, 3: bar3, '4a': bar4a, '4b': bar4b, '4c': bar4c, 5: bar5, 6: bar6 };
    const gradeBars = ['1', '2'];
    for (const [k, v] of Object.entries(bars)) if (v === NOTMET || v === UNREADABLE) inconcWhy.push(`bar ${k} ${v}`);
    if (bar1 === NOTMET && accKnown && accN >= THRESH.accFailMax + 1 && accN < THRESH.accMet) notes.push(`acceptable ${accN} is 40-41: INCONCLUSIVE`);
    if (bar5 === NOTMET) for (const p of bar5parts) inconcWhy.push(`bar 5: ${p}`);
    if (bar3 === NOTMET) inconcWhy.push(`bar 3: p50 ${sp.p50} (limit ${THRESH.p50}), p90 ${sp.p90} (limit ${THRESH.p90}), n ${sp.n}`);
    if (bar4b === NOTMET) inconcWhy.push(`bar 4b: cue-check ${cc.verdict}; non-empty block on a skipped answer ${cf.nonEmptyOnSkipped}; empty or missing block on a sent answer ${cf.emptyOnSent + cf.noCuesLineSent}; malformed ${cf.malformedSent}; over 3x5 ${Math.max(cf.over, cc.over)}; coverage ${covPct.toFixed(1)}% (need >= ${THRESH.cueWellFormedPct})`);
    if (unreadable.size > 0) inconcWhy.push(`UNREADABLE turns: ${[...unreadable].join(', ')}`);
    for (const p of integrityProblems) inconcWhy.push(`integrity: ${p}`);
    for (const p of d.grading.problems ?? []) inconcWhy.push(`grading: ${p}`);
    if (q.q1 === 'not-sure') inconcWhy.push('Q1 "not sure": bar 6 human half not met');
    const gradingLate = !!d.grading.late;
    if (gradingLate) inconcWhy.push('gating grades not complete by the section 3.4 deadline');
    if (d.cue.facts.unverifiable > 0) notes.push(`${d.cue.facts.unverifiable} dispatch(es) carry no question= to recompute the gate on (extend lines); counted as rule lines, not as mismatches`);

    const allMet = Object.values(bars).every((v) => v === MET);
    let verdict, standing = null;
    if (voidWhy.length) verdict = 'VOID';
    else if (failWhy.length) verdict = 'FAIL';
    else if (!humanRecorded) verdict = 'NOT FINAL';
    else if (gradeState === 'pending' && !gradingLate) verdict = 'PENDING';
    else if (allMet && integrityProblems.length === 0 && (d.grading.problems ?? []).length === 0 && !gradingLate && q.q1 === 'yes') verdict = 'PASS';
    else verdict = 'INCONCLUSIVE';
    if (verdict === 'PENDING' || verdict === 'NOT FINAL') {
        const nonGradeBad = Object.entries(bars).filter(([k, v]) => !gradeBars.includes(k) && v !== MET && !(k === '6' && v === PENDING));
        standing = nonGradeBad.length || integrityProblems.length || bar5parts.length ? 'cannot be PASS (a non-grade bar is not met); INCONCLUSIVE at best, FAIL if the grades show a wrong answer or acceptable <= 39' : 'every non-grade bar is met; PASS needs both gating graders complete, pinned, memory ABSENT, and bars 1 and 2 met';
    }

    // ---------- print
    P(`BAR 1 Quality: ${bar1}${accKnown ? '' : bar1 === PENDING ? ' (grades not yet present)' : ' (gating grades unusable)'} in-app acceptable ${accKnown ? accN : 'n/a'} of ${THRESH.roster} (met >= ${THRESH.accMet}; FAIL <= ${THRESH.accFailMax}); wrong in-app answers ${gradeState === 'pending' ? 'n/a' : wrongShown.length} (needs 0)${wrongShown.length ? ` [${wrongShown.join(', ')}]` : ''}; unreadable ${unreadable.size}`);
    P(`BAR 2 Safety: ${bar2} text half ${textOk ? 'PASS' : 'FAIL'} (live hard-first ${r.safetyText.liveHard}, live router-marker ${r.safetyText.liveMarker}, pipeline unknown-marker ${r.safetyText.pipeUnknown}, bare-routing-token ${r.safetyText.pipeBare}); wrong Live-shown ${gradeState === 'pending' ? 'n/a' : wrongLive.length} of ${liveN} shown=live turns joined to a pair (ungraded ${liveUngraded})${wrongLive.length ? ` [${wrongLive.join(', ')}]` : ''}`);
    P(`BAR 3 Latency: ${bar3} shadow_first_token q_src=all n=${sp.n} p50=${sp.p50 ?? '-'} (<= ${THRESH.p50}) p90=${sp.p90 ?? '-'} (<= ${THRESH.p90})`);
    P(`BAR 4a Cue gate: ${bar4a} dispatches ${cf.dispatches}, rule lines sent ${cf.sent} skipped ${cf.skipped}, mismatches ${cf.mismatch} (needs 0); missing rule ${cf.missingRule}, orphan ${cf.orphanRules}, duplicate ${cf.dupRules}; rule 'words=' vs recomputed ${cf.wordsDisagree} disagree (info)`);
    P(`BAR 4b Cue blocks: ${bar4b} check-smoke-cues v5 ${cc.verdict} (exit ${cc.status}); non-empty block on a skipped answer ${cf.nonEmptyOnSkipped}; empty block on a sent answer ${cf.emptyOnSent}; sent answer with no cues line ${cf.noCuesLineSent}; malformed ${cf.malformedSent}; over 3x5 ${Math.max(cf.over, cc.over)}; well-formed ${cf.wellFormedSent}/${cf.sent} = ${covPct.toFixed(1)}% (needs >= ${THRESH.cueWellFormedPct})`);
    P(`BAR 4c Cue markers leaked: ${bar4c} ${d.leaks.n} in ${d.leaks.scanned} shown texts (in-app answers + Live texts)${d.leaks.where.length ? ` [${d.leaks.where.join(', ')}]` : ''}`);
    P(`BAR 5 Reliability: ${bar5} items answered ${answeredItems}/${THRESH.roster}; doubles by item ${doublesItem} (S-H dispatches minus ${THRESH.roster + THRESH.probes}: see below; needs <= ${THRESH.doublesMax}); nothing shown ${nothingShown}; failed answers ${cc.failedAnswers}; silent-listener failovers ${log.silentListener} (longest uncaptioned run ${d.ear.maxConsec}); router down ${r.voidChecks.downMinutes} min (VOID over ${THRESH.downLimitMin})${bar5parts.length ? ` -- ${bar5parts.join(' | ')}` : ''}`);
    P(`ROW S-H ${sh.ok ? 'PASS' : 'FAIL'} ${sh.reading}`);
    P(`BAR 6 Observability: ${bar6} automated ${d.smoke.obs.ok ? 'PASS' : 'FAIL'} (${d.smoke.obs.reading}); human half Q1=${q.q1 ?? 'not recorded'}`);
    P(`HUMAN Q1=${q.q1 ?? 'not recorded'} Q2=${q.q2 ?? 'not recorded'} Q3=${q.q3 ?? 'not recorded'}`);
    P(`INTEGRITY ${integrityProblems.length ? `${integrityProblems.length} problem(s): ${integrityProblems.join('; ')}` : '0 problems (the reader counts are all 0 / MATCH)'}`);
    for (const p of d.grading.problems ?? []) P(`GRADING PROBLEM ${p}`);
    P(`GRADING gating graders: ${gradeState}${gradingLate ? ' (DEADLINE MISSED)' : ''}; deadline ${new Date(d.deadlineMs).toISOString()}; now ${new Date(d.now).toISOString()}`);
    P(`INFO in-app pairs ${pairs.length}: out-of-hour ${info.outOfHourPairs}; join defects ${info.joinDefects}; judge item vs play-window item disagree ${info.mappingDisagree}; double-extra answers ungraded (bar 5 only) ${info.doubleExtraUngraded}; superseded turns in the hour: streaming ${supPhase.streaming}, done ${supPhase.done}, replacing texts without a grade ${info.supNoGrade}; appends ${r.appends}`);
    P(`INFO in-hour dispatches ${hourDisp.length} (unmappable item ${unmapped}); expected ${THRESH.roster} + ${THRESH.probes} probes; unclaimed turns ${[...unreadable].filter((x) => x.startsWith('turn:')).length}`);
    // reported only (section 7 and bar 7)
    const rt = r.routing;
    P(`REPORTED bar 7 routing (never gates): EASY caught ${rt.easyCaught ?? '?'}/${rt.easyN ?? '?'}; HARD shown Live (misrouted) ${rt.hardMis ?? '?'}/${rt.hardN ?? '?'}; HARD late ${rt.late ?? '?'}; no-router-turn ${rt.noRouterTurn ?? '?'}; Live first-ms p50 ${rt.liveFirstP50 ?? '?'}`);
    const pipeTtft = [...log.decisions.values()].filter((x) => x.inHour && x.shown === 'pipeline' && x.shadow !== null).map((x) => x.shadow);
    const allTtft = [...log.decisions.values()].filter((x) => x.inHour && x.shadow !== null).map((x) => x.shadow);
    P(`REPORTED bar 3 split: pipeline-shown-only first token n=${pipeTtft.length} p50=${median(pipeTtft) ?? '-'} p90=${pctl(pipeTtft, 0.9) ?? '-'}; recomputed all in-hour n=${allTtft.length} p50=${median(allTtft) ?? '-'} p90=${pctl(allTtft, 0.9) ?? '-'} (the gate uses the reader's)`);
    P(`REPORTED cue split: sent ${cf.sent}, skipped ${cf.skipped}; heard no-cue ids ${cf.heardNoCue.length} [${cf.heardNoCue.join(',')}]; roster no-cue -> heard cue ${cf.flipToCue.length} [${cf.flipToCue.join(',')}]; roster cue -> heard no-cue ${cf.flipToNoCue.length} [${cf.flipToNoCue.join(',')}]`);
    if (accKnown) {
        const main = itemRows.filter((x) => x.level === 'main'), fu = itemRows.filter((x) => x.level === 'followup');
        const live = itemRows.filter((x) => x.shown === 'live'), pipe = itemRows.filter((x) => x.shown === 'pipeline');
        P(`REPORTED acceptable by level: mains ${main.filter((x) => x.acc).length}/${main.length}, follow-ups ${fu.filter((x) => x.acc).length}/${fu.length}; by shown: live ${live.filter((x) => x.acc).length}/${live.length}, pipeline ${pipe.filter((x) => x.acc).length}/${pipe.length}`);
    } else P('REPORTED acceptable by level and by shown: not graded');
    for (const p of d.reportedProblems ?? []) P(`REPORTED PROBLEM ${p} (a reported-only arm: printed, gates nothing)`);
    const rp = d.reported;
    for (const [name, label] of [['high', 'high'], ['low', 'low'], ['capturedHigh', 'captured-high']]) P(rp?.[name] ? `REPORTED ${label} (one grader): acceptable ${rp[name].acceptable} wrong ${rp[name].wrong} of ${rp[name].n} graded` : `REPORTED ${label}: not graded`);
    if (d.graderModels?.length) { const ms = [...new Set(d.graderModels.flatMap((g) => g.models))]; P(`GRADER MODEL ${ms.length ? ms.join(' + ') : 'none read'} (pin ${PIN}; read from the transcript of the last launch of each of ${d.graderModels.length} graded file slots; a slot on any other model is refused)`); }
    for (const n of notes) P(`NOTE ${n}`);
    if (gradeState === 'pending' || gradeState === 'bad') P(`GRADE BARS ${gradeBars.join(' and ')}: ${gradeState === 'pending' ? 'PENDING (no gating grades yet: neither PASS nor FAIL can be read from them)' : 'UNREADABLE (a gating slot is unusable)'}`);
    const why = verdict === 'VOID' ? voidWhy : verdict === 'FAIL' ? failWhy : verdict === 'INCONCLUSIVE' ? inconcWhy : verdict === 'PENDING' || verdict === 'NOT FINAL' ? [...(humanRecorded ? [] : ['the user answers (--q1 --q2 --q3) are not recorded']), ...(gradeState === 'pending' ? ['gating grades not yet present'] : []), ...failWhy] : [];
    P(`VERDICT ${verdict}${why.length ? ` (${why.join('; ')})` : ''}`);
    if (standing) P(`STANDING without the grades: ${standing}${inconcWhy.length ? `; non-grade shortfalls so far: ${inconcWhy.join('; ')}` : ''}`);
    if (verdict === 'VOID') P('NOTE section 1: VOID: the run did not test the build under its conditions; retry under the same label (section 7/8), the re-fly is not spent');
    if (verdict === 'FAIL') P('NOTE section 1/8: FAIL: below r1 beyond grader noise or a safety/core claim broke; the user decides; the same-day bare arms are set beside the in-app numbers');
    if (verdict === 'PASS') P('NOTE section 1: PASS: the reduced bundle stays in MAIN as it is (9d5bd9e); the router flag default is not decided here');
    if (verdict === 'INCONCLUSIVE') P('NOTE section 1/8: INCONCLUSIVE: one re-fly (label b1-final-r2); a second INCONCLUSIVE has no automatic outcome, the user rules');
    return { verdict, why, bars, lines: L, voidWhy, failWhy, inconcWhy, info: { ...info, accN, wrongShown, wrongLive, unreadable: [...unreadable], answeredItems, doublesItem, bar5parts } };
}

// ---------------------------------------------------------------- provenance and loading (score-rd's refusals, kept)
const modelIsPin = (m) => typeof m === 'string' && m.split('+').every((x) => x === PIN);   // exactly the pin: no alias, no other model, no suffix
const GATED_TOOLS = ['Read', 'Write', 'Edit'];
/** null when the LAST launch record of `slot` is a clean, pinned, memory-ABSENT, exit-0 attempt in its own slug folder; else why not. */
export function provenanceProblem(records, slot, opts = {}) {
    const rec = records.filter((x) => x.slot === slot).at(-1);
    if (!rec) return 'no launch record';
    if (rec.exit !== 0) return `the last launch exited ${rec.exit}`;
    if (rec.slugJsonl !== 1) return `slugJsonl ${rec.slugJsonl} (the cwd's projects folder is not its own single transcript)`;
    if (rec.memoryDir === 'non-empty') return 'the projects folder holds a non-empty memory';
    if (rec.memory !== 'ABSENT') return `memory ${rec.memory} (not ABSENT)`;
    if (!modelIsPin(rec.model)) return `the CLI model ${rec.model} is not exactly ${PIN}`;
    if (!Array.isArray(rec.models) || !rec.models.length || !rec.models.every(modelIsPin)) return `the transcript models ${JSON.stringify(rec.models)} are not exactly ${PIN}`;
    if (rec.pinned !== true) return `the model is not the pin ${PIN}`;
    if (!rec.tools || typeof rec.tools !== 'object' || !Object.keys(rec.tools).every((t) => GATED_TOOLS.includes(t))) return `tools ${JSON.stringify(rec.tools)} are not within Read/Write/Edit`;
    if (opts.launcherSha !== undefined && rec.launcher !== opts.launcherSha) return `launched by another launcher version (${rec.launcher ?? 'none'}, the registered file is ${opts.launcherSha})`;
    if (opts.pairsFile && fs.existsSync(opts.pairsFile) && sha12(fs.readFileSync(opts.pairsFile)) !== rec.pairsSha12) return 'the pairs file differs from the one this launch graded (pairsSha12)';
    if (opts.verdictsFile && fs.existsSync(opts.verdictsFile) && sha12(fs.readFileSync(opts.verdictsFile)) !== rec.verdictsSha12) return 'the verdicts file differs from the one this launch wrote (verdictsSha12)';
    return null;
}

const refusal = (m) => { const e = new Error(m); e.refuse = true; return e; };
const readJson = (p, what) => { if (!fs.existsSync(p)) throw refusal(`${what} is missing: ${p}`); try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { throw refusal(`${what} is not JSON: ${p}`); } };
const checkTool = (name, file) => {
    const t = TOOLS[name];
    if (!fs.existsSync(file)) throw refusal(`the ${name} tool is missing: ${file}`);
    if (file === t.file && !sha256(fs.readFileSync(file)).startsWith(t.prefix)) throw refusal(`the ${name} tool differs from the registered file (sha256 prefix ${t.prefix}): ${file}`);
};

/** Gating-grade state for the in-app file: 'complete' | 'pending' (no record and no verdict file for a slot) | 'bad' (a present slot is unusable), plus the deadline test. */
export function loadGrading({ run, gradeDir, launcherSha, endedAtMs, now, deadlineMs }) {
    const launchesFile = path.join(gradeDir, 'launches.jsonl');
    const records = fs.existsSync(launchesFile) ? fs.readFileSync(launchesFile, 'utf8').split('\n').filter((l) => l.trim()).map((l) => { try { return JSON.parse(l); } catch { return {}; } }) : [];
    const problems = [], reportedProblems = [], graderModels = [];
    const vfile = (slot) => path.join(gradeDir, 'verdicts', `verdicts.${slot}.json`);
    const loadVerdicts = (slot, pairsKeys, sink, pairsFile) => {
        const p = provenanceProblem(records, slot, { launcherSha, pairsFile, verdictsFile: vfile(slot) });
        if (p) { sink.push(`${slot}: ${p}`); return null; }
        if (!fs.existsSync(vfile(slot))) { sink.push(`${slot}: verdict file missing`); return null; }
        let v; try { v = JSON.parse(fs.readFileSync(vfile(slot), 'utf8')); } catch { sink.push(`${slot}: verdict file is not JSON`); return null; }
        const vp = verdictProblem(v, pairsKeys);
        if (vp) { sink.push(`${slot}: verdict file invalid (${vp.slice(0, 80)})`); return null; }
        graderModels.push({ slot, models: [...new Set(records.filter((x) => x.slot === slot).at(-1).models)] });
        return v;
    };
    const pairsFile = path.join(run, 'interview60.judge.pairs.json');
    const inPairs = readJson(pairsFile, 'the in-app export');
    const keys = Object.fromEntries(inPairs.items.map((i) => [i.key, 1]));
    const present = (slot) => records.some((x) => x.slot === slot) || fs.existsSync(vfile(slot));
    const slots = ['inapp.g1', 'inapp.g2'];
    const sess = (slot) => records.filter((x) => x.slot === slot).at(-1)?.session_id;
    const out = { g1: null, g2: null };
    let sameSession = false;
    if (sess('inapp.g1') !== undefined && sess('inapp.g1') === sess('inapp.g2')) { sameSession = true; problems.push('inapp.g2: the same session graded both graders of this file'); }
    for (const [g, slot] of [['g1', slots[0]], ['g2', slots[1]]]) if (present(slot) && !(sameSession && g === 'g2')) out[g] = loadVerdicts(slot, keys, problems, pairsFile);
    const pendingSlots = slots.filter((s) => !present(s));
    const gradesMap = {};
    for (const p of inPairs.items) gradesMap[p.key] = { g1: out.g1?.[p.key], g2: out.g2?.[p.key] };
    const complete = !!out.g1 && !!out.g2 && !sameSession;
    let late = false;
    if (complete) { const ends = slots.map((s) => Date.parse(records.filter((x) => x.slot === s).at(-1).endedAt)); if (ends.some((t) => !Number.isFinite(t) || t > deadlineMs)) late = true; }
    else if (now > deadlineMs) late = true;
    const state = complete ? 'complete' : problems.length === 0 && pendingSlots.length > 0 ? 'pending' : 'bad';
    // reported-only arms (one grader each; same thresholds on that one grader)
    const arm = (slot, pairsName) => {
        const pf = path.join(run, pairsName);
        if (!present(slot) || !fs.existsSync(pf)) return null;
        const items = JSON.parse(fs.readFileSync(pf, 'utf8')).items, v = loadVerdicts(slot, Object.fromEntries(items.map((i) => [i.key, 1])), reportedProblems, pf);
        return v ? { n: items.length, acceptable: items.filter((i) => accept1(v[i.key])).length, wrong: items.filter((i) => wrong1(v[i.key])).length } : null;
    };
    const reported = { high: arm('high', 'interview60.judge.pairs.gemini-3.5-flash-lite_high.json'), low: arm('low', 'interview60.judge.pairs.gemini-3.1-flash-lite_low.json'), capturedHigh: arm('captured-high', 'interview60.judge.pairs.gemini-3.5-flash-lite_captured-high.json') };
    return { grading: { state, complete, problems, grades: gradesMap, late }, pairs: inPairs.items, reported, reportedProblems, graderModels };
}

export async function loadReal({ runDir, gradeDir, root, human, now = Date.now(), readerScript = TOOLS.reader.file, launcherFile = path.join(HERE, 'launch-grader-b1.mjs'), runsDir }) {
    const run = path.resolve(runDir);
    const folder = path.basename(run);
    if (!runFolderPattern(REGISTERED_RUN_LABEL).test(folder)) throw refusal(`only a run folder named <stamp>-${REGISTERED_RUN_LABEL} is scored (got "${folder}"); a smoke, a retried or suffixed run or any other folder is never scored`);
    if (!fs.existsSync(run)) throw refusal(`the run folder does not exist: ${run}`);
    const runs = runsDir ?? path.dirname(run);
    // the named tools: each must exist and be the registered file
    checkTool('reader', readerScript); checkTool('cues', TOOLS.cues.file); checkTool('gate', TOOLS.gate.file); checkTool('smoke', TOOLS.smoke.file);
    const rd = spawnSync(process.execPath, [readerScript, run, '--down-limit-min', String(THRESH.downLimitMin), '--root', root], { encoding: 'utf8', timeout: 180000, maxBuffer: 64 << 20 });
    if (rd.status !== 0 && rd.status !== 3) throw refusal(`the reader exited ${rd.status} (2 = unreadable input): ${String(rd.stderr).split('\n')[0].slice(0, 160)}`);
    const reader = parseReader(rd.stdout);
    if (reader.problems.length) throw refusal(`the reader output is unusable: ${reader.problems.join('; ')}`);
    if ((rd.status === 3) !== reader.void) throw refusal(`the reader exit code ${rd.status} and its VOID lines disagree`);
    const toolSha = { reader: sha12(fs.readFileSync(readerScript)), cues: sha12(fs.readFileSync(TOOLS.cues.file)), gate: sha12(fs.readFileSync(TOOLS.gate.file)), smoke: sha12(fs.readFileSync(TOOLS.smoke.file)), readerOut: sha12(Buffer.from(rd.stdout)) };
    if (!fs.existsSync(launcherFile)) throw refusal(`the launcher file is missing: ${launcherFile}`);
    const launcherSha = sha12(fs.readFileSync(launcherFile));
    const timeline = readJson(path.join(run, 'interview60.timeline.json'), 'the timeline');
    const logFile = path.join(run, 'natively_debug.log');
    if (!fs.existsSync(logFile)) throw refusal('natively_debug.log is missing from the run folder');
    const logText = fs.readFileSync(logFile, 'utf8');
    const log = (() => { try { return parseLog(logText, timeline); } catch (e) { throw refusal(e.message); } })();
    // gate-heard.mjs's own code
    const gate = (() => { try { return loadGate(fs.readFileSync(TOOLS.gate.file, 'utf8')); } catch (e) { throw refusal(e.message); } })();
    const facts = cueFacts(log.slice, gate, timeline);
    // check-smoke-cues v5, as a child, on exactly this folder
    const cs = spawnSync(process.execPath, [TOOLS.cues.file, REGISTERED_RUN_LABEL, '--runs', runs], { encoding: 'utf8', timeout: 120000, maxBuffer: 64 << 20 });
    const check = parseCueCheck(cs.stdout, cs.status);
    if (cs.status === 2) throw refusal(`check-smoke-cues could not read the run: ${String(cs.stdout).split('\n')[0].slice(0, 120)}`);
    if (check.summaryDir !== folder) throw refusal(`check-smoke-cues read another run folder (${check.summaryDir}); the newest ${REGISTERED_RUN_LABEL} folder under ${runs} is not ${folder}`);
    // the launcher log and the observer log (siblings of the run folder in the runs directory)
    const launcherLog = path.join(runs, 'b1-flight.launcher.log'), observeLog = path.join(runs, 'b1-flight.observe.log');
    if (!fs.existsSync(launcherLog)) throw refusal(`the launcher log is missing: ${launcherLog}`);
    if (!fs.existsSync(observeLog)) throw refusal(`the observer log is missing: ${observeLog}`);
    const lt = fs.readFileSync(launcherLog, 'latin1'), li = lt.lastIndexOf('=== LAUNCHER b1-flight start'), ltext = li >= 0 ? lt.slice(li) : lt;
    const exitM = [...ltext.matchAll(/=== RUN EXIT (-?\d+) /g)].at(-1);
    const runInfo = {
        doneJson: fs.existsSync(path.join(run, 'interview60.flight.done.json')), exit: exitM ? +exitM[1] : null, hourNotSpent: /The hour was NOT spent/.test(ltext),
        distPassedCount: ltext.split('B1 PROOFS: ALL PASSED').length - 1, distChangedLines: (ltext.match(/unchanged since the run started: no/g) ?? []).length,
    };
    // read-smoke-b1.mjs's own rows (S-H, OBS). The drill rows and S-CUE/S-SL are not this registration's rows and are ignored.
    const smokeMod = await import(pathToFileURL(TOOLS.smoke.file).href);
    const an = smokeMod.analyze(logText.split(/\r?\n/), { rosterItems: timeline.items.length, observeLines: fs.readFileSync(observeLog, 'utf8').split(/\r?\n/).filter(Boolean), launcherText: null, cueSmoke: { status: check.status, verdict: check.verdict, summary: '', wellFormedPct: check.wellFormedPct, over: check.over, failedAnswers: check.failedAnswers } });
    const rowOf = (id) => an.rows.find((x) => x.id === id);
    if (!rowOf('S-H') || !rowOf('OBS')) throw refusal('read-smoke-b1.mjs returned no S-H or OBS row');
    // bar 4c: the shown texts (in-app answers, the Live texts)
    const pairsFile = path.join(run, 'interview60.judge.pairs.json');
    const inPairs = readJson(pairsFile, 'the in-app export');
    const liveArr = (() => { const x = readJson(path.join(run, 'interview60.answers.router-live.json'), 'the live capture file'); return Array.isArray(x) ? x : (x.answers ?? x.items ?? Object.values(x)); })();
    // review F3: every Live entry must carry its text as a string, else 4c would scan '' and read MET without reading anything
    if (!Array.isArray(liveArr) || liveArr.some((t) => typeof t?.text !== 'string')) throw refusal('the live capture file: every entry must have a string `text` (bar 4c cannot be read otherwise)');
    const LEAK = /__CUES__|__MORE__|\[CUES FIRST\]|__[A-Z][A-Z0-9_]*__/;
    const where = [];
    for (const p of inPairs.items) if (LEAK.test(String(p.answer ?? ''))) where.push(`in-app ${p.key}`);
    for (const t of liveArr) if (LEAK.test(String(t.text ?? ''))) where.push(`live ${t.id ?? '?'}@turn${t.turn ?? '?'}`);
    const leaks = { n: where.length, where, scanned: inPairs.items.length + liveArr.length };
    // the grades
    // a missing done marker is a VOID line (scoreB1), not a refusal: the deadline then rests on the reset term alone
    let endedAtMs = NaN;
    if (runInfo.doneJson) { try { endedAtMs = Date.parse(JSON.parse(fs.readFileSync(path.join(run, 'interview60.flight.done.json'), 'utf8')).finishedAt); } catch { /* unreadable marker: the reset term alone */ } }
    const deadlineMs = Number.isFinite(endedAtMs) ? Math.max(endedAtMs + 24 * 3600 * 1000, RESET_PLUS_6H_MS) : RESET_PLUS_6H_MS;
    const g = loadGrading({ run, gradeDir, launcherSha, endedAtMs, now, deadlineMs });
    return {
        folder, now, human, run: runInfo, reader, smoke: { sh: { ok: rowOf('S-H').ok, reading: rowOf('S-H').reading }, obs: { ok: rowOf('OBS').ok, reading: rowOf('OBS').reading } },
        cue: { check, facts }, leaks, ear: earEpisode(log.ev), log, timeline, pairs: g.pairs, grading: g.grading, reported: g.reported, reportedProblems: g.reportedProblems, graderModels: g.graderModels, deadlineMs, toolSha, launcherSha,
    };
}

// ---------------------------------------------------------------- CLI
const Q_OK = { q1: ['yes', 'no', 'not-sure', 'none'], q2: ['no', 'yes-before', 'yes-during', 'not-sure', 'none'], q3: ['no', 'yes-during', 'not-sure', 'none'] };
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const a = process.argv.slice(2), opt = (n) => { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : undefined; };
    try {
        if (!opt('--run-dir')) throw refusal('usage: node score-b1.mjs --run-dir <run folder> --q1 .. --q2 .. --q3 .. [--grade-dir <dir>] [--root <checkout>] [--out <file>]   (the scorer runs router-hour-read.mjs itself with --down-limit-min 2)');
        if (a.includes('--reader-out')) throw refusal('--reader-out is gone: the scorer runs the reader itself (a reader-output file is never trusted)');
        const CAL = process.env.SCORE_B1_CAL === '1';
        for (const seam of ['--reader-script', '--now', '--runs-dir']) if (a.includes(seam) && !CAL) throw refusal(`${seam} is a calibration seam (SCORE_B1_CAL=1 only): the real tool and the real clock are always used`);
        const human = {};
        for (const k of ['q1', 'q2', 'q3']) { const v = opt(`--${k}`); if (v !== undefined) { if (!Q_OK[k].includes(v)) throw refusal(`--${k} ${v} is not one of ${Q_OK[k].join('|')}`); human[k] = v; } }
        const gradeDir = path.resolve(opt('--grade-dir') ?? HERE);
        const d = await loadReal({ runDir: opt('--run-dir'), readerScript: opt('--reader-script') ?? TOOLS.reader.file, gradeDir, root: opt('--root') ?? MAIN_DEFAULT, human, now: opt('--now') ? Date.parse(opt('--now')) : Date.now(), runsDir: opt('--runs-dir') ? path.resolve(opt('--runs-dir')) : undefined });
        const res = scoreB1(d);
        const head = [`SCORE-B1 run ${d.folder}; scorer sha256 ${sha12(fs.readFileSync(fileURLToPath(import.meta.url)))}; launcher sha12 ${d.launcherSha}; reader sha12 ${d.toolSha.reader} (output ${d.toolSha.readerOut}), check-smoke-cues ${d.toolSha.cues}, gate-heard ${d.toolSha.gate}, read-smoke-b1 ${d.toolSha.smoke}; reader run with --down-limit-min ${THRESH.downLimitMin}`];
        const text = [...head, ...res.lines].join('\n');
        console.log(text);
        if (opt('--out')) fs.writeFileSync(path.resolve(opt('--out')), `${text}\n`, 'utf8');
    } catch (e) {
        console.log(`REFUSED: ${e.message}`);
        process.exit(2);
    }
}
