// Pre-flight guard for flight-eq (the earlier-question hour: NATIVELY_EARLIER_QUESTION=1 on scenario50 S1+S2), run from
// the repo root (MAIN) by launch-eq.cmd / launch-eq-dry.cmd AFTER the launcher has set the flight's environment.
// It is VH\guard-h40d.mjs re-pinned to PREREGISTER-flight-eq.md section 2 ("The guard") and AMENDMENT-A2.10 P6 (g1-g5),
// A3.7 (g1 strings, g5 clock, .env names), A5 (precheck gate). Interface as h40d's: `GUARD OK: ...` on stdout and
// exit 0, or `GUARD FAILED: (<check>) <what was violated>` on stderr (exactly one line) and exit 1. Fail-fast: the first
// violated check is the one reported.
//
// Options. `--require-precheck` is the one the REAL launcher passes (g5). Every other option exists for calibration
// ONLY (guard-eq-cal.mjs); no launcher ever passes them, and the guard prints the path it used for each:
//   --settings <file>            check 13's persisted settings (default %APPDATA%\natively\settings.json)
//   --night-gates-script <file>  g2's script (default E\night-gates.ps1)
//   --parity-script <file>       g1's parity-dist script (default F\build\parity-dist.mjs)
//   --smoke-result <file>        g1's smoke result (default F\smoke\RESULT-smoke-eq.md)
//   --precheck-file <file>       g5's precheck output (default E\eq-precheck.out.txt)
//   --now <iso>                  g5's clock (default the machine's)
//
// The checks (h40d's numbering where it carries over; e1/e2/g1-g5 are new):
//   (1) the roster the harness loads is scenario50, scenarios S1+S2, 40 items
//   (2) the built default / fallback answer models   (3) no answer-model or thinking override reaches the app
//   (4) the level each model flies at   (5) the R09 fix is in the build AND the source
//   (6) the hedge is the shipped default (variable UNSET, built default ON); (7) trigger 5000 ms
//   (8) the follow-up parent flag is OFF
//   (e1) NATIVELY_EARLIER_QUESTION is exactly "1" and the BUILT describeEarlierQuestionAtStartup returns
//        `earlier question: on` under this environment
//   (g4) NATIVELY_EQ_T is `yyyy-MM-dd HH:mm`, local (+03:00), within 2026-10-05 19:30 .. 2026-10-06 01:00
//   (6b) the hedge is in the build and the source   (9) the build is not stale against LLMHelper.ts
//   (10b) HEAD equals NATIVELY_FLIGHT_COMMIT and the tree is clean but for the allowlisted paths (guard-eq-git.mjs)
//   (11) ANSWER_MODELS is exactly the two Gemini lites
//   (g3) NATIVELY_FLIGHT_FOCUSED is exactly "off", the harness's own focusedFor() returns null for scenario50 under
//        this environment, and the harness source carries P2's marker line
//   (12) the cue build: dist-proof.mjs as a child, `function trimCues` built, CUE_RULE / VERBAL_TYPED_PROMPT declared
//   (e2) the four EQ markers in the BUILT dist and in the SOURCE, and no EQ dist file older than its source
//   (g1) parity-dist.mjs as a child: exit 0 AND the two exact lines of A3.7; the smoke result holds the WHY line and
//        two block lines with chars 200..578
//   (13) knowledge mode is ON in the persisted settings
//   (g2) night-gates.ps1 -At <NATIVELY_EQ_T> as a child: exit 0 and `NIGHT GATES OK`, its lines echoed
//   (g5) --require-precheck only: eq-precheck.out.txt ends with `PRECHECK OK <stamp>`, stamp within [T-10 min, now],
//        now <= T+10 min; prints `PRECHECK ACCEPTED <stamp>`
//   (10a) `.env` declares none of the guarded names (names only, never values)
// Run order: 1-8, e1, g4, 6b, 9, 10b, 11, g3, 12, e2, g1, 13, g2, g5, then 10a LAST. 10a is the only check that opens a
// secrets-bearing file, so every other failure is reported without touching it. Every check answers differently when
// its premise is false: each was broken once in a stub tree (guard-eq-cal.txt, guard-eq-cal.mjs) and each was switched
// off once in a copy of this file to watch its cases fail. 10b's git calls only READ (`status --no-optional-locks`).
//
// WHAT THIS GUARD PROVES (h40d's wording, unchanged in kind): only that the launcher's environment, as inherited by THIS
// node child of the same cmd session, resolves the flags correctly, and that dist-electron plus the source it must have
// come from carry the hedge, the cue build and the earlier-question build and pin HEAD. It does NOT prove the spawned
// Electron app process received the same environment (electron/main.ts runs dotenv: check 10a closes that for the
// guarded names). The app-process proofs are the smoke and, after the hour, the app's own `[Main] earlier question: on`
// line and the `Knowledge mode ENABLED` line.
//
// Check 13 reads %APPDATA%\natively\settings.json. Run from a Claude session that path is an MSIX shadow (memory
// project_claude_sandbox_appdata); the scheduled tasks run outside the sandbox and read the real file.
//
// Location: this file lives in E (SP\flight-eq); ../guard-r09.mjs and ../dist-proof.mjs are SP's, F\build\parity-dist.mjs
// and F\smoke\RESULT-smoke-eq.md are SP\followup-turn's.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { unexpectedDirtyPaths, allowlistedPaths, GIT_PATHSPEC } from './guard-eq-git.mjs';
import { r09Missing } from '../guard-r09.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));      // E
const SP = path.resolve(HERE, '..');
const PROJ = process.cwd();
const require = createRequire(`${PROJ}/package.json`);
// One line, always: a message that embeds an error's own text is folded onto a single line, so the launcher log holds
// exactly one `GUARD FAILED:` line per failure.
const fail = (tag, msg) => { console.error(`GUARD FAILED: (${tag}) ${String(msg).replace(/\s*\r?\n\s*/g, ' ')}`); process.exit(1); };
// Whatever a check did not foresee still ends as one named line, not a stack trace.
process.on('uncaughtException', (e) => fail('internal', `the guard itself crashed: ${String(e?.stack ?? e).split('\n').slice(0, 2).join(' ')}`));
const readText = (tag, file) => {
    try { return fs.readFileSync(file, 'utf8'); } catch (e) { return fail(tag, `cannot read ${path.relative(PROJ, file).replace(/\\/g, '/')}: ${e.code ?? e.message}`); }
};

