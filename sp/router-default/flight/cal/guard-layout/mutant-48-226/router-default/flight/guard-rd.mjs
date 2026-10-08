// Pre-flight guard for flight-rd (the router-default hour: NATIVELY_LIVE_ROUTER=1 on the live40 roster), run from the repo root (MAIN)
// by launch-rd.cmd / launch-rd-dry.cmd AFTER the launcher has set the flight's environment.
// It is SP\flight-eq\guard-eq.mjs re-pinned to the router-default spec (section 10, 10.1) and plan Task 18 step 3. Interface as eq's:
// `GUARD OK: ...` on stdout and exit 0, or `GUARD FAILED: (<check>) <what was violated>` on stderr (exactly one line) and exit 1.
// Fail-fast: the first violated check is the one reported.
//
// Options. `--require-precheck` is the one the REAL launcher passes (g5). Every other option exists for calibration ONLY
// (guard-rd-cal.mjs); no launcher ever passes them:
//   --settings <file>            check 13's persisted settings (default %APPDATA%\natively\settings.json)
//   --night-gates-script <file>  g2's script (default SP\flight-eq\night-gates.ps1, by reference, unchanged)
//   --smoke-result <file>        r6's smoke result (default LAB\RESULT-smoke.md)
//   --ledger-script <file>       r7's quota ledger (default SP\quota-ledger-today.mjs)
//   --precheck-file <file>       g5's precheck output (default LAB\flight\rd-precheck.out.txt)
//   --now <iso>                  g5's and r7's clock (default the machine's)
//
// The checks (flight-eq's numbering where it carries over; r1..r7 replace eq's 1, e1, e2, g1, g3):
//   (r1) the roster the harness loads is live40 with 47 items
//   (2) the built default / fallback answer models   (3) no answer-model or thinking override reaches the app
//   (4) the level each model flies at
//   (6) the hedge is the shipped default (variable UNSET, built default ON); (7) trigger 5000 ms
//   (8) the follow-up parent flag is OFF
//   (r2) NATIVELY_LIVE_ROUTER is exactly "1" and the BUILT main.js holds the `[Router] flag` startup line code
//   (r4) NATIVELY_EARLIER_QUESTION is unset
//   (g4) NATIVELY_RD_T is `yyyy-MM-dd HH:mm`, local (+03:00) (checked early), and the clock (now) is within [T - 6 min, T + 30 min] (checked LAST, after 10a, tag g4-clock, exit 10), both ends inclusive (fix2: T is whatever the controller chose;
//        the generators, register-rd and write-arming bound T against the clock and the quota day, the guard bounds the START against T)
//   (6b) the hedge is in the build and the source   (9) the build is not stale against LLMHelper.ts
//   (10b) HEAD equals NATIVELY_FLIGHT_COMMIT and the tree is clean but for the allowlisted paths (guard-rd-git.mjs)
//   (11) ANSWER_MODELS is exactly the two Gemini lites
//   (r5) NATIVELY_FLIGHT_ARMS is exactly `high,low,captured-high`, the harness's own selectArms returns that order, and
//        NATIVELY_FLIGHT_FOCUSED is exactly "off"
//   (12) the cue build: dist-proof.mjs as a child, `function trimCues` built, CUE_RULE / VERBAL_TYPED_PROMPT declared
//   (r3) the router build: LiveRouterSession.js holds ROUTER_SHAS_OK, gemini-3.8-live and the two sha constants; the three router
//        dist files exist and none is older than its source
//   (r6) RESULT-smoke.md exists and holds context_sha12=<NATIVELY_ROUTER_CONTEXT_SHA12>
//   (r7) a fresh ledger read, one count per REQUEST the app sent (the ledger's request markers) plus NATIVELY_RD_EXTRA_REQUESTS for script calls
//        (required); refused when the ledger says its logs are incomplete or absent. The ledger's reset is proven against this guard's own clock
//        first. Headroom >= 1.5 x need on each lite
//        model (>= 224 on 3.5-lite, >= 90 on 3.1-lite; spec 10.1)
//   (13) knowledge mode is ON in the persisted settings
//   (g2) night-gates.ps1 -At <NATIVELY_RD_T> as a child: exit 0 and `NIGHT GATES OK`, its lines echoed
//   (g5) --require-precheck only: rd-precheck.out.txt ends with `PRECHECK OK <stamp>`, stamp within [T-10 min, now], now <= T+10
//   (10a) `.env` declares none of the guarded names (names only, never values)
// Run order: r1, 2-4, 6-8, r2, r4, g4 (format), 6b, 9, 10b, 11, r5, 12, r3, r6, r7, 13, g2, g5, 10a, then g4-clock LAST (fix4: after 10a, own tag, own exit code 10). 10a is the only check that
// opens a secrets-bearing file, so every other failure is reported without touching it. Every check answers differently when its
// premise is false: each was broken once in a stub tree (guard-rd-cal.txt) and the new ones were switched off once in a copy of this
// file to watch their cases fail.
//
// WHAT THIS GUARD PROVES: only that the launcher's environment, as inherited by THIS node child of the same cmd session, resolves the
// flags correctly, and that dist-electron plus the source it must have come from carry the hedge, the cue build and the router build
// and pin HEAD. It does NOT prove the spawned Electron app process received the same environment (electron/main.ts runs dotenv:
// check 10a closes that for the guarded names), nor that the router session connects (the smoke and the run's own preflight do).
// The quota check counts the requests the APP logged (hedge front and back starts, warm-ups) and adds the script-call count the arming step supplies in
// NATIVELY_RD_EXTRA_REQUESTS: calls made by scripts (probes, bare arms) are in no app log, and a non-hedge app stream has no marker; both are only as
// good as that number.
//
// Check 13 reads %APPDATA%\natively\settings.json. Run from a Claude session that path is an MSIX shadow (memory
// project_claude_sandbox_appdata); the scheduled tasks run outside the sandbox and read the real file.
//
// Location: this file lives in LAB\flight; SP = two folders up (SP\dist-proof.mjs, SP\quota-ledger-today.mjs, SP\flight-eq\night-gates.ps1).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { unexpectedDirtyPaths, allowlistedPaths, GIT_PATHSPEC } from './guard-rd-git.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));      // LAB\flight
const LAB = path.resolve(HERE, '..');
const SP = path.resolve(LAB, '..');
const PROJ = process.cwd();
const require = createRequire(`${PROJ}/package.json`);
// One line, always: a message that embeds an error's own text is folded onto a single line, so the launcher log holds
// exactly one `GUARD FAILED:` line per failure.
// exit 1 = a check failed; EXIT_WINDOW (10) = ONLY the clock check g4-clock failed (fix4 H1): the dry launcher logs it without writing the error log
const EXIT_WINDOW = 10;
const fail = (tag, msg, code = 1) => { console.error(`GUARD FAILED: (${tag}) ${String(msg).replace(/\s*\r?\n\s*/g, ' ')}`); process.exit(code); };
// Whatever a check did not foresee still ends as one named line, not a stack trace.
process.on('uncaughtException', (e) => fail('internal', `the guard itself crashed: ${String(e?.stack ?? e).split('\n').slice(0, 2).join(' ')}`));
const readText = (tag, file) => {
    try { return fs.readFileSync(file, 'utf8'); } catch (e) { return fail(tag, `cannot read ${path.relative(PROJ, file).replace(/\\/g, '/')}: ${e.code ?? e.message}`); }
};

