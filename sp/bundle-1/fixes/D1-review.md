# D1 review — 3737dafc (fix/short-followup-dedup), base 9d5bd9e

Reviewer: Opus, scoped (read-only: diff, ChipDeduper.ts, questionReconcile.sameAnchor, main.ts dispatch path). Tests not run by me.

## Verdict: APPROVE. Keep the window at CROSS_DETECTOR_MS (5 s).

## Condition correctness
- **Which side is short:** `min(contentWords(anchor), contentWords(entry.anchor)) < 4`. Correct. sameAnchor's overlap half is `max(overlap(a,b), overlap(b,a)) >= 0.5`, and the ratio that clears 0.5 is the one over the SHORT side (RH02: 1/2). So the shorter side is the right one to gate on. `contentWords` (words > 3 letters) is documented as the same tokenizer `overlap()` uses. I did not open `words()` to check that.
- **Containment exemption:** the code recomputes sameAnchor's containment half inline: lowercase+trim, both >= 3 chars, `includes` either way. It matches `sameAnchor` today, character for character. Nit: it is a copy that can drift. An exported `anchorContains()` in questionReconcile would remove that risk. Not blocking.
- **Sources:** the rule applies to both sources, same-source and cross-source alike. That is what the request asked for ("only within 5 s"), and it is stricter than R45, which applies to cross-source pairs only. A same-source short-overlap pair under 5 s is still dropped. That is fine: two turns from one ear cannot be under 5 s apart in auto mode.
- **Age measure:** `now - entry.at`, measured from the parent's ADMIT. This is the same clock that windowMs and the R45 clause use. Using `<=` matches R45, so the two are consistent.
- **Fall-through:** when the anchor branch declines, the text checks still run (containment, Jaccard, R45). So a short follow-up whose TEXT is contained in the parent is still dropped. A tail split off its own question ("…across regions?") is usually a substring, so it stays dropped.
- **Exported semantics:** `sameAnchor` is untouched. Only the call site in findSimilar changed. Confirmed.

## Window: 5 s vs 10 s
Replay case (b) is unreachable as a double ANSWER today:
- Answers happen only in `liveMode === 'auto'` (decideDispatch: off → drop, suggest → chip).
- In auto, every non-turn detection returns early at the mark block (main.ts dispatchDetection, `if (this.liveMode === 'auto' && !d.turnDispatch)`). Only `turn` 'dispatch' calls `chipDeduper.admit`, once per turn. The other caller is 'supersede', and only when the head was dropped (`turnDedupId === undefined`). A healthy supersede goes through `extend`, never `admit`.
- The anchor is the whole joined turn text (`turnDispatchInput`: `anchor: d.text`).
- So for (b) to recur, the SAME question would have to be two separate turns 5–20 s apart, the shorter one would need fewer than 4 content words, and the two would have to share >= 50% of those words without containment. In practice that means the interviewer re-asks a short question, and answering a re-ask is defensible.
- In suggest mode the worst case is one duplicate chip, which is cosmetic.

Why not 10 s:
- 10 s is fitted to two data points (8.6 and 19.0) and has no derivation.
- 5 s is the existing constant, and it encodes the actual signature: one utterance heard by two ears.
- 10 s would also re-drop a genuine quick follow-up between 5 and 10 s after the parent's admit, for example an interviewer interjecting while the candidate starts answering.
- If a case like (b) appears in a turn-based run, revisit with that evidence.

## Tests (would each fail without the change?)
1. **Follow-up admitted at +19 s.** RED on old code, as the implementer reported. I checked the arithmetic: the follow-up's content words are {this, database}, and only `database` is in the parent, so overlap is 0.50 and the old code drops it. This is the fix test.
2. **Cross-source short pair at +2 s still dropped.** Passes on the old code too. It is a guard: it fails if the time clause is removed or the window shrinks below 2 s. The R45 text clause cannot mask it, because that clause needs >= 4 content words.
3. **Contained short anchor at +15 s still dropped.** A guard: it fails if `contained` is removed from the exemption. The text fallback does not mask it, because the texts do not contain each other.
4. **Long anchors overlapping at +15 s still dropped.** A guard: it fails if the rule is applied to every anchor length. Jaccard on the texts is about 0.45 by my count, so the anchor branch alone carries it. Worth confirming that the deduper threshold is above 0.45. If not, this test passes for the wrong reason.

## Missing (non-blocking)
- No boundary pin at exactly 5000 / 5001 ms, so the `<=` vs `<` choice is unpinned.
- No test that a short follow-up which is a text SUBSTRING of its parent is still dropped through the text-containment fall-through.
- No integration through main.ts turn dispatch. The 32-log replay stands in for it.
- Optional: extract the shared containment helper (see Nit above).

## Not shown
- The test files were not run by me. Test 4's Jaccard margin is from my own count, not a run.
- `words()` in questionReconcile was not opened. The tokenizer equivalence rests on the code comment.
- A re-asked short question across two turns in auto mode would now be answered twice. I judge that acceptable, but no run has exercised it.