// ---- options. Anything else on the command line is refused rather than ignored.
const VALUE_OPTS = ['--settings', '--night-gates-script', '--parity-script', '--smoke-result', '--precheck-file', '--now'];
const FLAG_OPTS = ['--require-precheck'];
const argv = process.argv.slice(2);
const opts = {};
const stray = [];
for (let i = 0; i < argv.length; i++) {
    if (VALUE_OPTS.includes(argv[i])) {
        if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) fail('usage', `${argv[i]} needs a value`);
        opts[argv[i]] = argv[++i];
    } else if (FLAG_OPTS.includes(argv[i])) opts[argv[i]] = true;
    else stray.push(argv[i]);
}
if (stray.length) fail('usage', `unknown argument(s): ${stray.join(' ')} (the options are ${[...FLAG_OPTS, ...VALUE_OPTS].join(', ')}; all but --require-precheck are for calibration)`);

// ---- time. NATIVELY_EQ_T and the precheck stamp are local clock readings at UTC+3 (the hour's convention; Turkey has
// no DST). Read as fixed +03:00 instants so the guard does not depend on the machine's time zone.
const TZ_H = 3;
const pad2 = (n) => String(n).padStart(2, '0');
function instantOf(y, mo, d, h, mi, s) {
    const ms = Date.UTC(y, mo - 1, d, h - TZ_H, mi, s);
    const back = new Date(ms + TZ_H * 3600000);
    return back.getUTCFullYear() === y && back.getUTCMonth() === mo - 1 && back.getUTCDate() === d && back.getUTCHours() === h && back.getUTCMinutes() === mi ? ms : NaN;
}
const parseT = (s) => { const m = /^(\d{4})-(\d\d)-(\d\d) (\d\d):(\d\d)$/.exec(s ?? ''); return m ? instantOf(+m[1], +m[2], +m[3], +m[4], +m[5], 0) : NaN; };
const parseStamp = (s) => { const m = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)\+03$/.exec(s ?? ''); return m ? instantOf(+m[1], +m[2], +m[3], +m[4], +m[5], +m[6]) : NaN; };
const local = (ms) => { const d = new Date(ms + TZ_H * 3600000); return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`; };
const T_MIN = instantOf(2026, 10, 5, 19, 30, 0);
const T_MAX = instantOf(2026, 10, 6, 1, 0, 0);

// 1. The roster the harness loads. roster.mjs reads NATIVELY_ROSTER and NATIVELY_SCENARIOS at import, so this proves the
//    launcher's variables reach a node child and resolve to scenario50's 40 items of S1 and S2.
let R;
try {
    R = await import(pathToFileURL(`${PROJ}/electron/test/golden/roster.mjs`).href);
} catch (e) {
    fail('1', `roster.mjs does not load under this environment: ${e.message}`);
}
if (R.ROSTER_NAME !== 'scenario50') fail('1', `the harness would load roster ${R.ROSTER_NAME}, not scenario50 - NATIVELY_ROSTER did not arrive`);
if (R.INTERVIEW.length !== 40) fail('1', `scenario50 loaded ${R.INTERVIEW.length} items, expected 40 (S1+S2) - NATIVELY_SCENARIOS did not arrive as S1,S2`);
const scenarios = [...new Set(R.INTERVIEW.map((i) => i.scenario))].sort().join(',');
if (scenarios !== 'S1,S2') fail('1', `the roster's scenarios are ${scenarios}, not S1,S2`);

let V, T;
try {
    V = require(`${PROJ}/dist-electron/electron/llm/verbalPrimaryModel.js`);
    T = require(`${PROJ}/dist-electron/electron/llm/geminiThinking.js`);
} catch (e) {
    fail('2', `dist-electron does not load: ${e.message}. Run npm run build:electron.`);
}

// 2. The built default and fallback. Read as text: LLMHelper.js pulls in the whole app.
const helperPath = `${PROJ}/dist-electron/electron/LLMHelper.js`;
const helper = readText('2', helperPath);
const primary = helper.match(/const GEMINI_FLASH_MODEL = "([^"]+)"/)?.[1];
const fallback = helper.match(/const GEMINI_FLASH_FALLBACK_MODEL = "([^"]+)"/)?.[1];
if (primary !== 'gemini-3.1-flash-lite') fail('2', `the build's default answer model is ${primary}, not gemini-3.1-flash-lite`);
if (fallback !== 'gemini-3.5-flash-lite') fail('2', `the build's stall fallback is ${fallback}, not gemini-3.5-flash-lite`);
const ALLOWED = [primary, fallback];

