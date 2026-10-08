// Pre-flight guard for h40d (holdout40's fourth flight: cue mode's validation hour), run from the repo root (MAIN) by
// launch-h40d.cmd AFTER the launcher has set the flight's environment. It is guard-h40c.mjs re-pinned to
// PREREGISTER-h40d.r4.md section 7.4, with two new checks (12, 13). Same interface as h40c's: no arguments in the
// launcher, `GUARD OK: ...` on stdout and exit 0, or `GUARD FAILED: (<check>) <what was violated>` on stderr and
// exit 1. Fail-fast: the first violated check is the one reported. The one option, `--settings <file>`, points
// check 13 at a stub for calibration; the launcher never passes it.
//
// The checks (r4's numbering; (6b) is h40c's old check 8, kept; run order is not numeric order, see the end):
//   (1) the roster the harness loads is holdout40, 45 items
//   (2) the built default / fallback answer models   (3) no answer-model or thinking override reaches the app
//   (4) the level each model flies at (3.1-lite LOW, the 3.5-lite fallback turned to HIGH)
//   (5) the R09 fix is in the build AND the source
//   (6) the hedge is the shipped default: NATIVELY_VERBAL_HEDGE must be UNSET (any value, `1` and `0` included,
//       refuses), and the BUILT module must resolve it ON with an empty environment (guard-br1.mjs's `hedge` check,
//       which FAILS on a build older than f745d7e); (6b) the hedge is in the build and in the source
//   (7) the hedge trigger is 5000 ms        (8) the follow-up parent flag is OFF
//   (9) the build is not stale against LLMHelper.ts
//   (10b) MAIN's HEAD equals NATIVELY_FLIGHT_COMMIT and the tree the flight's rebuild compiles is clean but for the
//         allowlisted paths (guard-h40d-git.mjs)
//   (11) the answer-model list has exactly the two Gemini lites (no Groq id)
//   (12) the cue build is in MAIN's dist and the source it came from: dist-proof.mjs as a child, `function trimCues`
//        in the built filter, `CUE_RULE` and `VERBAL_TYPED_PROMPT` declared in the source prompts.ts
//   (13) knowledge mode is ON in the persisted settings (rule 1(g))
//   (10a) `.env` declares none of the guarded names (names only, never values)
// Run order: 1-9, 10b, 11, 12, 13, then 10a LAST. 10a is the only check that opens a secrets-bearing file, so every
// other failure is reported without touching it. Every check answers differently when its premise is false: each was
// broken once in a stub tree, 10b and 12 also against MAIN's root, and each was switched off once in a copy of this
// file to watch its cases fail (VH\guard-h40d-cal.txt, VH\instruments\guard-h40d-cal.mjs). 10b's git calls only READ
// (`status --no-optional-locks`: no index lock on MAIN).
//
// WHAT THIS GUARD PROVES (h40c's wording, unchanged): only that the launcher's environment, as inherited by THIS node
// child of the same cmd session, resolves the flags correctly, and that dist-electron plus the source it must have come
// from carry the hedge and the cue build and pin HEAD. It does NOT prove the spawned Electron app process received the
// same environment (electron/main.ts runs dotenv, which fills in any name `.env` declares that process.env lacks: check
// 10a closes that for the guarded names). The app-process proofs are the pre-hour MAIN start (r4 7.3) and, after the
// hour, the app's own `[Main] verbal hedge: on trigger=5000ms` line and the `Knowledge mode ENABLED` line (rule 1(a), 1(g)).
//
// Check 13 reads %APPDATA%\natively\settings.json. Run from a Claude session that path is an MSIX shadow (memory
// project_claude_sandbox_appdata); the scheduled tasks (the dry twin, the flight) run outside the sandbox and read the
// real file. The guard prints that file's path, mtime and the knowledgeMode key, nothing else from it.
//
// Location: this file lives in VH; ../guard-r09.mjs and ../dist-proof.mjs are SP's (h40c's, unchanged).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { unexpectedDirtyPaths, allowlistedPaths, GIT_PATHSPEC } from './guard-h40d-git.mjs';
import { r09Missing } from '../guard-r09.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJ = process.cwd();
const require = createRequire(`${PROJ}/package.json`);
// One line, always: a message that embeds an error's own text (node's MODULE_NOT_FOUND carries a "Require stack:" list)
// is folded onto a single line, so the launcher log holds exactly one `GUARD FAILED:` line per failure.
const fail = (tag, msg) => { console.error(`GUARD FAILED: (${tag}) ${String(msg).replace(/\s*\r?\n\s*/g, ' ')}`); process.exit(1); };
// Whatever a check did not foresee (a built module whose shape changed, say) still ends as one named line, not a stack trace.
process.on('uncaughtException', (e) => fail('internal', `the guard itself crashed: ${String(e?.stack ?? e).split('\n').slice(0, 2).join(' ')}`));
// A missing or unreadable file is a named failure, not a stack trace.
const readText = (tag, file) => {
    try { return fs.readFileSync(file, 'utf8'); } catch (e) { return fail(tag, `cannot read ${path.relative(PROJ, file).replace(/\\/g, '/')}: ${e.code ?? e.message}`); }
};

