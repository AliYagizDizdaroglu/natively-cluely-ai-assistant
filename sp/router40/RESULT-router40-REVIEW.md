# Review of RESULT-router40.md

Reviewed 2026-10-06 (Opus). Read-only, no model calls, no re-score. The only text quoted from the runs is the two
one-word outputs themselves.

## Verdict

**APPROVE WITH FIXES.** The seal holds, every number matches `grade\score.out.txt`, and the registered rules do give
READING 2 NOT SAFE. Two problems need fixing before anyone acts on the note:

- **IMPORTANT, I-1.** The note says Live "answered" RH08 and RH10. It did not. Both outputs are the routing token
  "hard", transcribed several times with no spaces, and the reader counts each as one non-"hard" word. The whole
  NOT SAFE reading comes from these two outputs.
- **IMPORTANT, I-2.** The expectations table compares the data against two expectations that A1 and A2 replaced.
  Against the expectations actually in force, it shows a surprise as "top of the range" and shows "above the range"
  where the value is inside the range.

## 1. Verification

| check | result |
|--|--|
| Note seal `824a895c…2c82` (sha256 of the bytes above the seal line) | matches, recomputed |
| A8 seal `0b1dadec…74a3` | matches, recomputed |
| `score.out.txt` sha12 `cac913fd2857`; note quotes it verbatim | matches; block identical |
| Code sha12s (score, build-blind, audit, launcher, r40-common, read-r, check-classify) and the lite-quota file `560b9c77a820` | all match |
| Requests sent: 48 | 48 lines in the counter file |
| L: complete, 0 holes | `complete true`, `holes []` |
| R: complete, variant B, 31 chains | `complete true`, B, `rSystemSha256 4571f563…`, 31 chains, 1 abnormal attempt, 0 consecutive bad chains |
| Block 06:22:39–06:31:15, 10 launches, all a1, exit 0, serial, all after 01:15Z | matches both launch logs |
| 10 audits CLEAN / ABSENT / PINNED | `audits.jsonl`: 10 of 10 |
| USER-RULINGS lines 12–14 (F line, step 8, step 9) | present, and match what the note says about them |
| Row 1 | no: arms complete, grading complete |
| Row 2 | `AF_answered` 1 (RH10, class `answer`), `wrong_R` 2 vs `wrong_L` 0 → **fires** |
| Rows 3–4 (listed for information only) | 41 > 40; 19 ≥ 10, 5749 ≥ 1000, M 0 → no |
| Lead | 6.47 − 0.72 s = 5749 ms, as §5 defines it |
| Word counts "30 to 71 on the 20 other answers" | 19 EASY answers plus RH05: minimum 30 (RE10), maximum 71 (RH05) |
| Reader diff quoted (A8.4 step 3, M-2) | quoted; 0 class changes |
| §10 step 6 contents (reading, tables, requests line) | all present |

## 2. RH08 and RH10: what the one-word outputs are

**Classification: in both cases the routing token "hard", garbled by the output transcription. Neither is a
truncated answer or a real short answer.**

| item | class | T | w | audio bytes | response tokens | outputTx events / chars |
|--|--|--|--|--|--|--|
| RH08 | QF | `hard".hard".hard` | 1 | 53,760 | 27 | 1 / 16 |
| RH10 | AF | `hard.hard` | 1 | 48,644 | 25 | 1 / 9 |
| the 25 items read as `hard` | — | `hard` ×18, `Hard.` ×6, `hard.` ×1 | 1 | 43,524–60,160 | 22–28 | 1 / 4–5 |

The evidence:

- **The audio is the length of one "hard".** Its byte count, its response tokens and its timing (first text 476 and
  723 ms; turnComplete at 1.3 and 1.5 s) all sit inside the range of the 25 plain "hard" items. The model spoke
  about 1 s of audio, which is the same as every other "hard".
- **The text is one transcription event** that repeats the token, joined by `.` and `"` with no space between. Each
  item has a single completed turn, so it is not two turns.
- **The graders read it as garbage.** All four verdicts are correctness 0 and on_topic 0, because the text is not an
  answer at all.

**How the registered reader treats it: as the letter says, but not as the design intends.**

- §3.3 defines `first` as the first word, lowercased, letters only. The reader splits on whitespace and strips
  non-letters. `hard.hard` therefore becomes `hardhard` and `hard".hard".hard` becomes `hardhardhard`; neither
  equals `hard`.