// ---- options. Anything else on the command line is refused rather than ignored.
const VALUE_OPTS = ['--settings', '--night-gates-script', '--smoke-result', '--ledger-script', '--precheck-file', '--now'];
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
let nowMs = Date.now();
if (opts['--now']) { nowMs = Date.parse(opts['--now']); if (!Number.isFinite(nowMs)) fail('usage', `--now ${opts['--now']} is not an ISO instant`); }

// ---- time. NATIVELY_RD_T and the precheck stamp are local clock readings at UTC+3 (the hour's convention; Turkey has
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
// fix2 (user ruling 2026-10-07 00:48): no fixed windows. g4 below bounds the START against T: [T - 6 min, T + 30 min], both ends inclusive.
const START_EARLY_MIN = 6, START_LATE_MIN = 30;

// r1. The roster the harness loads. roster.mjs reads NATIVELY_ROSTER and NATIVELY_SCENARIOS at import, so this proves the
//     launcher's variables reach a node child and resolve to live40's 47 items.
let R;
try {
    R = await import(pathToFileURL(`${PROJ}/electron/test/golden/roster.mjs`).href);
} catch (e) {
    fail('r1', `roster.mjs does not load under this environment: ${e.message}`);
}
if (R.ROSTER_NAME !== 'live40') fail('r1', `the harness would load roster ${R.ROSTER_NAME}, not live40 - NATIVELY_ROSTER did not arrive`);
if (R.INTERVIEW.length !== 47) fail('r1', `live40 loaded ${R.INTERVIEW.length} items, expected 47`);

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

