// Rebuilds h40c-stats-cal-synth/ (fix round 3): keeps W1-W4 from fix round 2 unchanged in shape,
// adds [Answer] full: lines throughout for realism, and replaces the old single "ambiguous"
// window (W5/W5-super) with three windows covering R2's three resolution outcomes plus one more
// plain win, so the one realistic fixture demonstrates the whole round-3 picture end to end:
//   W1  plain win (3.5-lite)
//   W2  back wins after trigger (3.1-lite)
//   W3  a real error-triggered redirect ending in a win (3.5-lite fallback) - 0 charged
//   W4  terminal front-empty/back-empty - 1 clean charged failure, IntelligenceEngine's own
//       "Could you repeat that?" fallback text as its [Answer] full: line
//   W5  this window's OWN race wins a token then its OWN stream fails afterward - R2
//       resolved-as-failure (charged, folded into answer failures)
//   W6/W6-super  a stale empty-empty line from a superseded generation lands beside this
//       window's own real win - R2 resolved-as-delivered (not charged)
//   W7/W7-super  same shape as W6-super, but no [Answer] full: line survives - R2 unresolved,
//       makes rule 2 read INCOMPLETE
// verbal-diag.log carries a first-token line for every one of the 6 won-by windows (6 >= 90% of
// 6), so the fixture's rule 2 is INCOMPLETE for exactly one reason (W7-super), not contaminated
// by an R6 coverage shortfall too.
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/h40c-stats-cal-synth';

const pre = [
    '2026-09-26T17:00:00.000Z [LOG] [Main] Gemini API Key updated.',
    '2026-09-26T17:00:00.100Z [LOG] [Main] verbal hedge: on trigger=5000ms',
    '2026-09-26T17:00:00.200Z [LOG] [Main] Default Model set to: gemini-3.1-flash-lite',
    '2026-09-26T17:00:05.000Z [LOG] [Main] Starting Meeting',
].join('\n') + '\n';

