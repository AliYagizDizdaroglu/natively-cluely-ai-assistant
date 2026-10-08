# Amendment A1 to PREREGISTER-flight-eq.md: the evening flight (pre-data)

Written 2026-10-05 16:23 TST by `date` (Opus, spec author; a separate Opus reviews) on the registration sha256
9ca3149b…4f44, unedited. The hour has NOT flown; no datum exists. **The user's rulings, 2026-10-05 ~16:20, verbatim:**
quiet window **"Tonight, any time"**; reviews **"Per task"**; fallback **"Fly unattended late"** (a scheduled task flies
as soon as ready, up to ~01:00 local; the guards refuse an unbuilt or unproven feature; grading follows).

**A1.1 Day, window, quota** (replaces the times of §2 Task/Window, §6 "The day", §11 ruling 6). The day is 2026-10-05,
evening: the task is registered for T, **19:30 ≤ T ≤ 01:00 local**, the first quarter-hour ≥ 10 min after every A1.4
pre-hour piece has passed; not all passed by 00:50 = no flight tonight, §6's fallback, no rule change. The playback-start
window (§2, §5 item 5, §6 "Start") becomes **19:30–01:30** (app start and probe; br1 played 6 min after its task).
Nothing gated relied on midday: 2a–2d are same-hour twins; 2e's br1 clocks, reported only, now also differ by time of
day (named in "does not show"). **Quota:** `quota-ledger.mjs` read **immediately before arming** (not 10:45), quota
day 2026-10-05 10:00 → 2026-10-06 10:00, ≥ 400 headroom per lite, clock time in §11; less = no flight tonight. **No
straddle of the 10:00 reset:** latest T 01:00 + the 5 h task limit end the chain by 06:00. The G arms (last, after the
≥ 40 / ≥ 20 re-read) end by 10:00 2026-10-06, else §6's named next-day departure (2c reported). Precheck at T − 6 min.

**A1.2 Quiet machine.** "Tonight, any time" is the user's standing confirmation, smoke (b3) to `FLIGHT EXIT`. **Premise
corrected, as ruling 3's was: no precedent launcher or guard refuses on system audio.** `launch-h40d.cmd` lives in `VH\`,
not MAIN's `electron\test\golden\`; it checks folder, wav, roster, harness stop, commit, `wav:check`, dist proofs and
`guard-h40d.mjs`, which reads nothing of the sound system; `SP\audio-state.ps1` (run by the precheck) prints the default
device's volume and mute, refuses nothing, and cannot see another program's sound. Other audio tonight is caught only
afterwards, as on 2026-10-01 21:00 (extra answers, `cues: []` on non-questions): a dispatch window the reader (b5) joins
to no roster item is named and the user rules on the hour. No audio guard is added (new, uncalibrated, pre-hour). h40d
§6's list stands with "12:00–16:30" read as "T − 30 min to FLIGHT EXIT"; its night risks, **sleep never** and **no
restart pending**, are read once before arming (`powercfg` AC standby, pending-reboot state) and quoted in §11.
**A1.3 Logged on:** stated by the user (ruling 6's condition, met). With StartWhenAvailable OFF, a logoff, sleep or
restart before T means the task never fires: no hour, re-fly under §6, not a VOID.

**A1.4 Before the hour, and after it.** The hour = the task's chain. At T the guards refuse an unbuilt feature (markers,
parity-dist, flag, HEAD pin); an unproven one is never armed. **"Per task": each piece is Opus-reviewed as its own
task; without review READY it has not passed.** **Before T, §7's calibrations unchanged:**
- b1 c1–c3: parity 126 (21 block) + 29, 0 mismatches, `EQ_DIST_BREAK=1` ≥ 21 MISMATCH exit 1; `CALIBRATION OK 39/39`,
  `REPLAY_BREAK=1` fails; the test green in the full suite; tsc root 0, electron == the 6; Task 8 READY; `LANDED.txt` + sha.
- b2 dist: four markers True, `main.js` after the build, `dist-proof --expect combined`, `earlierQuestion.js` sha/16.
- b3 smoke: both segments CHECK CLEAN/EXIT 0; S1Q04F, S1Q06F `gate=block` 200..577; S1Q04/06 `no-cue`; seg 2 off, no diag.
- b4 `--no-block` (vitest round trip, smoke-capture hash calibration). Before T, not after: the registered HEAD holds it,
  §5 lets nothing land on MAIN before the result note, and the G arms that need it run on this quota day.
- Ruling 3's harness edit (focused-five Flash off) in the registered HEAD; proof = no Flash arm line in the launcher log.
- b7 launchers: ASCII/CRLF, `GUARDS_ALL_PASSED` + a mangled-marker exit, `guard-eq-cal.txt` (each break `GUARD FAILED`,
  true env `GUARD OK`), the dry task's GUARD OK, `register-eq.ps1` (StartWhenAvailable False, next run = T), precheck once.
- b9 at arming: ledger (A1.1), falsefail DONE, no `Natively-*` Running, no tail.exe, no Electron, no error log, the
  sleep/restart reads (A1.2), this file and A1 committed to MAIN `passes/`, both sha256 in §11.
**After the hour:** b5 the reader (it computes G for `--only <G>`) and the G-twin hole count (`transientError` per rep;
holes re-run that quota day), both by 10:00 2026-10-06, else §6's departure; b6 `eq-twins.mjs`; b8 (alias probes, the
`--pairs` mode calibrated on `--make-pilot` first, dispatch text, merge cmd); b10 the cue export + completeness check;
the cue-effect re-points (`h40d-twins`, `-thoughts-noise`, check-smoke-cues v4, smoke-facts); clocks. No time bound (§6).

**A1.5 Unchanged:** every bar, clause, arm, roster item, grader rule and count, §5, §8. §11's "Filled at arming" adds
the ledger's clock time, T read back, the sleep/restart reads; the user's confirmation = these rulings (16:20).
