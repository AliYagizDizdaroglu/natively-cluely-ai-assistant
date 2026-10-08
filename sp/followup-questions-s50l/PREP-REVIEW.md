# Prep review: the ONE pooled s50l re-run (Opus, 2026-10-02, read-only, no model call)

**VERDICT: READY WITH FIXES.** 0 Critical, 6 Important, 8 Minor.

Nothing found would make tomorrow's decision invalid as long as the Important items are dealt with before the first
call (I1–I4) or on the day (I5, I6). Clause 5, the clause that decides, reads only the 42 roster pairs. Neither
amendment touches those pairs.

## Verified (re-run or re-hashed by me, not taken from the prep's word)

- Registration unchanged: sha256 `cc127dab…a8ca1` for both the SP copy and MAIN `passes/`, mtime 2026-09-28 21:36:02.
  `earlierQuestions.ref.mjs` `0459f578…`, `gate-report.mjs` `b23b9219…`, `s50m-gated.json` `1aa4b3a5…`,
  `parity-fixture.json` `f61c4607…`: all four equal §2.
- `gate-report-s50l.mjs` vs `gate-report.mjs`: the only differences are the run path, two labels, the A1 exclusion,
  section 6 being cut, and the output names (exact-anchor generator `make-gate-report-s50l.mjs:11-31`). The gate,
  the selector, the callback texts and the slot ids are byte-identical.
- s50l gate list: `S1Q04F S1Q06F S1Q08 S2Q05F S2Q08 S2Q08F S2Q09F`, the same seven as s50m. S2Q01F fired but had an
  empty block, as on s50m. 32 ids are byte-identical (`gate-report-s50l.out.txt:189-191`). For C2–C5:
  `refSelected=yes` and 17.1/18.5/33.6/19.5 min back, all ≥ 10 (`:285-303`). Every s50l userA differs from s50m's
  (new material). The system prompt is identical.
- Bars: `decide()` (`followup-questions-decide.mjs:52,62,68`) gives R=42 → PASS ≥ +8, FAIL ≤ +2, and a pooled
  INCONCLUSIVE becomes FAIL. 3c allows `ceil(2n/39)`: n = 47 + 33 = 80 → +5 (it drops to +4 only at n ≤ 78). This
  matches §7 lines 231-233.
- The filter is Thursday's: the snapshot's `verbalStreamFilter.js` sha256 `d8fee6ca0170…` equals Thursday's dry-run
  line. It requires only `fs` and `path`, so nothing unhashed loads. The runner refuses any other filter
  (`followup-questions-run.mjs:38`). Thursday's result note says Thursday ran on MAIN at 73d7f01, the dist this
  snapshot copies.
- `--dry-run` (re-run): 66 calls, filter d8fee6ca0170, A first in 16 pairs and B first in 17. The arm order is
  `(i + rep) % 2` over the s50l IDS, as §4 says.
- §6.2 calibration, re-run by me against `…/2026-09-21T08-22-34-s50l` (verdict lines only): `CALIBRATION OK 39/39`.
  With `REPLAY_BREAK=1`: `CALIBRATION MISMATCH 39/39`.
- `check-grader-questions.mjs` on s50l (ids only): the 5 follow-ups and 4 callbacks carry a parent, and the 2 mains
  are bare. Instrument `8564ba96369a` = pre-registered. The grader prompt (mtime 09-14) and `interview60.judge.mjs`
  (mtime 09-26) predate Thursday.
- `pooled-decide.mjs --calibrate` (re-run): all 9 rule lines equal Thursday's RESULT.txt. Thursday's 6 answer files,
  4 keys and 8 verdict files are byte-identical to `followup-questions/evidence/`.
- Id collisions: the pooled ids are `m:`/`l:`-prefixed (`pooled-decide.mjs:53-54`), and `decide()` uses `id` only in
  error messages. Each run's scores are keyed inside its own `collect()`, so the two runs' pairs cannot be confused.
- The decide copied into the s50l folder is byte-identical to Thursday's. Pooled-decide imports Thursday's own file
  (`pooled-decide.mjs:14`).
- Thursday's graders, audited by the file paths in their 8 transcripts (no content read): each read only the grader
  prompt, its own pairs file and its own verdicts file. b4g2 also listed `blind/` (keys were out at the time) and
  grepped `interview60.judge.mjs`. None read a key, an answer file or the co-grader's verdicts.

## Critical

