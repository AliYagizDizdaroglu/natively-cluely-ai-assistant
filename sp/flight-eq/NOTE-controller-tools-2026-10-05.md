# Controller note, 2026-10-05 18:15 TST (before any flight data) — tool contracts as built

Filed per tools-367-rereview.md B4-I3 and the fix rounds; quoted in E\ARMING-flight-eq.md.

1. eq-b4-cal.mjs (sha256/12 aa8dad977672): exit codes 0 OK / 1 FAIL / 2 usage or refusal / 3 UNCALIBRATED /
   **4 crash** (A5.5 said 2 for a crash; 4 is kept so a crash can never read as a usage refusal).
2. eq-b4-cal.mjs **refuses (exit 2) when REPLAY_BREAK is set** in its environment, instead of removing it from the
   child's environment (A5.5 wording); fails closed.
3. eq-b4-cal.mjs prints the G ids that also fail as a **suffix on the UNCALIBRATED line**
   (`TRANSCRIPT UNCALIBRATED n; G-ids also failing: <ids>`), not a separate line; any post-hour parser reads that suffix.
4. eq-b4-cal.mjs tags `(marker-first ...)` only when the round trip is the ONLY failing check (B4-I2 fix, cases mf/mf2/mf3).
5. night-gates.ps1 (sha256/12 5e6cd2acaed4): `updates` FAILs when any A5.5 policy override value is present (AND with
   the hours-or-pause test); prints `NIGHT policy: INFO` and `NIGHT pause-status: INFO` lines (non-gating); its
   -FakeJson schema carries 19 keys and battery may be "error" (N-m5). The power gate needs the AC line online in every
   passing case (stricter than A5.1).
6. window-eq.mjs (sha256/12 ca664e741ad0): usage error exit 2 (W-m1).
7. Fix round 2 (NG-I1, B4-I1, B4-I2) was the re-reviewer's own requested fixes, each with a mutant that flips; ruling:
   accepted without a further review round. Real gate on aa8dad977672: TRANSCRIPT OK 5/5, BLOCK OK 2/2,
   LABEL OUTSIDE --g NONE, exit 0. Caveat: both smoke G ids have one-line transcripts (TRANSCRIPT blind spot c'');
   their evidence is BLOCK + LABEL OUTSIDE + the smoke's Step 6 verify.
