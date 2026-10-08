// Pre-flight guard for h40c, run from the repo root by launch-h40c.cmd AFTER the launcher has set
// the flight's environment. h40c = holdout40's third flight with the verbal hedge ON
// (NATIVELY_VERBAL_HEDGE=1) and the follow-up parent restore OFF. Checks 1-5 are h40b's own
// (roster, no override, the built default/fallback and their levels, the R09 fix in dist AND
// source); checks 6-9 add the hedge and follow-up flags: that they resolve as the flight needs
// under this environment, that the hedge is in both the build and the source it must have come
// from, and that the build is not stale against that source. Checks 10a-10b (fix round 1, review
// findings I1/I8) close two gaps those first nine cannot: a name-only .env scan, and a git-based
// pin of the tree the flight's own rebuild will compile. Every check answers differently if its
// premise is false.
//
// WHAT THIS GUARD PROVES (fix round 1, review finding I1 — the previous wording overclaimed):
// only that the launcher's environment, as inherited by THIS node child of the same cmd session,
// resolves the flags correctly, and that dist-electron plus the source it must have come from
// carry the hedge and pin HEAD. It does NOT prove the spawned Electron app process received the
// same environment — that process is three hops away (flight.mjs -> run.mjs `app:start` ->
// detached `app:keep` -> `cmd /c npm start` -> electron), and each hop's `env: {...process.env}`
// spread normally carries the launcher's `set` values through, but electron/main.ts:6 also runs
// `require('dotenv').config()`, which fills in any name `.env` declares that process.env does
// NOT already have. Since the launcher's `set NATIVELY_FOLLOWUP_PARENT=` (no value) UNSETS the
// name in cmd rather than leaving it empty, a `.env` line for that name — or
// NATIVELY_VERBAL_HEDGE_TRIGGER_MS, NATIVELY_VERBAL_PRIMARY_MODEL, NATIVELY_GEMINI_THINKING_LEVEL
// — would reach the app and never reach this guard. Check 10a closes the currently-latent version
// of that gap (today .env declares no NATIVELY_* name); it cannot close a future change to the
// hop code itself (I1's point (a)).
//
// THE APP-PROCESS PROOFS THIS GUARD CANNOT SUBSTITUTE FOR:
// - before the hour: Task 7's smoke, which exercises the same app:start chain this flight uses;
// - after the hour: the app's own startup line, `[Main] verbal hedge: on trigger=5000ms` or
//   `[Main] verbal hedge: off` (describeVerbalHedgeAtStartup, logged before credentials load —
//   read it from BEFORE the run's own timeline window, per I2), and the `verbal hedge: won by`
//   lines, which can only exist if verbalHedgeEnabled() was true INSIDE the app. Both are read by
//   h40c-hedge-stats.mjs after the hour (its `startupFlag` field and its won-by counts).
// Also unseen: the model the app has SAVED as its selection (credentials.enc, never read) — the
// liveness check reads the app's own "verbal stall race: trying <model>" or "verbal hedge:
// front=..." line instead.
//
// Exit 0 = ready. Exit 1 = a named check failed; the message says which.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { unexpectedDirtyPaths } from './guard-h40c-git.mjs';

// I8: the commit this flight is registered for. NO hardcoded default: the controller is moving
// HEAD again (2026-09-26 19:05 addition — dropping the two Groq answer arms in a separate
// commit), so a constant fixed here would go stale the moment that commit lands, and a guard
// that silently passed against a stale expectation is worse than one that refuses. The launcher
// sets NATIVELY_FLIGHT_COMMIT; the controller fills in the final HEAD there after the arm-removal
// commit and the pre-registration commit both land.

const PROJ = process.cwd();
const require = createRequire(`${PROJ}/package.json`);
const fail = (msg) => { console.error(`GUARD FAILED: ${msg}`); process.exit(1); };

// 1. The roster the harness loads. roster.mjs reads NATIVELY_ROSTER at import, so this proves
//    the launcher's variable reaches a node child and resolves to holdout40's 45 items.
let R;
try {
    R = await import(pathToFileURL(`${PROJ}/electron/test/golden/roster.mjs`).href);
} catch (e) {
    fail(`roster.mjs does not load under this environment: ${e.message}`);
}
if (R.ROSTER_NAME !== 'holdout40') fail(`the harness would load roster ${R.ROSTER_NAME}, not holdout40 - NATIVELY_ROSTER did not arrive`);
if (R.INTERVIEW.length !== 45) fail(`holdout40 loaded ${R.INTERVIEW.length} items, expected 45`);

