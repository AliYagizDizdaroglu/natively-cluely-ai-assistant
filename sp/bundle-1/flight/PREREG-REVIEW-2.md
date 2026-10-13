# Re-check: PREREGISTER-b1-final.md rev 2 (sha256 3e2dc380…58c08, re-hashed: match)

- **Reviewer:** a fresh Opus, not the author. 2026-10-11. Scoped to: is each finding of PREREG-REVIEW.md fixed, and did rev 2 add a contradiction. No code, no model calls, no git.
- **Verdict: CHANGES.** 1 required (a new contradiction, from the M5 fix), 4 minor. Every R1–R4 / M1–M7 finding is otherwise fixed.

## Findings: fixed?

| finding | rev 2 lines | status |
|--|--|--|
| R1 user confirmations: when, what, what counts, verbatim, no-answer rule | 182–208, 28 | Fixed. Asked before any output is opened (184–188); three fixed questions (190–192); effect table decided now (196–206); 12 h no-answer = VOID |
| R2 SPEC cuts need the user's sign-off | 133–151, 9, 139, 314 | Fixed. Pending; recorded before arming as USER-RULINGS item 9; no answer = not armed; branch A and branch B both written, with session counts |
| R3 session cost unmeasured | 110–131 | Fixed. Upper bound from readings, with provenance; `c` measured over the gating slots; stop rule 2c + 2%; reported arms after the reset by default |
| R4 gating deadline | 153–160, 30, 31 | Fixed. Max 2 attempts; deadline = later of run end + 24 h and reset + 6 h; missed = INCONCLUSIVE, and no later grade changes it |
| M1 FAIL meaning | 29, 49, 281 | Fixed |
| M2 latency deviation | 59–65 | Fixed, stated before data |
| M3 gate instrument + count sources | 52, 55 | Fixed. `gate-heard.mjs` re-hashed: `1a604cd2…` matches; `smoke\read-smoke-b1.mjs` re-hashed: `a2cb436e…` matches |
| M4 register command | 221 | Fixed. `-Kind flight -Which all -T` matches register-b1.ps1's header (line 7) and its `param` block. Launcher sha256 `045dceac…` re-hashed: matches |
| M5 r1 vs bar 5 | 55 | Answered, but it introduced R-A below |
| M6 freeze MAIN | 214–218, 319 | Fixed |
| M7 watch sheet | 238–253 | Fixed |

## Required

**R-A. L55 vs L29: a bar-5 shortfall is "INCONCLUSIVE, never FAIL", yet two bar-5 items are FAIL lines.**
- Bar 5 includes "**0** dispatched turns with nothing shown". The FAIL row (L29) lists "any dispatched turn with nothing shown". L55 says that a shortfall on bar 5 is "**INCONCLUSIVE, never FAIL**".
- The VOID → FAIL → PASS order makes FAIL win, so the outcome is decided. But the text contradicts itself, and the result note "applies it verbatim" (L12).
- Bar 5's "0 failed answers" is ambiguous in the same way: is a failed answer a "nothing shown" FAIL, or an INCONCLUSIVE?
- **Fix:** scope the M5 sentence to the two parts r1 missed. For example: "a shortfall on 47/47 or doubles is INCONCLUSIVE; nothing-shown turns stay FAIL (§1)". Also say which row 0 failed answers falls under.

## Minor

- **m1 (L205 vs L30, L56).** Q1 "not sure" gives "the run stands", but PASS needs bar 6 met, and bar 6's human half *is* the Q1 answer. Say whether "not sure" on Q1 meets bar 6. If it does not, the run is INCONCLUSIVE, not "stands".
- **m2 (L206).** Only the case where all three questions go unanswered is mapped. Map the case where one or two are answered and the rest are missing (for example: a missing answer = VOID).
- **m3 (L156 vs L128).** The gating usage block uses "< 2 × `c`", but `c` is measured only after `inapp.g2`, so it does not exist while gating runs. Name the figure gating uses (for example, the ~0.8% upper bound) or keep only "a usage refusal". The outcome is protected by the L157–159 deadline, so this is minor.
- **m4 (L149 vs L29, L49).** Branch B says the blind export is "replacing" the in-app grades for bar 2's Live half. However, bar 1 and the FAIL row still count wrong on *all* in-app answers, Live turns included. So the blind export adds a gate rather than replacing one. Say "in addition to", and name whose graders "EITHER grader" (L29) refers to in branch B.

## Contradiction sweep (beyond R-A)

- **The verdicts are still exclusive and exhaustive.** The order is VOID → FAIL → PASS, then "anything else" is INCONCLUSIVE. The new lines (§4 VOIDs, the deadline, abort) each sit in exactly one row.
- **Nothing is decided after data.** Every human answer and usage gate is mapped before data. Item 9 is recorded before arming. The derived tools are calibrated and their sha256 recorded at arming (L174–178, L315).
- **The abort is consistent:** a VOID is a retry, not a re-fly (L28, L252, L270–274).

## Not shown

- `register-b1.ps1` was read only to line 40; its flight branch was not run (`-Plan` was not used).
- `score-b1.mjs` and `launch-grader-b1.mjs` still do not exist.
- The session-cost arithmetic in §3.2 was not re-derived.
- The rest of rev 2 was diffed against the findings, not re-reviewed from scratch.

---

# Re-check 2: rev 3 (sha256 0140e151…80d6a, re-hashed: match)

- **Reviewer:** a fresh Opus, not the author. 2026-10-11. Scoped: R-A and m1–m4 fixed; no new contradiction among PASS / FAIL / INCONCLUSIVE / VOID. No edits, no model calls.
- **Verdict: CHANGES** (1 item, a one-word fix).

| finding | rev 3 lines | status |
|--|--|--|
| R-A bar 5 | 30, 32, 56, 305 | Fixed. The FAIL row no longer lists nothing-shown; L56 puts every bar-5 shortfall (incl. nothing-shown and failed answers) in INCONCLUSIVE, down > 2.0 min in VOID, as in r1 |
| m1 Q1 "not sure" | 206 | Fixed: not met → INCONCLUSIVE |
| m2 partial answers | 208 | Fixed: any one unanswered in 12 h → VOID |
| m3 gating usage figure | 157 | Fixed: 1.6% (2 × the 0.8% bound) |
| m4 branch B | 150 | Fixed at L150 ("in addition to"; EITHER of 2 blind or 2 in-app graders) |

**Required**
- **L51 vs L150 (m4 remnant).** Bar 2's source cell still says the Live half "is read from the blind L/S export **instead** (§3.3 branch B)". L150 says "in addition to". Fix: "is also read from the blind L/S export (§3.3 branch B)".

**Note, not blocking**
- L56 "never FAIL" vs L72 "no answer = not acceptable": enough nothing-shown turns can push bar 1 to ≤ 39 → FAIL. Scoped by "a shortfall on it" (bar 5) and VOID → FAIL → PASS order, so the outcome is decided; an optional clause "(bar 1 still counts them as not acceptable)" would remove the reading.

**Sweep.** Otherwise the four verdicts stay exclusive and exhaustive; no other new contradiction found.

**Not shown.** Only the R-A / m1–m4 lines and the verdict rows were re-read; the rest of rev 3 was not re-reviewed.

---

# Seal: rev 3a (2026-10-11)

- Applied the required L51 fix ("instead" -> "also") and the optional L56 clause ("bar 1 still counts nothing-shown turns as not acceptable"), exactly as Re-check 2 worded them. No other change.
- **SEALED** sha256 `4fa5db4b8e6905c4cc09cab465b3a44ead666fdf047f3e46aee2bef6f04f653d`. Any later edit voids the seal.