// 6. The hedge is the shipped default: the variable must be UNSET (the launcher's `set NATIVELY_VERBAL_HEDGE=` unsets it
//    in cmd) and any value, `1` included, refuses; the BUILT module must read ON with an empty environment.
const hedgeVar = process.env.NATIVELY_VERBAL_HEDGE;
if (hedgeVar !== undefined) fail('6', `NATIVELY_VERBAL_HEDGE is set (${JSON.stringify(hedgeVar)}) - flight-rd flies the shipped default with the variable UNSET, so the launcher must unset it, even for the value 1`);
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

// 8. The follow-up parent flag flies OFF: this hour isolates the router (the follow-up flag is not part of this build).
let F;
try {
    F = require(`${PROJ}/dist-electron/electron/llm/followUpParent.js`);
} catch (e) {
    fail('8', `dist-electron/electron/llm/followUpParent.js does not load: ${e.message}. Run npm run build:electron.`);
}
let followUpOn;
try { followUpOn = F.followUpParentEnabled(); } catch (e) { fail('8', `NATIVELY_FOLLOWUP_PARENT refuses this environment: ${e.message}`); }
if (followUpOn !== false) fail('8', 'the follow-up flag is set; flight-rd flies it OFF');

// r2. The flag under test: exactly "1" in the environment (the built code would read other spellings, " 1" included, the same way;
//     the guard does not: a trailing space on the launcher's `set` line is a defect to refuse), and the BUILT main.js carries the
//     startup line code, so the app will log `[Router] flag NATIVELY_LIVE_ROUTER=on|off` (the app-process proof is that line in the
//     run's own log). main.js must also not be older than main.ts: a source edited after the build would pass on the marker alone.
const routerVar = process.env.NATIVELY_LIVE_ROUTER;
if (routerVar !== '1') fail('r2', `NATIVELY_LIVE_ROUTER is ${routerVar === undefined ? 'unset' : JSON.stringify(routerVar)}, not exactly "1" - flight-rd flies the router ON, so the launcher must set it to 1`);
const ROUTER_FLAG_LINE = '[Router] flag NATIVELY_LIVE_ROUTER=';
const mainJs = `${PROJ}/dist-electron/electron/main.js`;
const mainTs = `${PROJ}/electron/main.ts`;
if (!readText('r2', mainJs).includes(ROUTER_FLAG_LINE)) fail('r2', `the built dist-electron/electron/main.js does not carry the startup line code "${ROUTER_FLAG_LINE}" - rebuild from a tree that has the router build`);
{
    const dm = fs.statSync(mainJs).mtimeMs;
    let sm;
    try { sm = fs.statSync(mainTs).mtimeMs; } catch (e) { fail('r2', `cannot read electron/main.ts: ${e.code ?? e.message}`); }
    if (dm < sm) fail('r2', `dist-electron/electron/main.js (${new Date(dm).toISOString()}) is older than electron/main.ts (${new Date(sm).toISOString()}) - the build is stale, rebuild`);
}

// r4. The earlier-question block is OFF: the variable must be UNSET (the launcher's `set NATIVELY_EARLIER_QUESTION=` unsets it in cmd);
//     any value, `0` and the empty string included, refuses. The run isolates the router, and the block would change the pipeline's answers.
const eqVar = process.env.NATIVELY_EARLIER_QUESTION;
if (eqVar !== undefined) fail('r4', `NATIVELY_EARLIER_QUESTION is set (${JSON.stringify(eqVar)}) - flight-rd flies with the earlier-question block OFF, so the launcher must unset it, even for the value 0`);

