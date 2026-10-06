VERDICT: APPROVE WITH FIXES

# Re-check of AMENDMENT-A3.md (fresh Opus, 2026-10-05 TST, before any router40 call)

**Hashes (node `crypto` / `sha256sum`, LF files):** A3's seal (every byte above its seal line, 101 lines) = `b92db547e75ffc17c935202f05bba72a79e0d10d3344d36c064f24bbb5b7f9ef` **equal**; A3 whole file `a5332d1a…b040`, 12,107 bytes. A3's "Read as" all **equal**: registration `5b7daaee…6057`, A1 `132739e6…f8aa`, A2 `10d0ea59…c821` (A2's own seal `f207c975…136f` re-computed **equal**), A2-RECHECK `598ae5ef…dfa7`, USER-RULINGS `8e5e3b40…487f` (665 bytes). The m2 regex matches USER-RULINGS line 5 (the 17:58 line) and no other line.

**Read:** A2-RECHECK, A2 (whole), A3 (whole), USER-RULINGS. The A2.7 and A3.6 tables were split on `; ` and diffed line by line. No prompts, answer texts, keys, model calls or subagents.

**Result:** all 13 fixes (I1–I4, m1–m9) are present with their meaning intact; A3.1–A3.5 carry A2-RECHECK's wording verbatim (I1's text quoted whole in A3.1; I2's rows in A3.2; I3, I4, m1–m9 as worded), and every case the re-check asked for is in A3.6 (I4's "real mode … → exit 2" in all four named pieces: P9, P2, P4, P6). The claim "no other change" does **not** hold: the A3.6 rewrite of A2.7 also drops wording that A3 does not mark [A3] and no fix asked for. Most drops are cosmetic (the `(I1)`, `(I2)`, `(m5)`, `(I3)`, `(m7)`, `(f, m5)`, `(h', I2)`, `(m, I3)`, `Guards (I4, m1)` labels; "m8:" → "User told:"; "the A2.4 guard (…)" → "a stub open gsitting STEP"; "the guard also runs before C05's retry", whose rule stands in A2.4 "retries included"). Four change or blur meaning (below).

**Not shown:** no harness exists, so no case ran. I did not re-judge whether A2-RECHECK's fixes are right (e.g. whether the A3.2 cases isolate their rules against the registration's reader text); I checked only that A3 adopted them as worded. The registration's and A1's own seals were not re-computed (their whole-file hashes match).

## Discrepancies (unmarked changes in A3.6; fix = restore A2.7's wording)

**D1. P5 narrows its case.** A2.7: "only the graded `router40-R` run is accepted (a `router40-R-<hhmm>` input → refuse)". A3.6 keeps only "a `router40-R-<hhmm>` input → refuse", so any other non-graded name (e.g. the C02 smoke's file) is no longer refused by a case. Fix, in A3.6 P5:
> replace "a `router40-R-<hhmm>` input → refuse" with "only the graded `router40-R` run is accepted (a `router40-R-<hhmm>` input → refuse)".

**D2. P4 (f) loses its scope.** A2.7: "the file contains exactly one `gemini-` id string, `gemini-3.1-flash-lite`". A3.6: "exactly one `gemini-` id string", with no "where" (the m5 model-id scope fix of A1-RECHECK). Fix, in A3.6 P4 (f):
> replace "(f) exactly one `gemini-` id string" with "(f) the file contains exactly one `gemini-` id string".

**D3. P9's stub-clock case loses its reason.** A2.7: "a stub clock at 2026-10-07T10:01 → FAIL (U window not 2026-10-06T07:00Z)". A3.6 drops the parenthetical. Now that m9 adds a separate date rule for R, the reason is what says this case tests L's U-window check, not the date rule. Fix, in A3.6 P9 Date:
> replace "a stub clock at 2026-10-07T10:01 → FAIL;" with "a stub clock at 2026-10-07T10:01 → FAIL (U window not 2026-10-06T07:00Z);".

**D4. A2's "Not covered" loses more than the stale clause.** A3.5 says only "not yet that R moved too" is dropped. But A3.6 (which supersedes A2.7, where that paragraph sits) replaces the whole paragraph. That silently drops "whether the flight's G sitting lands on 2026-10-06 is unknown tonight (the F line decides); R and L on one morning still carry two clocks, and A is from 2026-10-03". Fix, append to A3.6's "Not covered":
> "A2's remaining residuals stand: whether the flight's G sitting lands on 2026-10-06 is unknown tonight (the F line decides); R and L on one morning still carry two clocks, and A is from 2026-10-03."

## Minor (cosmetic, recommended with the fixes above)

- **m1.** In P9 Guards, "electron.exe → FAIL; tail.exe → FAIL" lost its subject. Restore "a stub process list with electron.exe → FAIL; with tail.exe → FAIL".
- **m2.** In P8, "nine class columns" lost its subject. Restore "the confusion table has nine class columns".
- **m3 (observation, not a discrepancy).** m4 extends guard 3's argv check to powershell.exe/pwsh.exe, but P9 has no case for it. A2-RECHECK did not ask for one, so A3 is faithful. A case "a stub powershell.exe argv containing `eq-gsitting` → FAIL" would calibrate it.
