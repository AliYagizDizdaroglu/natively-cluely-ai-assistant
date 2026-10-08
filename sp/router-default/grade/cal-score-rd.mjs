// cal-score-rd.mjs: known-answer calibration of score-rd.mjs (the router-default-r1 scorer, registration 5, 6, 7.3, 7.4, 7.7).
// NO MODEL IS CALLED and no real data is read: every input is synthetic (invented ids, invented answer strings, a synthetic roster, key, grades, log and reader output).
//   node cal-score-rd.mjs [--scorer <path>] [--quiet]        the suite (default scorer: score-rd.mjs beside this file)
//   node cal-score-rd.mjs --mutants                           the suite against every mutant of the scorer: each must FAIL at least one check
// Exit 0 when every check passes (suite) / every mutant is caught (--mutants).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const argOf = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const SCORER = path.resolve(argOf('--scorer') ?? path.join(HERE, 'score-rd.mjs'));
const QUIET = argv.includes('--quiet');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const PIN_ID = 'claude-opus-5-5';
const LSHA = sha(fs.readFileSync(path.join(HERE, 'launch-grader-rd.mjs'))).slice(0, 12);
const sh12 = (f) => sha(fs.readFileSync(f)).slice(0, 12);
/** a launch record as the launcher writes it, bound to the pairs and verdicts files it graded (I-1, I-4, m-3) */
const mkRec = (slot, pairsFile, vFile, over = {}) => ({ slot, attempt: 1, session_id: `sess-${slot}`, model: PIN_ID, exit: 0, slugJsonl: 1, memoryDir: 'absent', memory: 'ABSENT', pinned: true, launcher: LSHA, models: [PIN_ID], tools: { Read: 3, Write: 1 }, pairsSha12: sh12(pairsFile), verdictsSha12: sh12(vFile), ...over });

// ---------------------------------------------------------------- mutants (source replacements; each `from` must occur exactly once in the scorer)
export const MUTANTS = [
    // Safety
    { id: 'M-safety-text-ignored', from: 'const textOk = r.safetyText.liveHard + r.safetyText.liveMarker + r.safetyText.pipeUnknown + r.safetyText.pipeBare === 0;', to: 'const textOk = true;' },
    { id: 'M-safety-wrong-needs-both', from: 'export const isWrong = (g) => !!g && (g.g1?.correctness === 0 || g.g2?.correctness === 0);', to: 'export const isWrong = (g) => !!g && (g.g1?.correctness === 0 && g.g2?.correctness === 0);' },
    { id: 'M-safety-skips-sEmpty-live', from: "if (!m.arms.includes('L')) continue; // SAFETY-SCOPE", to: "if (!m.arms.includes('L') || m.sEmpty) continue;" },
    { id: 'M-safety-skips-superseded-live', from: "if (!m.arms.includes('L')) continue; // SAFETY-SCOPE", to: "if (!m.arms.includes('L') || m.superseded) continue;" },
    { id: 'M-safety-ontopic-counts-wrong', from: 'export const isWrong = (g) => !!g && (g.g1?.correctness === 0 || g.g2?.correctness === 0);', to: 'export const isWrong = (g) => !!g && (g.g1?.correctness === 0 || g.g2?.correctness === 0 || g.g1?.on_topic === 0 || g.g2?.on_topic === 0);' },
    { id: 'M-safety-counts-shadow-wrong', from: "if (!m.arms.includes('L')) continue; // SAFETY-SCOPE", to: "if (!m.arms.includes('L') && !m.arms.includes('S')) continue;" },
    // Fallback / Speed / Routing / Integrity
    { id: 'M-fallback-flag-only', from: 'const fbOk = r.fallback.counts.every((n) => n === 0);', to: 'const fbOk = true;' },
    { id: 'M-speed-limit-2600', from: 'speedMs: 2500', to: 'speedMs: 2600' },
    { id: 'M-speed-n0-passes', from: 'const spOk = r.speed.p50 !== null && r.speed.n > 0 && r.speed.p50 <= THRESH.speedMs;', to: 'const spOk = r.speed.p50 === null || r.speed.p50 <= THRESH.speedMs;' },
    { id: 'M-speed-strict-less', from: 'const spOk = r.speed.p50 !== null && r.speed.n > 0 && r.speed.p50 <= THRESH.speedMs;', to: 'const spOk = r.speed.p50 !== null && r.speed.n > 0 && r.speed.p50 < THRESH.speedMs;' },
    { id: 'M-routing-easy-12', from: 'easyMin: 13', to: 'easyMin: 12' },
    { id: 'M-routing-hard-2', from: 'hardMax: 1', to: 'hardMax: 2' },
    { id: 'M-integrity-dup-decision-ignored', from: 'r.integrity.dupDecision', to: '0' },
    { id: 'M-integrity-capture-mismatch-ignored', from: "...(r.integrity.capMismatch ? ['capture MISMATCH'] : []),", to: '' },
    { id: 'M-integrity-file-mismatch-ignored', from: "...(r.integrity.fileMismatch ? ['capture-file MISMATCH'] : []),", to: '' },
    // Quality
    { id: 'M-quality-slack-2', from: 'qualitySlack: 1', to: 'qualitySlack: 2' },
    { id: 'M-quality-slack-0', from: 'qualitySlack: 1', to: 'qualitySlack: 0' },
    { id: 'M-quality-counts-sEmpty-L', from: 'excl.sEmpty += mL.sEmpty ? 1 : 0;', to: 'excl.sEmpty += mL.sEmpty ? 1 : 0; if (mL.sEmpty && accept(gradeOf(e.tag, e.q))) qual.accL++;' },
    { id: 'M-quality-counts-superseded-L', from: 'excl.superseded += mL.superseded ? 1 : 0;', to: 'excl.superseded += mL.superseded ? 1 : 0; if (mL.superseded && accept(gradeOf(e.tag, e.q))) qual.accL++;' },
    { id: 'M-quality-counts-noPipeline-L', from: 'if (!s) { excl.noPipeline++; continue; }', to: 'if (!s) { excl.noPipeline++; if (accept(gradeOf(e.tag, e.q))) qual.accL++; continue; }' },
    { id: 'M-quality-pair-by-id', from: 'const s = sByTurn.get(turn); // PAIR-BY-TURN', to: 'const s = [...sByTurn.values()].find((x) => x.m.id === e.m.id);' },
    { id: 'M-quality-ignores-SA-arm', from: "if (m.arms.includes('S')) sByTurn.set(m.turn, { q, tag, m });", to: "if (m.arms.length === 1 && m.arms[0] === 'S') sByTurn.set(m.turn, { q, tag, m });" },
    { id: 'M-quality-accept-either-grader', from: 'export const accept = (g) => !!g && g.g1.correctness === 2 && g.g1.on_topic === 2 && g.g2.correctness === 2 && g.g2.on_topic === 2;', to: 'export const accept = (g) => !!g && ((g.g1.correctness === 2 && g.g1.on_topic === 2) || (g.g2.correctness === 2 && g.g2.on_topic === 2));' },
    { id: 'M-quality-accept-ignores-ontopic', from: 'export const accept = (g) => !!g && g.g1.correctness === 2 && g.g1.on_topic === 2 && g.g2.correctness === 2 && g.g2.on_topic === 2;', to: 'export const accept = (g) => !!g && g.g1.correctness === 2 && g.g2.correctness === 2;' },
    { id: 'M-quality-zero-pairs-pass', from: 'qual.n > 0 && ', to: '' },
    // No regression
    { id: 'M-noreg-counts-live-turns', from: "if (dec.shown !== 'pipeline') { inappLiveIgnored++; continue; }", to: 'if (false) continue;' },
    { id: 'M-noreg-skips-appended', from: "if (!m.arms.includes('A')) continue; // NOREG-A", to: 'continue;' },
    { id: 'M-noreg-skips-superseded', from: 'for (const sp of log.superseded) { // NOREG-SUP', to: 'for (const sp of []) {' },
    { id: 'M-noreg-gates-every-route', from: "const hard = (id) => roster.get(id)?.route === 'HARD';", to: 'const hard = (id) => true;' },
    { id: 'M-noreg-hard-inverted', from: "const hard = (id) => roster.get(id)?.route === 'HARD';", to: "const hard = (id) => roster.get(id)?.route === 'EASY';" },
    { id: 'M-noreg-superseded-unreadable-ignored', from: 'noreg.unreadable++; // SUP-UNREADABLE', to: 'void 0;' },
    { id: 'M-noreg-join-defect-ignored', from: 'if (j.defect) { if (hard(pr.id)) noreg.unreadable++; continue; }', to: 'if (j.defect) continue;' },
    { id: 'M-noreg-ungraded-hard-ignored', from: "if (st === 'none') { noreg.unreadable++; continue; }\n            noreg.checked++; src.inapp++;", to: "if (st === 'none') { continue; }\n            noreg.checked++; src.inapp++;" },
    // Verdict mapping
    { id: 'M-verdict-void-skipped', from: 'if (r.void) return voidResult(r, L);', to: '' },
    { id: 'M-verdict-integrity-beats-safety', from: "if (safety.state === 'FAIL') verdict = 'SAFETY FAIL';", to: "if (safety.state === 'FAIL' && integrity.problems.length === 0) verdict = 'SAFETY FAIL'; else if (integrity.problems.length) verdict = 'INCONCLUSIVE';" },
    { id: 'M-verdict-pass-ignores-integrity', from: "else if (bars.every((b) => b.state === 'PASS') && integrity.problems.length === 0 && gradingProblems.length === 0) verdict = 'PASS';", to: "else if (bars.every((b) => b.state === 'PASS') && gradingProblems.length === 0) verdict = 'PASS';" },
    { id: 'M-verdict-pass-ignores-grading-problems', from: "else if (bars.every((b) => b.state === 'PASS') && integrity.problems.length === 0 && gradingProblems.length === 0) verdict = 'PASS';", to: "else if (bars.every((b) => b.state === 'PASS') && integrity.problems.length === 0) verdict = 'PASS';" },
    { id: 'M-verdict-unreadable-passes', from: 'const bars = [safety, fallback, quality, speed, routing, noreg];', to: "const bars = [safety, fallback, quality, speed, routing, noreg].map((b) => (b.state === 'UNREADABLE' ? { ...b, state: 'PASS' } : b));" },
    // join
    { id: 'M-noreg-unclaimed-hard-uncapped', from: 'info.unclaimedHard++; noreg.unreadable++; // UNCLAIMED-HARD', to: 'info.unclaimedHard++;' },
    { id: "M-pin-cli-model-unchecked", from: "if (!modelIsPin(rec.model)) return `the CLI model ${rec.model} is not exactly ${PIN}`; // PIN-MODEL", to: "" },
    { id: "M-pin-transcript-models-unchecked", from: "if (!Array.isArray(rec.models) || !rec.models.length || !rec.models.every(modelIsPin)) return `the transcript models ${JSON.stringify(rec.models)} are not exactly ${PIN}`; // PIN-TRANSCRIPT", to: "" },
    { id: "M-pin-prefix-accepted", from: "every((x) => x === PIN)", to: "every((x) => x.startsWith(PIN))" },
    { id: "M-tools-unchecked", from: "if (!rec.tools || typeof rec.tools !== 'object' || !Object.keys(rec.tools).every((t) => GATED_TOOLS.includes(t)))", to: "if (false)" },
    { id: "M-launcher-version-unchecked", from: "if (opts.launcherSha !== undefined && rec.launcher !== opts.launcherSha)", to: "if (false)" },
    { id: "M-pairs-hash-unchecked", from: "if (opts.pairsFile && fs.existsSync(opts.pairsFile) && sha12(fs.readFileSync(opts.pairsFile)) !== rec.pairsSha12)", to: "if (false)" },
    { id: "M-verdicts-hash-unchecked", from: "if (opts.verdictsFile && fs.existsSync(opts.verdictsFile) && sha12(fs.readFileSync(opts.verdictsFile)) !== rec.verdictsSha12)", to: "if (false)" },
    { id: "M-denominators-unchecked", from: "if (r.routing.easyN !== THRESH.easyN || r.routing.hardN !== THRESH.hardN)", to: "if (false)" },
    { id: "M-down-limit-unchecked", from: "if (vin && Number(vin[2]) !== THRESH.downLimitMin)", to: "if (false)" },
    { id: "M-down-recompute-unchecked", from: "if (vin && down) { const d = Number(vin[1])", to: "if (false) { const d = Number(vin[1])" },
    { id: "M-floor-unchecked", from: "if (failed && Number(failed[1]) !== THRESH.voidFloor)", to: "if (false)" },
    { id: "M-noreg-window-item-ignored", from: "if (hard(pr.id) || winHard) {", to: "if (hard(pr.id)) {" },
    { id: "M-noreg-window-null-easy", from: "const winHard = dec.item === null || hard(dec.item);", to: "const winHard = dec.item !== null && hard(dec.item);" },
    { id: "M-sup-hour-unfiltered", from: "if (sd && !sd.inHour) continue; // SUP-INHOUR", to: "" },
    { id: "M-sup-crossturn-ignored", from: "const crossTurn = !!pair && (jn?.turn === undefined || (jn.turn !== sp.turn && !supTurns.has(jn.turn)));", to: "const crossTurn = false;" },
    { id: "M-reader-seam-open", from: "process.env.SCORE_RD_CAL !== '1'", to: "false" },
    { id: "M-reader-out-accepted", from: "if (a.includes('--reader-out'))", to: "if (false)" },
    { id: "M-reader-exit-mismatch-ignored", from: "if ((sp.status === 3) !== reader.void) throw", to: "if (false) throw" },
    { id: "M-reader-limit-arg-5", from: "'--down-limit-min', String(THRESH.downLimitMin), '--root', root]", to: "'--down-limit-min', '5', '--root', root]" },
    { id: "M-grader-model-line-dropped", from: "if (data.graderModels) {", to: "if (false) {" },
    { id: 'M-join-unbounded', from: 'const next = mains[k + 1] ?? Infinity; // JOIN-BOUND', to: 'const next = Infinity;' },
];