// g4 (format). NATIVELY_RD_T: the task time of this hour, the one value the dry twin, the guard's night gates, the precheck and the
//     registration must all agree on. yyyy-MM-dd HH:mm. The CLOCK half of g4 (now within [T - 6, T + 30] min) is the tag g4-clock and the LAST check, after 10a (fix3 F1, fix4):
//     a dry twin run outside the window still reaches and reports every other check, and fails only there.
const rdT = process.env.NATIVELY_RD_T;
const tMs = parseT(rdT);
if (!Number.isFinite(tMs)) fail('g4', `NATIVELY_RD_T is ${rdT === undefined ? 'unset' : JSON.stringify(rdT)}, not a yyyy-MM-dd HH:mm local time - the controller fills in T when the launchers are generated`);

// 6b. The hedge is in both the build and the source it must have come from. (Source checks, not check 9, bind the
//     flight: the flight may rebuild AFTER this guard runs.)
if (!helper.includes('verbal hedge: front=')) fail('6b', 'the build does not carry the hedge log line (verbal hedge: front=) - rebuild after the hedge lands');
const llmHelperSrcPath = `${PROJ}/electron/LLMHelper.ts`;
if (!readText('6b', llmHelperSrcPath).includes('streamGeminiWithHedge')) fail('6b', 'the source does not carry streamGeminiWithHedge - the build would not match the tree the pass record names');
const whatToAnswerBuilt = readText('6b', `${PROJ}/dist-electron/electron/llm/WhatToAnswerLLM.js`);
if (!whatToAnswerBuilt.includes('HEDGE_WINNER') && !whatToAnswerBuilt.includes('\\(hedge\\)__')) {
    fail('6b', 'the build does not carry the hedge winner regex (HEDGE_WINNER / \\(hedge\\)__) in WhatToAnswerLLM.js - rebuild after the hedge lands');
}

// 9. Freshness of the pre-flight dist snapshot against LLMHelper.ts (fail-closed staleness signal; checks 6b, 12, r2 and r3
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

// r5. The arms. The variable is exactly `high,low,captured-high` (spec 10.1's order: bare 3.5-lite HIGH, bare 3.1-lite LOW, captured-high),
//     and the harness's OWN selectArms, called here under THIS environment on its own PAIRED_ARMS, returns exactly those tags in that order
//     (a harness without the NATIVELY_FLIGHT_ARMS edit has no selectArms and fails here; it would otherwise fly every arm and the chains,
//     and spend quota this hour does not have). The focused-five Flash arms are OFF too: NATIVELY_FLIGHT_FOCUSED exactly "off".
const ARMS_WANT = 'high,low,captured-high';
const armsVar = process.env.NATIVELY_FLIGHT_ARMS;
if (armsVar !== ARMS_WANT) fail('r5', `NATIVELY_FLIGHT_ARMS is ${armsVar === undefined ? 'unset' : JSON.stringify(armsVar)}, not exactly "${ARMS_WANT}" - the arms of spec 10.1 in their order`);
if (typeof flightMjs.selectArms !== 'function' || !Array.isArray(flightMjs.PAIRED_ARMS)) fail('r5', 'interview60.flight.mjs has no selectArms / PAIRED_ARMS export - the NATIVELY_FLIGHT_ARMS edit (plan Task 13) is not in this tree');
let selectedArms;
try { selectedArms = flightMjs.selectArms(flightMjs.PAIRED_ARMS, process.env).map((a) => a.tag); } catch (e) { fail('r5', `the harness's selectArms refuses this environment: ${e.message}`); }
if (selectedArms.join(',') !== ARMS_WANT) fail('r5', `the harness's selectArms returns [${selectedArms.join(',')}], not [${ARMS_WANT}]`);
const focusedVar = process.env.NATIVELY_FLIGHT_FOCUSED;
if (focusedVar !== 'off') fail('r5', `NATIVELY_FLIGHT_FOCUSED is ${focusedVar === undefined ? 'unset' : JSON.stringify(focusedVar)}, not exactly "off" - without it the focused full-Flash arms could fly and spend quota this hour does not have`);

