VERDICT: APPROVE WITH FIXES

# Re-check of AMENDMENT-A3.md (pre-data)

Fresh Opus, independent of the A3 author, written 2026-10-05. I edited no file except this one. I read no captured prompt, key, `verbal-prompts.log`, `*-gated*.json` or `turn-parity-*.json`. Logs were read for line counts and timestamps only. I made no model call and used no subagent.

Counts: **0 Critical, 2 Important, 12 Minor.** A3 resolves every A2-RECHECK item and every controller input in substance. It applies U1 exactly and prices it correctly. Two things would make a tool fail its own calibration, or make tonight's verdict ambiguous:
- **I1:** `eq-b4-cal` cal (c)/(e) can fail to flip on a correct tool.
- **I2:** for a malformed block, 1(e) and 5d collide (FAIL vs VOID).

## Holds (checked, with evidence)

- **Hashes (sha256).**
  - A3 = `36aa80002a6b36d41a5c0ac613e4e7f705f81faa46b559566e9edaad79e31d6e`, the expected value.
  - Registration, A1 and A2 match A3's "Hashes as read" byte for byte.
- **U1 is applied as ruled.**
  - A3.3: "≥ +2 = FAIL, ≤ +1 = PASS", front leg, G sitting.
  - This matches "FAIL only if … exceeds no-block by >= 2". Reading +1 as PASS (not INCONCLUSIVE) is the only reading compatible with "FAIL only if".
  - It is the only weakening relative to the registration, A1 and A2. See (2) for one other relaxation against A2, which is disclosed.
- **The 4c price is exact.** I recomputed P(Bin(n,p) − Bin(n,p) ≥ 2) for independent arms:

  | p | 15 pairs | 16 pairs | 20 pairs | 24 pairs | old bar (≥ 1), 20 pairs |
  |---|---|---|---|---|---|
  | 5 % | 9.3 | 10.0 | 12.6 | 14.9 | 34.5 |
  | 10 % | 17.3 | 18.1 | 20.8 | 23.0 | 39.3 |
  | 20 % | 24.5 | 25.2 | 27.5 | 29.3 | 42.1 |

  - Every cell equals A3's table.
  - The union with 4b, assuming independence: 1 − (1 − .137)(1 − .126) = 24.6 %, and up to 44.8 % at 1 % / 27.5 %. That matches "25–37 % / 33–45 %".
- **The `+ 2` correction is right.**
  - `WhatToAnswerLLM.ts:234-250` pushes the block last and joins the parts with `\n\n`, then adds `\n\n${transcriptLabel}:\n`. The bytes before the marker are therefore `${block}\n\n`, whether the block is the only context part or the last of several.
  - `earlierQuestionArm.mjs` removes exactly `user.slice(first, mi)` and sets `block = removed.slice(0, -2)`. Hence `user.length − s.user.length = block.length + 2`.
  - The re-check's `+ 3` would have failed case (b) on correct bytes.
- **c2's builder** (`followup-replay-build.mjs`, sha256/16 `9585DD719360CEBE`, identical in MAIN `passes/` and in L):
  - In `--calibrate` it only checks that the debug log and timeline exist (l. 43-45) and reads only `prompts.json` (l. 100-118). A3.1a is right about this.
  - It loads MAIN's dist `followUpParent.js`, `transcriptCleaner.js` and `lastInterviewerTurn.js`, all present at 355ad0a.
- **The smoke run dir can be built.**
  - `interview60.prompts.mjs:35-47` attributes dispatches by `Date.parse` against `playedAt` (epoch ms). `smoke-turn.mjs:57-60` stamps `startedMs` as epoch ms from the player's clock, so `playedAt = startedMs` is on the same clock.
  - Keeping WHY bounds S1Q06F's window at WHY's start, which is FR-I2's option.
- **T3 matches the code.** `interview60.answers.mjs:324` prints T3's text followed by " — the id is not in G; …". A "contains" check passes.
  - The n5 header `block=stripped from the captured prompt` is at l. 329.
  - `--limit` exists (l. 139-141).
- **I1 (grader pin) is buildable.**
  - `launch-grader.mjs:87` `FLAGS` hard-codes `'--model','opus'`.
  - `probeArgs` (l. 94-96) reuses `FLAGS`, so one substitution covers graders and probes. Neither line holds `--add-dir`.
