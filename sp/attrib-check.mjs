/**
 * Rule-8 calibration for the h40c Task 1 paraphrase-attribution fix: proves the change on
 * COPIES of real run folders (h40a, h40b) in the scratchpad, never on the committed pass
 * records. Run BEFORE editing interview60.judge.mjs/interview60.metrics.mjs to capture the
 * "before" state, then again AFTER, and diff.
 *
 * MODULE_DIR (env, optional): load the three .mjs modules from here instead of live MAIN — used
 * to regenerate a true 07a0e5e "before" against these same copies (review fix round 1, M1: the
 * item field list below must cover every field the fix can move, not just the ones the first
 * pass happened to name).
 *
 *   node attrib-check.mjs <run-copy-dir> <out.json>
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const REPO = process.env.MODULE_DIR || 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden';
const { pairAnswers } = await import(pathToFileURL(path.join(REPO, 'interview60.judge.mjs')));
const { computeRun } = await import(pathToFileURL(path.join(REPO, 'interview60.metrics.mjs')));
const { logSince } = await import(pathToFileURL(path.join(REPO, 'interview60.lib.mjs')));

const [, , dir, outFile] = process.argv;
if (!dir || !outFile) { console.error('usage: attrib-check.mjs <run-copy-dir> <out.json>'); process.exit(2); }

const tl = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8'));
const dbg = logSince(path.join(dir, 'natively_debug.log'), tl.startDebug, tl.endDebug);

const pairs = pairAnswers(dbg, tl).map((p) => ({ id: p.id, heard: p.heard, dispatchedAt: p.dispatchedAt }));
const run = computeRun(dir);

// Field list widened per review M1: every numeric/boolean field claim-once can move, not just
// the four the first pass happened to compare (extended/supersedes/coverage/raceLoss/verdict
// added — mirrors the reviewer's SP\rev1\cross-runs.mjs key list).
const ITEM_KEYS = ['answered', 'answeredAt', 'dispatches', 'heardBy', 'extended', 'supersedes', 'coverage', 'raceLoss', 'verdict'];
const out = {
    pairs,
    answersToNobody: run.answersToNobody,
    items: run.items.map((i) => Object.fromEntries([['id', i.id], ...ITEM_KEYS.map((k) => [k, i[k]])])),
};
fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
console.log(`written ${outFile}`);