// 12. The cue build is in MAIN's dist and in the source it came from. dist-proof.mjs runs as a child so the guard and the
//     launcher's own proofs read the same markers; exit 0 AND its verdict line are required.
const DIST_PROOF = path.resolve(SP, 'dist-proof.mjs');
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

// r3. The router build, in the BUILT dist and in the source it came from. LiveRouterSession.js carries ROUTER_SHAS_OK, the model id and the two
//     sha constants (spec 4.1: the instruction and block B are pinned by sha; the module refuses to start on a mismatch); the three router
//     dist files exist and none is older than its source (a source edited after the build would otherwise pass on text alone).
const ROUTER_INSTRUCTION_SHA = 'e29bf3810128854c115214a50205ac7aa992e84bfcf35dd13147340a8cd41f3f';
const ROUTER_BLOCK_B_SHA = 'e11c240063eae0f258a1424fe49224aff5e6ffda0aafd2d6be6b553379379ad8';
const sessionJs = readText('r3', `${PROJ}/dist-electron/electron/audio/LiveRouterSession.js`);
for (const [what, needle] of [['ROUTER_SHAS_OK', 'ROUTER_SHAS_OK'], ['the router model id', 'gemini-3.8-live'], ['the INSTRUCTION sha256 constant', ROUTER_INSTRUCTION_SHA], ['the BLOCK_B sha256 constant', ROUTER_BLOCK_B_SHA]]) {
    if (!sessionJs.includes(needle)) fail('r3', `the built dist-electron/electron/audio/LiveRouterSession.js does not carry ${what} (${needle.slice(0, 20)}) - rebuild from a tree that has the router build`);
}
for (const rel of ['audio/LiveRouterSession', 'services/routerArbiter', 'services/routeReader']) {
    const distFile = `${PROJ}/dist-electron/electron/${rel}.js`;
    const srcFile = `${PROJ}/electron/${rel}.ts`;
    let dm, sm;
    try { dm = fs.statSync(distFile).mtimeMs; } catch (e) { fail('r3', `the built dist-electron/electron/${rel}.js is missing: ${e.code ?? e.message}`); }
    try { sm = fs.statSync(srcFile).mtimeMs; } catch (e) { fail('r3', `the source electron/${rel}.ts is missing: ${e.code ?? e.message}`); }
    if (dm < sm) fail('r3', `dist-electron/electron/${rel}.js (${new Date(dm).toISOString()}) is older than electron/${rel}.ts (${new Date(sm).toISOString()}) - the build is stale, rebuild`);
}

// r6. The smoke (plan Task 17) ran and recorded the context sha the app summarises the profile to: the hour never flies on a router nobody
//     saw run. NATIVELY_ROUTER_CONTEXT_SHA12 is the value the launcher carries (the harness's preflight gates it against the app's own
//     `[Router] session connect` line); here it must be 12 hex characters AND appear in RESULT-smoke.md as context_sha12=<it>.
const ctxVar = process.env.NATIVELY_ROUTER_CONTEXT_SHA12;
if (!/^[0-9a-f]{12}$/.test(ctxVar ?? '')) fail('r6', `NATIVELY_ROUTER_CONTEXT_SHA12 is ${ctxVar === undefined ? 'unset' : JSON.stringify(ctxVar)}, not 12 lowercase hex characters - the controller fills it in from the smoke`);
const SMOKE_RESULT = opts['--smoke-result'] ?? path.join(LAB, 'RESULT-smoke.md');
if (!fs.existsSync(SMOKE_RESULT)) fail('r6', `the smoke result ${SMOKE_RESULT} does not exist - the smoke has not run, or its result was not written`);
if (!new RegExp(`context_sha12=${ctxVar}(?![0-9a-f])`).test(readText('r6', SMOKE_RESULT))) fail('r6', `the smoke result ${SMOKE_RESULT} does not hold "context_sha12=${ctxVar}" - the launcher's NATIVELY_ROUTER_CONTEXT_SHA12 is not the sha the smoke recorded`);