// 3. No override reaches the app, resolved through the built code under THIS environment.
for (const m of ALLOWED) {
    let got;
    try { got = V.verbalPrimaryModel(m, ALLOWED); } catch (e) { fail('3', `the answer-model override refuses this environment: ${e.message}`); }
    if (got !== m) fail('3', `an answer-model override is set: ${m} resolves to ${got}`);
}
let level;
try { level = T.geminiThinkingLevelFromEnv(); } catch (e) { fail('3', `the thinking-level override refuses this environment: ${e.message}`); }
if (level !== 'LOW') fail('3', `the app would think at ${level}, not the shipped LOW - NATIVELY_GEMINI_THINKING_LEVEL is set`);

// 4. The level each model flies at.
if (T.thinkingLevelForModel(primary, level) !== 'LOW') fail('4', `${primary} would not fly at LOW`);
if (T.thinkingLevelForModel(fallback, level) !== 'HIGH') fail('4', `the ${fallback} fallback would fly at a level it ignores`);

// 5. The R09 fix is in both the build and the source it must have come from.
const distReason = r09Missing(readText('5', `${PROJ}/dist-electron/electron/knowledge/IntentClassifier.js`));
if (distReason) fail('5', `the build ${distReason} - rebuild after the R09 fix`);
const srcReason = r09Missing(readText('5', `${PROJ}/electron/knowledge/IntentClassifier.ts`));
if (srcReason) fail('5', `the source ${srcReason} - the build would not match the tree the pass record names`);

// 6. The hedge is the shipped default: the variable must be UNSET (the launcher's `set NATIVELY_VERBAL_HEDGE=` unsets it
//    in cmd) and any value, `1` included, refuses; the BUILT module must read ON with an empty environment.
const hedgeVar = process.env.NATIVELY_VERBAL_HEDGE;
if (hedgeVar !== undefined) fail('6', `NATIVELY_VERBAL_HEDGE is set (${JSON.stringify(hedgeVar)}) - flight-eq flies the shipped default with the variable UNSET, so the launcher must unset it, even for the value 1`);
let V2;
try {
    V2 = require(`${PROJ}/dist-electron/electron/llm/verbalHedge.js`);
} catch (e) {
    fail('6', `dist-electron/electron/llm/verbalHedge.js does not load: ${e.message}. Run npm run build:electron.`);
}
const HEDGE_LINE = '[Main] verbal hedge: on trigger=5000ms';
let bare;
try { bare = V2.describeVerbalHedgeAtStartup({}); } catch (e) { fail('6', `the built verbalHedge.describeVerbalHedgeAtStartup threw on an empty environment: ${e.message}`); }
if (bare !== HEDGE_LINE) fail('6', `the built default is not the hedge: "${bare}", want "${HEDGE_LINE}" - rebuild from a tree with the hedge default (f745d7e)`);

// 7. The hedge trigger resolves to the probed 5000 ms default.
let triggerMs;
try { triggerMs = V2.verbalHedgeTriggerMs(); } catch (e) { fail('7', `NATIVELY_VERBAL_HEDGE_TRIGGER_MS refuses this environment: ${e.message}`); }
if (triggerMs !== 5000) fail('7', `the hedge trigger is ${triggerMs}ms, not the probed 5000ms - NATIVELY_VERBAL_HEDGE_TRIGGER_MS is set`);

// 8. The follow-up parent flag flies OFF: this hour isolates the earlier-question block (the two never run together).
let F;
try {
    F = require(`${PROJ}/dist-electron/electron/llm/followUpParent.js`);
} catch (e) {
    fail('8', `dist-electron/electron/llm/followUpParent.js does not load: ${e.message}. Run npm run build:electron.`);
}
let followUpOn;
try { followUpOn = F.followUpParentEnabled(); } catch (e) { fail('8', `NATIVELY_FOLLOWUP_PARENT refuses this environment: ${e.message}`); }
if (followUpOn !== false) fail('8', 'the follow-up flag is set; flight-eq flies it OFF');