// The one option. Anything else on the command line is refused rather than ignored.
const argv = process.argv.slice(2);
const settingsIdx = argv.indexOf('--settings');
const consumed = settingsIdx >= 0 ? new Set([settingsIdx, settingsIdx + 1]) : new Set();
const stray = argv.filter((_, i) => !consumed.has(i));
if (stray.length) fail('usage', `unknown argument(s): ${stray.join(' ')} (the only option is --settings <file>, for calibration)`);
if (settingsIdx >= 0 && !argv[settingsIdx + 1]) fail('usage', '--settings needs a file');

// 1. The roster the harness loads. roster.mjs reads NATIVELY_ROSTER at import, so this proves the launcher's variable
//    reaches a node child and resolves to holdout40's 45 items.
let R;
try {
    R = await import(pathToFileURL(`${PROJ}/electron/test/golden/roster.mjs`).href);
} catch (e) {
    fail('1', `roster.mjs does not load under this environment: ${e.message}`);
}
if (R.ROSTER_NAME !== 'holdout40') fail('1', `the harness would load roster ${R.ROSTER_NAME}, not holdout40 - NATIVELY_ROSTER did not arrive`);
if (R.INTERVIEW.length !== 45) fail('1', `holdout40 loaded ${R.INTERVIEW.length} items, expected 45`);

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

// 3. No override reaches the app. Resolved through the built code under THIS environment: with an override set,
//    either model would come back as the override instead of itself.
for (const m of ALLOWED) {
    let got;
    try { got = V.verbalPrimaryModel(m, ALLOWED); } catch (e) { fail('3', `the answer-model override refuses this environment: ${e.message}`); }
    if (got !== m) fail('3', `an answer-model override is set: ${m} resolves to ${got}`);
}
let level;
try { level = T.geminiThinkingLevelFromEnv(); } catch (e) { fail('3', `the thinking-level override refuses this environment: ${e.message}`); }
if (level !== 'LOW') fail('3', `the app would think at ${level}, not the shipped LOW - NATIVELY_GEMINI_THINKING_LEVEL is set`);

// 4. The level each model flies at: 3.1-lite at LOW, the 3.5-lite fallback turned to HIGH because it ignores LOW.
if (T.thinkingLevelForModel(primary, level) !== 'LOW') fail('4', `${primary} would not fly at LOW`);
if (T.thinkingLevelForModel(fallback, level) !== 'HIGH') fail('4', `the ${fallback} fallback would fly at a level it ignores`);

