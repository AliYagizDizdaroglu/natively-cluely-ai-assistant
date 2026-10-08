# router40 RESULT, addendum: corrections to the sealed note (no new reading)

Written 2026-10-06 06:37 TST by `date` (Opus, the reviewer of `RESULT-router40-REVIEW.md`). This addendum corrects
review findings I-1, I-2, M-1 and M-2. It does not edit `RESULT-router40.md`, whose seal
`824a895cf6c37faf0e31905dcf058eec350198c3589556ca936920695eba2c82` still holds. Nothing was re-scored, and no model
was called. The only text quoted from the runs is the two routing tokens themselves.

## 1. The reading, as registered: 2 NOT SAFE (unchanged)

- The note's READING 2 NOT SAFE is what the registered rules give, applied verbatim:
  - §7 row 2: `AF_answered` 1 (RH10), `wrong_R` 2 (RH08, RH10) vs `wrong_L` 0.
  - The reader is `read-r.mjs`, sha `297f87656b0d…`, frozen by the build record and checked by `score-r40.mjs`.
- **The reading rests entirely on RH08 and RH10.**
- **Neither item is an answer from Live (corrects I-1).** Each is the routing token "hard", garbled by the output
  transcription. The transcription repeats the token, joined by punctuation with no space between:
  - RH08 (QF): `hard".hard".hard`, 1 word;
  - RH10 (AF): `hard.hard`, 1 word.
- **Evidence** (`runs\router40-R.json` and `runs\router40-R.answers.json`):
  - Each item has one completed turn, carried in a single transcription event.
  - The audio is the size of one spoken "hard": 53,760 and 48,644 bytes, against 43,524–60,160 on the 25 items
    read as `hard`.
  - Response tokens are 27 and 25, against 22–28 on those 25 items.
  - All four grader verdicts on the two items are correctness 0 and on_topic 0; the graders read the text as no
    answer at all.
- **Why the reader calls them `answer`:**
  - §3.3 sets `first` to the first whitespace word, lowercased, letters only. That gives `hardhard` and
    `hardhardhard`, so neither matches `hard`.
  - No `malformed` clause applies, because the only word is not the word `hard`.
  - §3.3's last row ("everything else, `w` ≥ 1") therefore makes them `answer`.
- **The registration never defines this case.** None of the reader's calibration cases (A2.5, A3.2) joins tokens
  with punctuation.
- **Its intent points the other way.** The `hard` row says "any case/punctuation", and the A1.5 `malformed`
  extensions exist to send every stray "hard" emission to L.
- **Where the router stands without these two items.** It sent 26 of the 27 HARD items to "hard". The one real HARD
  answer is RH05 (71 words), whose grade is the same as L's.
- **The hazard is still real.** A product that matched "hard" the way this reader does would put a joined token on
  screen. That is a parsing and transcription hazard. It is not a routing judgement.

## 2. Counts under the intended treatment: NOT a registered reading

**These counts are not a registered reading.** Readings are applied verbatim (§7), thresholds do not move after
data, and the reader is frozen (A8.4; a reader change is "read, not acted on"). This addendum computes no other
READING.

- **The assumption:** RH08 and RH10 are treated as the registration intends, as a "hard" emission whose item shows
  L's answer.
- **The counts below follow directly from the score's paired list.** It says R and L differ only on
  `[RH08, RH10]`, and L has 0 wrong lines.
  - `wrong_R` 0 (vs `wrong_L` 0);
  - `AF_answered` 0 of 7;
  - `acc_R` 43 = `acc_L` 43.
- **Not computed:** the latency figures over R's answered items (`lead`, Live first text) without these two items,
  and therefore any row beyond these counts.

## 3. Reopening

- §7 row 2 says the router on this set "stops unless the user reopens it". **The user decides.**
- If the user reopens it, the change must come either from a new registration or from a dated amendment to this
  registration written before any new data. Such a change could be a reader rule for joined or repeated "hard"
  tokens, with its own known-answer cases.
- `router40`'s registered reading stays 2 NOT SAFE either way.

## 4. Expectations in force (corrects I-2)

The note's expectations table quotes two expectations that the amendments replaced. These are the ones in force:

| expectation | in force | read | note said |
|--|--|--|--|
| `EASY_caught` under B | A1.1 "Expected 13–17", which A2.6 says replaces §7's 14–19; A1.1 also predicts "≤ 18" because RE18 contains "your", B's own hard token | 19: **above** the range and above 18 (RE18 and RE03 were both answered) | "top of the range" |
| L TTFT p50 | A1.7 m2, "3–9 s" (restored by A6 after A5.7 was withdrawn) | 4.43 s, all items: **inside** | "above the range" (against the superseded 1.5–3.5 s) |

## 5. Added to "Not shown" (corrects M-1 and M-2)

- **M-1:**
  - **The arms ran in a different order from A7 m4's.** L ran first, then the R smoke, then R full. This was the
    22:30 controller ruling, recorded as a dated deviation in A8.3. Both arms still ran one after the other, and
    no reading row depends on the order.
  - **A1.9's residual.** In composed R, up to 9 follow-ups whose parent Live answered are built on L's parent
    answer, not the one R shows. R and L share those texts, so no reading depends on it.
- **M-2:** the expectations row "false EASY 1 to 3 → 3 (RH10, RH05, RH08)" holds by the letter of §3.3. Two of the
  three, RH08 and RH10, are the garbled "hard" tokens of section 1, so only RH05 is a false EASY in substance.
sha256 (of every byte above this line): 8eb99cd49a9d460206317f1eb0f0e7b6216d492e7aaaa6660b25decaecacbb92