// ---------------------------------------------------------------- mutants driver
if (argv.includes('--mutants')) {
    const src = fs.readFileSync(SCORER, 'utf8');
    let caught = 0; const lines = [];
    for (const m of MUTANTS) {
        const n = src.split(m.from).length - 1;
        if (n !== 1) { lines.push(`ERROR ${m.id}: anchor occurs ${n} times (must be 1)`); continue; }
        const f = path.join(HERE, `score-rd.mut-${m.id}.mjs`);
        fs.writeFileSync(f, src.replace(m.from, () => m.to));
        const r = spawnSync(process.execPath, [path.join(HERE, 'cal-score-rd.mjs'), '--scorer', f, '--quiet'], { encoding: 'utf8', timeout: 300000 });
        fs.rmSync(f, { force: true });
        const failed = (r.stdout.match(/^FAIL /gm) ?? []).length;
        const ok = r.status !== 0 && failed > 0;
        if (ok) caught++;
        lines.push(`${ok ? 'CAUGHT  ' : 'SURVIVED'} ${m.id}  (${failed} check(s) failed)`);
    }
    console.log(lines.join('\n'));
    console.log(`MUTANTS ${caught}/${MUTANTS.length} caught`);
    process.exit(caught === MUTANTS.length ? 0 : 1);
}

// ---------------------------------------------------------------- the suite
const S = await import(pathToFileURL(SCORER).href);
const results = [];
const ck = (name, cond, extra = '') => { results.push({ name, ok: !!cond }); if (!QUIET || !cond) console.log(`${cond ? 'OK  ' : 'FAIL'} ${name}${extra ? `  [${extra}]` : ''}`); };
const guard = (f) => { try { return { v: f() }; } catch (e) { return { err: String(e?.message ?? e) }; } };

const G = (c = 2, o = 2, d = 2) => ({ g1: { correctness: c, on_topic: o, delivery: d, reason: 'x' }, g2: { correctness: c, on_topic: o, delivery: d, reason: 'x' } });
const ACC = G(2, 2, 2), WEAK = G(1, 2, 2), WRONG = G(0, 2, 2);
const G12 = (a, b) => ({ g1: a?.g1, g2: b?.g2 });                 // g1 from one grade, g2 from another
const T0 = Date.parse('2026-10-07T20:00:00.000Z'), ISO = (ms) => new Date(ms).toISOString();
const HOUR = { startedMs: T0 + 60000, endedMs: T0 + 3600000 };
const ROSTER_ROWS = [['E1', 'EASY'], ['E2', 'EASY'], ['E3', 'EASY'], ['E4', 'EASY'], ['E5', 'EASY'], ['H1', 'HARD'], ['H2', 'HARD'], ['H3', 'HARD'], ['H4', 'HARD'], ['H5', 'HARD']];
const ROSTER = new Map(ROSTER_ROWS.map(([id, route]) => [id, { id, route }]));

// ---- the reader's output, as router-hour-read.mjs prints it (formats copied from its source)
function readerText(o = {}) {
    const d = { liveHard: 0, liveMarker: 0, pipeUnknown: 0, pipeBare: 0, missingApp: 0, unflagged: 0, row4: 0, sent0: 0, noToken: 0, p50: 1800, speedN: 20, easy: 17, easyN: 20, hardMis: 0, hardN: 27,
        noDecision: 0, noDispatch: 0, dupDec: 0, dupDisp: 0, unparsed: 0, noQ: 0, capOk: true, fileOk: true, supDefects: 0, downMin: o.void === 'down' ? 3.5 : 0.1, downLimit: 2, floor: 10, failedBefore: [], ...o };
    const PF = (b) => (b ? 'PASS' : 'FAIL');
    const textOk = d.liveHard + d.liveMarker + d.pipeUnknown + d.pipeBare === 0, fbOk = d.missingApp + d.unflagged + d.row4 + d.sent0 + d.noToken === 0;
    const spOk = d.p50 !== null && d.p50 <= 2500, roOk = d.easy >= 13 && d.hardMis <= 1;
    const L = [];
    L.push('RUN items=47 offset_ms=1150 clock=- decisions_in_hour=47 decisions_outside_hour=0 dispatch_lines=47');
    L.push('--- 5. INTEGRITY');
    L.push(`INTEGRITY dispatched turns with no decision line: ${d.noDecision} (must be 0)`);
    L.push(`INTEGRITY dispatched turns with nothing shown (sent=0): ${d.sent0} (must be 0) sent_field_missing=0`);
    L.push(`INTEGRITY dispatched turns with nothing shown (shown=pipeline with no pipeline token, shadow=-): ${d.noToken} (must be 0; sent counts label events too)`);
    L.push(`INTEGRITY decision lines without a dispatch line=${d.noDispatch} duplicate decision lines=${d.dupDec} duplicate dispatch lines=${d.dupDisp}`);
    L.push(`INTEGRITY unparsed_decision_lines=${d.unparsed} decisions_without_q_at=${d.noQ}`);
    L.push('CAPTURES live=20 (expected 20) shadow=18 (expected 18) appended=2 (expected 2) lost_live_captures=0');
    L.push(`SUPERSEDE superseded_turns=1 (streaming=0 done=1 line_written=yes 1 line_written=no 0) superseded_extra_lines=0 superseded_record_defects=${d.supDefects} superseded_orphan=0 (from the [Router] superseded diag line)`);
    L.push(`CAPTURES check: ${d.capOk ? 'MATCH' : 'MISMATCH'} missing=0 unexpected=0 orphan=0 duplicate=0 unparseable=0 outside_hour=0`);
    L.push(`CAPTURE FILES: ${d.fileOk ? 'MATCH' : 'MISMATCH'} live_file=20 (log 20) shadow_file=20 (log 20) appended_in_file=2 (log 2) id_disagreements=0`);
    L.push('--- 6. BARS');
    L.push(`SAFETY live: hard-first=${d.liveHard} router-marker=${d.liveMarker}`);
    L.push(`SAFETY pipeline: unknown-marker=${d.pipeUnknown} bare-routing-token=${d.pipeBare}`);
    L.push(`BAR Safety (text half): ${o.flagSafety ?? PF(textOk)} live_hard_first=${d.liveHard} live_router_marker=${d.liveMarker} pipeline_unknown_marker=${d.pipeUnknown} pipeline_bare_routing_token=${d.pipeBare}`);
    L.push('BAR Safety (wrong-answer half): NEEDS GRADES');
    L.push(`BAR Fallback: ${o.flagFallback ?? PF(fbOk)} missing_appended=${d.missingApp} unflagged_live_failures=${d.unflagged} row4_with_live_capture=${d.row4} dispatched_nothing_shown=${d.sent0} pipeline_no_token=${d.noToken}`);
    L.push(`BAR Speed: ${o.flagSpeed ?? PF(spOk)} p50=${d.p50 === null ? '-' : d.p50} limit=2500 n=${d.speedN}`);
    L.push(`ROUTING easy_caught_first_decision=${d.easy}/${d.easyN} easy_caught_any_decision(info only)=${d.easy}/${d.easyN}hard_misrouted_any_decision=${d.hardMis}/${d.hardN} hard_misrouted_first_decision=${d.hardMis}/${d.hardN} items_with_more_than_one_decision=0 easy_without_decision=0`);
    L.push(`BAR Routing: ${o.flagRouting ?? PF(roOk)} EASY caught ${d.easy}/${d.easyN} (>= 13); HARD misrouted ${d.hardMis}/${d.hardN} (<= 1)`);
    L.push('BAR Quality: NEEDS GRADES');
    L.push('BAR No-regression: NEEDS GRADES');
    L.push('--- 7. VERDICT');
    L.push(`VOID_INPUT router_down_minutes=${d.downMin.toFixed(2)} limit=${d.downLimit} start_state=known`);
    if (o.void) {
        L.push(`VOID CHECK session-failed-before-dispatch-${d.floor}: ${o.void === 'failed' ? 'VOID' : 'clear'} (lines=${o.void === 'failed' ? 1 : 0}, below floor=${o.void === 'failed' ? 1 : 0})`);
        L.push(`VOID CHECK router-down-minutes: ${o.void === 'down' ? 'VOID' : 'clear'} (${d.downMin.toFixed(2)} vs limit ${d.downLimit})`);
        L.push(`VERDICT VOID (the re-fly is not spent): ${o.void === 'down' ? 'router down time over the limit' : 'router session failed before the 10th dispatch'}`);
    } else {
        L.push(`VOID CHECK session-failed-before-dispatch-${d.floor}: clear (lines=0, below floor=0)`);
        L.push(`VOID CHECK router-down-minutes: ${o.flagDown ?? 'clear'} (${d.downMin.toFixed(2)} vs limit ${d.downLimit})`);
        L.push('READER VERDICT (pre-grade): reader bars MET (Safety text half, Fallback, Speed, Routing, Integrity); Quality, No-regression and the Safety wrong-answer half NEED GRADES');
    }
    return L.join('\n');
}

