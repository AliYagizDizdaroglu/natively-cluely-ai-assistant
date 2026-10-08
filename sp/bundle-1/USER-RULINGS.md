# User rulings on SPEC-bundle-1 open questions (2026-10-07, in chat)
1. Silent-ear failover counts utterances (4 in a row without an ear caption), not seconds: YES.
2. Length guard ships only if the offline routing replay shows the instruction alone fails: YES.
3. Short (<=12 words, single-part) hard follow-ups get no cue rule: YES. The short-answer rule stays: yes/no and 1-2-word answerable questions open with the 1-2-word answer, then one supporting sentence (~15-25 words total), no cue block.
4. The final flight runs while the user WATCHES the app live: schedule it in a window the user names (user logged on, quiet machine).
5. Deviations D1-D8 of SPEC-bundle-1 APPROVED by the user (2026-10-08, 'approve D1–D8').
6. Bench FAIL on S1/S2 (2026-10-08 ~02:00): user chose option 1 = ONE fix round on the short-answer rule (#6) + re-bench of the T arm only (C reused), 6 graders.
7. Routing replay context: user chose B' = a made-up stand-in profile, identical for B0, B1 and V (--substitute-context); results marked SUBSTITUTE; the real-profile check happens in the app smoke/flight.
8. 2026-10-08: bench round 2 FAIL (L1b, S2) and routing replay FAIL (R1 10/7 vs B0 4; R3 8/40). User chose A: REDUCED bundle = keep cue gate (#7), cue-trim follow-ups, silent-ear failover, fault drill; REVERT the router instruction to r1's (e29bf3810128 / block e11c240063ea) and DROP the short-answer rule (#6) everywhere (pipeline, typed, Live). Re-bench that exact build (T arm only, C reused); bars S1/S2 do not apply (their feature is removed) - amendment written before the re-bench data.