// e1. The flag under test: exactly "1" in the environment (the inverse of h40d's flag checks: this hour tests the flag
//     ON), and the BUILT startup describer returns the line the app will log. `earlierQuestionEnabled` trims its input
//     and so would accept " 1"; the guard does not (a trailing space on the launcher's `set` line is a defect to refuse).
const eqVar = process.env.NATIVELY_EARLIER_QUESTION;
if (eqVar !== '1') fail('e1', `NATIVELY_EARLIER_QUESTION is ${eqVar === undefined ? 'unset' : JSON.stringify(eqVar)}, not exactly "1" - flight-eq flies the flag ON, so the launcher must set it to 1`);
let EQ;
try {
    EQ = require(`${PROJ}/dist-electron/electron/llm/earlierQuestion.js`);
} catch (e) {
    fail('e1', `dist-electron/electron/llm/earlierQuestion.js does not load: ${e.message}. Run npm run build:electron.`);
}
let eqLine;
try { eqLine = EQ.describeEarlierQuestionAtStartup(process.env); } catch (e) { fail('e1', `the built describeEarlierQuestionAtStartup refuses this environment: ${e.message}`); }
if (eqLine !== 'earlier question: on') fail('e1', `the built describeEarlierQuestionAtStartup returns "${eqLine}", not "earlier question: on" - the app would not log the flag ON`);

// g4. NATIVELY_EQ_T: the task time of this hour, the one value the dry twin, the guard's night gates, the precheck and
//     the registration must all agree on. yyyy-MM-dd HH:mm, within the evening's window (A1.1: 19:30 <= T <= 01:00).
const eqT = process.env.NATIVELY_EQ_T;
const tMs = parseT(eqT);
if (!Number.isFinite(tMs)) fail('g4', `NATIVELY_EQ_T is ${eqT === undefined ? 'unset' : JSON.stringify(eqT)}, not a yyyy-MM-dd HH:mm local time - the controller fills in T when the launchers are generated`);
if (tMs < T_MIN || tMs > T_MAX) fail('g4', `NATIVELY_EQ_T ${eqT} is outside 2026-10-05 19:30 .. 2026-10-06 01:00 (A1.1)`);

// 6b. The hedge is in both the build and the source it must have come from. (Source checks, not check 9, bind the
//     flight: the flight may rebuild AFTER this guard runs.)
if (!helper.includes('verbal hedge: front=')) fail('6b', 'the build does not carry the hedge log line (verbal hedge: front=) - rebuild after the hedge lands');
const llmHelperSrcPath = `${PROJ}/electron/LLMHelper.ts`;
if (!readText('6b', llmHelperSrcPath).includes('streamGeminiWithHedge')) fail('6b', 'the source does not carry streamGeminiWithHedge - the build would not match the tree the pass record names');
const whatToAnswerBuilt = readText('6b', `${PROJ}/dist-electron/electron/llm/WhatToAnswerLLM.js`);
if (!whatToAnswerBuilt.includes('HEDGE_WINNER') && !whatToAnswerBuilt.includes('\\(hedge\\)__')) {
    fail('6b', 'the build does not carry the hedge winner regex (HEDGE_WINNER / \\(hedge\\)__) in WhatToAnswerLLM.js - rebuild after the hedge lands');
}

// 9. Freshness of the pre-flight dist snapshot against LLMHelper.ts (fail-closed staleness signal; checks 5, 6b, 12 and e2
//    are what bind the flight).
const distMtime = fs.statSync(helperPath).mtimeMs;
const srcMtime = fs.statSync(llmHelperSrcPath).mtimeMs;
if (distMtime < srcMtime) fail('9', `dist-electron/electron/LLMHelper.js (${new Date(distMtime).toISOString()}) is older than electron/LLMHelper.ts (${new Date(srcMtime).toISOString()}) - the build is stale, rebuild`);

