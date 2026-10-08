// Bring the paused cue spec up to date before re-presenting Section 1: the flight it waited
// on is now s50m, the filter chain gained filterCodeFences (4903f2d), and the bench control
// moves to s50m's captured arms. Every anchor asserted present exactly once (rule 11).
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn/docs/superpowers/specs/2026-09-20-cue-mode-design.md';
let src = readFileSync(FILE, 'utf8');
if (src.includes('Resumed 2026-09-21')) throw new Error('already patched');

const EDITS = [
    {
        what: 'status line',
        from: 'Paused by the user on 2026-09-20 to wait for the s50k flight (10:10 local, grading cron 12:27).',
        to: 'Paused by the user on 2026-09-20 to wait for the s50k flight (10:10 local, grading cron 12:27).\n'
          + '**Resumed 2026-09-21** after s50l. The model question is now decided by s50m (2026-09-22 10:10, rule\n'
          + 'pre-registered on mains in `passes/PREREGISTER-s50m.md`, f3c7c8e). Cue mode is deliberately NOT in\n'
          + 's50m: cues-first-in-the-same-call changes the answer shape, so the captured prompts, so what the twin\n'
          + 'arms replay — it would move the instrument under the one comparison that flight makes.',
    },
    {
        what: 'section 1 stream bullet',
        from: '- **Stream.** The main process strips the cue block innermost in the existing filter chain, right\n  after the model-source strip and before the line filter and the word guard.',
        to: '- **Stream.** The main process strips the cue block innermost in the existing filter chain, right\n  after the model-source strip and before the code-fence filter, the line filter and the word guard\n  (today: `stripSpokenNotation(stripSuggestionBlock(filterVerbalLines(filterCodeFences(stripModelSentinel(raw)))))`\n  at `WhatToAnswerLLM.ts:301`; `filterCodeFences` moved into `verbalStreamFilter.ts` in 4903f2d).',
    },
    {
        what: 'section 1 rollout bullet',
        from: '- **Rollout.** Always on, no toggle. Nothing merges to main before s50k has flown and been graded,\n  since main is what the 10:10 task runs.',
        to: '- **Rollout.** Always on, no toggle. Nothing merges to main before s50m has flown and been graded\n  (2026-09-22), since main is what the 10:10 task runs. Ship decision then validates on the holdout\n  roster (`2026-09-21-holdout-roster-design.md`), not on scenario50 alone.',
    },
    {
        what: 'section 5 bench control',
        from: '- **Bench, the ship decision:** control = s50k `captured-low` r1 to r3 (produced by the 2026-09-20 flight).',
        to: '- **Bench, the ship decision:** control = s50m\'s captured twins r1 to r3 on the model s50m picks (3.1 LOW\n  `captured-low` or 3.5 HIGH `captured-high`), produced by the 2026-09-22 flight.',
    },
    {
        what: 'section 5 model line',
        from: 'Run on the model s50k picks.',
        to: 'Run on the model s50m picks.',
    },
    {
        what: 'section 5 rollout line',
        from: '- **Rollout:** merge after s50k is graded and the bench passes; the next flight flies cues live with the cues gate row.',
        to: '- **Rollout:** merge after s50m is graded and the bench passes; the next flight flies cues live with the cues\n  gate row, and the holdout baseline is the validation hour.',
    },
    {
        what: 'code facts composition line',
        from: 'the composition `stripSpokenNotation(stripSuggestionBlock(filterVerbalLines(filterCodeFences(stripModelSentinel(raw))), onSuggestionsOnce))` (346 to 351)',
        to: 'the composition `stripSpokenNotation(stripSuggestionBlock(filterVerbalLines(filterCodeFences(stripModelSentinel(raw))), onSuggestionsOnce))` (now 301 to 303; `filterCodeFences` is exported from `verbalStreamFilter.ts` since 4903f2d)',
    },
];

for (const e of EDITS) {
    const hits = src.split(e.from).length - 1;
    if (hits !== 1) throw new Error(`${e.what}: anchor found ${hits} times, expected exactly 1`);
    src = src.replace(e.from, e.to);
}
writeFileSync(FILE, src, 'utf8');
console.log(`patched ${EDITS.length} sites`);