- **I4d calibrates.** On this machine, Node v22.19 honours `TZ` on Windows: `TZ=UTC` turns 21:00Z into hour 21, against 0 without it. A machine-TZ implementation of P4 would therefore flip.
- **(5) Every cause signature exists in MAIN at 355ad0a and reaches a log the reader has:**

  | signature | where it is emitted | notes |
  |---|---|---|
  | behavioral override | `electron/IntelligenceEngine.ts:423`, `` `runWhatShouldISay: intent override → ${mapped}` `` | `mapped = 'behavioral'` at `:414`. The auto path always passes `intentOverride: intent` (`main.ts:2197`). s50m, s50l and the 10-01 cuesmoke each hold exactly 1 such line in `natively_debug.log`. |
  | fast route, `route: FAST-OVERRIDE (Flash Lite)` / `route: BEHAVIORAL (Flash Lite, filtered)` | `electron/llm/WhatToAnswerLLM.ts:285`, logged to `verbal-diag.log` on every `generateStream` call | The fast call is at `:342`. `verbal-diag.log` is copied into every run folder (`interview60.run.mjs:38,573`). |
  | intro response | `electron/LLMHelper.ts:2455`, `[LLMHelper] Knowledge mode (stream): returning generated intro response` | |
  | `__negotiationCoaching` | yielded at `LLMHelper.ts:2450` with no log there | It reaches the debug log through `SessionTracker.ts:248` (`addAssistantMessage called with:`, first 50 chars, which hold `{"__negotiationCoaching":`) and `:252` (`[Answer] full:`, JSON-escaped). The substring is present in both. |
  | screenshot | `electron/main.ts:2192`, `[Main] screen reference: captured ` | The `capture failed` warn is at `:2194`. A3's `:2189` is the 89c8f53 line; see m2. |

  - **Capture and the fast route:** the only `capturePrompt` call is `LLMHelper.ts:2728`. `streamVerbalWithGeminiFlash` (`:3344-3371`) has no capture and no knowledge intercept, so the knowledge short-circuit cannot co-occur with the fast route. A3's first-match order is therefore safe.
- **(1) Resolution status.**
  - Resolved in substance: C1 (pre-arming gate restored, waiver withdrawn), I1–I5, m1–m14, T1–T3, FR-I2 and FR-I3.
  - The defects in what was adopted are I1, I2 and the Minors below.
- **(2) Bars.**
  - **Stricter:** the window (`≤ 22:30:00.000Z`), the withdrawn A2.9 waiver, and knowledge-short-circuit counted as a G\* miss.
  - **Re-attributions (not weakenings):** m9 (a built-not-inserted main that is wrong → 4e) and m8 (a `short` window excluded from G, with 4a still read). Both follow from flag-off bytes.
  - **Disclosed relaxation against A2 (not against the registration):** `fast-route` and `knowledge-short-circuit` windows no longer VOID under 1(e). Registration 1(e) never counted capture-less windows, and these causes are known by code (FR-I3), so this is justified.
  - **Undisclosed narrowing:** 1(e)'s second half went from "every LABEL capture" to "every inserted capture". See I2.

## Critical

None.

## Important

**I1. TRANSCRIPT is a renderer fixed-point check, so cal (c) and (e) as worded need not flip, and the reading claims more than it can see.**

Why:
- In `--calibrate`, the builder rebuilds each captured prompt from the transcript lines parsed out of that same prompt and compares the result with that prompt (`followup-replay-build.mjs:91-95, 107-108`). It reads no log and no timeline.
- Window lines are re-rendered by `cleanText`, which lowercases, drops fillers and acks, collapses repeats and normalises punctuation (`transcriptCleaner.ts:30-53`).
- The last `[INTERVIEWER]` line is re-pinned verbatim (`lastInterviewerTurn.ts` `pinSettledQuestion`).

Consequences:
- A lowercase-for-lowercase swap in a window line, or any change in the last line, reproduces exactly. The result is `TRANSCRIPT OK`, not `DIFF X` / `UNCALIBRATED 1`.
- Piece 3 then "has not passed", which means no flight tonight. The alternative is a cal case tuned until it flips without the reason being written down.
- The live meaning of DIFF is "transcript bytes the app's renderer could not have produced". It is not "differs from the live transcript".

*Fix (replace cal (c) and (e) and add one sentence to A3.1a):*
> "(c) as (b), with one NON-final line of X's transcript part (X chosen with ≥ 2 transcript lines) given an uppercase letter in place of a lowercase one → `TRANSCRIPT DIFF X`; (c′) as (b), with a lowercase-for-lowercase swap in that line → `TRANSCRIPT OK` (the documented blind spot, printed); (e) the same uppercase change in one non-G id's non-final line → `TRANSCRIPT UNCALIBRATED 1`. TRANSCRIPT checks only that each transcript part is a fixed point of the app's renderer (`prepareTranscriptForWhatToAnswer` + `pinSettledQuestion`); it is not compared with the log, and a renderer-producible change is invisible to it (named in §9 beside the before-marker limit)."