let V, T;
try {
    V = require(`${PROJ}/dist-electron/electron/llm/verbalPrimaryModel.js`);
    T = require(`${PROJ}/dist-electron/electron/llm/geminiThinking.js`);
} catch (e) {
    fail(`dist-electron does not load: ${e.message}. Run npm run build:electron.`);
}

// 2. The built default and fallback. Read as text: LLMHelper.js pulls in the whole app.
const helperPath = `${PROJ}/dist-electron/electron/LLMHelper.js`;
const helper = fs.readFileSync(helperPath, 'utf8');
const primary = helper.match(/const GEMINI_FLASH_MODEL = "([^"]+)"/)?.[1];
const fallback = helper.match(/const GEMINI_FLASH_FALLBACK_MODEL = "([^"]+)"/)?.[1];
if (primary !== 'gemini-3.1-flash-lite') fail(`the build's default answer model is ${primary}, not gemini-3.1-flash-lite`);
if (fallback !== 'gemini-3.5-flash-lite') fail(`the build's stall fallback is ${fallback}, not gemini-3.5-flash-lite`);
const ALLOWED = [primary, fallback];

// 3. No override reaches the app. Resolved through the built code under THIS environment:
//    with an override set, either model would come back as the override instead of itself.
for (const m of ALLOWED) {
    let got;
    try { got = V.verbalPrimaryModel(m, ALLOWED); } catch (e) { fail(`the answer-model override refuses this environment: ${e.message}`); }
    if (got !== m) fail(`an answer-model override is set: ${m} resolves to ${got}`);
}
let level;
try { level = T.geminiThinkingLevelFromEnv(); } catch (e) { fail(`the thinking-level override refuses this environment: ${e.message}`); }
if (level !== 'LOW') fail(`the app would think at ${level}, not the shipped LOW - NATIVELY_GEMINI_THINKING_LEVEL is set`);

// 4. The level each model flies at: 3.1-lite at LOW, the 3.5-lite fallback turned to HIGH
//    because it ignores LOW.
if (T.thinkingLevelForModel(primary, level) !== 'LOW') fail(`${primary} would not fly at LOW`);
if (T.thinkingLevelForModel(fallback, level) !== 'HIGH') fail(`the ${fallback} fallback would fly at a level it ignores`);

// 5. The R09 fix is in both the build and the source it must have come from: a rebuild after
//    a later revert of electron/knowledge/IntentClassifier.ts would otherwise leave a passing
//    guard over a stale-but-fixed dist, attributing the hour to a source tree without the fix.
import { r09Missing } from './guard-r09.mjs';
const distReason = r09Missing(fs.readFileSync(`${PROJ}/dist-electron/electron/knowledge/IntentClassifier.js`, 'utf8'));
if (distReason) fail(`the build ${distReason} - rebuild after the R09 fix`);
const srcReason = r09Missing(fs.readFileSync(`${PROJ}/electron/knowledge/IntentClassifier.ts`, 'utf8'));
if (srcReason) fail(`the source ${srcReason} - the build would not match the tree the pass record names`);

// 6. The hedge flag and its trigger resolve as h40c flies them: ON, at the probed 5000ms default
//    (an override would mean the hour did not test the probed value).
let V2;
try {
    V2 = require(`${PROJ}/dist-electron/electron/llm/verbalHedge.js`);
} catch (e) {
    fail(`dist-electron/electron/llm/verbalHedge.js does not load: ${e.message}. Run npm run build:electron.`);
}
let hedgeOn;
try { hedgeOn = V2.verbalHedgeEnabled(); } catch (e) { fail(`NATIVELY_VERBAL_HEDGE refuses this environment: ${e.message}`); }
if (hedgeOn !== true) fail('NATIVELY_VERBAL_HEDGE did not arrive');
let triggerMs;
try { triggerMs = V2.verbalHedgeTriggerMs(); } catch (e) { fail(`NATIVELY_VERBAL_HEDGE_TRIGGER_MS refuses this environment: ${e.message}`); }
if (triggerMs !== 5000) fail(`the hedge trigger is ${triggerMs}ms, not the probed 5000ms - NATIVELY_VERBAL_HEDGE_TRIGGER_MS is set`);

// 7. The follow-up parent flag flies OFF: h40c isolates the hedge, so the other flag must not
//    also be on this hour, or the pass record could not tell which change moved the numbers.
let F;
try {
    F = require(`${PROJ}/dist-electron/electron/llm/followUpParent.js`);
} catch (e) {
    fail(`dist-electron/electron/llm/followUpParent.js does not load: ${e.message}. Run npm run build:electron.`);
}
let followUpOn;
try { followUpOn = F.followUpParentEnabled(); } catch (e) { fail(`NATIVELY_FOLLOWUP_PARENT refuses this environment: ${e.message}`); }
if (followUpOn !== false) fail('the follow-up flag is set; h40c flies it OFF');