// 10b. Pins the tree the flight's own rebuild will compile (MAIN is shared with peer sessions). No hardcoded default for
//      the commit: the launcher sets NATIVELY_FLIGHT_COMMIT (the registered HEAD). Trimmed before comparing, so a trailing
//      space on the launcher's `set` line cannot make this refuse for a reason that is not the commit.
const registeredCommit = process.env.NATIVELY_FLIGHT_COMMIT?.trim();
if (!registeredCommit) fail('10b', 'NATIVELY_FLIGHT_COMMIT is not set - the launcher must set it to the commit this flight is registered for (the registered HEAD)');
if (!/^[0-9a-f]{40}$/.test(registeredCommit)) fail('10b', `NATIVELY_FLIGHT_COMMIT is ${JSON.stringify(registeredCommit)}, not a full 40-hex commit hash - the controller fills in the registered HEAD at arming`);
let head;
try {
    // (a timeout on every child: a hung git or dist-proof must end as a named failure, not hold the launcher until the task's limit)
    head = execFileSync('git', ['-C', PROJ, 'rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 }).trim();
} catch (e) {
    fail('10b', `git rev-parse HEAD failed: ${e.message}`);
}
if (head !== registeredCommit) fail('10b', `MAIN HEAD is ${head}, not the registered commit ${registeredCommit} (NATIVELY_FLIGHT_COMMIT) - a peer or a later commit moved the tree since registration`);
let statusOut;
try {
    statusOut = execFileSync('git', ['--no-optional-locks', '-C', PROJ, 'status', '--porcelain', '--', ...GIT_PATHSPEC], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 });
} catch (e) {
    fail('10b', `git status failed: ${e.message}`);
}
const dirty = unexpectedDirtyPaths(statusOut);
if (dirty.length) fail('10b', `the tree the flight's rebuild will compile is not clean: ${dirty.join('; ')}`);
const allowlisted = allowlistedPaths(statusOut);

// 11. ANSWER_MODELS is imported live from the tree's own interview60.flight.mjs and matched exactly.
let flightMjs;
try {
    flightMjs = await import(pathToFileURL(`${PROJ}/electron/test/golden/interview60.flight.mjs`).href);
} catch (e) {
    fail('11', `interview60.flight.mjs does not load under this environment: ${e.message}`);
}
const EXPECTED_ANSWER_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'];
const actualAnswerModels = flightMjs.ANSWER_MODELS;
const answerModelsMatch = Array.isArray(actualAnswerModels)
    && actualAnswerModels.length === EXPECTED_ANSWER_MODELS.length
    && actualAnswerModels.every((id, i) => id === EXPECTED_ANSWER_MODELS[i]);
if (!answerModelsMatch) fail('11', `ANSWER_MODELS is ${JSON.stringify(actualAnswerModels)}, not exactly ${JSON.stringify(EXPECTED_ANSWER_MODELS)} - the arm-removal commit is not in this tree, or the export was renamed or reordered`);

// g3. The focused-five Flash arms are OFF (ruling 3, P2): the variable is exactly "off", the harness's own pure
//     focusedFor() resolves to null for scenario50 under THIS environment (a stale harness without the edit has no
//     focusedFor and fails here), and the harness source carries P2's log-line marker. The proof after the hour is the
//     launcher log's `FOCUSED  off ...` line and no `3.x-flash` arm line.
const focusedVar = process.env.NATIVELY_FLIGHT_FOCUSED;
if (focusedVar !== 'off') fail('g3', `NATIVELY_FLIGHT_FOCUSED is ${focusedVar === undefined ? 'unset' : JSON.stringify(focusedVar)}, not exactly "off" - without it the four focused full-Flash arms would fly and spend quota this hour does not have`);
if (typeof flightMjs.focusedFor !== 'function') fail('g3', 'interview60.flight.mjs has no focusedFor export - the focused-off edit (P2) is not in this tree');
let focusedPick;
try { focusedPick = flightMjs.focusedFor('scenario50', process.env); } catch (e) { fail('g3', `the harness's focusedFor refuses this environment: ${e.message}`); }
if (focusedPick !== null) fail('g3', `the harness's focusedFor('scenario50') returned ${JSON.stringify(focusedPick)}, not null - the focused arms would fly`);
const FOCUSED_MARKER = 'off by NATIVELY_FLIGHT_FOCUSED=off - skipping the';
if (!readText('g3', `${PROJ}/electron/test/golden/interview60.flight.mjs`).includes(FOCUSED_MARKER)) fail('g3', `interview60.flight.mjs does not carry P2's log line ("${FOCUSED_MARKER}") - the focused-off proof line would never print`);

// 12. The cue build is in MAIN's dist and in the source it came from. dist-proof.mjs runs as a child so the guard and the
//     launcher's own proofs read the same markers; exit 0 AND its verdict line are required.
const DIST_PROOF = path.resolve(HERE, '..', 'dist-proof.mjs');
const dp = spawnSync(process.execPath, [DIST_PROOF, '--root', PROJ, '--expect', 'combined', '--prefix-count', '3', '--offers-marker', 'offers block before the spoken answer'], { encoding: 'utf8', cwd: PROJ, timeout: 120000 });
const VERDICT = 'DIST PROOF: THE COMBINED BUILD, every marker as expected';
const dpOk = !dp.error && dp.status === 0 && dp.stdout.includes(VERDICT);
const dpWhy = () => {
    if (dp.error) return `could not run ${DIST_PROOF}: ${dp.error.message}`;
    if (dp.status === 0) return `dist-proof.mjs exited 0 but did not print its verdict line "${VERDICT}" - it is not the dist-proof this guard was calibrated against`;
    const out = dp.stdout.split(/\r?\n/).map((l) => l.replace(/^DIST PROOF: /, '').replace(/\s+/g, ' ').trim());
    const bad = out.filter((l) => /^(BAD|NOT THE|missing)/.test(l)).map((l) => l.replace(/^(BAD \S+ x\d+ ".*?") \(.*\)$/, '$1'));
    const crash = dp.stderr.split(/\r?\n/).find((l) => /\w*Error/.test(l));
    return `dist-proof.mjs exit ${dp.status}${bad.length ? `, ${bad.length} failing line(s): ${bad.join(' | ')}` : ''}${crash ? `; it crashed before its verdict: ${crash.trim()}` : ''}`;
};
const filterBuilt = readText('12', `${PROJ}/dist-electron/electron/llm/verbalStreamFilter.js`);
if (!filterBuilt.includes('function trimCues')) fail('12', `the built filter (dist-electron/electron/llm/verbalStreamFilter.js) has no "function trimCues" - this is not the cue build${dpOk ? '' : `; ${dpWhy()}`}`);
const promptsSrc = readText('12', `${PROJ}/electron/llm/prompts.ts`);
for (const name of ['CUE_RULE', 'VERBAL_TYPED_PROMPT']) {
    if (!new RegExp(`^export const ${name}\\b`, 'm').test(promptsSrc)) fail('12', `the source electron/llm/prompts.ts does not declare ${name} - the build would not match the tree the pass record names`);
}
if (!dpOk) fail('12', `the dist is not the combined cue build: ${dpWhy()}`);
const filterSha = dp.stdout.match(/filter sha256\/16 ([0-9a-f]{16})/)?.[1];
if (!filterSha) fail('12', 'dist-proof.mjs printed its verdict but no "filter sha256/16" line - it is not the dist-proof this guard was calibrated against');

// e2. The four EQ markers (plan Task 9 step 4) in the BUILT dist and in the SOURCE it came from, and no EQ dist file
//     older than its source (a source edited after the build would otherwise pass on markers alone).
const EQ_MARKERS = [
    ['llm/earlierQuestion', 'EARLIER QUESTION (asked earlier; context only'],
    ['IntelligenceEngine', 'earlier question: gate='],
    ['main', 'describeEarlierQuestionAtStartup'],
    ['llm/WhatToAnswerLLM', 'earlierQuestionBlock'],
];
for (const [rel, needle] of EQ_MARKERS) {
    const distFile = `${PROJ}/dist-electron/electron/${rel}.js`;
    const srcFile = `${PROJ}/electron/${rel}.ts`;
    if (!readText('e2', distFile).includes(needle)) fail('e2', `the built dist-electron/electron/${rel}.js does not carry the earlier-question marker "${needle}" - rebuild from a tree that has the build`);
    if (!readText('e2', srcFile).includes(needle)) fail('e2', `the source electron/${rel}.ts does not carry the earlier-question marker "${needle}" - the build would not match the tree the pass record names`);
    const dm = fs.statSync(distFile).mtimeMs;
    const sm = fs.statSync(srcFile).mtimeMs;
    if (dm < sm) fail('e2', `dist-electron/electron/${rel}.js (${new Date(dm).toISOString()}) is older than electron/${rel}.ts (${new Date(sm).toISOString()}) - the build is stale, rebuild`);
}

// g1. The n4 strings (A2.8, A3.7): parity-dist.mjs as a child, exit 0 AND both exact lines. In addition the smoke's result
//     must hold the WHY line and the two block lines with chars in 200..578 (the block's largest size is 125 label + 3 +
//     450 clip = 578). A smoke that never ran is a refusal here: the hour never flies on a feature nobody saw run.
const PARITY = opts['--parity-script'] ?? path.resolve(HERE, '..', 'followup-turn', 'build', 'parity-dist.mjs');
const PARITY_LINES = [
    'EARLIER-QUESTION REF TESTS: 47/47 passed',
    'PARITY DIST: 126 fixture entries (21 with a block) + 29 invented cases + 117 captured prompt-line rows; mismatches 0',
];
const pd = spawnSync(process.execPath, [PARITY], { encoding: 'utf8', cwd: PROJ, timeout: 120000 });
if (pd.error) fail('g1', `could not run the parity script ${PARITY}: ${pd.error.message}`);
if (pd.status !== 0) fail('g1', `parity-dist exited ${pd.status}, not 0 (last line: ${(pd.stdout.trim().split(/\r?\n/).pop() ?? '').slice(0, 160)})`);
const pdLines = new Set(pd.stdout.split(/\r?\n/).map((l) => l.trimEnd()));
for (const want of PARITY_LINES) if (!pdLines.has(want)) fail('g1', `parity-dist exited 0 but did not print the expected line "${want}" - it is not the parity gate this hour was registered with`);
const SMOKE_RESULT = opts['--smoke-result'] ?? path.resolve(HERE, '..', 'followup-turn', 'smoke', 'RESULT-smoke-eq.md');
if (!fs.existsSync(SMOKE_RESULT)) fail('g1', `the smoke result ${SMOKE_RESULT} does not exist - the smoke (b3) has not run, or its result was not written`);
const smokeText = readText('g1', SMOKE_RESULT);
if (/NOT EXERCISED/.test(smokeText)) fail('g1', 'the smoke result contains "NOT EXERCISED" - a smoke line that was not exercised is never a pass');
const smokeLine = (id, gate, cue) => new RegExp(`^[\\s>*-]*${id}: gate=${gate} cue=${cue} chars=(\\d+) turn=(\\d+)\\b`, 'm').exec(smokeText);
const smokeBlocks = [];
for (const [id, cue] of [['S1Q04F', 'constraint'], ['S1Q06F', 'pronoun']]) {
    const m = smokeLine(id, 'block', cue);
    if (!m) fail('g1', `the smoke result has no "${id}: gate=block cue=${cue} chars=<n> turn=<n>" line`);
    const chars = +m[1];
    if (!(chars >= 200 && chars <= 578)) fail('g1', `the smoke result's ${id} block is ${chars} chars, outside 200..578`);
    smokeBlocks.push(`${id} ${chars}`);
}
const why = smokeLine('WHY', 'parent-in-prompt', 'short');
if (!why || why[1] !== '0') fail('g1', 'the smoke result has no "WHY: gate=parent-in-prompt cue=short chars=0 turn=<n>" line');

// 13. Knowledge mode is ON in the persisted settings (rule 1(g)): with it off the knowledge step and its prompt are gone.
//     Only the mtime and that one key are printed; a JSON parse error's own message is never printed (it quotes the file).
let settingsFile;
if (opts['--settings']) {
    settingsFile = opts['--settings'];
} else {
    if (!process.env.APPDATA) fail('13', 'APPDATA is not set, so the persisted settings (%APPDATA%\\natively\\settings.json) cannot be found');
    settingsFile = path.join(process.env.APPDATA, 'natively', 'settings.json');
}
let settingsStat, settings;
try {
    settingsStat = fs.statSync(settingsFile);
    settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
} catch (e) {
    fail('13', `cannot read the persisted settings ${settingsFile}: ${e instanceof SyntaxError ? 'not valid JSON' : (e.code ?? e.name)}`);
}
if (typeof settings !== 'object' || settings === null || Array.isArray(settings)) fail('13', `${settingsFile} is not a JSON object`);
const knowledgeMode = settings.knowledgeMode;
if (knowledgeMode !== true) {
    const what = knowledgeMode === undefined ? 'absent (main.ts restores nothing: knowledge mode OFF)' : `${JSON.stringify(knowledgeMode)} (the boolean true is required)`;
    fail('13', `knowledge mode is not ON: knowledgeMode is ${what} in ${settingsFile} (mtime ${settingsStat.mtime.toISOString()}) - turn Context ON in the user's own app`);
}

// g2. The night gates (A2.6): night-gates.ps1 -At <T> as a child; any FAIL is a refusal. Its lines are echoed to stdout
//     (the launcher log keeps them), also on failure. The guard prints the path it used.
const NIGHT = opts['--night-gates-script'] ?? path.join(HERE, 'night-gates.ps1');
if (!fs.existsSync(NIGHT)) fail('g2', `the night-gates script ${NIGHT} does not exist - the night gates cannot be read, so the hour does not fly`);
const ng = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', NIGHT, '-At', eqT], { encoding: 'utf8', cwd: PROJ, timeout: 120000 });
console.log(`night gates script: ${NIGHT}`);
if (ng.error) fail('g2', `could not run ${NIGHT}: ${ng.error.message}`);
const ngLines = (ng.stdout ?? '').split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean);
for (const l of ngLines) console.log(l);
if (ng.status !== 0) fail('g2', `night-gates.ps1 exited ${ng.status}: ${ngLines[ngLines.length - 1] ?? '(no output)'}`);
if (ngLines[ngLines.length - 1] !== 'NIGHT GATES OK') fail('g2', `night-gates.ps1 exited 0 but its last line is "${(ngLines[ngLines.length - 1] ?? '').slice(0, 120)}", not "NIGHT GATES OK"`);

