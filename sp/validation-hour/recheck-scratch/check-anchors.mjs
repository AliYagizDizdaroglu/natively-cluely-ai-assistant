// Re-check: every OLD anchor in RECHECK-r2.md's edit list must occur exactly once in its file, on the stated line.
// Calibrated by two deliberately wrong anchors at the end (one absent, one on the wrong line), which must FAIL.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VH = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PRE = fs.readFileSync(path.join(VH, 'PREREGISTER-h40d.md'), 'utf8').split(/\r?\n/);
const TN = fs.readFileSync(path.join(VH, 'h40d-thoughts-noise.mjs'), 'utf8').split(/\r?\n/);
const A = [
    [PRE, 3, 'written 2026-10-01 about 02:30 local'],
    [PRE, 159, "construction (the clocks script prints the identity's residual, 0 ms):"],
    [PRE, 193, '(b) fewer than 95% of dispatch windows contain a `verbal hedge: front=` line;'],
    [PRE, 203, '- (f) the reliability void of rule 5 (more than 2 losses before dispatch).'],
    [PRE, 247, "**The first known case is Thursday's bench's thinking-token difference**"],
    [PRE, 298, 'decides rule 2 outright.'],
    [PRE, 306, 'correctness-0 counts 1 / 0 / 1 (`review-scratch/twin-wrongs.mjs`).'],
    [PRE, 313, "**not below the smallest of its own three cue twins' counts on the ids"],
    [PRE, 314, 'they share** reads as noise:'],
    [PRE, 332, 'on the 40 about 0'],
    [PRE, 334, 'be drawn from how R09F and R02F happen to fall.'],
    [PRE, 347, 'and on the cue side it is named as a block-only twin.'],
    [PRE, 351, '(`answers.mjs` resumes from the file and fills only its holes)'],
    [PRE, 416, '(h40c 0, h40a 2 — the salary'],
    [PRE, 420, 'The gate row `Coaching-path answers` is the cross-check.'],
    [PRE, 435, '**5a. Answered: at least 44 of the 45 roster items have an attributed in-app answer**'],
    [PRE, 447, 'pre-dispatch losses" only if 3a still holds that way.'],
    [PRE, 465, '- A same-day re-run of a twin arm fills only its holes;'],
    [PRE, 477, 'or 1(f) or NO LATENCY VERDICT'],
    [PRE, 479, '2. **VOID** (rule 1(a)–(c), 1(f)):'],
    [PRE, 482, '3. **other FAIL** — 2a (with 2b and 2c PASS the reading is NO LATENCY VERDICT, not FAIL), 2d, 3a (not read as noise),'],
    [PRE, 483, '   3b, rule 5.'],
    [PRE, 484, '4. **INCOMPLETE** — 2c, 2d, 2e or 3c undecided with nothing already failed; a 2a breach with 2c INCOMPLETE.'],
    [PRE, 485, "5. **NO LATENCY VERDICT** — 2a's provider reading, or an out-of-window start."],
    [PRE, 503, '**Other FAIL on 2a (2b or 2c failing: see above; otherwise NO LATENCY VERDICT), 2d, 3b, or rule 5**'],
    [PRE, 507, 'the in-app count is not below the smallest of its own'],
    [PRE, 520, 'Outside the window, rule 2 is reported, not gated,'],
    [PRE, 524, '(verified from the transcripts of the first agents dispatched)'],
    [PRE, 528, 'The user then chooses between'],
    [PRE, 531, "Neither is chosen after h40d's 3a number is known."],
    [PRE, 534, 'typed chat on the worktree build (merge review I1);'],
    [PRE, 543, 'the replay moves to Saturday (the 2026-10-03 quota day).'],
    [PRE, 571, 'Thursday after the rebuild, on the 2026-10-01 quota day,'],
    [PRE, 573, 'node … interview60.run.mjs probe` → `node …'],
    [PRE, 575, "and plays the 34 s continuous probe until the app's own log shows it heard"],
    [PRE, 576, 'and answered a question ('],
    [PRE, 580, '[Main] follow-up parent: off`, at least one'],
    [PRE, 631, 'empty prose counted wrong'],
    [PRE, 634, 'not applicable and says so (never a silent pass).'],
    [PRE, 641, '→ each counted wrong and named.'],
    [PRE, 658, 'the 2026-10-01 quota day, only if the ledger'],
    [PRE, 701, "happen on the 2026-10-01 quota day, before Friday's 10:00, never on the flight's."],
    [PRE, 712, 'first, then rule 1 (a)–(c),'],
    [PRE, 721, 'dispatch the ten grading agents'],
    [PRE, 726, 'LATENCY VERDICT → PASS, with GRADER DRIFT as a modifier.'],
    [PRE, 778, '- The grader alias at dispatch time:'],
    [PRE, 806, 'grader, named (§4).'],
    [TN, 105, "    const verdict = covOk ? (dTh <= THRESHOLD ? 'PASS' : 'FAIL') : (dTt <= TTFT_FALLBACK_MS ? 'PASS (fallback)' : 'FAIL (fallback)');"],
    [TN, 108, '(a rep with more than 3 true holes makes 3c INCOMPLETE; 2c is read on the ids answered)'],
    // calibration: these two must FAIL
    [PRE, 999, 'this anchor does not exist anywhere'],
    [PRE, 100, 'on the 40 about 0'],
];
let bad = 0;
for (const [lines, want, s] of A) {
    const hits = lines.map((l, i) => (l.includes(s) ? i + 1 : 0)).filter(Boolean);
    const occurrences = lines.reduce((n, l) => n + l.split(s).length - 1, 0);
    const ok = occurrences === 1 && hits[0] === want;
    if (!ok) bad++;
    console.log(`${ok ? 'OK  ' : 'FAIL'} line ${String(want).padStart(3)} -> found on [${hits.join(',')}] x${occurrences}  ${s.slice(0, 70)}`);
}
console.log(`${bad} failing (2 expected: the two calibration anchors)`);