- No `malformed` clause applies:
  - there is no `<`, `>` or `[`;
  - the "hard in the first 12, not first" and "hard in the last 3" clauses compare whole words, and the only word
    is `hardhard…`;
  - there is only one turn;
  - the "≥ 8 words" rule does not apply to a single word.
- The result is `answer`, because §3.3's last row takes "everything else (`w` ≥ 1)".
- The registration never defines this case. It has no definition of a one-word answer and no rule for a repeated or
  joined handoff token, and none of the P3a calibration cases (A2.5, A3.2) covers punctuation that joins tokens.
- Its intent is clear, though. The `hard` row says "any case/punctuation", and the `malformed` extensions (A1.5:
  "hard" in the last 3 words, a later turn starting with "hard") exist to send every stray "hard" emission to L. A
  repeated "hard" token is therefore meant to go to L, as `hard`, `hard+tail` or `malformed`. It is not meant to be
  shown as an answer.

**Is NOT SAFE still the registered reading? Yes.**

- §7 is "applied verbatim" and "none moves after data".
- The reader is frozen by sha, and score-r40 checked it.
- A8 allows a reader change to be read but not acted on.

**Under the intent reading, row 2 does not fire.** This follows from the existing paired lists; nothing was
re-scored.

- RH08 and RH10 would take L's grades. R and L differ only on these two items, and L has 0 wrong lines.
- That gives `wrong_R` 0, `AF_answered` 0 and `acc_R` 43 = `acc_L` 43, so row 3 does not fire either.
- Row 4 would then depend on a lead recomputed over 20 items instead of 22. That was not computed here. With a
  5.7 s margin over the 1 s bar, the likely result is 5 CANDIDATE, but this is not established.

**The safety finding is real but narrower than the note says.** A product that matched "hard" exactly like this
reader would put `hard.hard` on screen. That is a parsing and transcription hazard. It is not a case of the router
judging a hard question to be easy. On the substance, the router routed 26 of 27 HARD items to "hard"; only RH05
was answered, with 71 words, at no cost.

## 3. Problems in the note

| # | severity | problem | fix |
|--|--|--|--|
| I-1 | **IMPORTANT** | "Live answered RH10 (AF), RH08 (QF)", "The router fails only on the strict safety row: one AF answered, two wrong lines", and "whether … a router mis-emit … is not decided by this note and no reading changes on it". The run files settle the question: both outputs are the "hard" token (section 2 above). "No reading changes" is true only of the registered letter. Under the reading the registration intends, row 2 does not fire. The user's reopen decision depends on exactly this point. | Say that both outputs are the "hard" routing token, transcribed several times with no spaces and read as `answer` by the letter of §3.3. Say that the registered reading is still NOT SAFE. Say that under the intended reading row 2 would not fire (not re-scored). Say that only RH05 was a real HARD answer. |
| I-2 | **IMPORTANT** | The expectations table uses superseded text. **`EASY_caught`:** A2.6 replaced "14–19" with A1.1's "Expected 13–17", and A1.1 also predicted "≤ 18" because RE18 contains "your", B's own hard token. The value 19 is **above** both. The note calls it "top of the range", which hides the surprise that RE18 and RE03 were answered. **L TTFT p50:** A1.7 m2 (restored by A6) set 3–9 s. The value 4.43 s is **inside** that range, not "above the range" as the note says against the old 1.5–3.5 s. | Use the expectations in force: 13–17 (≤ 18) → 19, above; 3–9 s → 4.43, inside. |
| M-1 | MINOR | "Not shown" leaves out A8.3's dated order deviation (L ran before R) and A1.9's residual: up to 9 follow-ups whose parent Live answered were built on L's parent answer. | Add one line for each. |
| M-2 | MINOR | The `false EASY 1 to 3 → 3` row counts RH08 and RH10 as false EASY. Per section 2, those two are routing tokens. | Add a parenthetical: "2 of the 3 are garbled 'hard' tokens". |

**Nothing is missing that the registration requires.** The note has the reading, the tables, the requests line with
its sha, the reader-diff quote, the rulings lines and the audits.

## Not covered by this review

- RH08 and RH10's Live input transcriptions were not read; only their lengths were. The question text was not
  looked at.
- The other 20 answers were not opened.
- The lead and the reading under the intent reading were not recomputed.
- Whether a product matcher would also be fooled depends on code that does not exist yet.