// 5. The R09 fix is in both the build and the source it must have come from: a rebuild after a later revert of
//    electron/knowledge/IntentClassifier.ts would otherwise leave a passing guard over a stale-but-fixed dist.
const distReason = r09Missing(readText('5', `${PROJ}/dist-electron/electron/knowledge/IntentClassifier.js`));
if (distReason) fail('5', `the build ${distReason} - rebuild after the R09 fix`);
const srcReason = r09Missing(readText('5', `${PROJ}/electron/knowledge/IntentClassifier.ts`));
if (srcReason) fail('5', `the source ${srcReason} - the build would not match the tree the pass record names`);

// 6. The hedge is the shipped default (f745d7e: unset = ON; '0' = the old stall race; anything else refuses to start),
//    and this hour tests the default. So the variable must be UNSET - the launcher's `set NATIVELY_VERBAL_HEDGE=`
//    unsets it in cmd - and a value of any kind, `1` included, refuses: a flag that is set is a flag somebody chose.
const hedgeVar = process.env.NATIVELY_VERBAL_HEDGE;
if (hedgeVar !== undefined) fail('6', `NATIVELY_VERBAL_HEDGE is set (${JSON.stringify(hedgeVar)}) - h40d flies the shipped default with the variable UNSET, so the launcher must unset it, even for the value 1`);
let V2;
try {
    V2 = require(`${PROJ}/dist-electron/electron/llm/verbalHedge.js`);
} catch (e) {
    fail('6', `dist-electron/electron/llm/verbalHedge.js does not load: ${e.message}. Run npm run build:electron.`);
}
// guard-br1.mjs's hedgeDefaultCheck: the BUILT module reads "on trigger=5000ms" with NO variables at all (the default
// itself is the hedge). A build older than the default flip says "off" here, whatever the launcher sets.
const HEDGE_LINE = '[Main] verbal hedge: on trigger=5000ms';
let bare;
try { bare = V2.describeVerbalHedgeAtStartup({}); } catch (e) { fail('6', `the built verbalHedge.describeVerbalHedgeAtStartup threw on an empty environment: ${e.message}`); }
if (bare !== HEDGE_LINE) fail('6', `the built default is not the hedge: "${bare}", want "${HEDGE_LINE}" - rebuild from a tree with the hedge default (f745d7e)`);
// (With the variable unset, the built module's default is what the app runs: h40c's separate "does it resolve ON
// under this environment" read is subsumed by the line above and cannot fail on its own, so it is not repeated.)

// 7. The hedge trigger resolves to the probed 5000 ms default (an override would mean the hour did not test the
//    probed value). The exact line the app logs at startup (rule 1(a)) is the `bare` line above.
let triggerMs;
try { triggerMs = V2.verbalHedgeTriggerMs(); } catch (e) { fail('7', `NATIVELY_VERBAL_HEDGE_TRIGGER_MS refuses this environment: ${e.message}`); }
if (triggerMs !== 5000) fail('7', `the hedge trigger is ${triggerMs}ms, not the probed 5000ms - NATIVELY_VERBAL_HEDGE_TRIGGER_MS is set`);

// 8. The follow-up parent flag flies OFF: this hour isolates cue mode, so the other flag must not be on, or the pass
//    record could not tell which change moved the numbers.
let F;
try {
    F = require(`${PROJ}/dist-electron/electron/llm/followUpParent.js`);
} catch (e) {
    fail('8', `dist-electron/electron/llm/followUpParent.js does not load: ${e.message}. Run npm run build:electron.`);
}
let followUpOn;
try { followUpOn = F.followUpParentEnabled(); } catch (e) { fail('8', `NATIVELY_FOLLOWUP_PARENT refuses this environment: ${e.message}`); }
if (followUpOn !== false) fail('8', 'the follow-up flag is set; h40d flies it OFF');

