ALL ADDRESSED

# Task 8 re-review 5 (final): fix round 5

Reviewer: Opus. Scope:
- the rulings on R4-M1 to R4-M4;
- beyond those, only findings that change a verdict, make a rule uncomputable, or contradict another sentence.

Files reviewed:
- PREREGISTER-h40c.md (24065 bytes, 22:23:48);
- h40c-hedge-stats.mjs (27269 bytes, 22:21:10);
- check-smoke-hedge.mjs (22:04:03).

MAIN HEAD is now **391f1fc**. It was e94305a when round 5 was written. See R5-I1 and R5-M1.

What I ran, all read-only:
- `h40c-hedge-stats.mjs`, which has no write call, on existing fixtures. Stdout only; no fixture was rebuilt and no calibration script was re-run.
- `git -C MAIN` with `rev-parse`, `log`, `show`, `diff --stat` and `status --porcelain` (paths only).
- A grep of MAIN's `verbal-diag.log` for `route:` lines.

## Status of each ruling

- **R4-M1: addressed.** :218-220 is the proposed sentence, verbatim.
- **R4-M2: addressed.** :248-258 lists the four conditions as ruled, and states "any mismatch blocks arming".
  - `--compare` (stats:382-396) prints `COMPARE dispatch-windows=9 won-by=6 winners={"gemini-3.5-flash-lite":4,"gemini-3.1-flash-lite":2}` on the synthetic fixture. Those are its known values.
  - The comparison can be computed:
    - both tools read the same per-segment debug copy;
    - their dispatch patterns select the same lines (stats:78, checker:204);
    - the checker prints `windows found: N` (:497) and one `winner=<model>` per scored window (:532/:538). On a segment where every window is scored, that gives the won-by count and the per-model tally.
- **R4-M3(a): addressed.** The window check is at stats:256-272.
  - It uses a fixed +180 min offset and the closed interval [12:00, 15:00] at minute resolution.
  - It prints directly under rule 2's verdict line (:354-361), plus a NOT GATED line when out of window. `rule2Verdict` itself is unchanged, which matches "reported but not gated" (:190-193).
  - The pre-registration (:186-190) quotes the same strings.
  - Observed output:
    - h40b copy: `13:34 local — IN WINDOW`;
    - 20:00: OUT, plus NOT GATED;
    - 15:00: IN;
    - 15:01: OUT.
- **R4-M3(b): addressed** at :154-157.
- **R4-M3(c): addressed.** :112-114 matches `pct()` (stats:46) over the ascending list (stats:127).
- **R4-M4: addressed** at :159-174:
  - "OR it lost an answer";
  - "WHATEVER (2) reads";
  - "An INCOMPLETE hour cannot PASS and is re-flown before any ship decision".

  None of these conflicts with :190-193 or with (3)'s "understand item by item before another flight".

## New findings

Critical: none.

**R5-I1 (Important: contradiction). No smoke from before the pre-registration's commit can ever qualify, so item 1's reuse allowance does nothing.**
- The text allows reuse in two places:
  - :219: "Item 1's smoke may predate it at a qualifying HEAD";
  - :232-233: "a smoke already run at a qualifying HEAD does not need to be re-run".
- The qualifying test (:230) requires `git diff --stat <smoke HEAD>..<registered HEAD> -- electron src premium package.json` to be empty.
- The registered HEAD is this pre-registration's own commit (:48). That commit adds `electron/test/golden/passes/PREREGISTER-h40c.md`, the path where MAIN holds `PREREGISTER-h40b.md`. The path is inside `electron`, so the diff is never empty for any HEAD before that commit.
- It is already non-empty today. At 22:32 MAIN moved to 391f1fc, another session's docs commit with all 23 files under `electron/test/golden/passes/`. `git diff --stat e94305a..HEAD -- electron src premium package.json` lists those 23 files.
- **Effect:** a smoke run at e94305a or 391f1fc (the exact case N-M1 was written for) must be re-run after the commit. The alternative is a controller departing from the written test.
- **Fix (one clause):** exclude the passes folder: `git diff --stat <smoke HEAD>..<registered HEAD> -- electron src premium package.json ':(exclude)electron/test/golden/passes'`.
- I checked this read-only on MAIN:
  - `e94305a..HEAD` is empty with the exclusion, against 23 files without it.
  - `07a0e5e..HEAD` still lists 23 files with the exclusion: the hedge, the follow-up restore and the harness changes. So the test still catches real code changes.

**R5-M1 (Minor: contradiction; fix it before the commit, because the file is never edited afterwards). The commit list misses 391f1fc.**
- :6-8 promises "every commit between it and the registered HEAD below, named individually". The list at :10-48 stops at e94305a. 391f1fc now sits between e94305a and wherever the pre-registration's commit lands.
- 391f1fc also rewrites the follow-up replay pre-registration's bytes. 51e349d had committed a double-encoded copy with 14 damaged characters; no word of the rule changed. That contradicts :45, "the pre-registration text itself was untouched throughout".
- **Fix:**
  - Add a bullet for 391f1fc: a docs commit that restores that pre-registration's registered bytes and adds the replay's evidence, with no app or harness code.
  - Limit "untouched throughout" to 18242df.
  - Re-run `git log --reverse 07a0e5e..HEAD` immediately before committing, because MAIN is shared.
- The replay numbers the document cites still hold. 391f1fc's RESULT.txt reads A wrong=0 acceptable=16, B wrong=1 acceptable=22.

## Checked, not a finding

A CODING-routed smoke clip would disagree between the two tools:
- the stats script would VOID(b) at 2 of 3 windows, 67% (stats:215, :228);
- the checker exempts a CODING window (checker:314).

That blocks arming, which fails closed. No smoke clip has ever routed CODING on record:
- S1Q06 took VERBAL-TECHNICAL 3 of 3 times (2026-09-16, 2026-09-20);
- S2Q10 took it 13 of 13 times (2026-09-09 to 09-22);
- all 12 CODING routes in `verbal-diag.log` date from 2026-09-01 to 09-08.

Counts: every ruling (R4-M1 to R4-M4) is met. New: Critical 0, Important 1, Minor 1.
