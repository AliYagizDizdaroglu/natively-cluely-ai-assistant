// Inserts the 18:04 entries after the 17:36 PIPELINE RELIABILITY CHECKPOINT line of AGENDA.md (refuses if that line
// is not found exactly once, or if the entry is already there).
import fs from 'node:fs';
const F = new URL('./AGENDA.md', import.meta.url);
const lines = fs.readFileSync(F, 'utf8').split('\n');
const hits = lines.map((l, i) => (l.startsWith('- 17:36 Fri **PIPELINE RELIABILITY CHECKPOINT') ? i : -1)).filter((i) => i >= 0);
if (hits.length !== 1) { console.log(`REFUSED: anchor matched ${hits.length}`); process.exit(2); }
if (lines.some((l) => l.startsWith('- 18:04 Fri'))) { console.log('REFUSED: already added'); process.exit(2); }
const add = [
    '- 18:04 Fri **CORRECTION (told the user 17:5x): 2c counts THINKING tokens (usageMetadata.thoughtsTokenCount), NOT answer length.** The cue rule makes 3.5-lite HIGH think +161 tokens (pooled 899 vs 738 on the same bytes; ~0.56 s of model time at 3.47 ms/token); answer words p50 56 (h40c 57). Bench (scenario50) read +55: the no-cue side differs (holdout ~740-760 pre-cue vs scenario50 ~880-900), the cue side ~900-955 -> the rule may pull thinking to a level; to be tested on non-holdout data before any new cue build (§5).',
    '- 18:04 Fri **h40d RESULT NOTE DRAFTED** (`SP\\h40d-result\\2026-10-02-h40d-result.md`; every reading re-run and saved in VH: hedge-stats, clocks --list, hold-read, check-cues, smoke-facts, knowledge-lines, peek-R31/R05, diag-items, ear-counts, grader-ids, wonby-join, twins-by-item, rule3.winners). Opus fact-check running -> fix -> copy to MAIN with the regenerated pass record + INDEX + `PREREGISTER-h40d-flash38-sidecar.md` -> ONE docs commit (`commit-main-paths.ps1 -Expected 2b0906f…`). Instrument slip found + fixed: rule 3 had been run without the six 3.1-lite winners (R24 R25 R26 R26F R27 R28): only the per-item table changes, no gated number. New facts: R05 heard by the 2.5 ear as "Ready or MCX." (no Live dispatch); R31 dispatched from the 2.5 ear\'s rewrite ("A competitor claims…") 25 s after the clip; the offers fix recovered R16 live; R33\'s cue block repeats the answer\'s FP/FN error (cue-content evidence).',
    '- 18:04 Fri L38M 3.8 Flash re-asks H11,H19,H20F: **HTTP 429 x3** (the day\'s full-Flash allowance is spent; file `l38m/runs/reask-gemini-3.8-flash-post.json` holds the 3 errors and the script never retries an error) -> re-run after Sat 10:00 with a NEW tag: `node l38m/pipeline.mjs --model gemini-3.8-flash --ids H11,H19,H20F --tag sat`, then `pairs.mjs reask gemini-3.8-flash-sat H11,H19,H20F` + 2 blind Opus graders. Different quota from the lite models, so it does not touch Saturday\'s pooled s50l re-run.',
];
lines.splice(hits[0] + 1, 0, ...add);
fs.writeFileSync(F, lines.join('\n'));
console.log(`inserted ${add.length} lines after line ${hits[0] + 1}`);
