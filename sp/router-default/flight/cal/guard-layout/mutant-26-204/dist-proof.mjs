// Which build is in the whole-turn worktree's dist-electron, by what it contains (runbook RUNBOOK-resmoke2.md; Opus
// spec review I4: a timestamp printed before the scheduled run's own build step proves nothing). Prints each file's
// write time, every build marker with its count, the cue limits and the CUE_RULE hash, then one verdict line.
// The launcher calls it twice, before the run and after it, so the log shows whether the dist changed in between.
// ASCII output only. Exit 0 = every marker of the expected build reads as expected, 1 = not, 2 = a file is missing.
//   node dist-proof.mjs [--expect combined|v2] [--root <worktree>]
//     combined = the build that carries the early close and the offers fix (the default)
//     v2       = the e3fae5f build of 2026-09-30 15:44 (kept so this script can be calibrated on a known dist)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = arg('--root', process.cwd());
const EXPECT = arg('--expect', 'combined');
const D = path.join(ROOT, 'dist-electron', 'electron');
const F = { prompts: path.join(D, 'llm', 'prompts.js'), filter: path.join(D, 'llm', 'verbalStreamFilter.js'), engine: path.join(D, 'IntelligenceEngine.js'), ipc: path.join(D, 'ipcHandlers.js'), main: path.join(D, 'main.js') };
for (const [k, f] of Object.entries(F)) if (!fs.existsSync(f)) { console.log(`DIST PROOF: missing ${k} (${f})`); process.exit(2); }
const text = Object.fromEntries(Object.entries(F).map(([k, f]) => [k, fs.readFileSync(f, 'utf8')]));
const count = (s, needle) => s.split(needle).length - 1;

// [file, needle, expected count as a test, what it proves]
const V2 = [
    ['prompts', 'CUE_MAX_LINES = 3', (n) => n >= 1, 'small cues: the 3-line limit'],
    ['filter', 'function trimCues', (n) => n === 1, 'small cues: the display cap'],
    ['engine', '[Answer] cues trimmed:', (n) => n >= 1, 'small cues: every display edit is logged'],
    ['prompts', 'A one-part question gets exactly one line. Add a line only', (n) => n >= 1, 'the one-first wording'],
    ['ipc', 'VERBAL_TYPED_PROMPT', (n) => n >= 1, 'typed chat sends the prompt without the cue rule'],
    ['ipc', 'VERBAL_WHAT_TO_ANSWER_PROMPT', (n) => n === 0, 'typed chat never names the hands-free prompt'],
];
// The two fixes of the combined build. OFFERS_MARKER is set from the offers plan's own text once that plan is final.
const OFFERS_MARKER = arg('--offers-marker', null);
const NEW = [
    ['filter', 'CUE_LINE_PREFIX', (n) => n === Number(arg('--prefix-count', '2')), `the early close (the constant's name, ${arg('--prefix-count', '2')} times)`],
    ...(OFFERS_MARKER ? [['filter', OFFERS_MARKER, (n) => n >= 1, 'the offers block before the answer is kept apart from the answer']] : []),
];
const checks = EXPECT === 'v2' ? [...V2, ['filter', 'CUE_LINE_PREFIX', (n) => n === 0, 'NOT the early close (this is the v2 build)']] : [...V2, ...NEW];
if (EXPECT === 'combined' && !OFFERS_MARKER) { console.log('DIST PROOF: --offers-marker is required for --expect combined'); process.exit(2); }

for (const [k, f] of Object.entries(F)) console.log(`DIST PROOF: ${k.padEnd(7)} written ${fs.statSync(f).mtime.toISOString()}  ${path.relative(ROOT, f).replace(/\\/g, '/')}`);
let bad = 0;
for (const [file, needle, test, what] of checks) {
    const n = count(text[file], needle), ok = test(n);
    if (!ok) bad++;
    console.log(`DIST PROOF: ${ok ? 'ok ' : 'BAD'} ${file.padEnd(7)} x${n}  ${JSON.stringify(needle)}  (${what})`);
}
const P = createRequire(path.join(ROOT, 'package.json'))(F.prompts);
const hash = crypto.createHash('sha256').update(P.CUE_RULE).digest('hex').slice(0, 12);
const hashOk = hash === '8e15e4e7dd41', limitsOk = P.CUE_MAX_LINES === 3 && P.CUE_MAX_WORDS === 5;
if (!hashOk || !limitsOk) bad++;
console.log(`DIST PROOF: ${hashOk ? 'ok ' : 'BAD'} CUE_RULE sha256/12 ${hash} (the benched rule is 8e15e4e7dd41); ${limitsOk ? 'ok ' : 'BAD'} limits ${P.CUE_MAX_LINES} x ${P.CUE_MAX_WORDS}`);
console.log(`DIST PROOF: filter sha256/16 ${crypto.createHash('sha256').update(fs.readFileSync(F.filter)).digest('hex').slice(0, 16)}`);
console.log(bad ? `DIST PROOF: NOT THE ${EXPECT.toUpperCase()} BUILD (${bad} check(s) failed)` : `DIST PROOF: THE ${EXPECT.toUpperCase()} BUILD, every marker as expected`);
process.exit(bad ? 1 : 0);