// g5. The precheck stamp (A2.6, A5): the REAL launcher only. The precheck task (T - 6 min) writes `PRECHECK OK <stamp>`
//     as the LAST line of its output after its own checks and the dry twin's run; the guard refuses without a fresh one.
let precheckNote = 'precheck not required (dry twin)';
if (opts['--require-precheck']) {
    const pcFile = opts['--precheck-file'] ?? path.join(HERE, 'eq-precheck.out.txt');
    let nowMs = Date.now();
    if (opts['--now']) { nowMs = Date.parse(opts['--now']); if (!Number.isFinite(nowMs)) fail('usage', `--now ${opts['--now']} is not an ISO instant`); }
    if (!fs.existsSync(pcFile)) fail('g5', `${pcFile} does not exist - the precheck task has not run (it is the only thing that writes it), so the hour does not fly`);
    const pcLines = readText('g5', pcFile).split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean);
    const last = pcLines[pcLines.length - 1] ?? '';
    const sm = /^PRECHECK OK (.+)$/.exec(last);
    if (!sm) fail('g5', `${pcFile} does not end with a PRECHECK OK line (its last line starts "${last.slice(0, 40)}")`);
    const stampMs = parseStamp(sm[1]);
    if (!Number.isFinite(stampMs)) fail('g5', `the PRECHECK OK stamp "${sm[1].slice(0, 40)}" is not yyyy-MM-ddTHH:mm:ss+03`);
    if (stampMs < tMs - 10 * 60000) fail('g5', `the precheck stamp ${sm[1]} is older than T - 10 min (T ${eqT}): it is not this hour's precheck`);
    if (stampMs > nowMs) fail('g5', `the precheck stamp ${sm[1]} lies after now (${local(nowMs)}): a stamp from the future is not a precheck`);
    if (nowMs > tMs + 10 * 60000) fail('g5', `now (${local(nowMs)}) is later than T + 10 min (T ${eqT}): the task started too late to fly this hour`);
    precheckNote = `PRECHECK ACCEPTED ${sm[1]}`;
    console.log(precheckNote);
}