None.

## Important

**I1. A2 breaks the principle A1 uses.** Evidence: `make-gate-report-s50l.mjs:27-31`, AMENDMENT `:15-18`,
PREREGISTER `:199-203` and §3b `:113-136`.
- A1 is faithful. The registration's own §3 defines a callback slot as "a real slot (an id without a Live block)"
  (PREREGISTER `:83-84`). §7 fixes the slot ids, and the frozen builder refuses those two slots. So the rule A1
  follows is "run the frozen builder; exclude by name only what it refuses". It also leans conservative: C1 was
  A ooo / B YYY on Thursday, so dropping it removes off-topic cushion from B in clause 2.
- A2 does not follow that rule. Section 6 was cut out of the builder; it was not run and refused. The amendment
  argues from silence ("§7 names the gate list and the callbacks only"). Clauses 1 and 2 were registered over all
  pairs, "dropped-parent cases included", and §3b is the registration's only probe of the harm the design cannot
  prevent. All three cases sit on s50l's gate list. By the s50l capture times, each stand-in parent is about 235-245 s
  old, above the 180 s guard.
- A2 is not a renegotiation in effect, because it cannot move clause 5. But it is the weaker reading.
- Fix, preferred: run section 6 unmodified on s50l (keep the frozen `withoutPreview` and 180 s refusals) and exclude
  by name only a case it refuses. Then regenerate `s50l-gated.json` and record its new sha. That means IDS 14, 84
  calls (inside the 150 headroom), 4 blind files (4+4+4+2) and `move-keys.mjs:15` → 4. Re-run the dry run.
- Fix, alternative: keep A2, but state in the amendment that it departs from A1's principle and why, and get the
  user's explicit OK before the first call.

**I2. The amendment does not say what was known when it was written.** Evidence: AMENDMENT `:3-4`.
- It was written after Thursday's per-item verdicts (RESULT/result note) and after Friday's deep dive
  (`followup-deepdive/FINDINGS.md`, which names an S2Q09F selection bug and the S2Q05F off-topic class).
- Fix: add one paragraph:
  - What was known: Thursday's per-item results and the deep dive.
  - That neither amendment touches the 42 roster pairs, and the direction of each one's effect on clauses 1-4.
  - That the reference implementation is run as registered, despite the S2Q09F bug the deep dive found (no fix inside
    the re-run).
  - Cite PREREGISTER `:83-84` for A1.
- Get the user's OK on A1 and A2 before the first call. They change the registered pair set, and the registration
  reserves design changes for a new registration (`:53-55`).

