// Throwaway (h40c Task 6): builds the two-arm captured-prompt files for the follow-up parent
// restore replay. Loads the BUILT dist-electron modules (the same bytes the app ships), so a
// default-off flag check happens at the dist level, not against the TypeScript source.
//
//   node followup-replay-build.mjs <run-dir> <out-dir> --calibrate
//   node followup-replay-build.mjs <run-dir> <out-dir>
//
// --calibrate: env={} (flag off), history=[]; rebuilds EVERY id in <run-dir>/interview60.prompts.json
// and asserts user' === user byte for byte. Prints CALIBRATION OK <n>/<n> or the mismatching ids
// and exits 1. REPLAY_BREAK=1 in the environment deliberately corrupts `settled` (appends a word)
// before rebuilding, to prove the calibration check can fail (rule 8).
//
// Without --calibrate: builds prompts.A.json (captured bytes, unchanged) and prompts.B.json
// (rebuilt with the parent exchange restored, flag on) for the 10 pre-registered follow-up ids,
// prints the two inserted lines per id, then re-checks that the SAME rebuild with the flag off
// returns the captured bytes (the flag gates the built module, not just this script).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const MAIN = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant';
const require = createRequire(path.join(MAIN, 'package.json'));

const { withParentExchange } = require(path.join(MAIN, 'dist-electron/electron/llm/followUpParent.js'));
const { prepareTranscriptForWhatToAnswer } = require(path.join(MAIN, 'dist-electron/electron/llm/transcriptCleaner.js'));
const { pinSettledQuestion } = require(path.join(MAIN, 'dist-electron/electron/llm/lastInterviewerTurn.js'));

const J = await import(pathToFileURL(path.join(MAIN, 'electron/test/golden/interview60.judge.mjs')).href);
const { SCENARIO50 } = await import(pathToFileURL(path.join(MAIN, 'electron/test/golden/scenario50.questions.mjs')).href);

const TARGET_IDS = ['S1Q04F', 'S1Q05F', 'S1Q06F', 'S1Q07F', 'S1Q08F', 'S2Q04F', 'S2Q05F', 'S2Q06F', 'S2Q07F', 'S2Q08F'];

const args = process.argv.slice(2);
const runDir = args[0];
const outDir = args[1];
const CALIBRATE = args.includes('--calibrate');
if (!runDir || !outDir) { console.error('usage: followup-replay-build.mjs <run-dir> <out-dir> [--calibrate]'); process.exit(2); }

const promptsPath = path.join(runDir, 'interview60.prompts.json');
const debugLogPath = path.join(runDir, 'natively_debug.log');
const timelinePath = path.join(runDir, 'interview60.timeline.json');
for (const f of [promptsPath, debugLogPath, timelinePath]) {
    if (!fs.existsSync(f)) { console.error(`missing ${f}`); process.exit(2); }
}
const PROMPTS = JSON.parse(fs.readFileSync(promptsPath, 'utf8'));

const BEFORE_MARKER = 'INTERVIEWER JUST SAID:\n';
const AFTER_MARKERS = ['\n\nTHE LIVE LISTENER', '\n\nYOUR RESPONSE'];
const INTERVIEWER_LINE = /^\[INTERVIEWER\]:\s*(.*)$/;
const USER_LINE = /^\[ME\]:\s*(.*)$/;
const ASSISTANT_LINE = /^\[ASSISTANT\]:\s*(.*)$/;

/**
 * Splits a captured `user` string into { before, block, after }: `before` runs through the
 * BEFORE_MARKER (inclusive), `after` starts at the first AFTER_MARKER found in what follows,
 * `block` is what sits between them (the transcript block the app built for this call).
 */
function splitUser(user) {
    const mi = user.indexOf(BEFORE_MARKER);
    if (mi < 0) throw new Error(`no "${BEFORE_MARKER.trim()}" marker in captured user text`);
    const before = user.slice(0, mi + BEFORE_MARKER.length);
    const rest = user.slice(mi + BEFORE_MARKER.length);
    const hits = AFTER_MARKERS.map((m) => rest.indexOf(m)).filter((i) => i >= 0);
    if (!hits.length) throw new Error(`neither ${AFTER_MARKERS.map((m) => JSON.stringify(m.trim())).join(' nor ')} found after the interviewer block`);
    const idx = Math.min(...hits);
    return { before, block: rest.slice(0, idx), after: rest.slice(idx) };
}

/** Parses a transcript block's lines into { window, settled }: turns before the last line
 *  (timestamps = line index) and the pinned question the last [INTERVIEWER] line carries. */
