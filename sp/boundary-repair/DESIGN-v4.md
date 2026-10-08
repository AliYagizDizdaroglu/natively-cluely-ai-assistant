# Deepgram boundary repair: design brief v4 (2026-09-29 ~19:10, revised ~21:10 after the Opus review of v4; author: Fable subagent; supersedes DESIGN.md v3)

v4 = v3 plus the fixes the Opus spec review of v3 required ("Sound with changes", 5 Important; the
controller's rulings in `sdd/v4-findings.md`), plus the Opus review of v4 (`sdd/spec-review-v4.md`: 1
Important on the plan, 6 Minor; rulings applied below). The reference implementation is `rule-v4.mjs` (this
folder); `check-v4.mjs` proves it on every recorded stream and on both reviews' probe inputs, output in
`evidence/check-v4.out.txt` (ALL CHECKS PASS; its two calibrations fail as they must); `check-v4-built.mjs`
runs the same checks against the BUILT module (calibrated: `evidence/check-v4-built.calibrate.out.txt`). The
TypeScript module must reproduce `rule-v4.mjs` event for event. What changed against v3, in one line each:

1. The tolerant cut accepts only a RE-SPELLING at the cut: same first letter, no digit, no longer (v3 review Important 1).
2. A non-ASCII-letter guard on the interim (v4 review M2) — it subsumes v2's token-count alignment guard, which the shipped module therefore omits while the reference keeps it as an unreachable line (re-review M-a); the ADAPTER repairs English connections only (v3 review Important 2).
3. A pause forgets the cut: `clear()` on an empty final and on UtteranceEnd; `speech_final` on F1 leaves no cut (Important 3).
4. Window provenance corrected to 3,715 ms with the 7,835 ms NORMAL tail stated (Important 4).
5. Evidence section rewritten from the files: seam2 and the no-evidence class, recall stated (Important 5), plus every factual Minor of both reviews.
6. In scope by consequence: the turns-fixture extractor must rebuild the REPAIRED final (Task 2 review, Minor 2).

One ruling changed, with evidence (§4): the controller's compound-merge test ("F1's last token starts with the
interim's token and is longer") does not refuse the review's own example, "all right" -> "Alright" (the spelling
drops an "l": `"alright".startsWith("all")` is false; an earlier `check-v4` run showed v4 restoring "right" with
that test). v4 refuses any tolerant last token LONGER than the interim's token at that position instead, which
subsumes the controller's test. Evidence, NON-HOLDOUT logs + seam recordings only (`evidence/check-v4.out.txt`):
42 tolerant cuts, 34 kept — every kept last token is no longer than the interim's ("xgboost" -> "xg",
"dashboard" -> "dash", "rac" -> "rag") — 7 refused as longer (all "break" -> "breaks"), 1 for a digit ("ninety"
-> "92"), 0 for the first letter; none of the refused cuts was followed by a repair, and repairs stay 25 / 4 / 6.
The first-letter rule therefore rests only on the synthetic "put" for "cut" case (a homophone with a new first
letter, "cue" -> "queue", would also be refused: a recall cost with no data either way). Holdout, reported and
NOT used for any choice: 3 tolerant cuts, 1 kept, 1 refused as longer ("idem" -> "idempotent"), 1 for the first
letter ("exactly" -> "a"); none followed by a repair.

## 1. Symptom (flight h40c, R22; the class is general)

Deepgram's interim held a word that neither of the two finals after it contains (h40c `natively_debug.log`
:4765-4766, :4785):

```
11:19:27.809Z interim: "How do you cut hallucinations in a rag answer without just making"
11:19:27.826Z FINAL  : "How do you cut"
11:19:29.373Z FINAL  : "in a rag answer without just making it refuse?"
11:19:29.837Z [Main] dispatch: answer source=whisper anchor="How do you cut in a rag answer without just making it refuse?"
```

The dispatched turn text joins finals verbatim (`interviewerTurn.ts` `textOf`), so the app asked the model
"How do you cut in a rag answer without just making it refuse?". The Live ear heard the whole question
(:4806-4808, "Live question ... How do you cut hallucinations in a RAG answer ..."), which is the only
data-backed source for losses that leave no interim evidence (§8). v3's claim that "all six captured replays of
that prompt were weak" has no support in this folder and is withdrawn.

## 2. Root cause, reproduced at the seam