// r7. The arming gate of spec 10.1: a FRESH ledger read (SP\quota-ledger-today.mjs as a child), headroom >= 1.5 x need on each lite model.
//     need = from arming to the end of the arms: the run (55 on 3.5-lite, 13 on 3.1-lite) plus the arms (94 and 47). If the registration
//     recomputes these, change the four constants and re-run guard-rd-cal.mjs. The ledger's reset is proven against THIS guard's own clock
//     first, so a ledger that reads the wrong quota day (the premise the spec withdrew) refuses instead of passing on stale numbers.
const NEED_35 = 149, NEED_31 = 60, MARGIN = 1.5;
const MIN_35 = Math.ceil(MARGIN * NEED_35), MIN_31 = Math.ceil(MARGIN * NEED_31);   // 224 and 90
const LEDGER = opts['--ledger-script'] ?? path.join(SP, 'quota-ledger-today.mjs');
if (!fs.existsSync(LEDGER)) fail('r7', `the quota ledger ${LEDGER} does not exist - the headroom cannot be read, so the hour does not fly`);
// fix1 I1: the app logs hold only requests the APP sent (one marker per hedge front, back and warm-up). Calls made by scripts (the smoke's and
// the probes' bare calls, replays, graders) are in no app log, so the launcher carries their count as NATIVELY_RD_EXTRA_REQUESTS (the arming step
// fills it in from the smoke and probe records); it is charged to both models, and r7 refuses without it.
const extraVar = process.env.NATIVELY_RD_EXTRA_REQUESTS;
if (!/^\d{1,4}$/.test(extraVar ?? '')) fail('r7', `NATIVELY_RD_EXTRA_REQUESTS is ${extraVar === undefined ? 'unset' : JSON.stringify(extraVar)}, not a whole number - the requests made by scripts (probes, bare arms) are in no app log, so the arming step must fill in their count from the smoke and probe records`);
const lg = spawnSync(process.execPath, [LEDGER, '--extra-requests', extraVar, ...(opts['--now'] ? ['--now', opts['--now']] : [])], { encoding: 'utf8', timeout: 120000 });
if (lg.error) fail('r7', `could not run ${LEDGER}: ${lg.error.message}`);
if (lg.status !== 0) fail('r7', `the quota ledger exited ${lg.status}, not 0`);
const summary = /^LEDGER-SUMMARY reset=(\S+) now=(\S+) cap=(\d+) used35=(\d+) used31=(\d+) extra=(\d+|unset) headroom35=(-?\d+) headroom31=(-?\d+) complete=(yes|no) oldest=(\S+)$/m.exec(lg.stdout ?? '');
if (!summary) fail('r7', 'the quota ledger printed no LEDGER-SUMMARY line in its known shape - it is not the ledger this guard was calibrated against');
if (summary[6] !== extraVar) fail('r7', `the quota ledger read extra=${summary[6]}, not the ${extraVar} it was given - it did not add the script requests`);
if (summary[9] !== 'yes') fail('r7', `the quota ledger says complete=no (oldest log stamp ${summary[10]} is after the reset ${summary[1]}): the start of the quota day was rotated out of the app logs, so the use cannot be known`);
if (summary[10] === 'none') fail('r7', 'the quota ledger found no app log at all: the smoke must have written one, so the read is not trustworthy');
{
    const DAY = 86400000;
    const midnight = Math.floor(nowMs / DAY) * DAY;
    const expectReset = new Date(midnight + 7 * 3600000 <= nowMs ? midnight + 7 * 3600000 : midnight - DAY + 7 * 3600000).toISOString();
    if (summary[1] !== expectReset) fail('r7', `the quota ledger reads the quota day starting ${summary[1]}, but the latest 07:00Z at or before now is ${expectReset} - the ledger is stale`);
}
const [headroom35, headroom31] = [+summary[7], +summary[8]];
if (headroom35 < MIN_35) fail('r7', `quota headroom on gemini-3.5-flash-lite is ${headroom35} (${summary[4]} requests incl. ${extraVar} by scripts, of ${summary[3]}), below ${MIN_35} = ${MARGIN} x the ${NEED_35} the run and arms need - the run moves to the 23:00 fallback (spec 10.1)`);
if (headroom31 < MIN_31) fail('r7', `quota headroom on gemini-3.1-flash-lite is ${headroom31} (${summary[5]} requests incl. ${extraVar} by scripts, of ${summary[3]}), below ${MIN_31} = ${MARGIN} x the ${NEED_31} the run and arms need - the run moves to the 23:00 fallback (spec 10.1)`);