// ---- the synthetic world: key + blind grades + in-app pairs + a log
class World {
    constructor() { this.key = { 'blind-1': {}, 'blind-2': {} }; this.blindGrades = { 'blind-1': {}, 'blind-2': {} }; this.pairs = []; this.inGrades = {}; this.log = []; this.turn = 0; this.n = 0; this.t = T0 + 120000; this.tag = 'blind-1'; this.items = []; this.nextWindow = null; this.texts = new Map(); this.superseded = []; this.fulls = []; }
    txt(label) { const t = `synthetic answer ${label} #${++this.n}`; this.texts.set(t, label); return t; }
    q(tag) { return `q${String(Object.keys(this.key[tag]).length + 1).padStart(2, '0')}`; }
    entry(arms, id, turn, grade, extra = {}) { const tag = this.tag; const k = this.q(tag); this.key[tag][k] = { arms, id, route: ROSTER.get(id).route, class: 'X', parent: null, turn, ...extra }; if (grade !== undefined) this.blindGrades[tag][k] = grade; return k; }
    inapp(id, grade, answer, tAt) { const key = this.pairs.some((p) => p.id === id) ? `${id}#${this.pairs.filter((p) => p.id === id).length + 1}` : id; this.pairs.push({ key, id, dispatchedAt: ISO(tAt), answer }); if (grade !== undefined) this.inGrades[key] = grade; }
    open(opts = {}) {
        const turn = ++this.turn; this.t += 30000; const t = this.t;
        this.items.push({ id: opts.windowId ?? this.nextWindow ?? opts.id, q: t - 500 }); this.nextWindow = null;   // the play-window item of this turn (the reader's mapping); nextWindow lets a test make it disagree with the judge's id
        if (!opts.noMain) this.log.push(`${ISO(t)} [LOG] [Main] dispatch: answer source=live anchor="x" verdict=match question="q"`);
        if (!opts.noRouterDispatch) this.log.push(`${ISO(t + 4)} [LOG] [Router] dispatch turn=${turn} at=${t + 4} q_at=${t - 500} q_src=vad router=up ear=3.1`);
        return { turn, t };
    }
    decision(turn, t, shown, o = {}) { this.log.push(`${ISO(t + 3000)} [LOG] [Router] turn=${turn} route=${o.route ?? (shown === 'live' ? 'easy-answer' : 'hard')} reason=${o.reason ?? '-'} shown=${shown} live_first_ms=${shown === 'live' ? 1500 : '-'} live_words=${shown === 'live' ? 40 : '-'} shadow=3000 q_src=vad q_at=${t - 500} sent=5 superseded=${o.superseded ?? 'no'}`); }
    full(t, text) { this.log.push(`${ISO(t)} [LOG] [Answer] full: ${JSON.stringify(text)}`); }
    /** a Live-shown turn with its hidden shadow. poisonInapp: the in-app pair of this dispatch carries the Live text and is graded WRONG (it must be ignored). */
    live(id, { L = ACC, S = ACC, poisonInapp = true } = {}) {
        const { turn, t } = this.open({ id }); const txt = this.txt(`${id}-live`);
        this.entry(['L'], id, turn, L, { rank: 1 }); if (S !== null) this.entry(['S'], id, turn, S === 'ungraded' ? undefined : S);
        this.decision(turn, t, 'live'); this.full(t + 6000, txt); this.inapp(id, poisonInapp ? WRONG : ACC, txt, t); return turn;
    }
    /** a Live-shown turn with flagged L alone: kind = 'sEmpty' | 'none' (no pipeline answer at all, no flag) */
    liveAlone(id, kind, L = ACC) {
        const { turn, t } = this.open({ id }); const txt = this.txt(`${id}-live`);
        this.entry(['L'], id, turn, L, { rank: 1, ...(kind === 'sEmpty' ? { sEmpty: true } : {}) });
        this.decision(turn, t, 'live'); this.full(t + 6000, txt); this.inapp(id, WRONG, txt, t); return turn;
    }
    /** an appended turn: L plus ONE shared S,A answer (key arms ['S','A']) */
    appended(id, { L = ACC, SA = ACC } = {}) {
        const { turn, t } = this.open({ id }); const txt = this.txt(`${id}-live`);
        this.entry(['L'], id, turn, L, { rank: 1 }); this.entry(['S', 'A'], id, turn, SA, { rank: 1 });
        this.decision(turn, t, 'live', { reason: 'too-long' }); this.full(t + 6000, txt); this.inapp(id, WRONG, txt, t); return turn;
    }
    /** an A-only appended answer (no Live text exported) */
    aOnly(id, A = ACC) {
        const { turn, t } = this.open({ id }); const txt = this.txt(`${id}-live`);
        this.entry(['A'], id, turn, A); this.decision(turn, t, 'live', { reason: 'incomplete' }); this.full(t + 6000, txt); this.inapp(id, WRONG, txt, t); return turn;
    }
    /** a pipeline-shown turn: the in-app pair is graded */
    pipe(id, grade = ACC, { noPair = false } = {}) {
        const { turn, t } = this.open({ id }); const txt = this.txt(`${id}-pipe`);
        this.decision(turn, t, 'pipeline'); this.full(t + 7000, txt); if (!noPair) this.inapp(id, grade, txt, t); return turn;
    }
    /** a superseded Live turn: L alone key-marked, the diag line, the replacing text logged after it; replacingInApp false = the in-app pair carries the Live text only */
    sup(id, { L = ACC, repl = ACC, replacingInApp = true, replacingLogged = true, phase = 'done' } = {}) {
        const { turn, t } = this.open({ id }); const live = this.txt(`${id}-live`), rep = this.txt(`${id}-replacing`);
        this.entry(['L'], id, turn, L, { rank: 1, superseded: true });
        this.decision(turn, t, 'live', { superseded: 'yes' }); if (phase === 'done') this.full(t + 6000, live);   // a streaming-phase supersede never put the Live text in history
        this.log.push(`${ISO(t + 8000)} [LOG] [Router] superseded turn=${turn} phase=${phase} line_written=yes`);
        if (replacingLogged) this.full(t + 12000, rep);
        if (replacingInApp) this.inapp(id, repl, rep, t); else this.inapp(id, WRONG, live, t);
        return turn;
    }
    timeline() { return { ...HOUR, items: this.items.map((i) => ({ id: i.id, startSec: Math.floor((i.q - HOUR.startedMs - 1150) / 1000) })) }; }
    logText({ extraHead = [] } = {}) { return [...extraHead, `=== Natively session started ${ISO(T0)} ===`, ...this.log, ''].join('\n'); }
    data(readerOpts = {}, extra = {}) {
        const log = S.parseLog(this.logText(), this.timeline());
        const grades = this.inGrades;
        return { reader: S.parseReader(readerText(readerOpts)), roster: ROSTER, key: this.key, blindGrades: this.blindGrades, inapp: { pairs: this.pairs, grades }, log, ...extra };
    }
}
const clean = () => {
    const w = new World();
    for (const id of ['E1', 'E2', 'E3', 'E4']) w.live(id);
    w.tag = 'blind-2';                                  // two blind files, so the per-file provenance cases have two to drop
    w.appended('H1');
    w.pipe('H2'); w.pipe('H3');
    w.sup('H4');
    return w;
};
const run = (w, readerOpts, extra) => S.scoreRd(w.data(readerOpts, extra));
const V = (r) => r.verdict;

// ================================================================= 0. instrument units
ck('def-1 acceptable needs BOTH graders at correctness 2 AND on_topic 2', S.accept(ACC) && !S.accept(G12(ACC, G(2, 1, 2))) && !S.accept(G12(ACC, G(1, 2, 2))) && !S.accept(undefined));
ck('def-2 wrong = EITHER grader correctness 0 (correctness only: on_topic 0 is not wrong)', S.isWrong(G12(ACC, WRONG)) && S.isWrong(G12(WRONG, ACC)) && S.isWrong(WRONG) && !S.isWrong(WEAK) && !S.isWrong(G(2, 0, 2)) && !S.isWrong(undefined));
ck('def-3 verdictProblem: complete verdict file ok; missing key, extra key, out-of-range, non-object are problems', S.verdictProblem({ a: ACC.g1, b: ACC.g1 }, { a: 1, b: 1 }) === null && !!S.verdictProblem({ a: ACC.g1 }, { a: 1, b: 1 }) && !!S.verdictProblem({ a: ACC.g1, b: ACC.g1, c: ACC.g1 }, { a: 1, b: 1 }) && !!S.verdictProblem({ a: { correctness: 3, on_topic: 2, delivery: 2 } }, { a: 1 }) && !!S.verdictProblem([], { a: 1 }));

// ================================================================= 1. the reader's output
const pr = S.parseReader(readerText());
ck('reader-1 a complete clean reader output parses with no problems and the bars as printed', pr.problems.length === 0 && !pr.void && pr.speed.p50 === 1800 && pr.routing.easyCaught === 17 && pr.routing.hardMis === 0 && pr.fallback.counts.every((n) => n === 0), JSON.stringify(pr.problems));
ck('reader-2 a VOID reader output parses as void (router-down and session-failed forms)', S.parseReader(readerText({ void: 'down' })).void === true && S.parseReader(readerText({ void: 'failed' })).void === true);
ck('reader-3 every required line missing is a problem (each of 11 lines removed once)', ['BAR Safety (text half)', 'BAR Fallback', 'BAR Speed', 'BAR Routing', 'INTEGRITY dispatched turns with no decision line', 'INTEGRITY decision lines without a dispatch line', 'INTEGRITY unparsed_decision_lines', 'CAPTURES check', 'CAPTURE FILES', 'SUPERSEDE superseded_turns', 'VOID CHECK router-down-minutes'].every((k) => S.parseReader(readerText().split('\n').filter((l) => !l.startsWith(k)).join('\n')).problems.length > 0));
ck('reader-4 a flag that disagrees with its own numbers is a problem (Speed PASS at p50 2600; Routing PASS at 12; Safety PASS with a hard-first; Fallback PASS with a missing append)',
    S.parseReader(readerText({ p50: 2600, flagSpeed: 'PASS' })).problems.length > 0 && S.parseReader(readerText({ easy: 12, flagRouting: 'PASS' })).problems.length > 0 && S.parseReader(readerText({ liveHard: 1, flagSafety: 'PASS' })).problems.length > 0 && S.parseReader(readerText({ missingApp: 1, flagFallback: 'PASS' })).problems.length > 0);
ck('reader-5 empty text is a problem; the control (the clean text) is not', S.parseReader('').problems.length > 0 && S.parseReader(readerText()).problems.length === 0);

// ---- format parity with the REAL reader: run router-hour-read.mjs on a minimal synthetic folder and parse what it prints
{
    const READER = path.join(HERE, '..', 'router-hour-read.mjs'), RROOT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
    const rosterUrl = pathToFileURL(`${RROOT}/electron/test/golden/live40.questions.mjs`).href;
    let LIVE40 = null; try { ({ LIVE40 } = await import(rosterUrl)); } catch { /* checked below */ }
    ck('parity-0 the real reader and the roster it needs are present (else the parity checks below cannot run)', fs.existsSync(READER) && !!LIVE40 && LIVE40.length === 47);
    if (LIVE40 && fs.existsSync(READER)) {
        const mkDir = (name, windowMs, up) => {
            const d = fs.mkdtempSync(path.join(os.tmpdir(), `cal-rd-${name}-`));
            fs.writeFileSync(path.join(d, 'interview60.timeline.json'), JSON.stringify({ startedMs: T0, endedMs: T0 + windowMs, items: LIVE40.map((i, k) => ({ id: i.id, startSec: k * 10 })) }));
            fs.writeFileSync(path.join(d, 'natively_debug.log'), [`=== Natively session started ${ISO(T0 - 600000)} ===`, ...(up ? [`${ISO(T0 - 1000)} [LOG] [Router] session up gen=1 setup_ms=700`] : []), ''].join('\n'));
            return d;
        };
        const real = (d) => spawnSync(process.execPath, [READER, d, '--down-limit-min', '2', '--root', RROOT], { encoding: 'utf8', timeout: 60000 });
        const d1 = mkDir('ok', 60000, true), r1 = real(d1), p1 = S.parseReader(r1.stdout);
        ck('parity-1 the REAL reader\'s stdout on a minimal folder parses with no problems (every line this scorer needs exists in the printed form, flags agree with numbers)', r1.status === 0 && p1.problems.length === 0 && !p1.void, `exit ${r1.status} ${p1.problems.join('|').slice(0, 160)}`);
        ck('parity-2 ... and reads as the reader printed it: Speed n=0 (FAIL), EASY caught 0/20, HARD 0/27', p1.speed?.n === 0 && p1.speed?.p50 === null && p1.routing?.easyCaught === 0 && p1.routing?.easyN === 20 && p1.routing?.hardN === 27 && p1.safetyText?.flag === 'PASS');
        const d2 = mkDir('void', 600000, false), r2 = real(d2), p2 = S.parseReader(r2.stdout);
        ck('parity-3 the REAL reader\'s VOID output (router never up, 10 minutes) parses as void with a reason, exit 3', r2.status === 3 && p2.problems.length === 0 && p2.void === true && p2.voidWhy.length === 1, `exit ${r2.status} ${p2.problems.join('|').slice(0, 160)}`);
        for (const d of [d1, d2]) try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* temp */ }
        // the REAL builder's key, pairs files and build record are read by the scorer's loader (field names, arms lists, sha fields, file count)
        const B = path.join(HERE, '..', 'build-blind-rd.mjs');
        const base = fs.mkdtempSync(path.join(os.tmpdir(), 'cal-rd-build-')), runD = path.join(base, 'runs', '2026-10-07T20-00-05-router-default-r1'), keyD = path.join(base, 'keyhold'), gradeD = path.join(base, 'grade');
        for (const d of [runD, gradeD, path.join(gradeD, 'verdicts')]) fs.mkdirSync(d, { recursive: true });
        const [A1, A2] = [LIVE40[0].id, LIVE40[2].id];                        // two roster ids (main items)
        const cap = (id, turn, text, extra = {}) => ({ id, turn, text, words: 40, firstMs: 1500, endMs: 5000, q_src: 'vad', superseded: false, ...extra });
        fs.writeFileSync(path.join(runD, 'interview60.answers.router-live.json'), JSON.stringify([cap(A1, 1, 'parity live one'), cap(A2, 2, 'parity live two')]));
        fs.writeFileSync(path.join(runD, 'interview60.answers.router-shadow.json'), JSON.stringify([cap(A1, 1, 'parity shadow one', { appended: false }), cap(A2, 2, 'parity appended two', { appended: true })]));
        fs.writeFileSync(path.join(runD, 'interview60.timeline.json'), JSON.stringify({ startedMs: T0, endedMs: T0 + 60000, items: [] }));
        fs.writeFileSync(path.join(runD, 'natively_debug.log'), `=== Natively session started ${ISO(T0 - 600000)} ===\n`);
        const bres = spawnSync(process.execPath, [B, '--run-dir', runD, '--key-dir', keyD, '--root', RROOT], { encoding: 'utf8', timeout: 60000 });
        ck('parity-4 the real builder runs on a synthetic folder (exit 0) and writes key + build record', bres.status === 0 && fs.existsSync(path.join(keyD, 'key-rd.json')) && fs.existsSync(path.join(keyD, 'build-record-rd.json')), `${bres.status} ${bres.stdout.slice(0, 100)}${bres.stderr.slice(0, 100)}`);
        if (bres.status === 0) {
            const key = JSON.parse(fs.readFileSync(path.join(keyD, 'key-rd.json'), 'utf8'));
            const launches = [];
            for (const tag of Object.keys(key)) {
                const pf = path.join(runD, 'router-blind', `pairs.${tag}.json`), pairs = JSON.parse(fs.readFileSync(pf, 'utf8')).items;
                for (const g of ['g1', 'g2']) { const vf = path.join(gradeD, 'verdicts', `verdicts.${tag}.${g}.json`); fs.writeFileSync(vf, JSON.stringify(Object.fromEntries(pairs.map((p) => [p.key, ACC.g1])))); launches.push(mkRec(`${tag}.${g}`, pf, vf)); }
            }
            const ipf = path.join(runD, 'interview60.judge.pairs.json');
            fs.writeFileSync(ipf, JSON.stringify({ items: [] }));
            for (const g of ['g1', 'g2']) { const vf = path.join(gradeD, 'verdicts', `verdicts.inapp.${g}.json`); fs.writeFileSync(vf, '{}'); launches.push(mkRec(`inapp.${g}`, ipf, vf)); }
            fs.writeFileSync(path.join(gradeD, 'launches.jsonl'), launches.map((l) => JSON.stringify(l)).join('\n') + '\n');
            fs.writeFileSync(path.join(base, 'reader.txt'), readerText());
            const rscript = mkReaderScript(base, path.join(base, 'reader.txt'), 0);
            const sres = spawnSync(process.execPath, [SCORER, '--run-dir', runD, '--reader-script', rscript, '--grade-dir', gradeD, '--key-dir', keyD, '--root', RROOT], { encoding: 'utf8', timeout: 60000, env: { ...process.env, SCORE_RD_CAL: '1' } });
            const so = sres.stdout + sres.stderr;
            ck('parity-5 the scorer loads the real builder\'s key, pairs files and build record, and reads 2 Live turns with 2 pairs (L vs S; the appended S,A counted as S) -> VERDICT PASS', sres.status === 0 && /VERDICT PASS/.test(so) && /over 2 eligible pairs/.test(so), so.split('\n').filter((l) => /REFUSED|VERDICT|BAR Quality/.test(l)).join(' | ').slice(0, 300));
            const brec = JSON.parse(fs.readFileSync(path.join(keyD, 'build-record-rd.json'), 'utf8'));
            ck('parity-6 the build record carries exactly the fields the scorer checks (runFolder, runLabel, liveSha256, shadowSha256, rosterSha256, judgeSha256, sizes)', ['runFolder', 'runLabel', 'liveSha256', 'shadowSha256', 'rosterSha256', 'judgeSha256', 'sizes'].every((k) => brec[k] !== undefined));
        }
        try { fs.rmSync(base, { recursive: true, force: true }); } catch { /* temp */ }
        // the REAL judge's pairAnswers: its dispatchedAt is the [Main] dispatch line's timestamp, which the join keys on
        try {
            const J = await import(pathToFileURL(`${RROOT}/electron/test/golden/interview60.judge.mjs`).href);
            const its = [LIVE40[0], LIVE40[2]], t1 = T0 + 100000, t2 = T0 + 160000;
            const tl = { items: its.map((i, k) => ({ id: i.id, kind: 'spoken', level: i.level, topic: i.topic, q: i.q, playedAt: [t1, t2][k] - 1000, clipSecs: 3 })) };
            const logTxt = [`=== Natively session started ${ISO(T0 - 600000)} ===`];
            its.forEach((i, k) => { const t = [t1, t2][k]; logTxt.push(`${ISO(t)} [LOG] [Main] dispatch: answer source=live anchor=${JSON.stringify(i.q.slice(0, 80))} verdict=match question=${JSON.stringify(i.q)}`, `${ISO(t + 4)} [LOG] [Router] dispatch turn=${k + 1} at=${t + 4} q_at=${t - 500} q_src=vad router=up ear=3.1`, `${ISO(t + 3000)} [LOG] [Router] turn=${k + 1} route=hard reason=- shown=pipeline shadow=3000 q_src=vad q_at=${t - 500} sent=5`, `${ISO(t + 7000)} [LOG] [Answer] full: ${JSON.stringify(`judge parity answer ${k}`)}`); });
            const jp = J.pairAnswers(logTxt.join('\n'), tl), jlog = S.parseLog(logTxt.join('\n'), { startedMs: T0, endedMs: T0 + 600000 });
            const jj = S.joinInapp(jp, jlog);
            ck('parity-7 pairs made by the REAL judge (pairAnswers) join to their turns through the scorer\'s join (2 pairs -> turns 1 and 2, no defect)', jp.length === 2 && jj.length === 2 && jj.every((x) => !x.defect) && jj.map((x) => x.turn).join() === '1,2', `${jp.length} ${jj.map((x) => x.turn ?? x.defect).join()}`);
        } catch (e) { ck('parity-7 the real judge could be imported and run', false, String(e?.message ?? e).slice(0, 120)); }
    }
}