Deepgram (nova-3, `endpointing: 300`, `interim_results: true`, `smart_format: true`) sometimes finalizes a
segment short of its own latest interim and starts the next segment after a word that then appears in no
final. `seam-probe.mjs` streamed clips in real time straight to Deepgram with the app's option object (the
audio path differs from the app's loopback capture): seam1 (2026-09-29 13:36Z, 4 non-holdout clips x 5 plays,
before v3 was settled) lost a word this way in 6 of 20 plays; seam2 (13:54Z, 16 clips x 3 plays, recorded after
v3 was settled at 16:53 local) lost one in 9 of 48. So the loss is Deepgram's, not the app's. Interims do reach
the app (`IntelligenceManager.recentInterviewerSpeech`); the dispatched turn text is built from finals only.

## 3. Evidence for the rule (`variants-scan.mjs`, `rule-sim.mjs`, `check-v4.mjs`; read-only over every run log)

A CUT is a final F1 whose tokens equal its preceding interim I's first |F1| tokens (strict), or all but F1's
last token (tolerant: Deepgram re-spells the word at the cut, "RAC" -> "Rag", 5 of 5 seam1 plays of S2Q07).
T = I's tokens after F1. Classes of the next final F2, non-holdout logs (`evidence/variants-scan.out.txt`):
- NORMAL 527: F2 starts with T[0] (the word just moved to the next segment). Nothing lost.
- F2 resumes T after skipping 1-2 words: 26 (18 with 2 matching words after the skip, 7 with 1 — the interim
  held no more — and 1 skipping 2 words), all TRUE against the scripted question. v3/v4 repair 25 of them
  (`evidence/rule-v3.out.txt`; the 26th, the "by 84%" NUMBER case, differs only by number formatting).
- |T| == 1 and F2 does not start with T[0]: 49 — mixed (8 real losses, 26 re-hearings such as "schedule" ->
  "scheduled", 15 unknown). Not repaired: text alone cannot decide it.