// 6b. (h40c's check 8) The hedge is in both the build and the source it must have come from. THESE SOURCE CHECKS (5,
//     6b, 12), not check 9, are the ones that bind the flight: the flight rebuilds AFTER this guard runs, so only a
//     check against the SOURCE tree can speak for what the rebuild produces.
if (!helper.includes('verbal hedge: front=')) fail('6b', 'the build does not carry the hedge log line (verbal hedge: front=) - rebuild after the hedge lands');
const llmHelperSrcPath = `${PROJ}/electron/LLMHelper.ts`;
if (!readText('6b', llmHelperSrcPath).includes('streamGeminiWithHedge')) fail('6b', 'the source does not carry streamGeminiWithHedge - the build would not match the tree the pass record names');
const whatToAnswerBuilt = readText('6b', `${PROJ}/dist-electron/electron/llm/WhatToAnswerLLM.js`);
// A plain `.includes('(hedge)')` is also satisfied by the JSDoc comment above HEDGE_WINNER; `HEDGE_WINNER` is the
// const's own name and `\(hedge\)__` (the literal backslashes a regex source prints) appears only inside that regex.
if (!whatToAnswerBuilt.includes('HEDGE_WINNER') && !whatToAnswerBuilt.includes('\\(hedge\\)__')) {
    fail('6b', 'the build does not carry the hedge winner regex (HEDGE_WINNER / \\(hedge\\)__) in WhatToAnswerLLM.js - rebuild after the hedge lands');
}

// 9. Freshness: a stale dist would fly without what the source has. This check runs BEFORE the flight's own rebuild
//    (`auto` rebuilds after this guard exits), so it only proves the pre-flight dist snapshot is not currently stale;
//    checks 5, 6b and 12 are what make the flight correct. Kept (as h40c kept it) because a fail-closed staleness
//    signal is cheap; a bare `touch` on LLMHelper.ts can also trip it harmlessly.
const distMtime = fs.statSync(helperPath).mtimeMs;
const srcMtime = fs.statSync(llmHelperSrcPath).mtimeMs;
if (distMtime < srcMtime) fail('9', `dist-electron/electron/LLMHelper.js (${new Date(distMtime).toISOString()}) is older than electron/LLMHelper.ts (${new Date(srcMtime).toISOString()}) - the build is stale, rebuild`);

