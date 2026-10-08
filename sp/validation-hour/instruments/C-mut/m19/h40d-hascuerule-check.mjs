// The hasCueRule() check of PREREGISTER-h40d.r4.md section 7.6 (merge review item 6): the flight's no-cue twin arms are gated by
// hasCueRule(), which has only ever seen synthetic prompts; a false reading would skip Friday's control arms with one log line.
// This imports hasCueRule and capturedOnly from the flight module itself (safe: that module runs main() only when it is the entry
// script, interview60.flight.mjs:388), reads one prompts file, and prints ONLY counts and true/false, never a prompt:
//   - the number of ids capturedOnly() returns (spoken roster items with a system AND a user turn),
//   - how many of those ids carry [CUES FIRST] in their system text (an independent count, r4's literal),
//   - hasCueRule: true or false.
//
//   node h40d-hascuerule-check.mjs <interview60.prompts.json> [--flight <interview60.flight.mjs>] [--mutate-one]
//
// The ROSTER ENVIRONMENT is the caller's: NATIVELY_ROSTER and NATIVELY_SCENARIOS are read by roster.mjs when the flight module is
// imported, so run this under the environment the run used (Friday: NATIVELY_ROSTER=holdout40, NATIVELY_SCENARIOS unset). The
// effective values are printed first so a wrong environment cannot read as a right one.
//
// --flight <path>   the flight module to import; default MAIN's. MAIN BEFORE THE MERGE has no hasCueRule (checked 2026-10-01): the
//                   check then refuses and says so; point --flight at the worktree's copy, the code MAIN holds after the merge.
// --mutate-one      calibration only: strips the mark from ONE id's system text IN MEMORY (the first id that carries it) before
//                   the reading, so a MIXED hour must read false. Nothing is ever written.
//
// exit 0  hasCueRule true (and the independent count agrees)    exit 1  hasCueRule false (and it agrees)
// exit 2  usage / unreadable input / the flight module lacks hasCueRule or capturedOnly / an invalid roster environment
// exit 3  hasCueRule and the independent count DISAGREE, or the flight module's own CUE_RULE_MARK is not r4's [CUES FIRST]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const MARK = '[CUE FIRST]'; // r4 section 7.6's literal; compared with the flight module's own CUE_RULE_MARK below
const MAIN = 'C:/Users/sotka/OneDrive/Masa\u00fcst\u00fc/natively-cluely-ai-assistant';

const die = (msg, code = 2) => {
    console.error(`h40d-hascuerule-check: ${msg}`);
    process.exit(code);
};

let flight = `${MAIN}/electron/test/golden/interview60.flight.mjs`;
let mutateOne = false;
let promptsFile = null;
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--mutate-one') mutateOne = true;
    else if (a === '--flight') { flight = argv[++i]; if (!flight) die('--flight needs a path'); }
    else if (a.startsWith('--')) die(`unknown option ${a}`);
    else if (promptsFile === null) promptsFile = a;
    else die(`unexpected argument ${a}`);
}
if (!promptsFile) die('usage: node h40d-hascuerule-check.mjs <interview60.prompts.json> [--flight <interview60.flight.mjs>] [--mutate-one]');
if (!fs.existsSync(promptsFile)) die(`prompts file not found: ${promptsFile}`);
if (!fs.existsSync(flight)) die(`flight module not found: ${flight}`);

const envShow = (k) => (process.env[k] === undefined ? '(unset)' : process.env[k] === '' ? '(blank)' : process.env[k]);
console.log(`roster environment: NATIVELY_ROSTER=${envShow('NATIVELY_ROSTER')} NATIVELY_SCENARIOS=${envShow('NATIVELY_SCENARIOS')}`);
console.log(`flight module: ${flight}`);

let mod;
try {
    mod = await import(pathToFileURL(path.resolve(flight)).href);
} catch (e) {
    die(`importing the flight module failed: ${String(e?.message ?? e).split('\n')[0]}`);
}
for (const name of ['hasCueRule', 'capturedOnly']) {
    if (typeof mod[name] !== 'function') {
        die(`the flight module has no ${name} export: this is MAIN before the merge (or an older checkout). Re-run with --flight <worktree>/electron/test/golden/interview60.flight.mjs, the code MAIN holds after the merge`);
    }
}
try {
    // the same roster module instance the flight imported (same URL), for a one-line name of the roster actually in force
    const roster = await import(pathToFileURL(path.join(path.dirname(path.resolve(flight)), 'roster.mjs')).href);
    console.log(`roster in force: ${roster.rosterLabel()}`);
} catch { console.log('roster in force: (roster label unavailable)'); }
console.log(`flight CUE_RULE_MARK: ${mod.CUE_RULE_MARK === undefined ? '(not exported)' : mod.CUE_RULE_MARK === MARK ? `${MARK} (same as r4's)` : `${mod.CUE_RULE_MARK} (NOT r4's ${MARK})`}`);

let captured;
// never echo e.message: a JSON.parse error quotes a snippet of the file, and this file is the captured system prompts
try { captured = JSON.parse(fs.readFileSync(promptsFile, 'utf8')); } catch (e) { die(`prompts file ${e instanceof SyntaxError ? 'is not valid JSON' : `is unreadable (${e?.code ?? e?.name})`}`); }
if (captured === null || typeof captured !== 'object' || Array.isArray(captured) || !Object.keys(captured).length) die('prompts file is not an object keyed by item id');
console.log(`prompts file: ${promptsFile} (${fs.statSync(promptsFile).size} bytes, ${Object.keys(captured).length} entries)`);

if (mutateOne) {
    const first = mod.capturedOnly(captured).find((id) => String(captured[id].system ?? '').includes(MARK));
    if (first) {
        captured[first].system = String(captured[first].system).split(MARK).join('');
        console.log(`--mutate-one: ${first}'s system text stripped of the mark IN MEMORY (nothing is written)`);
    } else console.log('--mutate-one: no id carries the mark, nothing to strip');
}

const ids = mod.capturedOnly(captured);
const carry = ids.filter((id) => String(captured[id].system ?? '').includes(MARK)).length;
const has = mod.hasCueRule(captured);
console.log(`capturedOnly ids: ${ids.length}`);
console.log(`carry ${MARK}: ${carry} of ${ids.length}`);
console.log(`hasCueRule: ${has}`);
if (ids.length === 0) console.log("NOTE: capturedOnly returned 0 ids: none of the file's ids is a spoken item of the roster in force (is NATIVELY_ROSTER / NATIVELY_SCENARIOS the run's?)");

// exitCode, not process.exit(): stdout is a pipe under a runner and must drain first
const expected = ids.length > 0 && carry === ids.length;
if (has !== expected) {
    console.log(`DISAGREE: hasCueRule says ${has}, an independent count says ${expected} (every captured id must carry the mark, and at least one id must exist)`);
    process.exitCode = 3;
} else if (mod.CUE_RULE_MARK !== undefined && mod.CUE_RULE_MARK !== MARK) {
    console.log(`MARK DIFFERS: the flight module reads ${mod.CUE_RULE_MARK}, r4 section 7.6 reads ${MARK}`);
    process.exitCode = 3;
} else {
    console.log(`CONSISTENT: hasCueRule equals "at least one id, and every one carries the mark"`);
    process.exitCode = has ? 0 : 1;
}