// 8. The hedge is in both the build and the source it must have come from. THESE TWO SOURCE
//    CHECKS (5 and 8), not check 9, are the ones that actually bind the flight: the flight
//    rebuilds AFTER this guard runs (see check 9's own comment), so only a check against the
//    SOURCE tree — not today's pre-flight dist snapshot — can speak for what the rebuild produces.
if (!helper.includes('verbal hedge: front=')) fail('the build does not carry the hedge log line (verbal hedge: front=) - rebuild after the hedge lands');
const llmHelperSrc = fs.readFileSync(`${PROJ}/electron/LLMHelper.ts`, 'utf8');
if (!llmHelperSrc.includes('streamGeminiWithHedge')) fail('the source does not carry streamGeminiWithHedge - the build would not match the tree the pass record names');
const whatToAnswerBuilt = fs.readFileSync(`${PROJ}/dist-electron/electron/llm/WhatToAnswerLLM.js`, 'utf8');
// M1: a plain `.includes('(hedge)')` is also satisfied by the JSDoc comment above HEDGE_WINNER
// (dist WhatToAnswerLLM.js's own doc comment quotes the sentinel in prose) — a build that kept
// the comment but lost the actual regex would still pass. `HEDGE_WINNER` is the const's own name;
// `\(hedge\)__` (with the literal backslashes a regex source prints) appears only inside that
// regex literal — the JSDoc's prose uses plain, unescaped parens, so it does not contain this
// exact substring.
if (!whatToAnswerBuilt.includes('HEDGE_WINNER') && !whatToAnswerBuilt.includes('\\(hedge\\)__')) {
    fail('the build does not carry the hedge winner regex (HEDGE_WINNER / \\(hedge\\)__) in WhatToAnswerLLM.js - rebuild after the hedge lands');
}

// 9. Freshness: a stale dist would fly without the hedge even though the source has it. This
//    check runs BEFORE the flight's own rebuild (`auto` runs `npm run build:electron` after this
//    guard exits), so it only proves the pre-flight dist snapshot is not currently stale — it is
//    not what makes the flight correct; checks 5 and 8 above are. Kept because a fail-closed
//    staleness signal here is cheap and catches an operator who skipped a manual build entirely,
//    but a bare `touch` on a source file with no real edit can also trip it harmlessly.
const distMtime = fs.statSync(helperPath).mtimeMs;
const srcMtime = fs.statSync(`${PROJ}/electron/LLMHelper.ts`).mtimeMs;
if (distMtime < srcMtime) fail(`dist-electron/electron/LLMHelper.js (${new Date(distMtime).toISOString()}) is older than electron/LLMHelper.ts (${new Date(srcMtime).toISOString()}) - the build is stale, rebuild`);

// 10a. I1's .env gap: NAMES ONLY, never values (h40c global constraint: never print or copy key
// values). A `.env` line for one of these names would reach the app (dotenv fills in a name
// process.env does not already have) and never reach this guard (the launcher's `set X=` UNSETS
// X in cmd, it does not leave it empty) — see the header comment. NATIVELY_QUESTION_DETECTION_MODEL
// added per N7: it can override the app's Groq question detector (GroqDetectionClient.ts:66),
// which the pre-registration names as unchanged — an unnoticed override would make that false.
const ENV_NAMES_GUARDED = ['NATIVELY_VERBAL_HEDGE', 'NATIVELY_VERBAL_HEDGE_TRIGGER_MS', 'NATIVELY_FOLLOWUP_PARENT', 'NATIVELY_VERBAL_PRIMARY_MODEL', 'NATIVELY_GEMINI_THINKING_LEVEL', 'NATIVELY_QUESTION_DETECTION_MODEL'];
// N6: dotenv 17.3.1's own LINE regex (node_modules/dotenv/lib/main.js) accepts `export NAME=`
// and `NAME: value` as well as plain `NAME=`; `line.split('=')[0]` (round 1's parser) missed
// both. Same name-capture shape, simplified to what this check needs (a name, not a value).
const DOTENV_NAME = /^\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)/;
const envPath = `${PROJ}/.env`;
if (fs.existsSync(envPath)) {
    const envNames = fs.readFileSync(envPath, 'utf8')
        .split(/\r?\n/)
        .map((line) => line.match(DOTENV_NAME)?.[1])
        .filter(Boolean);
    const clash = ENV_NAMES_GUARDED.filter((n) => envNames.includes(n));
    if (clash.length) fail(`.env declares ${clash.join(', ')} - this would reach the app and never reach this guard (see the header comment); remove it from .env before the flight`);
}
// N7: the question-detection override must also be unset in THIS process's own environment —
// dist has no exported resolver for it to call (GroqDetectionClient reads process.env inline),
// so check it directly rather than through a built module, the way checks 3-4 do for the answer
// model and thinking level.
if (process.env.NATIVELY_QUESTION_DETECTION_MODEL) fail('NATIVELY_QUESTION_DETECTION_MODEL is set - the pre-registration says the Groq question detector is unchanged; unset it');