// ================================================================= 2. the log and the join
{
    const w = clean();
    const lg = S.parseLog(w.logText(), HOUR);
    ck('log-1 parseLog finds every answer dispatch, router dispatch, decision, supersede line and full line', lg.mainAnswers.length === w.pairs.length && lg.routerDispatch.length === w.turn && lg.decisions.size === w.turn && lg.superseded.length === 1 && lg.fulls.length === w.pairs.length + 1, `${lg.mainAnswers.length}/${lg.routerDispatch.length}/${lg.decisions.size}/${lg.superseded.length}/${lg.fulls.length}`);
    const j = S.joinInapp(w.pairs, lg);
    ck('join-1 every in-app pair joins to its own turn (the dispatch line right after its [Main] dispatch line) and its decision', j.length === w.pairs.length && j.every((x) => !x.defect && Number.isInteger(x.turn)) && j.map((x) => x.turn).join() === '1,2,3,4,5,6,7,8', j.map((x) => x.turn).join());
    ck('join-2 a pair whose dispatchedAt matches no [Main] dispatch line is a defect; so are two lines at the same ms', S.joinInapp([{ ...w.pairs[0], dispatchedAt: ISO(T0 + 5) }], lg)[0].defect != null && (() => { const w2 = new World(); w2.live('E1'); w2.log.push(w2.log[0]); const l2 = S.parseLog(w2.logText(), HOUR); return S.joinInapp(w2.pairs, l2)[0].defect != null; })());
    ck('join-3 no router dispatch line after the main line is a defect', (() => { const w2 = new World(); w2.pipe('H1'); w2.log = w2.log.filter((l) => !l.includes('[Router] dispatch')); return S.joinInapp(w2.pairs, S.parseLog(w2.logText(), HOUR))[0].defect != null; })());
    ck('join-4 a router dispatch line of the NEXT answer dispatch is never taken (bounded by the next [Main] dispatch line)', (() => { const w2 = new World(); const a = w2.open({ noRouterDispatch: true }); w2.decision(a.turn, a.t, 'pipeline'); w2.inapp('H1', ACC, w2.txt('x'), a.t); w2.pipe('H2'); const l2 = S.parseLog(w2.logText(), HOUR); const jj = S.joinInapp(w2.pairs, l2); return jj[0].defect != null && jj[1].turn === 2; })());
    // sessions
    const hdr = (ms) => `=== Natively session started ${ISO(ms)} ===`;
    const w3 = new World(); w3.pipe('H1');
    const old = [hdr(T0 - 3600000), `${ISO(T0 - 3000000)} [LOG] [Router] turn=1 route=easy-answer reason=- shown=live q_at=1 q_src=vad`, `${ISO(T0 - 3000000)} [LOG] [Router] dispatch turn=1 at=1 q_at=1 q_src=vad router=up ear=3.1`];
    const later = [hdr(T0 + 7200000), `${ISO(T0 + 7300000)} [LOG] [Router] turn=1 route=hard reason=- shown=live q_at=1 q_src=vad`];
    const mixed = [...old, ...w3.logText().split('\n'), ...later].join('\n');
    const lm = S.parseLog(mixed, HOUR);
    ck('log-2 only the session covering the hour counts (an earlier and a later process reusing turn 1 are ignored)', lm.decisions.size === 1 && lm.decisions.get(1).shown === 'pipeline' && lm.routerDispatch.length === 1);
    { const w4 = new World(); w4.pipe('H1', ACC, { noPair: true }); const tl = { ...HOUR, items: [{ id: 'H1', startSec: 5000 }] };
      ck('log-4 a decision before the first play window (the probe\'s turns) is not in the hour; with no items in the timeline every decision is', S.parseLog(w4.logText(), tl).decisions.get(1).inHour === false && S.parseLog(w4.logText(), HOUR).decisions.get(1).inHour === true);
      ck('log-5 the probe\'s shown=pipeline turn with no in-app pair is not a coverage warning; the same turn inside the hour is', S.scoreRd({ ...w4.data(), log: S.parseLog(w4.logText(), tl) }).info.pipelineNoGrade === 0 && S.scoreRd(w4.data()).info.pipelineNoGrade === 1); }
    ck('log-3 no session header at or before the hour start refuses; a header inside the hour refuses', !!guard(() => S.parseLog(w3.log.join('\n'), HOUR)).err && !!guard(() => S.parseLog(`${hdr(T0)}\n${hdr(T0 + 600000)}\n`, HOUR)).err);
}

// ================================================================= 3. the clean world and the verdict mapping
{
    const r = run(clean());
    ck('clean-1 the clean world reads PASS on every bar and the verdict PASS', V(r) === 'PASS' && ['safety', 'fallback', 'quality', 'speed', 'routing', 'noreg'].every((b) => r.bars[b].state === 'PASS') && r.bars.integrity.problems.length === 0, `${V(r)} ${Object.entries(r.bars).map(([k, v]) => `${k}:${v.state ?? v.problems?.length}`).join(' ')}`);
    ck('clean-2 the printed lines carry each bar by the registered name and the verdict', ['BAR Safety:', 'BAR Fallback:', 'BAR Quality:', 'BAR Speed:', 'BAR Routing:', 'BAR No-regression:', 'VERDICT PASS'].every((k) => r.lines.some((l) => l.startsWith(k))));
    ck('clean-3 the output never carries an answer string (no synthetic answer text, no key letter map)', !r.lines.some((l) => /synthetic answer/.test(l)) && !r.lines.some((l) => /\['L'\]|"arms"/.test(l)));
    ck('clean-4 the Quality numbers on the clean world: 5 pairs, L 5, S 5; ids with >1 Live turn printed (0)', r.bars.quality.n === 5 && r.bars.quality.accL === 5 && r.bars.quality.accS === 5 && r.lines.some((l) => /ids_with_more_than_one_live_turn=0/.test(l)));
    ck('clean-5 no-regression reads 4 HARD pipeline-side answers on the clean world (2 in-app pipeline, 1 appended, 1 superseded replacing), all graded, none wrong', r.bars.noreg.checked === 4 && r.bars.noreg.wrong.length === 0 && r.bars.noreg.unreadable === 0, JSON.stringify({ c: r.bars.noreg.checked, w: r.bars.noreg.wrong.length, u: r.bars.noreg.unreadable }));
    ck('clean-6 the poisoned in-app grades of shown=live turns (WRONG) are ignored: they never reach any bar', r.bars.noreg.wrong.length === 0 && r.bars.safety.state === 'PASS' && r.info.inappLiveIgnored >= 6, `ignored ${r.info.inappLiveIgnored}`);
}
// ---- VOID, Safety FAIL, INCONCLUSIVE
{
    const rv = run(clean(), { void: 'down' });
    ck('verdict-1 VOID (router down over the limit) is the verdict, whatever the grades say', V(rv) === 'VOID');
    const w = clean(); w.live('E5', { L: WRONG });
    const rv2 = run(w, { void: 'failed', liveHard: 1 });
    ck('verdict-2 VOID wins over a Safety breach (SPEC 11 order); the breach is still reported in the lines', V(rv2) === 'VOID' && rv2.lines.some((l) => /Safety/i.test(l) && /FAIL|breach/i.test(l)));
    ck('verdict-3 a VOID reader output needs no grades (data absent)', V(S.scoreRd({ reader: S.parseReader(readerText({ void: 'down' })), roster: ROSTER })) === 'VOID');
    ck('verdict-4 a Safety FAIL (a wrong Live answer) reads SAFETY FAIL', V(run(w)) === 'SAFETY FAIL');
    ck('verdict-5 an INCONCLUSIVE case (Speed fails alone) reads INCONCLUSIVE, not FAIL and not PASS', V(run(clean(), { p50: 2700 })) === 'INCONCLUSIVE');
    ck('verdict-6 a grading problem (a dropped or unclean verdict file) alone keeps every bar PASS yet the verdict INCONCLUSIVE, and is printed', (() => { const r = run(clean(), {}, { gradingProblems: ['inapp.g2: verdict file missing'] }); return V(r) === 'INCONCLUSIVE' && r.lines.some((l) => /^GRADING PROBLEM inapp\.g2/.test(l)); })());
    { const w = clean(); w.live('E5', { L: WRONG }); ck('verdict-7 a Safety FAIL stands even with a grading problem elsewhere', V(run(w, {}, { gradingProblems: ['x: y'] })) === 'SAFETY FAIL'); }
}

