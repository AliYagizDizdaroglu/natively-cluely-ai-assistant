# REVIEW-2 of SPEC-bundle-1.md rev 2 (fresh Opus, scoped re-check, 2026-10-07)

**Verdict: CHANGES (minor).** All 11 REVIEW-1 findings are fixed, and the spot-checked claims hold. Five small bar or wording defects remain, plus one deviation that is not listed. The author can fix these in place, and a spot-check of the touched lines is enough after that. No question or answer text appears here. I wrote no code, made no model calls and used no git.

## REVIEW-1 findings: all fixed
| # | Status | Evidence |
|---|---|---|
| B1 | fixed | §2:138-145. The invariant is pinned at prompts.test.ts:282 (`${VERBAL_TYPED_PROMPT}${CUE_RULE}`). A grep for 4495445db0c2 under MAIN electron/ finds only 4 probe results.json files, so no test or harness pins it |
| B2 | fixed | gate-heard.out.txt: r1 and both smokes give EASY 13/20, QF 5, H 1, AF 4 → 23/47; HARD 10/27; s50m and eq give 1/40 (S1Q08F); roster→heard flips 0 and 1 (RH16). The frozen 22 (23 minus EF02) plus 20 cue ids make the 42 |
| B3 | fixed | §7.1:284-291. `NATIVELY_AUTOSTART_MEETING === '1'` is the gate at main.ts:3633. The refusal order is packaged, then not-harness, then router-off |
| B4 | fixed | §1.3:73-78 plus R2t. `DECIDE_MS = 2000` at routerArbiter.ts:32, and the deadline at :207 |
| R1 | fixed | ear-gap3.out.txt: 24 runs have utts > 0 (s50b onward), 22 of them healthy. The maximum of 3 occurs in s50f, s50j, cuesmoke 10-01 and h40d (4 of 22). The episodes reach 7 (br1) and 10 (cuesmoke 13-46). Arming and the two new tests are in place, and after5 is named |
| R2 | fixed | §5.2:253 (2.5 log line), §7.2:296-299 (zero PCM), §5.1:238 |
| R3 | fixed | §7.4 table, and §1.3:87-90 for a failed calibration gate (no guard) |
| R4 | fixed | Q3 (tolerance 1), the per-id floor in L1b, and NS defined as the cue ids |
| R5 | fixed | §8:325-333. Both methods are used, ties break by time, and the frozen set is 42 |
| R6 | fixed | §3.2:192-197 (per-id twins), §10:392 (owner and Sat deadline) |
| R7 | fixed | D2, D3, D4 and D5 are in §0.1 |

## Findings
1. **New contradiction at SPEC:404 (§11).** It says ASR fillers and commas "can only flip items toward more cues". §3.1:177 shows the opposite case on this same audio: on RH16, ASR dropped a comma and the item flipped to no-cue. Real ASR can both add and drop punctuation. Restate the residual as two-sided.
2. **S-R2 is ambiguous (SPEC:315).** It says "≥ 13" and also "scaled down by the excluded items, rounded down", and both cannot hold. r1's bar was 13/20 (PREREGISTER-router-default.md:205). Pre-register it as a formula: `floor(13 × n_EASY_outside / 20)`.
3. **The D2 count is not pinned (SPEC:319).** The bar says it fires "on the 5th interviewer utterance after T", but the watch is not reset at T. Healthy runs carry up to 3 uncaptioned utterances in a row, so the failover could fire legitimately on the 2nd to 5th utterance after T. Write the bar as: fires at or before the 5th utterance after T, with 0 fires before T.
4. **S1 has no tolerance (SPEC:364).** "T > C" fails whenever C reaches 18/18 (or T = C ≥ 15), even if T is at ceiling. Use T ≥ 15/18 AND T ≥ C, or T > C only when C < 15.
5. **C1 is not frozen (SPEC:366).** "named parts" per MP id is never fixed in advance, and "≥ C's count" has no stated tolerance. Freeze a per-id part count (counts only) before the bench, and state the tolerance (for example T ≥ C − 1 of 9).
6. **Deviation not listed (§0.1:31-41).** The plan's Sat drill says "force the ear to failed (2.5 failover live)". The ear-mute drill exercises the silent-listener path. The status-`failed` trigger (earFailover via status) is not drilled. Add a D8, or add an `ear-fail` fault. Nothing else departs from PLAN-before-reset. The 03:00 flight moved under user ruling 4, and #4 (3.8 Flash) is outside this bundle.

**Optional.** The residual at §5.1:238 and §11:408 (2.5 captions known only from memory) can be closed. h40d is one of the 22 healthy runs, and it flew on `gemini-2.5-flash-native-audio-latest` (interview60.runs/2026-10-02T11-39-41-h40d/interview60.flight.done.json:7), so 2.5 caption flow is proven in the logs.

## Bars with tolerance
All other bars carry a pre-registered tolerance: R1–R4, R2t, Q1–Q3, L1a, L1b, L2, L3, S2, C2, S-H, S-R1, S-SL, S-CUE and D1. The exceptions are findings 2–5.

## Not shown
I did not recompute the gate or the ear-gap numbers; I read the committed outputs. I did not check the CUE_RULE sha 8e15e4e7dd41 or the router context sha. I did not check that `.env` lacks the drill variables.
