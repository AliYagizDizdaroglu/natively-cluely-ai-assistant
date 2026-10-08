// Throwaway end-to-end check of cuebench-pairs.mjs -> two synthetic graders -> cuebench-score.mjs, in temp folders.
// Stand-in cue arm = the control files themselves (so the prose is identical), with cue checks planted, one empty
// prose answer planted (r2, first id) and one transient (r3, second id). Synthetic graders read ONLY the pairs files
// and score every answer acceptable. Known outcome, including one REAL empty answer in the control: s50m's
// captured-high-r2 answered S2Q06 with a Python fence only, which filterCodeFences removes (spoken ''), so the
// judge counted it undelivered = wrong. The stand-in cue arm copies it, plus the planted empty S1Q01F:
//   rep 1: 39 vs 39 acceptable; rep 2: control 38 + 1 wrong, cue 37 + 2 wrong; rep 3: 38 ids compared (transient).
//   worst control wrong 1 < cue rep 2's 2 -> DECISION: STOP (wrong); cue checks 100%.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cb-e2e-'));
const CUE = path.join(TMP, 'cue'), BLIND = path.join(TMP, 'blind');
fs.mkdirSync(CUE);
process.env.CB_BLIND_DIR = BLIND;
const { controlFile, cueFile, REPS } = await import('./cuebench-pairs.mjs');
let firstId, secondId;
for (const r of REPS) {
    const recs = JSON.parse(fs.readFileSync(controlFile(r), 'utf8'));
    const ids = Object.keys(recs).filter((id) => recs[id].spoken);
    [firstId, secondId] = [ids[0], ids[1]];
    // Raw cue blocks the scorer shapes itself: two short lines everywhere; in rep 1 one 6-line block (over the line
    // limit at 3 or 5, so NOT shaped) and one 9-word line (over the word limit at 5 or 8, reported only).
    for (const id of Object.keys(recs)) recs[id] = { ...recs[id], cues: ['Batch scoring', 'Nightly pipeline'] };
    if (r === 1) { recs[ids[2]].cues = ['a', 'b', 'c', 'd', 'e', 'f']; recs[ids[3]].cues = ['one two three four five six seven eight nine']; }
    if (r === 2) recs[firstId] = { ...recs[firstId], spoken: '' };
    if (r === 3) recs[secondId] = { id: secondId, transientError: 'HTTP 503' };
    fs.writeFileSync(cueFile(CUE, r), JSON.stringify(recs));
}
const run = (f, extra = []) => spawnSync(process.execPath, [path.join(HERE, f), '--cue-dir', CUE, ...extra], { encoding: 'utf8', env: { ...process.env, CB_BLIND_DIR: BLIND } });
const p = run('cuebench-pairs.mjs');
console.log(p.stdout.trim()); if (p.status !== 0) { console.log(`pairs exit ${p.status}: ${p.stderr}`); process.exit(1); }
for (const f of fs.readdirSync(BLIND).filter((x) => /^pairs\./.test(x))) {
    const tag = f.replace(/^pairs\./, '').replace(/\.json$/, '');
    const { items } = JSON.parse(fs.readFileSync(path.join(BLIND, f), 'utf8'));
    for (const g of ['g1', 'g2']) fs.writeFileSync(path.join(BLIND, `verdicts.${tag}.${g}.json`), JSON.stringify(Object.fromEntries(items.map((it) => [it.key, { correctness: 2, on_topic: 2, delivery: 2, reason: 'synthetic' }]))));
}
const s = run('cuebench-score.mjs');
console.log(s.stdout.trim()); if (s.stderr.trim()) console.log(`stderr: ${s.stderr.trim()}`);
const out = s.stdout;
const checks = [
    ['rep 1: 39 vs 39 acceptable', /rep 1: n=39 {2}acceptable control 39 \/ cue 39/.test(out)],
    ['rep 1: the 6-line block is not shaped, and counted over the line limit', /rep 1: .*blocks present 39\/39 {2}shaped 38\/39 \(over \d lines: 1\)/.test(out)],
    // 37 blocks x 2 lines + the 6-line block + the 1-line block = 81 lines
    ['rep 1: the 9-word line is reported, not gated', /rep 1: .*words over \d, reported: blocks 1\/39, lines 1\/81/.test(out)],
    ['the benched rule is named (limits + CUE_RULE hash)', /benched rule: CUE_MAX_LINES \d, CUE_MAX_WORDS \d, CUE_RULE sha256\/12 [0-9a-f]{12}/.test(out)],
    ['rep 2: every empty prose counted wrong, not acceptable', /rep 2: n=39 {2}acceptable control 38 \/ cue 37 {2}consensus-wrong control 1 \/ cue 2/.test(out)],
    ['rep 3: the transient id out of the rep for both arms', /rep 3: n=38 {2}acceptable control 38 \/ cue 38/.test(out)],
    ['decision STOP on wrong', /DECISION: STOP .*wrong: cue rep\(s\) 2 exceed the worst control rep's 1/.test(out)],
    ['empties and the transient named by the pairs builder', new RegExp(`r2:${firstId}:cue`).test(p.stdout) && /r2:S2Q06:control/.test(p.stdout) && new RegExp(`r3:${secondId}\\(cue\\)`).test(p.stdout)],
];
let ok = true;
for (const [name, pass] of checks) { ok &&= pass; console.log(`${pass ? 'OK ' : 'BAD'} ${name}`); }
fs.rmSync(TMP, { recursive: true, force: true });
console.log(ok ? 'CUEBENCH E2E OK' : 'CUEBENCH E2E FAILED');
process.exit(ok ? 0 : 1);