// 10a. NAMES ONLY, never values (never print or copy key values). A `.env` line for one of these names would reach the
//      app (dotenv fills in a name process.env does not already have) and never reach this guard (the launcher's
//      `set X=` UNSETS X in cmd, it does not leave it empty). A3.7 m12 adds NATIVELY_FLIGHT_FOCUSED and NATIVELY_EQ_T.
const ENV_NAMES_GUARDED = ['NATIVELY_VERBAL_HEDGE', 'NATIVELY_VERBAL_HEDGE_TRIGGER_MS', 'NATIVELY_FOLLOWUP_PARENT', 'NATIVELY_VERBAL_PRIMARY_MODEL', 'NATIVELY_GEMINI_THINKING_LEVEL', 'NATIVELY_QUESTION_DETECTION_MODEL', 'NATIVELY_LIVE_MODEL', 'NATIVELY_FIRST_TOKEN_TIMEOUT_MS', 'NATIVELY_TURN_GATE_MS', 'NATIVELY_TURN_SETTLE_MS', 'NATIVELY_TURN_UNFINISHED_HOLD_MS', 'NATIVELY_TURN_CONTINUATION_MS', 'NATIVELY_TURN_MAX_HOLD_MS', 'NATIVELY_TURN_WORDLESS_GRACE_MS', 'NATIVELY_DETECTOR_CALIBRATE', 'NATIVELY_DETECTOR_CHAIN_TEST', 'NATIVELY_DETECTOR_CHAIN_TEST_QUESTIONS', 'NATIVELY_GEMMA_TTFT_MS', 'NATIVELY_GEMMA_MAX_ATTEMPTS', 'NATIVELY_GEMMA_VISION_TTFT_MS', 'NATIVELY_GEMMA_VISION_TTFT_BASE_MS', 'NATIVELY_GEMMA_VISION_TTFT_PER_IMAGE_MS', 'NATIVELY_GEMMA_VISION_MAX_ATTEMPTS', 'NATIVELY_STT_PROVIDER', 'NATIVELY_ROSTER', 'NATIVELY_SCENARIOS', 'NATIVELY_FLIGHT_FOCUSED', 'NATIVELY_EQ_T'];
// dotenv's own LINE regex accepts `export NAME=` and `NAME: value` as well as plain `NAME=`.
const DOTENV_NAME = /^\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)/;
const envPath = `${PROJ}/.env`;
if (fs.existsSync(envPath)) {
    const envNames = readText('10a', envPath)
        .split(/\r?\n/)
        .map((line) => line.match(DOTENV_NAME)?.[1])
        .filter(Boolean);
    const clash = ENV_NAMES_GUARDED.filter((n) => envNames.includes(n));
    if (clash.length) fail('10a', `.env declares ${clash.join(', ')} - this would reach the app and never reach this guard (see the header comment); remove it from .env before the flight`);
}
if (process.env.NATIVELY_QUESTION_DETECTION_MODEL) fail('10a', 'NATIVELY_QUESTION_DETECTION_MODEL is set - the pre-registration says the Groq question detector is unchanged; unset it');

