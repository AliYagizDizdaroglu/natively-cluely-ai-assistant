// mutants-bench.mjs: runs cal-bench.mjs against a temp COPY of the bench kit with one deliberate mutation at a time; every mutant must make the calibration FAIL (rule 8).
// NO network, NO model; the real files are never touched.   node mutants-bench.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILES = ['common.mjs', 'bars.mjs', 'score-bench.mjs', 'export-blind.mjs', 'build-arms.mjs', 'run-bench.mjs', 'cal-bench.mjs'];
export const MUTANTS = [
    ['bars.mjs', 'Q1-slack-3', 'Q1_MEAN_SLACK: 2', 'Q1_MEAN_SLACK: 3'],
    ['bars.mjs', 'Q1-overlap-dropped', 'Math.max(...accT) >= Math.min(...accC) && mean(accT)', 'true && mean(accT)'],
    ['bars.mjs', 'Q2-new-wrong-ignored', 'const q2 = newWrong.length === 0 && totWrong', 'const q2 = true && totWrong'],
    ['bars.mjs', 'Q2-total-ignored', 'newWrong.length === 0 && totWrong(\'T\') <= totWrong(\'C\')', 'newWrong.length === 0'],
    ['bars.mjs', 'Q3-max-2', 'Q3_MAX: 1', 'Q3_MAX: 2'],
    ['bars.mjs', 'L1a-per-id-1.5', 'L1A_PER_ID: 1.25', 'L1A_PER_ID: 1.5'],
    ['bars.mjs', 'L1a-over-3', 'L1A_MAX_OVER: 2', 'L1A_MAX_OVER: 3'],
    ['bars.mjs', 'L1a-pooled-1.2', 'L1A_POOLED: 1.05', 'L1A_POOLED: 1.2'],
    ['bars.mjs', 'L1b-pooled-0.7', 'L1B_POOLED: 0.9', 'L1B_POOLED: 0.7'],
    ['bars.mjs', 'L1b-per-id-0.5', 'L1B_PER_ID: 0.75', 'L1B_PER_ID: 0.5'],
    ['bars.mjs', 'L2-floor-100', 'L2_FLOOR: 50', 'L2_FLOOR: 100'],
    ['bars.mjs', 'L3-floor-400', 'L3_FLOOR_MS: 200', 'L3_FLOOR_MS: 400'],
    ['bars.mjs', 'S1-min-13', 'S1_MIN: 15', 'S1_MIN: 13'],
    ['bars.mjs', 'S1-not-vs-C', 't1n >= TOL.S1_MIN && t1n >= c1n', 't1n >= TOL.S1_MIN'],
    ['bars.mjs', 'S2-min-7', 'S2_MIN: 9', 'S2_MIN: 7'],
    ['bars.mjs', 'S2-over-ignored', 'inband >= TOL.S2_MIN && allOver.length === 0', 'inband >= TOL.S2_MIN'],
    ['bars.mjs', 'C1-slack-2', 'C1_SLACK: 1', 'C1_SLACK: 2'],
    ['bars.mjs', 'C2-fraction-0.5', 'C2_CUE_FRACTION: 0.9', 'C2_CUE_FRACTION: 0.5'],
    ['bars.mjs', 'C2-raw-sentinel-ignored', "(e.cues ?? []).length > 0 || String(e.raw ?? '').includes(sentinel)", '(e.cues ?? []).length > 0'],
    ['bars.mjs', 'first-words-8', 'export const FIRST_WORDS = 5;', 'export const FIRST_WORDS = 8;'],
    ['bars.mjs', 'wrong-needs-both', "if (gs.some((g) => g.correctness === 0)) return 'wrong';", "if (gs.every((g) => g.correctness === 0)) return 'wrong';"],
    ['bars.mjs', 'acceptable-needs-one', "if (gs.every((g) => g.correctness === 2 && g.on_topic === 2)) return 'acceptable';", "if (gs.some((g) => g.correctness === 2 && g.on_topic === 2)) return 'acceptable';"],
    ['bars.mjs', 'thinking-missing-read-as-ok', "if (missing.length) return [result('L2', false,", "if (false) return [result('L2', false,"],
    ['score-bench.mjs', 'pin-unchecked', "if (r.pinned !== true) bad.push(", "if (false) bad.push("],
    ['score-bench.mjs', 'memory-unchecked', "if (r.memory !== 'ABSENT') bad.push(", "if (false) bad.push("],
    ['score-bench.mjs', 'pairs-sha-unchecked', "if (r.pairsSha12 !== sha(pairsPathOf(tag))) bad.push(", "if (false) bad.push("],
    ['score-bench.mjs', 'rep-unchecked', "if (m.rep !== k) problems.push(", "if (false) problems.push("],
    ['score-bench.mjs', 'one-grader-enough', "const gs = [1, 2].map((g) => verdicts[`blind-${k}.g${g}`]?.[q]);", "const gs = [1, 2].map((g) => verdicts[`blind-${k}.g1`]?.[q]);"],
    ['score-bench.mjs', 'run-hash-unchecked', "else if (shaOf(runPathOf(a, r)) !== want) bad.push(", "else if (false) bad.push("],
    ['score-bench.mjs', 'build-record-optional', "if (!fs.existsSync(recFile)) refuse(", "if (false) refuse("],
    ['export-blind.mjs', 'transient-accepted', "|| e.transientError) throw new Error(`${arm} rep", ") throw new Error(`${arm} rep"],
    ['export-blind.mjs', 'seed-ignored', 'shuffle(flat, rng(`${seed}:${rep}`));', 'shuffle(flat, rng(`${rep}`));'],
    ['export-blind.mjs', 'no-shuffle', 'shuffle(flat, rng(`${seed}:${rep}`));', ''],
    ['build-arms.mjs', 'old-constant-twice-ok', 'if (n !== 1) throw new Error(`${id}: the old SPOKEN_LENGTH_AND_DEPTH occurs', 'if (n < 1) throw new Error(`${id}: the old SPOKEN_LENGTH_AND_DEPTH occurs'],
    ['build-arms.mjs', 'cue-strip-unchecked', "if (count(out, cueRule) !== 1) throw new Error(`${id}: the cue rule occurs", "if (false) throw new Error(`${id}: the cue rule occurs"],
    ['run-bench.mjs', 'incomplete-ignores-transient', 'return ids.filter((id) => !store?.[id]?.spoken || store[id].transientError);', 'return ids.filter((id) => !store?.[id]?.spoken);'],
];