// 10b. I8: pins the tree the flight's own rebuild (step after this guard, in `auto`) will
// compile. MAIN is shared with peer sessions (memory: build captures concurrent edits) — a peer
// edit between registration and the hour would fly under the registered commit's name without
// moving HEAD. git is invoked read-only via child_process; unexpectedDirtyPaths is the pure
// predicate calibrated in guard-h40c-git-cal.mjs.
// N11: trim before comparing — a trailing space or CRLF artifact on the launcher's `set` line
// (cmd is not always forgiving about what follows `=`) must not make this check refuse for a
// reason that has nothing to do with which commit is checked out.
const registeredCommit = process.env.NATIVELY_FLIGHT_COMMIT?.trim();
if (!registeredCommit) fail('NATIVELY_FLIGHT_COMMIT is not set - the launcher must set it to the commit this flight is registered for (filled in by the controller once HEAD is final)');
let head;
try {
    head = execFileSync('git', ['-C', PROJ, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
} catch (e) {
    fail(`git rev-parse HEAD failed: ${e.message}`);
}
if (head !== registeredCommit) fail(`MAIN HEAD is ${head}, not the registered commit ${registeredCommit} (NATIVELY_FLIGHT_COMMIT) - a peer or a later commit moved the tree since registration`);
let statusOut;
try {
    statusOut = execFileSync('git', ['-C', PROJ, 'status', '--porcelain', '--', 'electron', 'src', 'premium', 'package.json'], { encoding: 'utf8' });
} catch (e) {
    fail(`git status failed: ${e.message}`);
}
const dirty = unexpectedDirtyPaths(statusOut);
if (dirty.length) fail(`the tree the flight's rebuild will compile is not clean: ${dirty.join('; ')}`);

// 11. N7: mechanically proves the Groq-arm-removal addendum instead of only asserting it in
// prose. ANSWER_MODELS is imported live from MAIN's own interview60.flight.mjs (the source of
// truth the flight actually reads at run time — not a copy, not a grep of a comment) via
// pathToFileURL, same pattern as check 1's roster import.
// R1: "no id contains a slash" passed on an ABSENT export too — `(undefined ?? []).filter(...)`
// finds nothing to object to and GUARD OK printed "ANSWER_MODELS = undefined". A check that
// answers the same way whether its premise holds or not is not a check (rule 8). Require an EXACT
// array match instead — order, length and content all against the two ids PAIRED_ARMS itself
// indexes by position ([0] = primary, [1] = fallback) — so a rename, a reorder, a dropped id, or
// an extra id all fail by the same test that a Groq id would.
let flightMjs;
try {
    flightMjs = await import(pathToFileURL(`${PROJ}/electron/test/golden/interview60.flight.mjs`).href);
} catch (e) {
    fail(`interview60.flight.mjs does not load under this environment: ${e.message}`);
}
const EXPECTED_ANSWER_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'];
const actualAnswerModels = flightMjs.ANSWER_MODELS;
const answerModelsMatch = Array.isArray(actualAnswerModels)
    && actualAnswerModels.length === EXPECTED_ANSWER_MODELS.length
    && actualAnswerModels.every((id, i) => id === EXPECTED_ANSWER_MODELS[i]);
if (!answerModelsMatch) fail(`ANSWER_MODELS is ${JSON.stringify(actualAnswerModels)}, not exactly ${JSON.stringify(EXPECTED_ANSWER_MODELS)} - the arm-removal commit is not in this tree, or the export was renamed or reordered`);

console.log(`GUARD OK: roster holdout40 (${R.INTERVIEW.length} items), no model or thinking override, ${primary} LOW with the ${fallback} fallback at HIGH, hedge ON (front ${fallback} HIGH, back ${primary} LOW at ${triggerMs}ms), follow-up parent OFF, R09 fix in the build, HEAD pinned at ${head}, tree clean, .env carries none of the guarded names, question detector unchanged, ANSWER_MODELS = ${JSON.stringify(flightMjs.ANSWER_MODELS)}`);
console.log('(this guard proves the launcher environment as ITS OWN node child resolves it, and that dist-electron plus its source carry the hedge and pin HEAD; the app PROCESS itself is proven by Task 7\'s pre-hour smoke and, after the hour, the run\'s own "[Main] verbal hedge: on trigger=...ms" startup line and its won-by lines, read by h40c-hedge-stats.mjs)');
