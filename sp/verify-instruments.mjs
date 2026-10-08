// Throwaway (2026-09-26 19:20, the user's "verify changes landed as intended"): re-proves e311019 against
// MAIN's COMMITTED modules (HEAD 18242df), on copies of real run folders, no API calls.
//  A. attribution: before = 07a0e5e's modules (round1-wide snapshots), after = MAIN now; h40a must be
//     identical, h40b must gain exactly R07F.
//  B. blind pairs: rebuild h40b's blind files with the committed questionForGrader into a fresh dir and
//     check every follow-up carries its parent; the ORIGINAL blind files (built before the fix, the ones
//     the sidecar was graded on) must FAIL the same check - the check's known-answer case.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const V = `${SP}/verify-final`;
const H40B = `${MAIN}/electron/test/golden/interview60.runs/2026-09-26T11-39-51-h40b`;
fs.mkdirSync(V, { recursive: true });
const node = (args, env = {}) => {
    const r = spawnSync(process.execPath, args, { encoding: 'utf8', env: { ...process.env, ...env } });
    return { code: r.status, out: `${r.stdout}${r.stderr}`.trim() };
};

console.log('== A. attribution (07a0e5e modules -> MAIN now) ==');
for (const run of ['h40a', 'h40b']) fs.copyFileSync(`${SP}/round1-wide/attrib-before-${run}.json`, `${V}/attrib-before-${run}.json`);
for (const run of ['h40a', 'h40b']) console.log(node([`${SP}/attrib-check.mjs`, `${SP}/attrib-${run}`, `${V}/attrib-after-${run}.json`]).out);
console.log(node([`${SP}/attrib-diff.mjs`, V, '', 'attrib-diff-final.txt']).out);

console.log('\n== B. blind pairs carry the parent (committed questionForGrader) ==');
const blind = `${V}/blind`;
fs.rmSync(blind, { recursive: true, force: true });
const built = node([`${SP}/flash-h40b-blind-pairs.mjs`], { BLIND_DIR: blind, RUN_DIR: H40B });
console.log(`builder exit ${built.code}: ${built.out.split('\n').slice(-2).join(' | ')}`);
const tl = `${H40B}/interview60.timeline.json`;
const now = node([`${SP}/blind-parent-check.mjs`, blind, tl]);
console.log(`rebuilt now   -> exit ${now.code}: ${now.out.replace(/\n/g, ' | ')}`);
const old = node([`${SP}/blind-parent-check.mjs`, `${SP}/flash-h40b/blind`, tl]);
console.log(`graded files (built before the fix) -> exit ${old.code}: ${old.out.replace(/\n/g, ' | ').slice(0, 300)}`);
console.log(`\nVERDICT A: see diff above (want: h40a identical; h40b only R07F gained)`);
console.log(`VERDICT B: ${now.code === 0 && old.code === 1 ? 'OK (fixed builder passes, pre-fix files fail)' : 'NOT AS EXPECTED'}`);