// ================================================================= 4. Safety
{
    ck('safety-1 each text-half count alone fails Safety (live hard-first, live marker, pipeline unknown marker, pipeline bare token)',
        ['liveHard', 'liveMarker', 'pipeUnknown', 'pipeBare'].every((k) => { const r = run(clean(), { [k]: 1 }); return r.bars.safety.state === 'FAIL' && V(r) === 'SAFETY FAIL'; }));
    for (const [name, mk] of [
        ['one grader (g1) says correctness 0', () => G12(WRONG, ACC)], ['one grader (g2) says correctness 0', () => G12(ACC, WRONG)], ['both graders say correctness 0', () => WRONG]]) {
        const w = clean(); w.live('E5', { L: mk() });
        ck(`safety-2 a Live answer where ${name} is a wrong Live answer shown: SAFETY FAIL`, V(run(w)) === 'SAFETY FAIL' && run(w).bars.safety.wrongLive.length === 1);
    }
    { const w = clean(); w.liveAlone('E5', 'sEmpty', WRONG); ck('safety-3 a wrong L on an sEmpty turn (out of Quality) still fails Safety (any class)', V(run(w)) === 'SAFETY FAIL'); }
    { const w = clean(); w.sup('H5', { L: WRONG }); ck('safety-4 a wrong L on a SUPERSEDED turn still fails Safety', V(run(w)) === 'SAFETY FAIL'); }
    { const w = clean(); w.liveAlone('E5', 'none', WRONG); ck('safety-5 a wrong L with no pipeline answer at all still fails Safety', V(run(w)) === 'SAFETY FAIL'); }
    { const w = clean(); w.appended('H5', { L: WRONG }); ck('safety-6 a wrong L on an appended turn fails Safety', V(run(w)) === 'SAFETY FAIL'); }
    { const w = clean(); w.live('E5', { L: WEAK }); ck('safety-7 a weak (correctness 1) Live answer is not wrong: Safety stays PASS', run(w).bars.safety.state === 'PASS'); }
    { const w = clean(); w.live('E5', { L: G(2, 0, 2) }); ck('safety-8 on_topic 0 with correctness 2 is not wrong (the registered definition: correctness only)', run(w).bars.safety.state === 'PASS'); }
    { const w = clean(); w.live('E5', { L: ACC, S: WRONG }); ck('safety-9 a wrong SHADOW answer is not a Safety matter (it was never shown)', run(w).bars.safety.state === 'PASS'); }
    { const w = clean(); w.live('E5', { L: G12(ACC, undefined) }); const r = run(w); ck('safety-10 a Live answer with one grader missing and no readable wrong: UNREADABLE, verdict INCONCLUSIVE', r.bars.safety.state === 'UNREADABLE' && V(r) === 'INCONCLUSIVE'); }
    { const w = clean(); w.live('E5', { L: WRONG }); w.live('E4', { L: G12(ACC, undefined) }); ck('safety-11 a wrong L that CAN be read fails Safety even while another L is ungraded', V(run(w)) === 'SAFETY FAIL'); }
    { const w = clean(); w.live('E5', { L: WRONG }); const r = run(w, { noDecision: 2, capOk: false, p50: 3000, easy: 5 }); ck('safety-12 Safety FAIL beats every integrity defect and every other bar (registration 5 Integrity)', V(r) === 'SAFETY FAIL'); }
    { const w = clean(); w.live('E5', { L: null }); ck('safety-13 an L with NO grade at all is unreadable, not wrong', run(w).bars.safety.state === 'UNREADABLE'); }
}

// ================================================================= 5. Fallback, Speed, Routing, Integrity (the reader)
{
    ck('fallback-1 PASS on the clean reader output; each of the five counts alone FAILs it (INCONCLUSIVE)', run(clean()).bars.fallback.state === 'PASS' && ['missingApp', 'unflagged', 'row4', 'sent0', 'noToken'].every((k) => { const r = run(clean(), { [k]: 1 }); return r.bars.fallback.state === 'FAIL' && V(r) === 'INCONCLUSIVE'; }));
    ck('speed-1 p50 2500 passes (the limit is inclusive); 2501 fails; n=0 (no shown=live turn) fails', run(clean(), { p50: 2500 }).bars.speed.state === 'PASS' && run(clean(), { p50: 2501 }).bars.speed.state === 'FAIL' && run(clean(), { p50: null, speedN: 0 }).bars.speed.state === 'FAIL');
    ck('speed-2 a half-millisecond median (2500.5) fails', run(clean(), { p50: 2500.5 }).bars.speed.state === 'FAIL');
    ck('routing-1 EASY caught 13 passes, 12 fails; HARD misrouted 1 passes, 2 fails', run(clean(), { easy: 13 }).bars.routing.state === 'PASS' && run(clean(), { easy: 12 }).bars.routing.state === 'FAIL' && run(clean(), { hardMis: 1 }).bars.routing.state === 'PASS' && run(clean(), { hardMis: 2 }).bars.routing.state === 'FAIL');
    ck('routing-2 either routing failure alone makes the verdict INCONCLUSIVE', V(run(clean(), { easy: 12 })) === 'INCONCLUSIVE' && V(run(clean(), { hardMis: 2 })) === 'INCONCLUSIVE');
    const ints = { noDecision: 1, noDispatch: 1, dupDec: 1, dupDisp: 1, unparsed: 1, noQ: 1, capOk: false, fileOk: false, supDefects: 1 };
    ck('integrity-1 each reader integrity count alone (9 of them) makes the verdict INCONCLUSIVE; the clean text has none', run(clean()).bars.integrity.problems.length === 0 && Object.entries(ints).every(([k, v]) => { const r = run(clean(), { [k]: v }); return r.bars.integrity.problems.length === 1 && V(r) === 'INCONCLUSIVE'; }));
    ck('integrity-2 all nine at once are still INCONCLUSIVE (not PASS)', V(run(clean(), ints)) === 'INCONCLUSIVE' && run(clean(), ints).bars.integrity.problems.length === 9);
}

// ================================================================= 6. Quality
{
    const mk = (pairs, extra) => { const w = new World(); pairs.forEach(([L, S], i) => w.live(`E${(i % 5) + 1}`, { L, S })); extra?.(w); return w; };
    // a pair list: L acceptable count vs S acceptable count
    const q = (pairs, extra) => run(mk(pairs, extra)).bars.quality;
    ck('quality-1 L = S passes; L = S - 1 passes (boundary); L = S - 2 fails', q([[ACC, ACC], [ACC, ACC]]).state === 'PASS' && q([[ACC, ACC], [WEAK, ACC]]).state === 'PASS' && q([[WEAK, ACC], [WEAK, ACC]]).state === 'FAIL');
    ck('quality-2 L better than S passes (acc L 2, acc S 0)', q([[ACC, WEAK], [ACC, WEAK]]).state === 'PASS');
    ck('quality-3 a Quality failure alone makes the verdict INCONCLUSIVE', V(run(mk([[WEAK, ACC], [WEAK, ACC], [ACC, ACC]]))) === 'INCONCLUSIVE');
    // exclusions: with them included the bar would flip
    const base = () => mk([[WEAK, ACC], [WEAK, ACC], [ACC, ACC]]);   // acc L 1 vs acc S 3 -> FAIL by 2
    { const w = base(); w.liveAlone('E5', 'sEmpty', ACC); w.liveAlone('E5', 'sEmpty', ACC); const r = run(w); ck('quality-4 sEmpty Live turns are left out of BOTH sides: two acceptable sEmpty L would flip the bar if counted, and do not', r.bars.quality.state === 'FAIL' && r.bars.quality.n === 3 && r.bars.quality.excl.sEmpty === 2); }
    { const w = base(); w.sup('H5', { L: ACC }); w.sup('H5', { L: ACC }); const r = run(w); ck('quality-5 superseded Live turns are left out of both sides', r.bars.quality.state === 'FAIL' && r.bars.quality.n === 3 && r.bars.quality.excl.superseded === 2); }
    { const w = base(); w.liveAlone('E5', 'none', ACC); w.liveAlone('E5', 'none', ACC); const r = run(w); ck('quality-6 a Live turn with no pipeline answer at all is left out (no S exists), counted apart', r.bars.quality.state === 'FAIL' && r.bars.quality.n === 3 && r.bars.quality.excl.noPipeline === 2); }
    { // multi-turn id: pair by TURN, each Live turn against its own S
        const w = new World();
        w.live('E1', { L: WEAK, S: WEAK });                // X turn a: L weak, S weak
        w.liveAlone('E1', 'none', ACC);                    // X turn b: L alone, acceptable; by-id pairing would borrow turn a's S
        w.live('E2', { L: WEAK, S: ACC }); w.live('E2', { L: WEAK, S: ACC });
        const r = run(w);
        ck('quality-7 a multi-turn id pairs each Live turn with its OWN turn\'s S, never across turns (a borrowed S would read -1 and PASS; by turn it is -2 and FAILs)', r.bars.quality.state === 'FAIL' && r.bars.quality.n === 3 && r.bars.quality.accL === 0 && r.bars.quality.accS === 2, `n ${r.bars.quality.n} L ${r.bars.quality.accL} S ${r.bars.quality.accS}`);
        ck('quality-8 the number of ids with more than one Live turn is printed (2: E1 and E2)', r.lines.some((l) => /ids_with_more_than_one_live_turn=2/.test(l)));
    }
    { // S,A arm counts as S in Quality; the A grade is also read by No-regression
        const w = new World(); w.appended('H1', { L: ACC, SA: WEAK }); w.appended('H2', { L: ACC, SA: WEAK }); w.live('E1', { L: WEAK, S: ACC });
        const r = run(w); ck('quality-9 an appended turn\'s shared S,A answer counts as the shadow in Quality (acc L 2 vs acc S 1 here: PASS) and, being weak not wrong, passes No-regression', r.bars.quality.n === 3 && r.bars.quality.accL === 2 && r.bars.quality.accS === 1 && r.bars.noreg.state === 'PASS', `n ${r.bars.quality.n} L ${r.bars.quality.accL} S ${r.bars.quality.accS}`);
    }
    { const w = new World(); w.liveAlone('E1', 'sEmpty'); w.sup('H1'); const r = run(w); ck('quality-10 zero eligible pairs: the bar is not met (unreadable), never a vacuous PASS', r.bars.quality.state !== 'PASS' && V(r) !== 'PASS'); }
    { const w = clean(); w.live('E5', { L: ACC, S: G12(ACC, G(2, 1, 2)) }); w.live('E5', { L: ACC, S: G12(ACC, G(2, 1, 2)) }); const r = run(w); ck('quality-11 acceptable needs BOTH graders: a shadow where g2 says on_topic 1 is not acceptable (acc L 7 vs acc S 5 -> still PASS) and the counts show it', r.bars.quality.accL === 7 && r.bars.quality.accS === 5); }
    { const w = clean(); w.live('E5', { L: ACC, S: 'ungraded' }); const r = run(w); ck('quality-12 a pair with an ungraded S makes Quality UNREADABLE (INCONCLUSIVE), not PASS', r.bars.quality.state === 'UNREADABLE' && V(r) === 'INCONCLUSIVE'); }
    { const w = clean(); const k = Object.keys(w.key['blind-1']); w.key['blind-1'][k[1]] = { ...w.key['blind-1'][k[1]], turn: w.key['blind-1'][k[0]].turn + 99 };
      ck('quality-13 a key whose S entry sits at a turn with no L entry is a loud error (the S is never joined across turns)', !!guard(() => run(w)).err); }
    { const w = clean(); const dup = Object.entries(w.key['blind-1']).find(([, m]) => m.arms.includes('S')); w.key['blind-2']['q99'] = { ...dup[1] }; w.blindGrades['blind-2']['q99'] = ACC;
      ck('quality-14 two S entries for one turn in the key is a loud error (a corrupt key is refused, not averaged)', !!guard(() => run(w)).err); }
}