// 10b. Pins the tree the flight's own rebuild will compile. MAIN is shared with peer sessions: a peer edit between
//      registration and the hour would fly under the registered commit's name without moving HEAD. No hardcoded
//      default for the commit: the launcher sets NATIVELY_FLIGHT_COMMIT (the registered HEAD), and a guard that
//      passed against a stale expectation would be worse than one that refuses. Trimmed before comparing, so a
//      trailing space on the launcher's `set` line cannot make this refuse for a reason that is not the commit.
const registeredCommit = process.env.NATIVELY_FLIGHT_COMMIT?.trim();
if (!registeredCommit) fail('10b', 'NATIVELY_FLIGHT_COMMIT is not set - the launcher must set it to the commit this flight is registered for (the registered HEAD)');
// A placeholder token, an abbreviation or a typo can never equal HEAD: name that, instead of printing a mismatch.
if (!/^[0-9a-f]{40}$/.test(registeredCommit)) fail('10b', `NATIVELY_FLIGHT_COMMIT is ${JSON.stringify(registeredCommit)}, not a full 40-hex commit hash - the controller fills in the registered HEAD at arming`);
let head;
try {
    // (a timeout on every child: a hung git or dist-proof must end as a named failure, not hold the launcher until the task's limit)
    head = execFileSync('git', ['-C', PROJ, 'rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 }).trim();
} catch (e) {
    fail('10b', `git rev-parse HEAD failed: ${e.message}`);
}
if (head !== registeredCommit) fail('10b', `MAIN HEAD is ${head}, not the registered commit ${registeredCommit} (NATIVELY_FLIGHT_COMMIT) - a peer or a later commit moved the tree since registration, or the merge has not landed`);
let statusOut;
try {
    // --no-optional-locks: a status that only READS must not take MAIN's index lock (peer sessions share that index).
    statusOut = execFileSync('git', ['--no-optional-locks', '-C', PROJ, 'status', '--porcelain', '--', ...GIT_PATHSPEC], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 });
} catch (e) {
    fail('10b', `git status failed: ${e.message}`);
}
const dirty = unexpectedDirtyPaths(statusOut);
if (dirty.length) fail('10b', `the tree the flight's rebuild will compile is not clean: ${dirty.join('; ')}`);
const allowlisted = allowlistedPaths(statusOut);

// 11. Mechanically proves the Groq-arm removal: ANSWER_MODELS is imported live from the tree's own
//     interview60.flight.mjs (the source of truth the flight reads at run time). An EXACT array match, order, length
//     and content, against the two ids PAIRED_ARMS indexes by position ([0] primary, [1] fallback): a rename, a
//     reorder, a dropped id, an extra id or an absent export (which "no Groq id" would pass) all fail by one test.
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

// 12. The cue build is in MAIN's dist and in the source it came from (merge review item 6; r4 section 2's Build row).
//     dist-proof.mjs runs as a child so the guard and the launcher's own two proofs read the same markers; exit 0 AND
//     its verdict line are required (an exit code alone would pass a replaced, no-op dist-proof). Its output is kept
//     to quote in the failure of whichever sub-check trips first.
const DIST_PROOF = path.resolve(HERE, '..', 'dist-proof.mjs');
const dp = spawnSync(process.execPath, [DIST_PROOF, '--root', PROJ, '--expect', 'combined', '--prefix-count', '3', '--offers-marker', 'offers block before the spoken answer'], { encoding: 'utf8', cwd: PROJ, timeout: 120000 });
const VERDICT = 'DIST PROOF: THE COMBINED BUILD, every marker as expected';
const dpOk = !dp.error && dp.status === 0 && dp.stdout.includes(VERDICT);
// What the failing dist-proof said: every BAD marker (file, count, needle; its explanation dropped) and a crash, if any.
// On a pre-cue dist it prints its BAD lines and then throws on the missing CUE_RULE export (node's uncaught-exception
// exit code is also 1, so the exit code alone cannot tell the two endings apart).
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
// A declaration at the start of a line: a comment that merely names the constant must not satisfy this.
for (const name of ['CUE_RULE', 'VERBAL_TYPED_PROMPT']) {
    if (!new RegExp(`^export const ${name}\\b`, 'm').test(promptsSrc)) fail('12', `the source electron/llm/prompts.ts does not declare ${name} - the build would not match the tree the pass record names`);
}
if (!dpOk) fail('12', `the dist is not the combined cue build: ${dpWhy()}`);
const filterSha = dp.stdout.match(/filter sha256\/16 ([0-9a-f]{16})/)?.[1];
if (!filterSha) fail('12', 'dist-proof.mjs printed its verdict but no "filter sha256/16" line - it is not the dist-proof this guard was calibrated against');

// 13. Knowledge mode is ON in the persisted settings (rule 1(g), re-check N1): the Context toggle writes
//     `knowledgeMode` to %APPDATA%\natively\settings.json (ipcHandlers.ts:3030, SettingsManager.ts:28) and main.ts:687
//     restores it at start (`if (sm.get('knowledgeMode'))`: any truthy value; the toggle only ever writes a boolean, so
//     r4's `=== true` is the same test for every file the app can write, and stricter for a hand-edited one). With it
//     off the knowledge step and its prompt are gone, and 2a and rule 3 would compare another configuration with h40c's.
//     Only the mtime and that one key are printed; a JSON parse error's own message is never printed either (it
//     quotes the file's text).
let settingsFile;
if (settingsIdx >= 0) {
    settingsFile = argv[settingsIdx + 1];
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

// 10a. NAMES ONLY, never values (never print or copy key values). A `.env` line for one of these names would reach the
//      app (dotenv fills in a name process.env does not already have) and never reach this guard (the launcher's
//      `set X=` UNSETS X in cmd, it does not leave it empty). NATIVELY_QUESTION_DETECTION_MODEL can override the app's
//      Groq question detector (GroqDetectionClient.ts:66), which the pre-registration names as unchanged.
const ENV_NAMES_GUARDED = ['NATIVELY_VERBAL_HEDGE', 'NATIVELY_VERBAL_HEDGE_TRIGGER_MS', 'NATIVELY_FOLLOWUP_PARENT', 'NATIVELY_VERBAL_PRIMARY_MODEL', 'NATIVELY_GEMINI_THINKING_LEVEL', 'NATIVELY_QUESTION_DETECTION_MODEL', 'NATIVELY_LIVE_MODEL', 'NATIVELY_FIRST_TOKEN_TIMEOUT_MS', 'NATIVELY_TURN_GATE_MS', 'NATIVELY_TURN_SETTLE_MS', 'NATIVELY_TURN_UNFINISHED_HOLD_MS', 'NATIVELY_TURN_CONTINUATION_MS', 'NATIVELY_TURN_MAX_HOLD_MS', 'NATIVELY_TURN_WORDLESS_GRACE_MS', 'NATIVELY_DETECTOR_CALIBRATE', 'NATIVELY_DETECTOR_CHAIN_TEST', 'NATIVELY_DETECTOR_CHAIN_TEST_QUESTIONS', 'NATIVELY_GEMMA_TTFT_MS', 'NATIVELY_GEMMA_MAX_ATTEMPTS', 'NATIVELY_GEMMA_VISION_TTFT_MS', 'NATIVELY_GEMMA_VISION_TTFT_BASE_MS', 'NATIVELY_GEMMA_VISION_TTFT_PER_IMAGE_MS', 'NATIVELY_GEMMA_VISION_MAX_ATTEMPTS', 'NATIVELY_STT_PROVIDER', 'NATIVELY_ROSTER', 'NATIVELY_SCENARIOS'];
// dotenv 17.3.1's own LINE regex (node_modules/dotenv/lib/main.js) accepts `export NAME=` and `NAME: value` as well as
// plain `NAME=`; `line.split('=')[0]` would miss both. Same name-capture shape, simplified to a name, not a value.
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
// The detector override must also be unset in THIS process's environment: dist has no exported resolver for it
// (GroqDetectionClient reads process.env inline), so check it directly.
if (process.env.NATIVELY_QUESTION_DETECTION_MODEL) fail('10a', 'NATIVELY_QUESTION_DETECTION_MODEL is set - the pre-registration says the Groq question detector is unchanged; unset it');

console.log(`GUARD OK: roster holdout40 (${R.INTERVIEW.length} items), no model or thinking override, ${primary} LOW with the ${fallback} fallback at HIGH, hedge ON by default (NATIVELY_VERBAL_HEDGE unset; front ${fallback} HIGH, back ${primary} LOW at ${triggerMs}ms), follow-up parent OFF, R09 fix in the build and the source, HEAD pinned at ${head}, tree clean but for the allowlisted paths present [${allowlisted.join(', ') || 'none'}], cue build proven (dist-proof exit 0, filter sha256/16 ${filterSha}, function trimCues built, CUE_RULE and VERBAL_TYPED_PROMPT declared in the source), knowledge mode ON (knowledgeMode = true in ${settingsFile}, mtime ${settingsStat.mtime.toISOString()}), .env carries none of the guarded names, question detector unchanged, ANSWER_MODELS = ${JSON.stringify(flightMjs.ANSWER_MODELS)}`);
console.log('(this guard proves the launcher environment as ITS OWN node child resolves it, and that dist-electron plus its source carry the hedge and the cue build and pin HEAD; the app PROCESS itself is proven by the pre-hour MAIN start and, after the hour, the run\'s own "[Main] verbal hedge: on trigger=5000ms" and "Knowledge mode ENABLED" lines)');
