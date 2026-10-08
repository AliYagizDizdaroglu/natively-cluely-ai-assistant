// Pre-flight guard for h40b, run from the repo root by launch-h40b.cmd AFTER the launcher has set
// the flight's environment. h40b = holdout40 again with ONE change: the R09 routing fix. So this
// checks the hour will measure exactly that: the roster the environment names is the one the harness
// loads, no model or thinking override reaches the app, the build's default and fallback models get
// the levels they honour, and the built classifier carries the fix. Every check answers differently
// if its premise is false; check 5 was run against the pre-fix build before arming.
//
// What it cannot see: the model the app has SAVED as its selection, which the technical verbal
// route passes to verbalPrimaryModel. That lives in credentials.enc, which is never read. The
// liveness check reads the app's own "verbal stall race: trying <model>" line instead.
//
// Exit 0 = ready. Exit 1 = a named check failed; the message says which.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

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
const helper = fs.readFileSync(`${PROJ}/dist-electron/electron/LLMHelper.js`, 'utf8');
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

console.log(`GUARD OK: roster holdout40 (${R.INTERVIEW.length} items), no model or thinking override, ${primary} LOW with the ${fallback} fallback at HIGH, R09 fix in the build`);