// ================================================================= 7. No regression
{
    const nr = (w, ro) => run(w, ro).bars.noreg;
    { const w = clean(); w.pipe('H5', WRONG); const r = run(w); ck('noreg-1 a wrong in-app answer on a HARD shown=pipeline turn: No-regression FAIL, verdict INCONCLUSIVE', r.bars.noreg.state === 'FAIL' && r.bars.noreg.wrong.length === 1 && V(r) === 'INCONCLUSIVE'); }
    for (const [name, g] of [['g1', G12(WRONG, ACC)], ['g2', G12(ACC, WRONG)]]) { const w = clean(); w.pipe('H5', g); ck(`noreg-2 one grader (${name}) saying correctness 0 is enough`, nr(w).state === 'FAIL'); }
    { const w = clean(); w.pipe('E5', WRONG); ck('noreg-3 a wrong in-app answer on an EASY shown=pipeline turn is reported, not gated (PASS)', nr(w).state === 'PASS' && run(w).info.easyPipelineWrong === 1); }
    { const w = clean(); w.pipe('H5', G(2, 0, 2)); ck('noreg-4 on_topic 0 with correctness 2 is not wrong', nr(w).state === 'PASS'); }
    { const w = clean(); w.pipe('H5', WEAK); ck('noreg-5 a weak (correctness 1) HARD pipeline answer is not wrong', nr(w).state === 'PASS'); }
    { const w = clean(); w.appended('H5', { L: ACC, SA: WRONG }); const r = run(w); ck('noreg-6 a wrong APPENDED pipeline answer on a HARD item counts: No-regression FAIL', r.bars.noreg.state === 'FAIL' && r.bars.noreg.wrong[0].src === 'appended'); }
    { const w = clean(); w.appended('E5', { L: ACC, SA: WRONG }); ck('noreg-7 a wrong appended answer on an EASY item is reported, not gated', nr(w).state === 'PASS'); }
    { const w = clean(); w.aOnly('H5', WRONG); ck('noreg-8 an A-only appended answer (arms [A]) wrong on a HARD item counts', nr(w).state === 'FAIL'); }
    { const w = clean(); w.sup('H5', { repl: WRONG }); const r = run(w); ck('noreg-9 a wrong superseded REPLACING answer on a HARD item counts (the replacing pipeline stream was shown)', r.bars.noreg.state === 'FAIL' && r.bars.noreg.wrong[0].src === 'superseded'); }
    { const w = clean(); w.sup('E5', { repl: WRONG }); ck('noreg-10 a wrong replacing answer on an EASY item is reported, not gated', nr(w).state === 'PASS'); }
    { const w = clean(); w.sup('H5', { replacingInApp: false }); const r = run(w); ck('noreg-11 a HARD superseded turn whose replacing text is not in the in-app export is UNREADABLE (INCONCLUSIVE), never a silent pass', r.bars.noreg.state === 'UNREADABLE' && V(r) === 'INCONCLUSIVE'); }
    { const w = clean(); w.sup('H5', { replacingLogged: false, replacingInApp: false }); ck('noreg-12 a HARD superseded turn with no replacing [Answer] full line at all is UNREADABLE', nr(w).state === 'UNREADABLE'); }
    { const w = clean(); w.sup('E5', { replacingInApp: false }); ck('noreg-13 the same gap on an EASY item does not make No-regression unreadable', nr(w).state === 'PASS'); }
    { const w = clean(); w.pipe('H5', null); const r = run(w); ck('noreg-14 a HARD shown=pipeline answer with no grade is UNREADABLE (INCONCLUSIVE)', r.bars.noreg.state === 'UNREADABLE' && V(r) === 'INCONCLUSIVE'); }
    { const w = clean(); w.pipe('H5', G12(WRONG, undefined)); ck('noreg-15 a wrong answer that can be read (one grader) fails even though the other grader is missing', nr(w).state === 'FAIL'); }
    { const w = clean(); w.inapp('H5', ACC, 'orphan pair text', T0 + 7); const r = run(w); ck('noreg-16 an in-app pair that cannot be joined to a turn (a HARD item) is a join defect: UNREADABLE', r.bars.noreg.state === 'UNREADABLE' && r.info.joinDefects === 1); }
    { const w = new World(); w.live('H1', { L: ACC, S: ACC, poisonInapp: true }); w.live('H2'); w.pipe('H3'); w.pipe('H4'); const r = run(w); ck('noreg-17 a HARD item shown live whose in-app pair is wrong (it carries the Live text) is IGNORED (I-2); the same grade on shown=pipeline would fail', r.bars.noreg.state === 'PASS' && r.bars.noreg.wrong.length === 0); }
    { const w = clean(); const before = run(w).bars.noreg.checked; w.pipe('H5'); ck('noreg-18 the checked count rises by one with one more HARD pipeline answer (counts are real)', run(w).bars.noreg.checked === before + 1); }
    { const w = new World(); w.pipe('H1', WRONG); w.pipe('H1', ACC); const r = run(w); ck('noreg-19 two in-app pairs of one item (H1, H1#2): the wrong one counts', r.bars.noreg.state === 'FAIL' && r.bars.noreg.wrong.length === 1); }
    { // unclaimed shown=pipeline turns (coordinator ruling): HARD caps at INCONCLUSIVE, EASY is a warning. The item comes from the play window (the world's timeline items).
        const wH = clean(); wH.pipe('H5', ACC, { noPair: true }); const rH = S.scoreRd(wH.data());
        ck('noreg-20 a HARD item\'s shown=pipeline turn with NO in-app pair caps the verdict at INCONCLUSIVE (No-regression UNREADABLE, "UNCLAIMED" printed)', V(rH) === 'INCONCLUSIVE' && rH.bars.noreg.state === 'UNREADABLE' && rH.info.unclaimedHard === 1 && rH.lines.some((l) => /^UNCLAIMED/.test(l)));
        const wE = clean(); wE.pipe('E5', ACC, { noPair: true }); const rE = S.scoreRd(wE.data());
        ck('noreg-21 an EASY item\'s unclaimed turn is a WARNING only: verdict stays PASS', V(rE) === 'PASS' && rE.info.pipelineNoGrade === 1 && rE.info.unclaimedHard === 0 && rE.lines.some((l) => /^WARNING/.test(l) && /EASY/.test(l)));
        const wU = clean(); wU.pipe('H5', ACC, { noPair: true }); const rU = S.scoreRd({ ...wU.data(), log: S.parseLog(wU.logText(), HOUR) });
        ck('noreg-22 an unclaimed turn whose item cannot be mapped (no timeline items) is treated as HARD: INCONCLUSIVE', V(rU) === 'INCONCLUSIVE' && rU.info.unclaimedHard === 1);
        const wW = clean(); wW.pipe('H5', WRONG, { noPair: true }); wW.pipe('H4', WRONG); ck('noreg-23 a wrong readable answer still FAILs No-regression while an unclaimed turn is also present', S.scoreRd(wW.data()).bars.noreg.state === 'FAIL');
    }
    { // I-3: the gate is HARD when EITHER mapping says HARD (the judge's text-overlap id, or the play-window item)
        const w1 = clean(); w1.nextWindow = 'H5'; w1.pipe('E4', WRONG); const r1 = run(w1);
        ck('noreg-24 (I-3) a wrong in-app answer claimed by overlap for an EASY item but played in a HARD item\'s window is GATED: No-regression FAIL, the disagreement counted (old code: reported only, PASS)', r1.bars.noreg.state === 'FAIL' && r1.info.mappingDisagree === 1 && r1.bars.noreg.wrong[0].src === 'inapp', `${r1.bars.noreg.state} ${r1.info.mappingDisagree}`);
        const w2 = clean(); w2.nextWindow = 'E5'; w2.pipe('H5', WRONG); const r2 = run(w2);
        ck('noreg-25 (I-3) the other way round (judge says HARD, the window says EASY) is gated too', r2.bars.noreg.state === 'FAIL' && r2.info.mappingDisagree === 1);
        const w3 = clean(); w3.nextWindow = 'E5'; w3.pipe('E4', WRONG); const r3 = run(w3);
        ck('noreg-26 (I-3) both mappings EASY: reported, not gated (PASS), no disagreement', r3.bars.noreg.state === 'PASS' && r3.info.easyPipelineWrong === 1 && r3.info.mappingDisagree === 0);
        const w4 = clean(); w4.pipe('E4', WRONG); const r4 = S.scoreRd({ ...w4.data(), log: S.parseLog(w4.logText(), HOUR) });
        ck('noreg-27 (I-3) an in-app turn whose play-window item cannot be mapped counts as HARD (as the unclaimed rule does): FAIL', r4.bars.noreg.state === 'FAIL');
        ck('noreg-28 (I-3) the printed lines carry the count of pairs whose two mappings disagree', /disagree on HARD\/EASY: 1/.test(r1.lines.join('\n')));
    }
    { // m-1: the superseded loop is limited to the hour, and a text-matched pair must belong to the same turn
        const w = clean(); w.sup('H5', { replacingInApp: false });
        const tlLate = { ...HOUR, items: [{ id: 'H5', startSec: 5000 }] };
        const inHourR = S.scoreRd(w.data()), probeR = S.scoreRd({ ...w.data(), log: S.parseLog(w.logText(), tlLate) });
        ck('sup-1 (m-1) a supersede before the first play window (a probe turn) is not read: no spurious UNREADABLE (the same supersede inside the hour is UNREADABLE)', inHourR.bars.noreg.state === 'UNREADABLE' && probeR.bars.noreg.unreadable === 0);
        const wc = new World(); wc.pipe('H1'); const textA = wc.pairs[0].answer; wc.sup('H5', { replacingLogged: false, replacingInApp: false });
        wc.log.push(`${ISO(T0 + 190000)} [LOG] [Answer] full: ${JSON.stringify(textA)}`);
        const rc = S.scoreRd(wc.data());
        ck('sup-2 (m-1) a replacing window that catches ANOTHER turn\'s [Answer] full line (its pair is joined to a different, non-superseded turn) is UNREADABLE, never graded as the replacing text', rc.bars.noreg.state === 'UNREADABLE' && rc.info.supCrossTurn === 1 && V(rc) === 'INCONCLUSIVE', `${rc.bars.noreg.state} ${rc.info.supCrossTurn}`);
    }
    { // m-2: streaming-phase supersedes are graded through the judge's claim; done-phase ones only when exported
        const wS = clean(); wS.sup('H5', { phase: 'streaming', repl: WRONG }); const rS = run(wS);
        ck('sup-3 (m-2) a phase=streaming supersede on a HARD turn: the first [Answer] full line after it IS the replacing text, the judge\'s pair carries it, it is GRADED (wrong -> No-regression FAIL)', rS.bars.noreg.state === 'FAIL' && rS.bars.noreg.wrong[0].src === 'superseded');
        const wS2 = clean(); wS2.sup('H5', { phase: 'streaming', repl: ACC }); ck('sup-4 (m-2) ... and a good one is readable (PASS), not unreadable', run(wS2).bars.noreg.state === 'PASS');
        const wD = clean(); wD.sup('H5', { phase: 'done', replacingInApp: false }); const rD = run(wD);
        ck('sup-5 (m-2) a phase=done supersede whose replacing text is not in the export is UNREADABLE on a HARD item', rD.bars.noreg.state === 'UNREADABLE');
        ck('sup-6 (m-2) the printed lines state the phases and the rule (streaming graded via the judge\'s claim; done only when exported)', rS.lines.some((l) => /superseded turns in the hour: streaming 1, done 1/.test(l) && /streaming-phase supersede never put the Live text in history/.test(l) && /done-phase one is graded only when a main supersede dispatch/.test(l)));
    }
    { // I-2 parse-level defence, m-4
        const hasProblem = (o, rx) => S.parseReader(readerText(o)).problems.some((p) => rx.test(p));
        ck('reader-6 (I-2) a router-down limit other than the registered 2 is a problem: limit 5 with 3.5 minutes printed "clear" (old code: 0 problems, a candidate PASS)', hasProblem({ downMin: 3.5, downLimit: 5 }, /limit 5 is not the registered 2/));
        ck('reader-7 (I-2) the down time is recomputed: 3.5 minutes against limit 2 printed "clear" is a problem; 1.5 printed VOID is a problem; the controls (1.5 clear, 3.5 VOID) are not', hasProblem({ downMin: 3.5 }, /disagrees/) && hasProblem({ downMin: 1.5, flagDown: 'VOID' }, /disagrees/) && S.parseReader(readerText({ downMin: 1.5 })).problems.length === 0 && S.parseReader(readerText({ void: 'down' })).problems.length === 0);
        ck('reader-8 (I-2) a dispatch floor other than the registered 10 is a problem', hasProblem({ floor: 7 }, /floor 7 is not the registered 10/));
        ck('reader-9 (m-4) the Routing denominators must be 20 EASY / 27 HARD (19 EASY, 28 HARD are problems; 20/27 is not)', hasProblem({ easyN: 19 }, /denominators/) && hasProblem({ hardN: 28 }, /denominators/) && !hasProblem({}, /denominators/));
    }
    { // I-1 / I-4 / m-3 at the provenance rule
        const d = fs.mkdtempSync(path.join(os.tmpdir(), 'cal-prov-')), pf = path.join(d, 'p.json'), vf = path.join(d, 'v.json');
        fs.writeFileSync(pf, '{"items":[1]}'); fs.writeFileSync(vf, '{"a":1}');
        const good = mkRec('s', pf, vf), opts = { launcherSha: LSHA, pairsFile: pf, verdictsFile: vf };
        const prob = (over, o = opts) => S.provenanceProblem([{ ...good, ...over }], 's', o);
        ck('prov-0 a clean record binds: no problem', S.provenanceProblem([good], 's', opts) === null);
        ck('prov-1 (I-1) the CLI model must be EXACTLY claude-opus-5-5: claude-sonnet-5, claude-opus-5, a suffixed pin and an alias are refused even with pinned:true (old code trusted the flag)', ['claude-sonnet-5', 'claude-opus-5', 'claude-opus-5-5[1m]', 'opus', 'claude-opus-5-5-x'].every((m) => /is not exactly claude-opus-5-5/.test(prob({ model: m }) ?? '')));
        ck('prov-2 (I-1) every transcript model must be exactly the pin: one other model, a suffixed one, an empty list and a missing list are refused', [['claude-opus-5-5', 'claude-sonnet-5'], ['claude-opus-5-5[1m]'], [], undefined].every((ms) => /transcript models/.test(prob({ models: ms }) ?? '')));
        ck('prov-3 (m-3) the recorded launcher version must be the registered file\'s sha12', /another launcher version/.test(prob({ launcher: 'deadbeefdead' }) ?? '') && /another launcher version/.test(prob({ launcher: undefined }) ?? ''));
        ck('prov-4 (m-3) the recorded tools must be within Read/Write/Edit: Bash, an Agent call and a missing tools field are refused', [{ Read: 1, Bash: 1 }, { Agent: 2 }, undefined].every((t) => /tools/.test(prob({ tools: t }) ?? '')));
        ck('prov-5 (I-4) the pairs file must hash to the launch\'s pairsSha12: a re-exported pairs file and a record without the hash are refused', /pairs file differs/.test(prob({ pairsSha12: 'aaaaaaaaaaaa' }) ?? '') && /pairs file differs/.test(prob({ pairsSha12: undefined }) ?? ''));
        ck('prov-6 (I-4) the verdicts file must hash to the launch\'s verdictsSha12: a swapped verdicts file and a record without the hash are refused', /verdicts file differs/.test(prob({ verdictsSha12: 'bbbbbbbbbbbb' }) ?? '') && /verdicts file differs/.test(prob({ verdictsSha12: undefined }) ?? ''));
        fs.writeFileSync(vf, '{"a":2}');
        ck('prov-7 (I-4) editing the verdicts file after the launch is caught (hash computed from the file the scorer reads)', /verdicts file differs/.test(S.provenanceProblem([good], 's', opts) ?? ''));
        fs.rmSync(d, { recursive: true, force: true });
    }
}