**I2. 5d and 1(e) collide on a malformed block. A LABEL capture outside a block window escapes both. BLOCK is vacuous on the hour.**

- **(a) The collision.** A3.1b sends "no signature, LABEL present but malformed" to **5d**, a feature-attributable FAIL. A3.1b's recast 1(e) ("every `gate=block` window that carries none of the three signatures has an inserted capture") makes the same window **VOID 1(e)**. §5 item 1 FAILs are "not read under 1(d) or 1(e)" (A3.2 I3), so the one defect 5d targets reads VOID (re-fly) under one sentence and FAIL under the other.
- **(b) The escape.** A2's 1(e) required "every LABEL capture in the run window has a `gate=block` window". A3 narrows this to "every inserted capture", meaning a well-formed one. A malformed LABEL capture in a non-block window (a leak, or a mis-pairing) now matches no VOID and no FAIL. That is a narrowing against A2 that the user did not rule.
- **(c) BLOCK is vacuous after the hour.** It runs with `--g <G_twin>`, and G_twin is pre-filtered by `splitEarlierQuestion !== null`, so `BLOCK FAIL` cannot fire.

*Fix (A3.1b and A3.1a):*
> "**5d is checked first, on every capture carrying the LABEL** (per-dispatch captures and `interview60.prompts.json` entries), whatever the window's signature or gate: LABEL present and `splitEarlierQuestion` null = 5d. A malformed capture satisfies 1(e)'s first half (it is read as 5d, never as UNEXPLAINED). 1(e)'s second half reads: 'every capture carrying the LABEL, well-formed or not, has a `gate=block` window'. After the hour, `eq-b4-cal` runs with `--g {id : prompts[id].user includes LABEL}` (not G_twin), so BLOCK FAIL can fire on a malformed kept entry."

Add a reader calibration case: a non-block window whose capture carries a malformed LABEL → 1(e) VOID, with the id named.

## Minor

- **m1. A misquote, and a note on BLOCK's clauses.**
  - The module has no line `removed = block + '\n\n'`. It has `removed = user.slice(first, mi)` and `block = removed.slice(0, -2)`; the arithmetic is unchanged. Fix the quote.
  - The length clause cannot fail when `s` is non-null. Keep it as a consistency assertion, but say so.
  - The round-trip clause is the real check: it catches a split that cuts the parent. It would false-FAIL only if `INTERVIEWER JUST SAID:\n` appeared before the label, because `withEarlierQuestion` uses the first marker. Name that case.
- **m2. A line citation drifted.** `[Main] screen reference: captured ` is at `main.ts:2192` at 355ad0a; `:2189` is 89c8f53. Change "(`main.ts:2189`, verified)" to "`main.ts:2192` at 355ad0a".
- **m3. "Immediately before" is too strict.** "The line immediately before its pinned-question line" should read "before its pinned-question line in the same dispatch window, with no other pinned line between them". STT and Live lines interleave, and an adjacency reader would turn a screenshot window into UNEXPLAINED (VOID).
- **m4. The real-shape case ignores `verbal-diag.log`.** That file is cumulative: s50m's run-folder copy holds 24 `route: BEHAVIORAL|FAST-OVERRIDE` lines, and only 1 falls inside its run window (07:14:21Z, S1Q01). Replace the case with: "both files, run-window only: s50m and s50l each give 1 debug-log override line and 1 verbal-diag BEHAVIORAL line, both at S1Q01; out-of-window verbal-diag route lines counted and ignored." Add a synthetic window that carries only a verbal-diag `route: BEHAVIORAL` line → `fast-route`. That line is the complete signature: `WhatToAnswerLLM.ts:285` logs it for every call, while the override line exists only on override paths.
- **m5. Standing A2 text contradicts A3.**
  - (a) A2.10's b6 contract and cal still read "span (≤ 90 min) for 2c" and "span 120 min → 2c REPORTED". Replace them with A3.4's rule. Cal: "one front rep's steps 16 min apart → 2c REPORTED naming the rep; all ≤ 15 min with a 120-min sitting → 2c gates".
  - (b) A2.10's `eq-b4-cal` output line (`B4CAL non-G n/n …`) is replaced by A3.1a's TRANSCRIPT/BLOCK lines.
  - (c) `eq-gsitting.ps1` should also refuse on `BLOCK FAIL`. Add its `-WhatIf` case.
  - (d) A2.9's kept first sentence, "proves the no-block twins send flag-off bytes", overclaims against A3's own §9 limit. Read it as "checks the stripped bytes as A3.1a defines".