- OTHER 4: F2 neither resumes nor is a tail-1 case, e.g. the `92%` misaligned cut (negative #28, gap 5,164 ms).

v2 repaired the |T| == 1 class behind a "variants" filter and matched spelled numbers to digits; on holdout it
made 4 FALSE repairs ("two" before "to answer" x2, "fee" before "feature", "four point" before "4.1%"). v3 = v2
minus both. Consequently the holdout numbers below are NOT an independent validation of v3/v4 (v2's holdout
failures chose what v3 removed); R22 and the 4 holdout repairs are excluded from any future holdout measurement
of this rule, and no holdout count is used as evidence for any choice in this brief. The weakest path is k = 2
with m = 1: one sample ("for a" before "production", after4, gap 794 ms).

Repairs, rule v4 == rule v3 event for event (`evidence/check-v4.out.txt`, 13,892 events): non-holdout logs 25
(25 TRUE, 0 FALSE — the measured precision; 25 is a floor on the number of losses, since the logs cannot show
the no-evidence class of §8), holdout 4 (4 TRUE, reported only), seam recordings 6 (all true). The v4 refusals,
guards and pause signals change no repair on any recorded stream; `variants-v4.out.txt` measured the same for
each v3-review fix separately.

## 4. The rule (v4; reference `rule-v4.mjs`)

Normalization for comparison only: thousands commas between digits removed ("10,000" -> "10000"), lowercase,
tokens `[a-z0-9']+`. Traw = the same regex without lowercasing on the same comma-stripped text, so it lines up
index for index with the normalized tokens. I is ASCII-LETTERED iff it holds no letter or combining mark
outside ASCII (`/(?![\x00-\x7F])[\p{L}\p{M}]/u`; v4 review M2): accented English tokenizes as fragments, and a
lost "résumé" came back as "r sum and your last role" (`check-v4.out.txt`); "İzmir" even lowercases to "i" +
"zmir", one token more than its spelling has, which shifted Traw against T in the v3 review's probe. With ASCII
letters only, the two regexes split any text identically, so the guard SUBSUMES v2's token-count alignment guard
(`rawTok(I).length === tok(I).length`): the shipped module omits that line (re-review M-a: unreachable — 0 of
the 968,459 code points in the data would ever reach it), while `rule-v4.mjs` keeps it, behaviour identical
(`check-v4-built.mjs` proves the plan's module equal to the reference on every event and probe). 0 of the
13,017 interim/final texts in the 28 English logs and 0 of the 875 seam texts hold a non-ASCII letter, so the
guard costs nothing on the data; it also covers es/ru text if the adapter's English gate were ever bypassed.

On an interim: remember it as the latest interim; pass it through.

On a final F1 (arrival time t, Deepgram's `speech_final` flag s):
1. Repair (against the remembered cut, if any; see below). Then forget the cut.
2. If s is false and a latest interim I exists, I is ASCII-lettered, |F1| >= 1 and |I| > |F1|: F1 is a CUT
   of I when
   - strict: F1's tokens equal I's first |F1| tokens; or
   - tolerant: |F1| >= 2, all but F1's last token equal I's tokens, and F1's last token is a RE-SPELLING of
     I's token at that position: same first letter, no digit, and no longer than it. A digit token is
     smart_format writing "ninety two percent" as "92%" (one final token over three interim words); a longer
     token absorbed more audio than the interim's word (a compound merge, "all right" -> "Alright"); either
     shifts T and restored the wrong words in v3 (the review's probes: "two percent For each of those
     metrics, ...", "five last quarter ...", "right So tell me ..."). KNOWN RECALL COST (v4 review M1): an
     inflection is longer too, and it does NOT shift T — all 7 "break" -> "breaks" cuts in the logs are
     aligned (I "... and break score ties by original row", F1 "... and breaks", F2 "score ties by original row
     order.": nothing lost). A loss right after an inflected cut ("scale" -> "scales", then "horizontally"
     lost) was restored by v3 and is not by v4 (`check-v4.out.txt`, the RECALL COST probes). No such loss
     exists in the data; the refusal is kept because the merge shape it refuses inserts wrong words, and the
     inflection shape it loses has never lost a word in 42 tolerant cuts.
     THE DIGIT RULE'S EVIDENCE (Task 3 review): every digit-ending final token in the data or the probes
     ("ninety" -> "92", "twenty five" -> "25", "fifteen percent" -> "15%") also fails the first-letter rule,
     because a spelled number never starts with a digit — the tally's "1 digit, 0 first letter" only reflects
     the order the tests run in (`check-v4.out.txt`: 1 of 1 digit cuts also fails the first letter). The digit
     rule on its own is pinned by a synthetic case where the first letter matches and the token is shorter:
     "the version two release" -> "The v2" ("v2" for "version"; v3 restored "two"); it is a Task 3 test and a
     check-v4 probe.
   Remember T (I's normalized tokens after |F1|), Traw (the same words in I's spelling) and t.
3. Forget the latest interim.

Repair, on the NEXT final F2 only, when a cut is remembered, F2 arrives within 5,000 ms of F1 (inclusive) and
F2's first token is not T[0]: for k = 1, then 2 (k < |T|), with m = min(2, |T| - k), if F2's first m tokens
EXACTLY equal T[k .. k+m), emit `Traw[0..k).join(' ') + ' ' + F2` and log `[DeepgramStreaming] boundary
repair: restored "<words>" before "<first 40 chars of F2>"`; the first k that matches wins; otherwise F2 is
unchanged. F2's own `speech_final` does not affect its repair.

Pauses (§6): `clear()` forgets the remembered cut AND the latest interim.

Constants and their provenance (comments in the code): 5,000 ms = the observed max F1->F2 gap among repaired
losses, 3,715 ms (logs; 3,115 holdout; 3,207 seam), with margin — it keeps a tail from being glued onto the
next, unrelated utterance, and it is today the only turn-boundary guard the data exercised (no v3 match was ever
refused by it); NORMAL cuts reach 7,835 ms (p50 2,506, p90 3,774; 12 of 527 past 5,000), so the window will
occasionally miss a real loss; k <= 2 = the largest skip observed (1 case of 2, 25 of 1); m = min(2, available)
= the evidence every observed loss provides, 1 word only when the interim holds no more.

## 5. Language scope: English only

The rule compares ASCII tokens. The review's probes (`sdd/spec-review-scratch/probe-lang.out.txt`) showed it
restoring "migraci n" for a lost Spanish "migración", a shifted duplicate for Turkish "İzmir", and comparing
only the Latin tokens of a Russian sentence. The app offers es fr de it pt tr id ru uk ja ko zh and 'multi'
(`electron/config/languages.ts:64-77`). The ADAPTER therefore creates the repair only when the connection's
language passes `isEnglishLanguage` (`/^en(-|$)/i`, the same test `keytermsFor` uses, exported from
`deepgramKeyterms.ts`; 'multi' fails it; `languageCode` can only be `'en'`, an iso639 code or `'multi'`, and
the gate is re-evaluated in every `connect()`, so a language change — which restarts the stream — and every
reconnect see the current code); on every other connection transcripts pass through untouched and no repair
line is logged. The module keeps the non-ASCII guard as its own floor (one floor: it subsumes the alignment
guard, §4); it is not a language test. The reviews' Spanish and Russian probes are refused by that guard
inside the module, so the case only the GATE stops is unaccented text: Indonesian is written in plain ASCII,
and the module alone restores "menangani" in the adapter test's sequence (`check-v4.out.txt`); a Spanish
sentence that happens to carry no accent would be treated the same. The gate is what keeps such audio away
from a rule validated on English only.

## 6. Pause semantics

The module sits after the adapter's empty-transcript return, so v3's "any final clears the cut" was false for
EMPTY finals (median 187 per run log, max 445; h40c 223). In v4 three signals clear a remembered cut, none of
which occurred inside a repaired loss on the recorded data (`evidence/check-v4.out.txt`, `sdd/spec-review-
scratch/review-logs.out.txt`, `review-seam1/2.out.txt`):
- an empty FINAL (adapter: `clear()` before its empty return; 0 of 29 log repairs had one between F1 and F2;
  the only log cut with one is the 49.9 s turn boundary of negative #5);
- an UtteranceEnd (adapter: `clear()` in its handler; 0 of 6 seam repairs had one between F1 and F2; the
  logs' own `turn: deepgram utterance-end` lines applied as clear() keep 25 / 4 — 1 of them falls inside a
  NORMAL cut, where nothing was lost);
- `speech_final = true` on F1 (passed to the module; all 63 seam cuts had it false).
An empty INTERIM is not a pause (they are frequent and precede words). After `clear()` the next final is not
compared with an interim from before the pause.

Scope of this evidence (v4 review M4): the app only logs UtteranceEnd since 2026-09-09, so 15 of the 28 logs
carry those lines and only 14 of the 25 non-holdout repairs come from logs where the UtteranceEnd signal was
observable; the other 11 are evidence for the empty-final signal only. `speech_final` is never logged by the
app, so its effect on the app's audio path is unmeasured: the seam recordings (which record it) are the only
evidence, and the live hour of §10.6 cannot count it. No logging is added for it (out of scope).

## 7. Wiring

- Module `electron/audio/deepgramBoundaryRepair.ts`: pure, clock-free, log-free; `createBoundaryRepair()` ->
  `{ onTranscript(text, isFinal, atMs, speechFinal?), clear() }`, result `{ text, restored: string[] | null }`.
- Adapter `electron/audio/DeepgramStreamingSTT.ts`: one repair per live socket, created in `connect()` beside
  `stale()` when `isEnglishLanguage(this.languageCode)`, else `null`; the Transcript handler calls `clear()` on
  an empty FINAL before its empty return, feeds every non-empty event with `Date.now()` and
  `data.speech_final === true` (a top-level field of Deepgram's Results message, the one `seam-probe.mjs`
  records), logs one line per restore and emits the repaired text; the UtteranceEnd handler calls `clear()`.
  A restarted socket starts fresh. The `Transcript event — isFinal=…, text="…"` line keeps logging Deepgram's
  RAW text; the repair adds its own line on the very next line (same synchronous handler; `main.ts:63` writes
  the log with `appendFileSync`).
- Only the interviewer Deepgram instance exists: `main.ts:1413` is the sole `createSTTProvider` call; the mic
  STT is disabled (`main.ts:1401`, `:1584`, `:1609` "no-op: mic STT disabled"; `googleSTT_User` is never
  assigned). v3's "both instances" statement is withdrawn.
- Extractor `electron/test/golden/interview60.turns-fixture.mjs`: its finals came from the RAW line, but the app
  now passes the REPAIRED text to the turn, so fixtures from future flights would replay without the restored
  words. `finalsFrom(dbg, since)` (new `interview60.turns-finals.mjs`) rebuilds `${restored} ${raw}` when a
  `boundary repair:` line directly follows a final; on the two committed fixtures (s50a 132 finals, after9
  181) it reproduces the committed `finals` arrays exactly (pre-repair logs hold no repair line), and the
  end-to-end run on s50a with `scenario50-tts-local` deep-equals the committed fixture's `finals`, `items` and
  `actual` (the v4 reviewer's r5). `interview60.metrics.mjs:141` also parses the RAW line — on purpose: it
  measures what Deepgram heard. Its unit test locates the golden folder with `__dirname`, because vitest
  workers keep the caller's cwd (the plan's test command runs from `%TEMP%`; the v4 reviewer's r2 probe).
- Consumers of the repaired text (reconciler, session context, detector, RAG, UI, knowledge, liveHold, turn
  machine, dispatch) are benign per the review; a restored leading "and" makes `looksFragmentary` true so the
  reconciler keeps Live's text (benign), and suggest mode could hold a detector question that starts with a
  restored conjunction for up to 2.5 s (minor, accepted).
- Out of scope: Live supersede, keyterms content, isFragment (R05), the turn machine, the prompt, new logging.

## 8. Residuals (documented; the ones text can pin are pinned by tests)

- The |T| == 1 tail: half of the cut-shaped losses; text alone cannot tell a lost word from a re-hearing.
- Resumption evidence that differs only by number formatting ("eighty" / "84%").
- The NO-EVIDENCE class: F1 longer than its last interim, so the lost word is in no interim. seam2: 4 of its 9
  boundary losses (M06#1 "machine", M28#2 "between", M02#1 "scheduled", M10#3 "recommendation"). No interim rule
  reaches it. Expected recall of v4 over ALL boundary losses on fresh audio: seam1 4 of 6, seam2 2 of 9 (the
  first post-v3 data: 2 of the 5 cut-shaped losses plus 0 of the 4 no-evidence ones) — between a fifth and two
  thirds, point estimate 2/9 from seam2 (seam3, 2026-09-30, post-v4: 1 of its 1 resumed-shaped loss restored;
  its other loss is the head drop below). In the logs the no-evidence class is invisible (no
  per-word timings): 25 of 25 there is the measured precision, and 25 is a floor on the number of losses.
- The longer-token refusal's recall cost (§4): a loss right after an INFLECTED tolerant cut ("scale" ->
  "scales" + lost "horizontally") stays lost; 0 such losses in 42 tolerant cuts.
- Shorter symbol merges the re-spelling test still accepts (v4 review M2): "Q and A" -> "Q&A" ("q&a" tokenizes
  as "q", "a": same first letter, shorter) would restore "A" ("A session on Friday."); likewise "M and A" ->
  "M&A". 0 "&"-joined words in the 28 logs and the seam recordings (`check-v4.out.txt`). No guard.
- A STRICT cut past a smart_format rewrite (Task 3 review): an interim that already shows the digits, "...
  accuracy reaching 92 percent for each", followed by the final "... accuracy reaching 92%." is a strict cut
  (F1's tokens "accuracy reaching 92" are a prefix of the interim's), so the re-spelling test never runs and
  the rule restores "percent" ("percent For each of those metrics, ..."; `check-v4.out.txt`). 0 of the 10,069
  non-empty log interims and 0 of the 663 seam interims spell "percent" after digits, while 270 + 5 already
  show "<digit>%" (the Task 3 review counted 0 of 10,732 and 275 over a slightly different set). No guard.
- Per-word timestamps as a follow-up: promising, unproven. `evidence/seam2-tail-timing.out.txt` holds 5 LOST
  rows and 0 re-heard rows; the NORMAL-cut proxy (F2's first word start minus T[0]'s end) sits 0.11-0.58 s
  before, the lost rows at -0.02..+0.05 s — 90 ms from the nearest NORMAL value on 0.08 s timestamp steps; the
  silence gap cannot flag a loss (lost 0.31-0.73 s vs pauses up to 0.56 s without loss, `review-gap.out.txt`).
  A timestamp rule needs re-heard negatives with timings before it is designed.
- Fillers and stutters: if interims keep a filler or a repeated word the final dropped, v4 restores it ("um",
  "the"); unmeasured (no log shows it), benign duplicates.
- The window tail: 12 of 527 NORMAL cuts exceed 5,000 ms, so a real loss past the window stays lost.
- `speech_final`'s in-app effect is unmeasured (§6). Holdout is not independent (§3).
- Punctuation inside a restored word (final review, 2026-09-30): Traw is `[A-Za-z0-9']+` runs, so a restored
  "4.1" comes back as "4 1", "C++" as "C", "50%" as "50" (`final-review-scratch/fr-probes.out.txt`). None of the
  25 non-holdout restores held such a word; unmeasured. No guard.
- Fresh seam data (2026-09-30, `seam-probe-v4/`, 30 plays of 10 non-holdout clips never streamed before): the
  reference under the adapter's wiring made 1 repair (L04#1 "upstream", TRUE) and none wrong; `speech_final` was
  on 0 of 37 strict cut finals (seam2: 0 of 38). Two losses of other classes in L04#3: the final dropped its
  own interim's first word ("or gets corrected" -> "gets corrected") — a head drop inside one segment, which no
  cut rule sees; and Deepgram cut "backfill" to "back" in a final the rule keeps as a re-spelling cut
  ("back" is shorter, same first letter), the next final resuming at "a month": the word stays damaged because
  the rule never edits the cut final (a residual nobody had listed; the final review, 2026-09-30). Not the
  "xgboost" -> "xg" case, where the next final re-emits "XGBoost" (s50c log).

## 9. Evidence table (every number, its file)

| Number | File |
|---|---|
| 25 non-holdout / 4 holdout repairs, all TRUE, the 29 restored/before lines | `evidence/rule-v3.out.txt` |
| v4 == v3 event for event over 13,892 events; 25 / 4 / 6; utterance-end lines as clear() 25 / 4 / 6; fixtures 45/45; 23 probes (incl. "version two" -> "v2", Indonesian "menangani", clear() after an interim, the 5000 / 5001 ms pair); non-ASCII 0 of 13,017 log texts and 0 of 875 seam texts; "&"-joined 0; digits + "percent" in 0 of 10,069 log / 663 seam interims, "<digit>%" 270 / 5; UtteranceEnd 15 of 28 logs, 14 of 25 repairs; empty finals median 187 / max 445 / h40c 223 | `evidence/check-v4.out.txt` |
| Non-holdout tolerant cuts 42: kept 34, longer 7, digit 1 (which also fails the first letter), first letter 0; holdout (not used) 3: kept 1, longer 1, first letter 1 | `evidence/check-v4.out.txt` |
| check-v4 against the built module: rule-v4 EQUIVALENT; shim-v3 NOT EQUIVALENT (13 checks); a clear() that keeps the interim NOT EQUIVALENT (1 check); a 4000 ms window NOT EQUIVALENT (1 check) | `evidence/check-v4-built.calibrate.out.txt` and the four `check-v4-built.calib-*.out.txt` |
| 968,459 code points in the data, none reaching the alignment line once the non-ASCII guard holds | the re-review's M-a (controller's message) |
| Each v3-review fix separately: strict 25/4/4, digit, digitcat, pause, align 25/4/6 | `evidence/variants-v4.out.txt` |
| per-socket == per-log: 1922 sockets, 29 repairs, 0 differences | `evidence/per-socket.out.txt` |
| Classes NORMAL 527, SKIP1 25 + 1, TAIL0 49 (8/26/15), gaps | `evidence/variants-scan.out.txt` |
| Max repaired gap 3,715 (logs) / 3,115 (holdout); m=1 repairs 7; empty final between 0; the `92%` cut | `sdd/spec-review-scratch/review-logs.out.txt` |
| NORMAL gaps p50 2,506 / p90 3,774 / max 7,835; 12 of 527 past 5,000; 4,441 = the "by 84%" case; the 49.9 s empty-between case | `sdd/spec-review-scratch/review-window.out.txt` |
| seam1: 20 plays, 6 losses, 4 repaired (gaps 1,692 / 3,190 / 3,207 / 2,999); 23 cuts all speech_final=false | `evidence/seam1-v3.out.txt`, `sdd/spec-review-scratch/review-seam1.out.txt` |
| seam2: 48 plays, 9 boundary losses (5 cut-shaped, 4 no-evidence), 2 repaired (gaps 1,187 / 966); 40 cuts all speech_final=false | `evidence/seam2-v3.out.txt`, `review-seam2.out.txt`, `review-gap.out.txt` |
| 1 log UtteranceEnd inside a NORMAL cut; 1 empty final inside the 49.9 s TAIL1 case; "breaks" cuts aligned; "scales"/"horizontally", "Q&A", "résumé" probes | `sdd/spec-review-v4.md` (r3, r6) |
| Timestamp proxy: 5 LOST rows at -0.02..+0.05 s | `evidence/seam2-tail-timing.out.txt` |
| The v3 review's probe inputs and language probes on v3 | `sdd/spec-review-scratch/probe-inputs.out.txt`, `probe-lang.out.txt` |
| Spelled multi-word numbers before a digit final: 2 distinct ("p ninety nine", "ninety two percent") | `sdd/spec-review-scratch/review-numbers.out.txt` |
| R22 lines, the dispatched garbled question, the Live ear's full text | h40c `natively_debug.log` :4765-4766, :4785, :4806-4808 |
| Extractor parity: s50a 132 / after9 181 finals identical to the committed fixtures; end-to-end s50a run deep-equal | `extractor-finals-check.mjs` (2026-09-29), `sdd/spec-review-v4.md` (r5) |
| Vitest workers keep the caller's cwd; `__dirname` is the test's folder | `sdd/spec-review-v4-scratch/r2-cwd-probe.mjs` |
| The plan's RED/GREEN counts, run from `%TEMP%` on a mirror of MAIN | `evidence/verify-plan-v4.out.txt` |

## 10. Verification (rules 5, 7, 8 of the global CLAUDE.md)

1. TDD unit tests of the module: the 58 existing tests (fixtures copied verbatim from `fixtures-v3.json`, whose
   expected outputs v4 reproduces 45/45) stay green with no expectation changed, plus 11 v4 edges each watched
   failing against the v3 module: negative #28's strings with the interim running on, "twenty five" / "25",
   "all right" / "Alright", "break" / "breaks" (pinned as the documented recall cost), a first-letter mismatch,
   "version two" / "v2" (the digit rule on its own), the "İzmir" and "résumé" non-ASCII-guard cases, `clear()`
   between F1 and F2, `clear()` after an interim, `speech_final` on F1 (and not on F2).
2. Adapter tests through a fake socket: the existing restart test, an empty FINAL between F1 and F2 clears, an
   UtteranceEnd clears (and is still re-emitted), `speech_final` reaches the module, an empty INTERIM does not
   clear (control), an Indonesian connection passes through with no repair line — Indonesian is written in
   ASCII, so the module alone would restore a word there ("menangani"); the reviews' Spanish and Russian probes
   are refused inside the module by the non-ASCII guard and cannot show the gate; `isEnglishLanguage` pinned on
   the app's codes.
3. Extractor: `finalsFrom` unit tests (a final directly followed by a repair line -> restored + raw; since
   filter; empties; a repair line not right under its own final REFUSED with the line named — Task 5 fix round 1,
   rule 11: one handler writes both lines, so such a log is not what the app saw) and parity with the two committed fixtures' `finals`,
   located with `__dirname`; the end-to-end extractor run on s50a as the import-path check.
4. Offline replay (controller): `check-v4-built.mjs` runs `check-v4.mjs --module` against the BUILT
   `dist-electron/electron/audio/deepgramBoundaryRepair.js` under the v4 feed and must print EQUIVALENT
   (25 / 4 / 6, 0 of 13,892 events differ from rule-v4, 45 fixtures, 23 probes — among them "clear() after an
   interim keeps nothing" and the 5,000 / 5,001 ms window pair); calibrated on rule-v4 (EQUIVALENT), on
   `shim-v3.mjs` (NOT EQUIVALENT), on a mutant whose `clear()` keeps the latest interim and on a 4,000 ms
   window mutant (both NOT EQUIVALENT, each caught by exactly its probe).
5. Live at the Deepgram seam: a fresh seam probe on other non-holdout clips (fresh data), the built module
   applied, before/after against the script; count the no-evidence losses separately; this is also the only
   place `speech_final` is recorded.
6. Live, through the app (scheduled task, never from a Claude session): a scenario50 S1+S2 hour on the rebuilt
   MAIN; every `boundary repair:` line read against the scripted question playing, and the dispatched
   `question=` of each repaired item; count the empty finals and UtteranceEnds that arrived between a cut and
   its next final (both are logged); `speech_final` cannot be counted here (never logged).