function parseBlock(block, { breakSettled = false } = {}) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) throw new Error('empty transcript block');
    const lastMatch = INTERVIEWER_LINE.exec(lines[lines.length - 1]);
    if (!lastMatch) throw new Error(`block's last line is not [INTERVIEWER]: ${JSON.stringify(lines[lines.length - 1])}`);
    let settled = lastMatch[1];
    if (breakSettled) settled = `${settled} REPLAY_BREAK`;
    const window = lines.slice(0, -1).map((line, i) => {
        let m;
        if ((m = INTERVIEWER_LINE.exec(line))) return { role: 'interviewer', text: m[1], timestamp: i };
        if ((m = USER_LINE.exec(line))) return { role: 'user', text: m[1], timestamp: i };
        if ((m = ASSISTANT_LINE.exec(line))) return { role: 'assistant', text: m[1], timestamp: i };
        throw new Error(`unrecognised transcript line: ${JSON.stringify(line)}`);
    });
    return { window, settled };
}

/** Rebuilds a captured user string from its parsed parts under the given flag env + history. */
function rebuildUser(user, { env, history, now, breakSettled = false }) {
    const { before, block, after } = splitUser(user);
    const { window, settled } = parseBlock(block, { breakSettled });
    const turns = withParentExchange(window, history, now, env);
    const rebuiltBlock = pinSettledQuestion(prepareTranscriptForWhatToAnswer(turns, 12), settled);
    return { user: before + rebuiltBlock + after, rebuiltBlock, window, settled };
}

const NOW = Date.now();

if (CALIBRATE) {
    const ids = Object.keys(PROMPTS);
    const breakSettled = process.env.REPLAY_BREAK === '1';
    const mismatches = [];
    for (const id of ids) {
        const captured = PROMPTS[id];
        try {
            const { user } = rebuildUser(captured.user, { env: {}, history: [], now: NOW, breakSettled });
            if (user !== captured.user) mismatches.push(id);
        } catch (e) {
            mismatches.push(`${id} (error: ${e.message})`);
        }
    }
    if (mismatches.length) {
        console.log(`CALIBRATION MISMATCH ${mismatches.length}/${ids.length}: ${mismatches.join(', ')}`);
        process.exit(1);
    }
    console.log(`CALIBRATION OK ${ids.length}/${ids.length}`);
    process.exit(0);
}

// ── build the two arms for the 10 target ids ────────────────────────────────────────────────
const dbg = fs.readFileSync(debugLogPath, 'utf8');
const timeline = JSON.parse(fs.readFileSync(timelinePath, 'utf8'));
const pairs = J.pairAnswers(dbg, timeline);

const missingParents = [];
const A = {}, B = {};
for (const id of TARGET_IDS) {
    const captured = PROMPTS[id];
    if (!captured?.user || !captured?.system) { missingParents.push(`${id} (no captured prompt)`); continue; }
    const item = SCENARIO50.find((i) => i.id === id);
    if (!item?.chain) { missingParents.push(`${id} (no chain/parent in roster)`); continue; }
    const parentId = item.chain;
    const parentAnswerPair = pairs.find((p) => p.id === parentId && p.answer);
    if (!parentAnswerPair) { missingParents.push(`${id} (parent ${parentId} has no delivered answer in ${runDir})`); continue; }
    const parentCaptured = PROMPTS[parentId];
    if (!parentCaptured?.user) { missingParents.push(`${id} (parent ${parentId} has no captured prompt)`); continue; }
    const { settled: parentSettled } = parseBlock(splitUser(parentCaptured.user).block);

    A[id] = { system: captured.system, user: captured.user };

    const history = [{ text: parentAnswerPair.answer, questionContext: parentSettled, timestamp: NOW - 1000 }];
    const built = rebuildUser(captured.user, { env: { NATIVELY_FOLLOWUP_PARENT: '1' }, history, now: NOW });
    B[id] = { system: captured.system, user: built.user };

    const insertedLines = built.rebuiltBlock.split('\n').slice(0, 2);
    console.log(`${id}  parent=${parentId}`);
    console.log(`  inserted: ${insertedLines[0]}`);
    console.log(`  inserted: ${insertedLines[1]}`);

    // Second calibration: the SAME rebuild with the flag off must return the captured bytes —
    // the default-off proof at the built-module level, not just this script's own logic.
    const off = rebuildUser(captured.user, { env: {}, history, now: NOW });
    if (off.user !== captured.user) {
        console.error(`FLAG-OFF CALIBRATION FAILED for ${id}: rebuild with the flag off did not return the captured bytes`);
        process.exit(1);
    }
}

if (missingParents.length) {
    console.error(`missing parent answer/prompt for: ${missingParents.join('; ')}`);
    process.exit(2);
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'prompts.A.json'), JSON.stringify(A, null, 1));
fs.writeFileSync(path.join(outDir, 'prompts.B.json'), JSON.stringify(B, null, 1));
console.log(`\nFLAG-OFF CALIBRATION OK for all ${TARGET_IDS.length} ids (flag off reproduces captured bytes)`);
console.log(`wrote ${path.join(outDir, 'prompts.A.json')}`);
console.log(`wrote ${path.join(outDir, 'prompts.B.json')}`);