- **m6. The "third, dry probe" cannot run as named.**
  - `launch-grader.mjs:211` accepts only `cwdprobe-1|2`.
  - `--dry-run` launches nothing, so it reads no model.
  - Name it: "`cwdprobe-1 --probe` without `--model-id`, in a fresh cwd, after the two pinned probes (or `cwdprobe-3` with the regex extended); reported only."
- **m7. Step 9's "HEAD moved by a dummy commit" commits on a shared MAIN.** Calibrate HEAD-moved by pin mismatch instead: run the guard with `NATIVELY_FLIGHT_COMMIT` set to the parent sha. Never commit on MAIN to test.
- **m8. T is circular.** Step 10 embeds `NATIVELY_EQ_T`, but A1.1 defines T from the moment steps 10–13 pass. Add: "T is chosen at step 10 as the first quarter-hour ≥ 10 min after step 13's expected end; if step 13 ends after T − 10, regenerate from step 10 with a new T and re-run steps 11–13."
- **m9. The ARMING sha is printed before the file exists.** The launcher prints `ARMING-flight-eq.md`'s sha, but the file is written at step 14, after step 11's dry run. Add: "the launcher prints `ARMING absent` and continues when the file is missing; the precheck at T − 6 must see it present."
- **m10. Fast-route G items have no capture.** Rule 5b cannot read their referent. Name it "referent UNREAD (fast-route)", reported only; 4a still reads the answer.
- **m11. The hole re-run needs one more clause** (m5 of A3.4): "the `-b` pair replaces that rep's original pair on both sides; the two are never mixed".
- **m12. Step 11's dry run is untimed.** Record its duration, so the 240 s precheck wait is measured before the real run; A3 names it as unmeasured. Also name where the n5 output file lands: `electron\test\golden\interview60.answers.<model>_nb-accept-probe.json` (`answers.mjs:138`). That is where step 5's delete must look.

## (3) The verdict map, walked after A3

The ladder is: 1 feature-attributable FAIL → 2 VOID → 2-NG → 2-OF → 3 INCOMPLETE → 4 INCONCLUSIVE → 5 NO LATENCY VERDICT → 6 PASS → closing line.

| outcome | maps to |
|---|---|
| `fast-route` | in G (3b, 4a, 4d; 1(c) counts it as reached); out of G_twin; \|G_twin\| < 3 → 3 |
| `knowledge-short-circuit` | out of G; a G\* miss → 1(c); a main so read → 4e |
| screenshot | out of G; a G\* miss; main → 4e |
| 1(j), 1(k) | 2, with item 1 still read (A3.2) |
| unreadable `startedAt` | 5 |
| ungated 2c | reported |
| 4c +1 | PASS |
| TRANSCRIPT UNCALIBRATED on the hour | reported |
| TRANSCRIPT DIFF or BLOCK FAIL on the smoke | no flight |

The map is total and unambiguous except for I2(a) and I2(b).

## (6) The pre-hour list

- **Order:** dependency order is right. Cal (f) and g1 need step 4's outputs and come after it; P6 needs RESULT-smoke-eq; launchers follow the HEAD commit; precheck cal needs the dry task.
- **Known answers:** every step has one, except as noted in I1, m7 and m8.
- **Buildable tonight:** yes. All tools sit in L, need no app code, and use existing MAIN modules. Nothing on the list needs quota beyond the smoke (≈ 10) and n5 (1).

## (7) Contradictions left standing

- m5 (A2.10's b6, its `eq-b4-cal` line and `eq-gsitting`, and A2.9's first sentence).
- A2.4's 1(e) second half (I2(b)).

Nothing else was found. Registration §2's G rows, §6's consumption order, A1.1/A1.4's departures, A2.8 m4's file list and A2.8 n4's HEAD are all replaced explicitly by A3.

## Not checked

- I ran none of A3's tools, because none exists yet.
- Whether the cuesmoke and smoke captures reproduce under TRANSCRIPT (A3 names it).
- The `__negotiationCoaching` line in a live hour's log; I verified only its code path and the metrics test's fixture shape.
- `TZ` behaviour under the scheduled task's environment (only my shell).
- The dry twin's duration.
