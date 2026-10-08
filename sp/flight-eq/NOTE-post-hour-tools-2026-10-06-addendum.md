# Controller note addendum, 2026-10-06 01:02 TST (before any flight data; the hour is 03:00 tonight)

Addendum to NOTE-post-hour-tools-2026-10-06.md (sha256 059aeda5ae4904de64550587890fdddcce0613856a4ed9936c6fff5558be72f8,
sealed and unedited). Filed per b5-b10-review.md "## Re-review" I12. No `*-eq` run folder exists.

## 1. Correction to (a)3, part 2

The sealed note says: "As built, the debug-log override line alone also reads `fast-route`". It also says the result
note will name any fast-route window that has no verbal-diag `route:` line. **Both statements are withdrawn.** After the
I10 fix, `eq-flight-read.mjs` requires the verbal-diag `route: FAST-OVERRIDE | BEHAVIORAL` line inside the dispatch
window as the fast-route signature. A window with the debug-log `intent override → behavioral` line and no `route:` line
reads **UNEXPLAINED**, which is **VOID 1(e)**. The re-review's cal case 20 shows this.

(a)3 part 1 still stands: the placement ruling for diag, override and knowledge lines after the pinned line.

## 2. Ruling: A4.2 m4 governs

- The registered texts conflict.
  - A3.1b (l. 134) accepts either the debug-log override line or the verbal-diag `route:` line as the fast-route
    signature. Its synthetic case (l. 144) expects a window with the override line alone, and no capture, to read
    `fast-route`.
  - A4.2 m4 makes the verbal-diag `route:` line **the** signature. It treats the debug-log line as optional
    corroboration only, and it replaces A3's real-shape case.
- **Ruling: A4.2 m4 governs, because it is the later text.** A3.1b's synthetic override-only case is superseded on this
  point. The reader's cal follows m4.
- **This moves a possible VOID.** Under A3.1b, an override-only window would be `fast-route` (in G, read under 4d). Under
  m4 it is UNEXPLAINED, so the hour is VOID under 1(e) and is re-flown under §5 item 2. No bar changes: only what the
  signature is. Risk on the hour is low, because on s50m and s50l the two lines co-occur (1 each, at S1Q01).

## 3. New tool shas (fix round; re-review shas, recomputed here 01:02 TST)

| file | sha256/12 | cal txt sha256/12 (re-review) |
|---|---|---|
| `eq-flight-read.mjs` (b5) | **53151846367b** | c895b360fbc8 |
| `eq-cues-export.mjs` (b10) | **952182ae4eea** | 16fce1aae09e |

These supersede the build report's 84ff2fa12719 and 2ee308d261f1. Under A2.5, the line in `instruments.sha256.txt` is
still written at use, before the first run on the run folder.