const win = [
    // W1: plain win, 3.5-lite.
    '2026-09-26T17:00:10.000Z [LOG] [Main] dispatch: answer source=whisper anchor="What is a hash map?" verdict=match question="What is a hash map?"',
    '2026-09-26T17:00:10.100Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=5000ms',
    '2026-09-26T17:00:11.300Z [LOG] [LLMHelper] verbal hedge: won by gemini-3.5-flash-lite at 1200ms; other=not-started',
    '2026-09-26T17:00:11.350Z [LOG] [Answer] full: "A hash map stores key-value pairs and gives average O(1) lookup by hashing the key to a bucket."',

    // W2: back wins after the trigger, 3.1-lite.
    '2026-09-26T17:00:40.000Z [LOG] [Main] dispatch: answer source=live anchor="What is a linked list?" verdict=match question="What is a linked list?"',
    '2026-09-26T17:00:40.100Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=5000ms',
    '2026-09-26T17:00:45.100Z [LOG] [LLMHelper] verbal hedge: back started at 5000ms reason=trigger',
    '2026-09-26T17:00:46.400Z [LOG] [LLMHelper] verbal hedge: won by gemini-3.1-flash-lite at 6300ms; other=aborted',
    '2026-09-26T17:00:46.450Z [LOG] [Answer] full: "A linked list is a chain of nodes, each holding a value and a pointer to the next node."',

    // W3: a real error-triggered redirect (front errors before its token; the generic front-error
    // no-answer line is NOT the exact-match empty/empty failure pattern) ending in a clean win.
    '2026-09-26T17:01:20.000Z [LOG] [Main] dispatch: answer source=whisper anchor="What is a stack?" verdict=match question="What is a stack?"',
    '2026-09-26T17:01:20.100Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=5000ms',
    '2026-09-26T17:01:20.600Z [WARN] [LLMHelper] gemini-3.5-flash-lite failed before its first token: 503',
    '2026-09-26T17:01:20.650Z [LOG] [LLMHelper] verbal hedge: back started at 500ms reason=front-error',
    '2026-09-26T17:01:21.700Z [WARN] [LLMHelper] verbal hedge: no answer - front error, back empty',
    '2026-09-26T17:01:21.750Z [WARN] [WhatToAnswerLLM] verbal primary failed before first token (503) - redirecting to gemini-3.5-flash-lite',
    '2026-09-26T17:01:21.800Z [LOG] [Main] answer source: gemini-3.5-flash-lite (fallback)',
    '2026-09-26T17:01:21.850Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=5000ms',
    '2026-09-26T17:01:23.000Z [LOG] [LLMHelper] verbal hedge: won by gemini-3.5-flash-lite at 1150ms; other=not-started',
    '2026-09-26T17:01:23.050Z [LOG] [Answer] full: "A stack is a LIFO structure: the last element pushed is the first one popped."',

    // W4: terminal front-empty/back-empty - one clean charged failure. IntelligenceEngine's own
    // generic fallback is what actually gets delivered and logged as the answer text.
    '2026-09-26T17:02:00.000Z [LOG] [Main] dispatch: answer source=whisper anchor="What is a queue?" verdict=match question="What is a queue?"',
    '2026-09-26T17:02:00.100Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=5000ms',
    '2026-09-26T17:02:05.100Z [LOG] [LLMHelper] verbal hedge: back started at 5000ms reason=trigger',
    '2026-09-26T17:02:10.200Z [WARN] [LLMHelper] verbal hedge: no answer - front empty, back empty',
    '2026-09-26T17:02:10.250Z [LOG] [Answer] full: "Could you repeat that? I want to make sure I address your question properly."',

    // W5: R2 resolved-as-failure. This window's OWN race wins a first token, then its OWN stream
    // fails afterward (generateStream's catch block, a real thrown error after a clean win).
    '2026-09-26T17:02:30.000Z [LOG] [Main] dispatch: answer source=whisper anchor="What is recursion?" verdict=match question="What is recursion?"',
    '2026-09-26T17:02:30.100Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=5000ms',
    '2026-09-26T17:02:30.950Z [LOG] [LLMHelper] verbal hedge: won by gemini-3.5-flash-lite at 850ms; other=not-started',
    '2026-09-26T17:02:32.400Z [ERROR] [WhatToAnswerLLM] Stream failed: socket hang up',
    '2026-09-26T17:02:32.450Z [LOG] [Answer] full: "[No answer — the answer model failed: socket hang up]"',

    // W6 (superseded immediately) / W6-super: R2 resolved-as-delivered. A stale empty-empty line
    // from W6's own abandoned race lands inside W6-super, beside W6-super's own real win.
    '2026-09-26T17:03:00.000Z [LOG] [Main] dispatch: answer source=whisper anchor="What is Big O?" verdict=match question="What is Big O?"',
    '2026-09-26T17:03:00.100Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=5000ms',
    '2026-09-26T17:03:00.400Z [LOG] [Main] turn: gate=400 finals=1 live=0 finished=true',
    '2026-09-26T17:03:00.450Z [LOG] [Main] dispatch: supersede source=whisper anchor="What is Big O notation" verdict=match replaces="What is Big O?" question="What is Big O notation and why does it matter?"',
    '2026-09-26T17:03:00.500Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.1-flash-lite back=gemini-3.5-flash-lite trigger=5000ms',
    '2026-09-26T17:03:01.900Z [WARN] [LLMHelper] verbal hedge: no answer - front empty, back empty',
    '2026-09-26T17:03:02.600Z [LOG] [LLMHelper] verbal hedge: won by gemini-3.1-flash-lite at 2100ms; other=not-started',
    '2026-09-26T17:03:02.650Z [LOG] [Answer] full: "Big O notation describes how an algorithm\'s cost grows with input size, ignoring constant factors."',

    // W7 (superseded immediately) / W7-super: R2 unresolved. Same shape as W6-super, but no
    // [Answer] full: line survives in the window - the run's own log ends here.
    '2026-09-26T17:03:30.000Z [LOG] [Main] dispatch: answer source=whisper anchor="What is a binary tree?" verdict=match question="What is a binary tree?"',
    '2026-09-26T17:03:30.100Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=5000ms',
    '2026-09-26T17:03:30.400Z [LOG] [Main] turn: gate=400 finals=1 live=0 finished=true',
    '2026-09-26T17:03:30.450Z [LOG] [Main] dispatch: supersede source=whisper anchor="What is a binary search tree" verdict=match replaces="What is a binary tree?" question="What is a binary search tree?"',
    '2026-09-26T17:03:30.500Z [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite trigger=5000ms',
    '2026-09-26T17:03:31.900Z [WARN] [LLMHelper] verbal hedge: no answer - front empty, back empty',
    '2026-09-26T17:03:32.600Z [LOG] [LLMHelper] verbal hedge: won by gemini-3.5-flash-lite at 1800ms; other=not-started',
].join('\n') + '\n';

const full = pre + win;
const startDebug = Buffer.byteLength(pre, 'utf8');
const endDebug = Buffer.byteLength(full, 'utf8');

const diag = [
    '[2026-09-26T17:00:11.300Z] first token 1200ms',
    '[2026-09-26T17:00:46.400Z] first token 6300ms',
    '[2026-09-26T17:01:23.000Z] first token 1150ms',
    '[2026-09-26T17:02:30.950Z] first token 850ms',
    '[2026-09-26T17:03:02.600Z] first token 2100ms',
    '[2026-09-26T17:03:32.600Z] first token 1800ms',
].join('\n') + '\n';
const endDiag = Buffer.byteLength(diag, 'utf8');

fs.mkdirSync(DIR, { recursive: true });
fs.writeFileSync(path.join(DIR, 'natively_debug.log'), full);
fs.writeFileSync(path.join(DIR, 'verbal-diag.log'), diag);
fs.writeFileSync(path.join(DIR, 'interview60.timeline.json'), JSON.stringify({
    startedAt: '2026-09-26T17:00:10.000Z', startedMs: 1790427610000, clock: 'playsync',
    startDebug, startDiag: 0, items: [],
    endedAt: '2026-09-26T17:03:40.000Z', endedMs: 1790427820000, endDebug, endDiag,
}, null, 1));

console.log(`wrote ${DIR}: startDebug=${startDebug} endDebug=${endDebug} endDiag=${endDiag}`);