// 13. Knowledge mode is ON in the persisted settings (rule 1(g)): with it off the knowledge step and its prompt are gone, and the
//     router's profile summary is empty. Only the mtime and that one key are printed; a JSON parse error's own message is never printed.
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

// g2. The night gates: night-gates.ps1 -At <T> as a child; any FAIL is a refusal. Its lines are echoed to stdout (the launcher log
//     keeps them), also on failure. The guard prints the path it used. The script is flight-eq's, unchanged, read-only.
const NIGHT = opts['--night-gates-script'] ?? path.join(SP, 'flight-eq', 'night-gates.ps1');
if (false) fail('g2', `the night-gates script ${NIGHT} does not exist - the night gates cannot be read, so the hour does not fly`);
const ng = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', NIGHT, '-At', rdT], { encoding: 'utf8', cwd: PROJ, timeout: 120000 });
console.log(`night gates script: ${NIGHT}`);
if (ng.error) fail('g2', `could not run ${NIGHT}: ${ng.error.message}`);
const ngLines = (ng.stdout ?? '').split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean);
for (const l of ngLines) console.log(l);
if (ng.status !== 0) fail('g2', `night-gates.ps1 exited ${ng.status}: ${ngLines[ngLines.length - 1] ?? '(no output)'}`);
if (ngLines[ngLines.length - 1] !== 'NIGHT GATES OK') fail('g2', `night-gates.ps1 exited 0 but its last line is "${(ngLines[ngLines.length - 1] ?? '').slice(0, 120)}", not "NIGHT GATES OK"`);

// g5. The precheck stamp: the REAL launcher only. The precheck task (T - 6 min) writes `PRECHECK OK <stamp>` as the LAST line of its
//     output after its own checks and the dry twin's run; the guard refuses without a fresh one.
let precheckNote = 'precheck not required (dry twin)';
if (opts['--require-precheck']) {
    const pcFile = opts['--precheck-file'] ?? path.join(HERE, 'rd-precheck.out.txt');
    if (!fs.existsSync(pcFile)) fail('g5', `${pcFile} does not exist - the precheck task has not run (it is the only thing that writes it), so the hour does not fly`);
    const pcLines = readText('g5', pcFile).split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean);
    const last = pcLines[pcLines.length - 1] ?? '';
    const sm = /^PRECHECK OK (.+)$/.exec(last);
    if (!sm) fail('g5', `${pcFile} does not end with a PRECHECK OK line (its last line starts "${last.slice(0, 40)}")`);
    const stampMs = parseStamp(sm[1]);
    if (!Number.isFinite(stampMs)) fail('g5', `the PRECHECK OK stamp "${sm[1].slice(0, 40)}" is not yyyy-MM-ddTHH:mm:ss+03`);
    if (stampMs < tMs - 10 * 60000) fail('g5', `the precheck stamp ${sm[1]} is older than T - 10 min (T ${rdT}): it is not this hour's precheck`);
    if (stampMs > nowMs) fail('g5', `the precheck stamp ${sm[1]} lies after now (${local(nowMs)}): a stamp from the future is not a precheck`);
    if (nowMs > tMs + 10 * 60000) fail('g5', `now (${local(nowMs)}) is later than T + 10 min (T ${rdT}): the task started too late to fly this hour`);
    precheckNote = `PRECHECK ACCEPTED ${sm[1]}`;
    console.log(precheckNote);
}