**I3. The run-day preconditions and their full record are missing from the runbook.** Evidence: RUNBOOK `:7-10`
lists only the quota, the model row and the dry run. §6 items 2-4 and §9 ("the run log with the calibration, stamp
and quota lines") are not covered.
- `cal-ok.out.txt` and `cal-break.out.txt` are bare lines that do not show the run-dir argument. Both runs share the
  same 39 ids, so the record cannot tell s50l from s50m. I re-ran it on s50l and it is OK.
- `stamp.out.txt` is a 571-byte tail without the four sha256 lines §6.3 requires. Thursday's 2009-byte file has
  them.
- Fix: add steps 3a-3f to the runbook. Each one runs on the day and appends to `run.log` with its full command line:
  - the precue builder `--calibrate` with the s50l run dir, then the same with `REPLAY_BREAK=1`;
  - `stamp.mjs` in full;
  - `followup-questions-decide-calibrate.mjs` and `mutate-decide.mjs`;
  - `pooled-decide.mjs --calibrate`;
  - `check-grader-questions.mjs` (ids and stamp only).

**I4. The runner's resume path would fill a transient hole without interleaving.** Evidence:
`followup-questions-run.mjs:92` re-calls any record carrying `transientError`, while RUNBOOK `:13` calls the runner
"resumable". Thursday's ruling, in its result note, was that the C5 r1 hole is NOT resumed, because a later call
would not be interleaved with its A call; per §4 it is an incomplete pair.
- Fix: the runbook says the runner runs as one pass. A second invocation is allowed only if the process died
  mid-pass, and that is logged. A `transientError` left after the pass is never re-called. It is named as an
  incomplete pair, as Thursday's was.

**I5. `--calibrate` proves only Thursday's half of the merge.** Evidence: `pooled-decide.mjs:59-68` runs
`collect(THU)` alone. The `l:` collection (s50l `common.mjs`, 3 key files, 6 verdict files), the concatenation and
`pooled: true` on real-shaped pairs are never exercised before the real read.
- `e2e-synthetic.mjs` in the s50l folder was copied unadapted (`:54` expects 94 of 96) and was not run.
- Setting `FQ_OUT_DIR` would redirect BOTH halves, since both `common.mjs:12` read it, so a synthetic pooled e2e
  cannot simply reuse that variable.
- The calibrate comparison is one-directional (`:64`, `published.includes(l)`), so a dropped line would still pass.
- Fix:
  - Tonight: adapt the e2e count to 64 of 66 and run it for the s50l CLI seams.
  - Make `--calibrate` also assert exactly 9 lines, in order.
  - On the day, after the pooled read: check additivity, i.e. pooled n, R, wrongA/B, offA/B, slowA/B and accA/B
    equal Thursday's RESULT plus the s50l-alone CLI. Record that line in `run.log` before the result is announced.

**I6. Blinding holds by instruction, not by construction. Audit it as Thursday's was (by my check).** Evidence:
- The answer files carry the arm in their names (`common.mjs:29`) and sit one folder above `blind/`.
- The keys go to a sibling folder (`move-keys.mjs:9`).
- The dispatch text forbids "any other arm's pairs or verdicts" but not the co-grader's verdicts file in the same
  `blind/` folder (`validation-hour/h40d-grader-dispatch.txt:92`). On Thursday, b4g2 did list `blind/`.

Fix: keep the dispatch text verbatim (instrument parity with Thursday). After grading and before the decision, run a
paths-only audit of the six transcripts (`file_path`/`path`/`pattern`/`command` fields) and record it in `run.log`.
Any read of a key, an answer file or the co-grader's verdicts makes that file's grades reported, not decided.

## Minor

**M1. Stale comments copied from Thursday.**
- runner header `:1-9` ("s50m-gated.json", "96 calls")
- `common.mjs:23,28` ("dropped-parent", "4 files of 4 items")
- `followup-questions-blind.mjs:27` ("s50m timeline")
- `move-keys.mjs:3` ("exactly 4")
- `check-grader-questions.mjs:1` ("16")

**M2. The grader count disagrees.** AGENDA 22:41 says "8 Opus graders"; RUNBOOK `:16` says six. Six is right for
three files (eight if I1's preferred fix is taken).

**M3. The amendment records only hash prefixes.**
- AMENDMENT `:27` records a 16-hex prefix. Put in the full `s50l-gated.json` sha256
  `0b9f67492a16fd6daef63cacc7ee18f845a5cd2f761a94845089c628de9a5fa3`, the generated `gate-report-s50l.mjs`
  `7b1d9c1d006fa749…` and the generator's sha.
- State the expected pooled n and the 3c allowance (+5 at n = 80; +4 at n ≤ 78).

**M4. The snapshot id needs a sentence.** The registration (§6.2, `:184-185`) names 0e1e8b2 as the fallback dist.
The prep uses 73d7f01, the exact dist Thursday ran on, with the same filter sha and calibration OK on s50l. That is
more faithful, but the amendment should say so in one sentence.

**M5. Grader pin checks.**
- Before the six graders: dispatch one throwaway `opus` probe and read its transcript model, as h40d did, so a
  drifted alias is caught before graders are spent. A different model on Saturday than Thursday would mix graders
  inside the pooled pairs.
- Have `pooled-decide.mjs` refuse unless `blind/graders.json` lists six `claude-opus-5-5` and the stamp is
  `8564ba96369a` (§1 "reported, not decided"). RUNBOOK `:18` does not mention `graders.json`.

**M6. Graders auto-load `MEMORY.md`.** It names this experiment, its +3 and its bar (Thursday's graders loaded it
too, per their transcripts). This is the same on both days, so it is a residual risk only. Note it in the result.

**M7. Keep other Gemini work on the same key off the run window.** The Saturday L38M 3.8-Flash re-asks (AGENDA
18:04) should not run concurrently with the 66 calls, to keep TTFT noise down. Interleaving cancels most of it, not
all.

**M8. The pooled output has no per-item tables.** `pooled-decide.mjs:72-75` prints only the rule lines. The result
note's tables come from Thursday's RESULT and the s50l-alone CLI (RUNBOOK `:19-20`). Label the latter's
"DECISION:" line as not deciding.
