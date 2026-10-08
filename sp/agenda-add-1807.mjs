// Inserts the user's 18:07 follow-up priority after the 18:04 entries of AGENDA.md (refuses if the anchor is not found
// exactly once, or the entry exists).
import fs from 'node:fs';
const F = new URL('./AGENDA.md', import.meta.url);
const lines = fs.readFileSync(F, 'utf8').split('\n');
const hits = lines.map((l, i) => (l.startsWith('- 18:04 Fri L38M 3.8 Flash re-asks') ? i : -1)).filter((i) => i >= 0);
if (hits.length !== 1) { console.log(`REFUSED: anchor matched ${hits.length}`); process.exit(2); }
if (lines.some((l) => l.startsWith('- 18:07 Fri'))) { console.log('REFUSED: already added'); process.exit(2); }
lines.splice(hits[0] + 1, 0,
    '- 18:07 Fri **USER: "lets dive deep on the inconclusive follow-up work, we need to fix this as it is a basic part of the app".** FOLLOW-UPS FIXED = a priority item, ahead of the router line. Order that keeps the registered path: (1) DEEP DIVE now (systematic-debugging Phase 1: the complete follow-up failure map across every recorded hour, not only the 120 s eviction; why the 01 Oct replay read +3; what each failure class needs); no app code, no tuning on holdout40 (its follow-ups are evidence of the defect class only); (2) Sat 3 Oct after 10:00: the ONE pooled s50l re-run AS REGISTERED (gate list recorded before its calls; pre-cue dist snapshot) -- unchanged by the deep dive; (3) the design that fixes the classes the questions-only block cannot reach (answer-based follow-ups, the ear merging parent+follow-up, the pre-dispatch losses): Fable spec + Opus review, own pre-registered replay on non-holdout data; (4) build (TDD, Sonnet) + its own flight. Pipeline reliability checkpoint item (a) = this.',
);
fs.writeFileSync(F, lines.join('\n'));
console.log('inserted after line', hits[0] + 1);