console.log(`GUARD OK: roster scenario50 S1,S2 (${R.INTERVIEW.length} items), no model or thinking override, ${primary} LOW with the ${fallback} fallback at HIGH, hedge ON by default (NATIVELY_VERBAL_HEDGE unset; front ${fallback} HIGH, back ${primary} LOW at ${triggerMs}ms), follow-up parent OFF, earlier question flag exactly 1 (built startup line "${eqLine}"), T ${eqT} (inside 19:30 .. 01:00), R09 fix in the build and the source, HEAD pinned at ${head}, tree clean but for the allowlisted paths present [${allowlisted.join(', ') || 'none'}], ANSWER_MODELS = ${JSON.stringify(flightMjs.ANSWER_MODELS)}, focused Flash arms OFF (focusedFor null), cue build proven (dist-proof exit 0, filter sha256/16 ${filterSha}), four EQ markers in dist and source, parity-dist exit 0 with both exact lines, smoke result holds WHY and the blocks [${smokeBlocks.join(', ')}] (${SMOKE_RESULT}), knowledge mode ON (knowledgeMode = true in ${settingsFile}, mtime ${settingsStat.mtime.toISOString()}), night gates OK, ${precheckNote}, .env carries none of the guarded names, question detector unchanged`);
console.log('(this guard proves the launcher environment as ITS OWN node child resolves it, and that dist-electron plus its source carry the hedge, the cue build and the earlier-question build and pin HEAD; the app PROCESS itself is proven by the smoke and, after the hour, the run\'s own "[Main] earlier question: on" and "Knowledge mode ENABLED" lines)');
