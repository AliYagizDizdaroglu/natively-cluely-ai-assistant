# Controller note, 2026-10-06 00:50 TST (before any flight data; the hour is 03:00 tonight) — post-hour tool rulings

Filed per b5-b10-review.md (m1, m2, I10), b6-b8-review.md (B1, I1, I5) and cue-report-build-report.md; read with
PREREGISTER-flight-eq.md and A1–A7. No `*-eq` run folder exists (only the dry launcher log and the smoke). No bar of
§4 or A1–A7 moves. Each tool's sha is recorded at use, under A2.5 (item e), not here.

## (a) b5 rulings 3, 4 and 5 (b5-b10-build-report.md), kept as the reviewer judged

1. **Ruling 3: the in-app answer ↔ pair join (b10).**
   - Registered text: §7.b10, "joined to the judge's pairs by dispatch time (the `wonby-join.mjs` join)".
   - Kept: `eq-cues-export.mjs` re-implements the judge's own claim rule locally. A dispatch claims the first
     `[Answer] full:` in [d, min(next dispatch, d + 60 s)). It does not call `wonby-join.mjs`, which joins won-by lines in
     [d − 1 s, d + 25 s].
   - Reason: the export must join to the judge's pairs. On h40d the two joins give the same result (44 of 44 joined).
   - Residual (review m2): an `extend` continuation makes the exporter refuse the whole export rather than name it
     INCOMPLETE. This fails closed. h40d, s50m and s50l had 0 extend dispatches.
   - Changes no bar: §7.b10 says the export "does not touch this hour's verdict".
2. **Ruling 4: `short` is tested before the roster match (b5).**
   - Registered text: A2.4 orders the pinned-question classes as `roster:<id>` if `sameAnchor` holds, else `short`
     (< 3 words of ≥ 4 letters), else STRAY. A2's own known answer (A2 m2, A2.10 b5 cal; the smoke's "Why that one?",
     reg. l. 276) requires WHY to read `short`.
   - Ruling: this is a self-contradiction in the registration. Under A2.4's order, sameAnchor's 0.5-overlap rule matches
     WHY to a roster text, and the registered known answer fails. **Resolved in favour of the known answer: `short`
     is tested first.**
   - Changes no bar: the order only moves a < 3-word line between `roster:<id>` and `short`. Neither one is STRAY, so
     rule 1(i) reads the same. `short` windows stay named and reported. s50m and s50l have 0 short windows (of 40 and 41).
3. **Ruling 5: where signature lines sit relative to the pinned line (b5), with the reviewer's I10 context.**
   - Registered text, part 1: A4.2 m3 says a signature line belongs to a window if it lies "before that window's
     pinned-question line". Kept: diag, override and knowledge lines belong to the pinned line BEFORE them, because the
     app logs the pinned line first and the diag line after it. On s50m and s50l the real override line follows the
     pinned line. Only the screen-reference line is read literally, before the pinned line.
   - Registered text, part 2 (I10): A4.2 m4 makes the verbal-diag `route: FAST-OVERRIDE | BEHAVIORAL` line THE fast-route
     signature. The debug-log override line is only corroboration. As built, the debug-log override line alone
     also reads `fast-route`. This is recorded as a departure from m4.
   - Changes no bar. The reading can still change: a window that m4 would read UNEXPLAINED (VOID 1(e)) can read
     `fast-route` instead (G, under 4d). The result note names any fast-route window that has no verbal-diag `route:`
     line.

## (b) b6 holes: controller ruling (b6-b8-review.md I1, B1)

- Registered text: §4 counting rulings, "a rep with more than 1 true hole on G (of 4) makes 3a INCOMPLETE". A3.4 m5
  changes this to "(of |G_twin|)" and says "a rep's hole re-run re-runs **both** of that rep's steps". §4 head:
  "Every clause is always computed and reported". §5: a feature-attributable FAIL (item 1) comes before INCOMPLETE
  (item 3), and "Sampling until it passes is not allowed".