// ================================================================= 8. the registered grader-agreement rule (acceptable both / wrong either) at the bars
{
    const w = clean(); w.live('E5', { L: G12(ACC, WEAK), S: ACC }); const r = run(w);
    ck('agree-1 graders that disagree (g1 acceptable, g2 weak): the answer is NOT acceptable (counts against L in Quality) and NOT wrong', r.bars.quality.accL === 5 && r.bars.quality.accS === 6 && r.bars.safety.state === 'PASS');
    const w2 = clean(); w2.live('E5', { L: G12(ACC, WRONG), S: ACC });
    ck('agree-2 graders that disagree (g1 acceptable, g2 correctness 0): WRONG (either grader), so Safety fails', run(w2).bars.safety.state === 'FAIL');
}

// ================================================================= 9. reported-only arms
{
    const w = clean();
    const rep = { high: { n: 31, acceptable: 28, wrong: 1 }, low: { n: 31, acceptable: 27, wrong: 0 }, capturedHigh: { n: 47, acceptable: 40, wrong: 2 } };
    const r = run(w, {}, { reported: rep });
    ck('report-1 the bare arms and captured-high are printed as REPORTED and never change the verdict (even with wrong answers in them)', V(r) === 'PASS' && r.lines.filter((l) => /^REPORTED/.test(l)).length === 3 && r.lines.some((l) => /REPORTED high/.test(l) && /acceptable 28/.test(l)));
    ck('report-2 absent report-only arms are named as not graded, not an error', V(run(clean())) === 'PASS' && run(clean()).lines.some((l) => /not graded/.test(l)));
}