// 10a. NAMES ONLY, never values (never print or copy key values). A `.env` line for one of these names would reach the app (dotenv
//      fills in a name process.env does not already have) and never reach this guard (the launcher's `set X=` UNSETS X in cmd, it does
//      not leave it empty). Names the launcher SETS to a value cannot be overridden by .env, but eq listed its own set names too and
//      so does this guard.
const ENV_NAMES_GUARDED = ['NATIVELY_VERBAL_HEDGE', 'NATIVELY_VERBAL_HEDGE_TRIGGER_MS', 'NATIVELY_FOLLOWUP_PARENT', 'NATIVELY_VERBAL_PRIMARY_MODEL', 'NATIVELY_GEMINI_THINKING_LEVEL', 'NATIVELY_QUESTION_DETECTION_MODEL', 'NATIVELY_LIVE_MODEL', 'NATIVELY_FIRST_TOKEN_TIMEOUT_MS', 'NATIVELY_TURN_GATE_MS', 'NATIVELY_TURN_SETTLE_MS', 'NATIVELY_TURN_UNFINISHED_HOLD_MS', 'NATIVELY_TURN_CONTINUATION_MS', 'NATIVELY_TURN_MAX_HOLD_MS', 'NATIVELY_TURN_WORDLESS_GRACE_MS', 'NATIVELY_DETECTOR_CALIBRATE', 'NATIVELY_DETECTOR_CHAIN_TEST', 'NATIVELY_DETECTOR_CHAIN_TEST_QUESTIONS', 'NATIVELY_GEMMA_TTFT_MS', 'NATIVELY_GEMMA_MAX_ATTEMPTS', 'NATIVELY_GEMMA_VISION_TTFT_MS', 'NATIVELY_GEMMA_VISION_TTFT_BASE_MS', 'NATIVELY_GEMMA_VISION_TTFT_PER_IMAGE_MS', 'NATIVELY_GEMMA_VISION_MAX_ATTEMPTS', 'NATIVELY_STT_PROVIDER', 'NATIVELY_ROSTER', 'NATIVELY_SCENARIOS', 'NATIVELY_FLIGHT_FOCUSED', 'NATIVELY_EARLIER_QUESTION', 'NATIVELY_RD_T'];
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

// g4-clock (fix4 H2, H3): the LAST check, after 10a. A dry twin outside [T - 6, T + 30] has then passed every other check, the .env scan included, and fails only here, with its own tag
// and its own exit code. Reaching this line means no other check failed.
if (nowMs < tMs - START_EARLY_MIN * 60000 || nowMs > tMs + START_LATE_MIN * 60000) fail('g4-clock', `now (${local(nowMs)}) is outside [T - ${START_EARLY_MIN} min, T + ${START_LATE_MIN} min] for NATIVELY_RD_T ${rdT}: every other check passed, 10a included; only the start time is wrong`, EXIT_WINDOW);

console.log(`GUARD OK: roster live40 (${R.INTERVIEW.length} items), no model or thinking override, ${primary} LOW with the ${fallback} fallback at HIGH, hedge ON by default (NATIVELY_VERBAL_HEDGE unset; front ${fallback} HIGH, back ${primary} LOW at ${triggerMs}ms), follow-up parent OFF, router flag exactly 1 (built startup line code present), earlier question unset, T ${rdT} (clock within [T - 6, T + 30] min), HEAD pinned at ${head}, tree clean but for the allowlisted paths present [${allowlisted.join(', ') || 'none'}], ANSWER_MODELS = ${JSON.stringify(flightMjs.ANSWER_MODELS)}, arms exactly ${ARMS_WANT} (selectArms returns ${selectedArms.join(',')}), focused Flash arms OFF, cue build proven (dist-proof exit 0, filter sha256/16 ${filterSha}), router build in dist and source (three router dist files fresh, both sha constants present), smoke result holds context_sha12=${ctxVar} (${SMOKE_RESULT}), quota headroom ${headroom35} on 3.5-lite (>= ${MIN_35}) and ${headroom31} on 3.1-lite (>= ${MIN_31}) from the ledger reset ${summary[1]}, knowledge mode ON (knowledgeMode = true in ${settingsFile}, mtime ${settingsStat.mtime.toISOString()}), night gates OK, ${precheckNote}, .env carries none of the guarded names, question detector unchanged`);
console.log('(this guard proves the launcher environment as ITS OWN node child resolves it, and that dist-electron plus its source carry the hedge, the cue build and the router build and pin HEAD; the app PROCESS itself is proven by the smoke and, after the hour, the run\'s own "[Router] flag NATIVELY_LIVE_ROUTER=on", "[Router] session up" and "Knowledge mode ENABLED" lines)');