- **Ruling, unit:** count incomplete PAIRS per rep, where a rep is both of its steps (A3.4 m5). It is not counted per
  answer file. **A rep with ≥ 2 incomplete pairs makes 3a INCOMPLETE.** This replaces builder ruling 5's per-file count,
  which let a rep lose 2 pairs without INCOMPLETE.
- **Ruling, scope:** only 3a goes INCOMPLETE. Every other clause (4b, 4c, 2b–2d, and 4b's back leg) is always computed
  on the complete pairs. Hole pairs are excluded and named. A FAIL is read before any INCOMPLETE. This replaces builder
  rulings 5 and 8, which turned a registered FAIL into INCOMPLETE. The registration says nothing about back-leg holes.
  They are excluded and named, and 4b is still computed.
- Changes no bar: this restores the registered text. The 3a pair count stays `5 × |G|` minus incomplete pairs, and the
  bars stay formulas on that count.

## (c) Substitute grader instruments (b6-b8-review.md I5)

- Registered text: §2 l. 98–101, "Every grader is launched by `F\R\launch-grader.mjs`" and every transcript is audited
  "by `audit-graders.mjs` in its DEFAULT (point-15) mode". §7.b8 and A3.5 I1 name `launch-grader.mjs --model-id` and the
  `--pairs/--verdicts` mode.
- Substitutes:
  - **`E\launch-grader-eq.mjs`**, derived from `F\R\launch-grader.mjs`, stands in for the registered launcher. It
    imports the original's tested functions (launch attempt, slot lock, slug and memory checks, `absRule`,
    `buildPrompt`). It adds the `--pairs/--verdicts` mode and pins `--model-id`.
  - **`E\eq-audit.mjs`** audits pairs-mode graders (the pilot and the 14 per-arm graders). The original audit cannot:
    it derives a grader's files only from a `blind-N.gX` tag. The blind G slots are still audited by the original
    `audit-graders.mjs`.
- Reason: the original lives outside E and was not edited (it is byte-unchanged). The registered modes needed a home,
  and the original audit cannot reach non-blind files.
- Before first use, each substitute gets an Opus review and an `instruments.sha256.txt` line (A2.5).
- Changes no bar: same allowlist, same dispatch template region (byte-identical to h40d's), same pin
  (`claude-opus-5-5`), same "wrong" / "acceptable" / "off-topic" definitions.

## (d) Cue reporting through `E\cue-report.mjs` (cue-report-build-report.md; A4.3a, A5.1, A6 m5)

- Registered text: A4 "Counts-only cue reporting" (under A4.3a), with the leak checker as A5.1 and A6 m5 restate it.
- What it does: `E\cue-report.mjs` wraps the four cue instruments unedited (`check-smoke-cues.mjs` v4,
  `smoke-facts.mjs`, `h40d-twins.mjs`, `h40d-thoughts-noise.mjs`).
  - Full output goes to `E\cue-report\` (never printed, never committed).
  - Only counts-only summaries are printed.
  - Each summary passes through `cue-leak-check.mjs` (a shared run of ≥ 24 normalised characters is a leak; a cue
    shorter than 24 is matched whole). A summary with `leak ≥ 1` is withheld.
- **Always run it with `--export <the run's cues-export-eq.json>`.** Without it no leak check runs, and the summary is
  not quoted.
- Not covered by the wrapper: A5.1 also requires the leak check on the completeness file and on the result note, so
  `cue-leak-check.mjs` is run on each of them separately before either is quoted.
- Changes no bar: the cue effect is reported, never gating (reg. §4).

## (e) A2.5 binds every tool

- b5, b6, b8's pieces (including both substitutes in c), b10, `cue-report.mjs` and `cue-leak-check.mjs` each need an
  Opus review (READY) and a sha line in `E\instruments.sha256.txt` before their first run on the run folder. The sha
  line carries the tool's sha256, its cal file's sha256 and the review file name. That file does not exist yet.
- Shas are recorded at use, not in this note.
- A tool edited after its first run on the hour's data re-runs its full calibration, and the edit is named in the
  result note.