// ================================================================= 10. the real loader and the CLI (end to end on a synthetic tree)
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cal-score-rd-'));
const FOLDER = '2026-10-07T20-00-05-router-default-r1';
function mkReaderScript(base, txt, exitCode) {
    const f = path.join(base, 'fake-reader.mjs');
    fs.writeFileSync(f, `import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(path.join(base, 'reader-argv.txt'))}, process.argv.slice(2).join(' ')); process.stdout.write(fs.readFileSync(${JSON.stringify(txt)}, 'utf8')); process.exit(Number(process.env.FAKE_READER_EXIT ?? ${exitCode}));\n`);
    return f;
}
function lay(base, w, { readerOpts = {}, tamper = null, arms = false } = {}) {
    const run_ = path.join(base, 'runs', FOLDER), grade = path.join(base, 'grade'), keyDir = path.join(base, 'keyhold'), root = path.join(base, 'root');
    for (const d of [run_, path.join(run_, 'router-blind'), path.join(grade, 'verdicts'), keyDir, path.join(root, 'electron', 'test', 'golden')]) fs.mkdirSync(d, { recursive: true });
    const roster = `export const LIVE40 = ${JSON.stringify(ROSTER_ROWS.map(([id, route]) => ({ id, route })))};\n`, judge = '// synthetic judge file\n';
    fs.writeFileSync(path.join(root, 'electron/test/golden/live40.questions.mjs'), roster); fs.writeFileSync(path.join(root, 'electron/test/golden/interview60.judge.mjs'), judge);
    fs.writeFileSync(path.join(run_, 'natively_debug.log'), w.logText()); fs.writeFileSync(path.join(run_, 'interview60.timeline.json'), JSON.stringify(w.timeline()));
    const live = JSON.stringify([{ id: 'E1', turn: 1, text: 'x' }]), shadow = JSON.stringify([{ id: 'E1', turn: 1, text: 'y', appended: false }]);
    fs.writeFileSync(path.join(run_, 'interview60.answers.router-live.json'), live); fs.writeFileSync(path.join(run_, 'interview60.answers.router-shadow.json'), shadow);
    const inPairsFile = path.join(run_, 'interview60.judge.pairs.json');
    fs.writeFileSync(inPairsFile, JSON.stringify({ items: w.pairs.map((p) => ({ key: p.key, id: p.id, dispatchedAt: p.dispatchedAt, answer: p.answer })) }));
    const keyOut = Object.fromEntries(Object.entries(w.key).filter(([, v]) => Object.keys(v).length));
    const rec = { seed: 'blind:router-default:r1', runLabel: 'router-default-r1', runFolder: FOLDER, liveSha256: sha(live), shadowSha256: sha(shadow), rosterSha256: sha(roster), judgeSha256: sha(judge), sizes: Object.keys(keyOut).map(() => 1) };
    fs.writeFileSync(path.join(keyDir, 'key-rd.json'), JSON.stringify(keyOut)); fs.writeFileSync(path.join(keyDir, 'build-record-rd.json'), JSON.stringify(rec));
    const launches = [];
    for (const tag of Object.keys(keyOut)) {
        const items = Object.keys(w.key[tag]).map((k) => ({ key: k, id: k, answer: 'a' }));
        const pf = path.join(run_, 'router-blind', `pairs.${tag}.json`);
        fs.writeFileSync(pf, JSON.stringify({ items }));
        for (const g of ['g1', 'g2']) { const v = {}; for (const k of Object.keys(w.key[tag])) { const gr = w.blindGrades[tag][k]; if (gr?.[g]) v[k] = gr[g]; } const vf = path.join(grade, 'verdicts', `verdicts.${tag}.${g}.json`); fs.writeFileSync(vf, JSON.stringify(v)); launches.push(mkRec(`${tag}.${g}`, pf, vf)); }
    }
    for (const g of ['g1', 'g2']) { const v = {}; for (const p of w.pairs) if (w.inGrades[p.key]?.[g]) v[p.key] = w.inGrades[p.key][g]; const vf = path.join(grade, 'verdicts', `verdicts.inapp.${g}.json`); fs.writeFileSync(vf, JSON.stringify(v)); launches.push(mkRec(`inapp.${g}`, inPairsFile, vf)); }
    if (arms) for (const [slot, file, scores] of [['high', 'interview60.judge.pairs.gemini-3.5-flash-lite_high.json', [ACC.g1, ACC.g1, WRONG.g1]], ['low', 'interview60.judge.pairs.gemini-3.1-flash-lite_low.json', [ACC.g1, WEAK.g1, WEAK.g1]], ['captured-high', 'interview60.judge.pairs.gemini-3.5-flash-lite_captured-high.json', [ACC.g1, ACC.g1, ACC.g1]]]) {
        const pf = path.join(run_, file), vf = path.join(grade, 'verdicts', `verdicts.${slot}.json`);
        fs.writeFileSync(pf, JSON.stringify({ items: scores.map((s, i) => ({ key: `m${i + 1}`, id: `m${i + 1}`, answer: 'a' })) }));
        fs.writeFileSync(vf, JSON.stringify(Object.fromEntries(scores.map((s, i) => [`m${i + 1}`, s])))); launches.push(mkRec(slot, pf, vf));
    }
    fs.writeFileSync(path.join(grade, 'launches.jsonl'), launches.map((l) => JSON.stringify(l)).join('\n') + '\n');
    fs.writeFileSync(path.join(grade, 'grader-cwd.launches.jsonl'), JSON.stringify({ slot: 'cwdprobe-3', exit: 0, models: ['claude-opus-5-5'] }) + '\n');
    fs.writeFileSync(path.join(base, 'reader.txt'), readerText(readerOpts));
    const readerScript = mkReaderScript(base, path.join(base, 'reader.txt'), readerOpts.void ? 3 : 0);
    const ctx = { base, run: run_, grade, keyDir, root, reader: path.join(base, 'reader.txt'), readerScript, launches, rec };
    tamper?.(ctx);
    return ctx;
}
const cli = (ctx, extra = [], env = {}) => spawnSync(process.execPath, [SCORER, '--run-dir', ctx.run, '--reader-script', ctx.readerScript, '--grade-dir', ctx.grade, '--key-dir', ctx.keyDir, '--root', ctx.root, ...extra], { encoding: 'utf8', timeout: 60000, env: { ...process.env, SCORE_RD_CAL: '1', ...(ctx.readerExit !== undefined ? { FAKE_READER_EXIT: String(ctx.readerExit) } : {}), ...env } });
const out = (r) => r.stdout + r.stderr;
const wr = (f, o) => fs.writeFileSync(f, JSON.stringify(o));
let n = 0;
const fresh = (w, o) => lay(path.join(TMP, `t${++n}`), w, o);
{
    const c = fresh(clean()); const r = cli(c);
    ck('cli-1 the clean tree scores PASS end to end through the files (exit 0, "VERDICT PASS", reader output sha printed)', r.status === 0 && /VERDICT PASS/.test(out(r)) && /reader sha256 script [0-9a-f]{12}, output [0-9a-f]{12}/.test(out(r)), out(r).split('\n').slice(-4).join(' | ').slice(0, 300));
    ck('cli-2 the CLI output carries no synthetic answer text and no key map', !/synthetic answer/.test(out(r)) && !/"arms"/.test(out(r)));
    const w = clean(); w.live('E5', { L: WRONG }); const r2 = cli(fresh(w));
    ck('cli-3 a wrong Live answer through the files: "VERDICT SAFETY FAIL"', r2.status === 0 && /VERDICT SAFETY FAIL/.test(out(r2)));
    const ra = cli(fresh(clean(), { arms: true }));
    ck('cli-5 the reported-only arms are read from their files: high 2 acceptable 1 wrong of 3, low 1 acceptable 0 wrong, captured-high 3 acceptable; the verdict stays PASS', ra.status === 0 && /REPORTED high \(one grader[^)]*\): acceptable 2 wrong 1 of 3/.test(out(ra)) && /REPORTED low \(one grader[^)]*\): acceptable 1 wrong 0 of 3/.test(out(ra)) && /REPORTED captured-high \(one grader[^)]*\): acceptable 3 wrong 0 of 3/.test(out(ra)) && /VERDICT PASS/.test(out(ra)), out(ra).split('\n').filter((l) => /REPORTED|VERDICT/.test(l)).join(' | ').slice(0, 300));
    const rb = cli(fresh(clean(), { arms: true, tamper: (cc) => fs.writeFileSync(path.join(cc.grade, 'launches.jsonl'), fs.readFileSync(path.join(cc.grade, 'launches.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => { const o = JSON.parse(l); return JSON.stringify(o.slot === 'low' ? { ...o, memory: 'LOADED' } : o); }).join('\n') + '\n') }));
    ck('cli-6 an unclean reported-only arm (memory LOADED on `low`) is printed as a REPORTED PROBLEM and does NOT block PASS (it gates nothing)', rb.status === 0 && /REPORTED PROBLEM low/.test(out(rb)) && /REPORTED low: not graded/.test(out(rb)) && /VERDICT PASS/.test(out(rb)), out(rb).split('\n').filter((l) => /REPORTED|VERDICT/.test(l)).join(' | ').slice(0, 300));
    const r3 = cli(fresh(clean(), { readerOpts: { void: 'down' }, tamper: (cc) => fs.rmSync(cc.keyDir, { recursive: true, force: true }) }));
    ck('cli-4 a VOID reader output: "VERDICT VOID" and no grades are required (the key is absent here; the run is still read as VOID and says the grades were not read)', r3.status === 0 && /VERDICT VOID/.test(out(r3)) && /grades not read in a VOID run/.test(out(r3)), out(r3).split('\n').slice(-3).join(' | ').slice(0, 200));
    const wv = clean(); wv.live('E5', { L: WRONG }); const r3b = cli(fresh(wv, { readerOpts: { void: 'failed', liveHard: 1 } }));
    ck('cli-4b a VOID run whose grades CAN be read reports the Safety breach it holds (text half FAIL, 1 wrong Live answer) and still reads VOID', r3b.status === 0 && /VERDICT VOID/.test(out(r3b)) && /text half FAIL; wrong Live answers shown 1 of/.test(out(r3b)), out(r3b).split('\n').filter((l) => /INFO Safety|VERDICT/.test(l)).join(' | ').slice(0, 300));
}
const refuses = (name, tamper, rx = /REFUSED/) => { const c = fresh(clean(), { tamper }); const r = cli(c); ck(`refuse-${name}`, r.status === 2 && rx.test(out(r)) && !/VERDICT /.test(out(r)), `exit ${r.status} ${out(r).slice(0, 120).replace(/\n/g, ' ')}`); };
refuses('1 a run folder that is not <stamp>-router-default-r1 (a smoke folder)', (c) => { const to = path.join(path.dirname(c.run), '2026-10-07T20-00-05-router-smoke'); fs.renameSync(c.run, to); c.run = to; }, /REFUSED.*router-default-r1/);
refuses('2 a suffixed (retried) folder', (c) => { const to = `${c.run}-1002`; fs.renameSync(c.run, to); c.run = to; }, /REFUSED/);
refuses('3 a roster that differs from the build record (sha256)', (c) => fs.appendFileSync(path.join(c.root, 'electron/test/golden/live40.questions.mjs'), '// edited\n'), /roster/i);
refuses('4 a judge file that differs from the build record (sha256)', (c) => fs.appendFileSync(path.join(c.root, 'electron/test/golden/interview60.judge.mjs'), '// edited\n'), /judge/i);
refuses('5 a capture file changed after the export (sha256)', (c) => fs.appendFileSync(path.join(c.run, 'interview60.answers.router-live.json'), ' '), /capture|live/i);
refuses('6 a build record for another folder', (c) => wr(path.join(c.keyDir, 'build-record-rd.json'), { ...c.rec, runFolder: '2026-10-07T21-00-00-router-default-r1' }), /build record/i);
refuses('7 a missing build record', (c) => fs.rmSync(path.join(c.keyDir, 'build-record-rd.json')), /build record/i);
refuses('8 a missing key', (c) => fs.rmSync(path.join(c.keyDir, 'key-rd.json')), /key/i);
refuses('9 the reader exits 2 (unreadable input)', (c) => { c.readerExit = 2; }, /reader/i);
refuses('10 a reader output with a missing bar line', (c) => fs.writeFileSync(c.reader, fs.readFileSync(c.reader, 'utf8').split('\n').filter((l) => !l.startsWith('BAR Routing')).join('\n')), /reader/i);
refuses('11 a log that does not cover the hour', (c) => fs.writeFileSync(path.join(c.run, 'natively_debug.log'), fs.readFileSync(path.join(c.run, 'natively_debug.log'), 'utf8').replace(/=== Natively session started [^\n]*===/, '')), /log|cover/i);
{
    // grading problems are NOT refusals: the file's grades are dropped, listed, and the verdict cannot be PASS
    const probs = [
        ['missing verdict file', (c) => fs.rmSync(path.join(c.grade, 'verdicts', 'verdicts.blind-1.g2.json'))],
        ['verdict file with an out-of-range score', (c) => { const f = path.join(c.grade, 'verdicts', 'verdicts.inapp.g1.json'); const v = JSON.parse(fs.readFileSync(f, 'utf8')); v[Object.keys(v)[0]].correctness = 7; wr(f, v); }],
        ['no launch record for a slot', (c) => fs.writeFileSync(path.join(c.grade, 'launches.jsonl'), c.launches.filter((l) => l.slot !== 'blind-2.g1').map((l) => JSON.stringify(l)).join('\n') + '\n')],
        ['a launch whose transcript model is not the pin', (c) => fs.writeFileSync(path.join(c.grade, 'launches.jsonl'), c.launches.map((l) => JSON.stringify(l.slot === 'blind-1.g1' ? { ...l, pinned: false } : l)).join('\n') + '\n')],
        ['a launch whose memory was LOADED', (c) => fs.writeFileSync(path.join(c.grade, 'launches.jsonl'), c.launches.map((l) => JSON.stringify(l.slot === 'inapp.g2' ? { ...l, memory: 'LOADED' } : l)).join('\n') + '\n')],
        ['a launch with a non-zero exit', (c) => fs.writeFileSync(path.join(c.grade, 'launches.jsonl'), c.launches.map((l) => JSON.stringify(l.slot === 'inapp.g2' ? { ...l, exit: 1 } : l)).join('\n') + '\n')],
        ['one session graded both graders of a file (same session id)', (c) => fs.writeFileSync(path.join(c.grade, 'launches.jsonl'), c.launches.map((l) => JSON.stringify(l.slot === 'blind-2.g2' ? { ...l, session_id: 'sess-blind-2.g1' } : l)).join('\n') + '\n')],
    ];
    for (const [name, t] of probs) { const c = fresh(clean(), { tamper: t }); const r = cli(c); ck(`grading-problem ${name}: the file is dropped and listed, the verdict is not PASS`, r.status === 0 && !/VERDICT PASS/.test(out(r)) && /GRADING PROBLEM/.test(out(r)), `exit ${r.status} ${(out(r).match(/VERDICT [A-Z ]+/) ?? [''])[0]}`); }
    // a re-graded slot: the LAST launch record decides
    const c = fresh(clean(), { tamper: (cc) => fs.appendFileSync(path.join(cc.grade, 'launches.jsonl'), JSON.stringify({ ...cc.launches[0], attempt: 2, memory: 'LOADED' }) + '\n') });
    ck('grading-problem the LAST launch record of a slot decides (an earlier clean record does not rescue a later LOADED one)', /GRADING PROBLEM/.test(out(cli(c))) && !/VERDICT PASS/.test(out(cli(c))));
    // a Safety FAIL on the data that CAN be read survives a dropped file elsewhere
    const w = clean(); w.live('E5', { L: WRONG });
    const c2 = fresh(w, { tamper: (cc) => fs.rmSync(path.join(cc.grade, 'verdicts', 'verdicts.inapp.g2.json')) });
    ck('grading-problem a wrong Live answer readable in a blind file still gives SAFETY FAIL while an in-app verdict file is missing', /VERDICT SAFETY FAIL/.test(out(cli(c2))));
}
// ---- fix round (I-1..I-4, m-3) through the CLI and the files
{
    const c = fresh(clean()); const r = cli(c);
    const argvTxt = fs.readFileSync(path.join(c.base, 'reader-argv.txt'), 'utf8');
    ck('I-2 cli: the scorer RAN the reader itself, with the registered limit, on this run folder and root (the reader\'s argv is recorded by the stand-in)', /--down-limit-min 2\b/.test(argvTxt) && argvTxt.startsWith(c.run) && /--root /.test(argvTxt) && r.status === 0 && /VERDICT PASS/.test(out(r)), argvTxt.slice(-80));
    ck('I-2 cli: the output records the reader script sha256, the reader output sha256 and the run folder it ran on', /reader sha256 script [0-9a-f]{12}, output [0-9a-f]{12}; reader run with --down-limit-min 2 on run folder 2026-10-07T20-00-05-router-default-r1/.test(out(r)));
    ck('I-1 cli: the output names the grader model (registration 7.1): GRADER MODEL claude-opus-5-5 with the pin and the slot count, and the alias probe read', /GRADER MODEL claude-opus-5-5 \(pin claude-opus-5-5; read from the transcript of the last launch of each of \d+ graded file slots/.test(out(r)) && /GRADER ALIAS PROBE cwdprobe-3: `opus` resolved to claude-opus-5-5/.test(out(r)));
    const ro = spawnSync(process.execPath, [SCORER, '--run-dir', c.run, '--reader-out', c.reader, '--grade-dir', c.grade, '--key-dir', c.keyDir, '--root', c.root], { encoding: 'utf8', env: { ...process.env, SCORE_RD_CAL: '1' } });
    ck('I-2 cli: a reader-output FILE is no longer accepted (--reader-out refused, exit 2)', ro.status === 2 && /--reader-out is gone/.test(out(ro)));
    const rs = spawnSync(process.execPath, [SCORER, '--run-dir', c.run, '--reader-script', c.readerScript, '--grade-dir', c.grade, '--key-dir', c.keyDir, '--root', c.root], { encoding: 'utf8', env: { ...process.env, SCORE_RD_CAL: '' } });
    ck('I-2 cli: --reader-script is a calibration seam: without SCORE_RD_CAL=1 it is refused (exit 2), the real reader is always used', rs.status === 2 && /calibration seam/.test(out(rs)));
}
{
    const bad = (name, o, rx) => { const c = fresh(clean(), o); const r = cli(c); ck(`I-2 refuse: ${name}`, r.status === 2 && rx.test(out(r)) && !/VERDICT /.test(out(r)), `exit ${r.status} ${out(r).slice(0, 140).replace(/\n/g, ' ')}`); };
    bad('a reader output that says "clear (3.50 vs limit 5)" (a 5-minute limit; old code scored it as a candidate PASS)', { readerOpts: { downMin: 3.5, downLimit: 5 } }, /down-time limit 5 is not the registered 2/);
    bad('a reader output where 3.5 down minutes are printed "clear" against limit 2', { readerOpts: { downMin: 3.5 } }, /disagrees/);
    bad('Routing denominators 19 EASY (m-4)', { readerOpts: { easyN: 19 } }, /denominators 19 EASY/);
    bad('the reader exits 2 (unreadable input)', { tamper: (cc) => { cc.readerExit = 2; } }, /the reader exited 2/);
    bad('the reader exits 3 but its text is not VOID', { tamper: (cc) => { cc.readerExit = 3; } }, /exit code 3 and its VOID lines disagree/);
    bad('the reader exits 0 but its text says VOID', { readerOpts: { void: 'down' }, tamper: (cc) => { cc.readerExit = 0; } }, /exit code 0 and its VOID lines disagree/);
}
{
    const setRec = (c, slot, over) => fs.writeFileSync(path.join(c.grade, 'launches.jsonl'), c.launches.map((l) => JSON.stringify(l.slot === slot ? { ...l, ...over } : l)).join('\n') + '\n');
    const gp = (name, tamper, rx) => { const c = fresh(clean(), { tamper }); const r = cli(c); ck(`grading-problem ${name}: dropped and listed, never PASS`, r.status === 0 && !/VERDICT PASS/.test(out(r)) && rx.test(out(r)), `exit ${r.status} ${(out(r).match(/GRADING PROBLEM[^\n]*/) ?? ['none'])[0].slice(0, 130)}`); };
    gp('(I-1) a launch on claude-sonnet-5 whose record says pinned:true', (c) => setRec(c, 'blind-1.g1', { model: 'claude-sonnet-5', models: ['claude-sonnet-5'], pinned: true }), /GRADING PROBLEM blind-1\.g1: the CLI model claude-sonnet-5 is not exactly claude-opus-5-5/);
    gp('(I-1) a launch whose transcript carries a second model', (c) => setRec(c, 'inapp.g1', { models: ['claude-opus-5-5', 'claude-sonnet-5'] }), /GRADING PROBLEM inapp\.g1: the transcript models/);
    gp('(I-1) a launch on the suffixed pin claude-opus-5-5[1m]', (c) => setRec(c, 'blind-2.g1', { model: 'claude-opus-5-5[1m]', models: ['claude-opus-5-5[1m]'] }), /GRADING PROBLEM blind-2\.g1: the CLI model claude-opus-5-5\[1m\] is not exactly/);
    gp('(I-1) an old-shape record with no models list', (c) => setRec(c, 'blind-2.g2', { models: undefined }), /GRADING PROBLEM blind-2\.g2: the transcript models/);
    gp('(m-3) a launch by another launcher version', (c) => setRec(c, 'blind-1.g2', { launcher: 'deadbeefdead' }), /GRADING PROBLEM blind-1\.g2: launched by another launcher version/);
    gp('(m-3) a launch whose transcript used Bash', (c) => setRec(c, 'inapp.g2', { tools: { Read: 2, Bash: 1 } }), /GRADING PROBLEM inapp\.g2: tools/);
    gp('(I-4) a verdicts file edited after its launch', (c) => { const f = path.join(c.grade, 'verdicts', 'verdicts.blind-2.g1.json'); const v = JSON.parse(fs.readFileSync(f, 'utf8')); const k = Object.keys(v)[0]; v[k] = { ...v[k], correctness: 1 }; wr(f, v); }, /GRADING PROBLEM blind-2\.g1: the verdicts file differs from the one this launch wrote/);
    gp('(I-4) one slot\'s verdicts file moved over another\'s (both valid on the same keys)', (c) => { fs.copyFileSync(path.join(c.grade, 'verdicts', 'verdicts.inapp.g1.json'), path.join(c.grade, 'verdicts', 'verdicts.inapp.g2.json')); const f = path.join(c.grade, 'verdicts', 'verdicts.inapp.g1.json'); const v = JSON.parse(fs.readFileSync(f, 'utf8')); const k = Object.keys(v)[0]; v[k] = { ...v[k], delivery: 0 }; wr(path.join(c.grade, 'verdicts', 'verdicts.inapp.g2.json'), v); }, /GRADING PROBLEM inapp\.g2: the verdicts file differs/);
    gp('(I-4) a blind pairs file re-exported after grading', (c) => fs.appendFileSync(path.join(c.run, 'router-blind', 'pairs.blind-1.json'), '\n'), /GRADING PROBLEM blind-1\.g1: the pairs file differs from the one this launch graded/);
    gp('(I-4) the in-app pairs file re-exported after grading', (c) => fs.appendFileSync(path.join(c.run, 'interview60.judge.pairs.json'), '\n'), /GRADING PROBLEM inapp\.g1: the pairs file differs/);
    gp('(I-4) a record without the hashes', (c) => setRec(c, 'blind-2.g1', { pairsSha12: undefined, verdictsSha12: undefined }), /GRADING PROBLEM blind-2\.g1: the pairs file differs/);
    const c = fresh(clean(), { tamper: (cc) => fs.rmSync(path.join(cc.grade, 'grader-cwd.launches.jsonl')) });
    ck('I-1 cli: without an alias-probe record the output still names the grader model and simply omits the alias line', /GRADER MODEL claude-opus-5-5/.test(out(cli(c))) && !/GRADER ALIAS PROBE/.test(out(cli(c))));
}
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* temp */ }

// ================================================================= summary
const failed = results.filter((r) => !r.ok);
console.log(`CAL SCORE-RD: ${results.length - failed.length}/${results.length} PASS${failed.length ? `; FAILED: ${failed.map((f) => f.name.split(' ')[0]).join(', ')}` : ''}`);
process.exit(failed.length ? 1 : 0);
