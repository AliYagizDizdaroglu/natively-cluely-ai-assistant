// E\eq-proofs.mjs: the launcher's dist proofs, one command, printed into the launcher log before the run and after it
// (PREREGISTER-flight-eq.md section 2 "Build": dist-proof --expect combined (the cue build) + the four EQ markers + parity-dist
// exit 0 against MAIN's dist; earlierQuestion.js sha256/16 recorded both times, a changed sha = VOID).
//   node eq-proofs.mjs --root <MAIN, absolute> [--same-as-log <launcher log>]
// Prints the children's own output, then `EQ MARKER <dist file> True|False` x4, `EQ PROOFS earlierQuestion.js sha256/16 <x>`, and a
// final `EQ PROOFS: ALL PASSED` (exit 0) or `EQ PROOFS: FAILED (<names>)` (exit 1). `--same-as-log` (the proofs AFTER the run): the
// sha must equal the first sha line printed after the log's LAST `=== DIST BEFORE THE RUN ===` banner; a change fails the proofs.
// Usage error: exit 2. Writes nothing; no model call; MAIN is only read.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const E = path.dirname(fileURLToPath(import.meta.url));
const SP = path.resolve(E, '..');
const argv = process.argv.slice(2);
const usage = (m) => { console.log(`EQ PROOFS usage error: ${m}`); console.log('usage: node eq-proofs.mjs --root <MAIN, absolute> [--same-as-log <launcher log>]'); process.exit(2); };
const known = new Set(['--root', '--same-as-log']);
argv.forEach((a, i) => { if (a.startsWith('--') && !known.has(a)) usage(`unknown option ${a}`); if (!a.startsWith('--') && !known.has(argv[i - 1])) usage(`unexpected argument ${a}`); });
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
const root = opt('--root');
if (!root || root.startsWith('--')) usage('--root is required');
if (!path.isAbsolute(root)) usage(`--root must be an absolute path (dist-proof.mjs fails on a relative root): ${root}`);
if (!fs.existsSync(path.join(root, 'dist-electron'))) usage(`no dist-electron under ${root}`);
const sameAs = opt('--same-as-log');
if (argv.includes('--same-as-log') && (!sameAs || sameAs.startsWith('--'))) usage('--same-as-log needs a file');

const failed = [];
const echo = (text) => { for (const l of text.split(/\r?\n/)) if (l.length) console.log(l); };

// 1. the cue build: dist-proof.mjs exactly as the guard runs it
const dp = spawnSync(process.execPath, [path.join(SP, 'dist-proof.mjs'), '--root', root, '--expect', 'combined', '--prefix-count', '3', '--offers-marker', 'offers block before the spoken answer'], { encoding: 'utf8', cwd: root, timeout: 120000 });
echo(dp.stdout ?? ''); echo(dp.stderr ?? '');
if (dp.error || dp.status !== 0 || !(dp.stdout ?? '').includes('DIST PROOF: THE COMBINED BUILD, every marker as expected')) failed.push('dist-proof');

// 2. the four earlier-question markers in the built dist, and the sha256/16 of earlierQuestion.js
const MARKERS = [['llm/earlierQuestion', 'EARLIER QUESTION (asked earlier; context only'], ['IntelligenceEngine', 'earlier question: gate='], ['main', 'describeEarlierQuestionAtStartup'], ['llm/WhatToAnswerLLM', 'earlierQuestionBlock']];
for (const [rel, needle] of MARKERS) {
    const f = path.join(root, 'dist-electron', 'electron', `${rel}.js`);
    const found = fs.existsSync(f) && fs.readFileSync(f, 'utf8').includes(needle);
    console.log(`EQ MARKER dist-electron/electron/${rel}.js ${found ? 'True' : 'False'}`);
    if (!found) failed.push(`marker ${rel}`);
}
const eqFile = path.join(root, 'dist-electron', 'electron', 'llm', 'earlierQuestion.js');
let sha16 = null;
if (fs.existsSync(eqFile)) { sha16 = crypto.createHash('sha256').update(fs.readFileSync(eqFile)).digest('hex').slice(0, 16); console.log(`EQ PROOFS earlierQuestion.js sha256/16 ${sha16}`); }
else { console.log('EQ PROOFS earlierQuestion.js MISSING'); failed.push('earlierQuestion.js missing'); }

// 3. parity-dist against MAIN's dist, both exact lines (A3.7 g1)
const pd = spawnSync(process.execPath, [path.join(SP, 'followup-turn', 'build', 'parity-dist.mjs')], { encoding: 'utf8', cwd: root, timeout: 120000 });
echo(pd.stdout ?? ''); echo(pd.stderr ?? '');
const pdLines = new Set((pd.stdout ?? '').split(/\r?\n/).map((l) => l.trimEnd()));
if (pd.error || pd.status !== 0 || !pdLines.has('EARLIER-QUESTION REF TESTS: 47/47 passed') || !pdLines.has('PARITY DIST: 126 fixture entries (21 with a block) + 29 invented cases + 117 captured prompt-line rows; mismatches 0')) failed.push('parity-dist');

// 4. after the run: the dist that flew is the dist that was proven
if (sameAs) {
    let before = null;
    try {
        const text = fs.readFileSync(sameAs, 'latin1');
        const i = text.lastIndexOf('=== DIST BEFORE THE RUN ===');
        before = i >= 0 ? /EQ PROOFS earlierQuestion\.js sha256\/16 ([0-9a-f]{16})/.exec(text.slice(i))?.[1] ?? null : null;
    } catch { before = null; }
    if (!before) { console.log(`EQ PROOFS sha before the run: NOT FOUND in ${sameAs}`); failed.push('sha-before-not-found'); }
    else { const same = before === sha16; console.log(`EQ PROOFS earlierQuestion.js sha256/16 unchanged since the run started: ${same ? 'yes' : `NO (${before} before, ${sha16} after)`}`); if (!same) failed.push('sha-changed'); }
}
console.log(failed.length ? `EQ PROOFS: FAILED (${failed.join(', ')})` : 'EQ PROOFS: ALL PASSED');
process.exit(failed.length ? 1 : 0);