let caught = 0; const lines = [];
for (const [file, id, from, to] of MUTANTS) {
    const src = fs.readFileSync(path.join(HERE, file), 'utf8');
    const n = src.split(from).length - 1;
    if (n !== 1) { lines.push(`ERROR ${file} ${id}: anchor occurs ${n} times (must be 1)`); continue; }
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mut-bench-'));
    for (const f of FILES) fs.copyFileSync(path.join(HERE, f), path.join(tmp, f));
    fs.writeFileSync(path.join(tmp, file), src.replace(from, () => to));
    const r = spawnSync(process.execPath, [path.join(tmp, 'cal-bench.mjs'), '--quiet'], { encoding: 'utf8', timeout: 300000 });
    fs.rmSync(tmp, { recursive: true, force: true });
    const failed = (r.stdout.match(/^FAIL /gm) ?? []).length;
    const ok = r.status !== 0;
    if (ok) caught++;
    lines.push(`${ok ? 'CAUGHT  ' : 'SURVIVED'} ${file} ${id}  (${failed} check(s) failed${r.status !== 0 && !failed ? `; crashed exit ${r.status}` : ''})`);
}
console.log(lines.join('\n'));
console.log(`MUTANTS ${caught}/${MUTANTS.length} caught`);
process.exit(caught === MUTANTS.length ? 0 : 1);
