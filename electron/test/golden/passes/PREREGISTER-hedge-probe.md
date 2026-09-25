# Pre-registered: the live hedge probe (2026-09-25, windows H1–H3)

**Question.** Does the hedge (3.5-lite HIGH first; 3.1-lite LOW started at 5 s without stopping
3.5; the first token wins) beat the policy the app runs today (3.1-lite LOW first; 3.5-lite HIGH
after a 503 or at a 10 s first-token stall) when both are run for real, in the same minutes, on
the same prompts? The 2026-09-24 replay of the 09-23 latency windows (117 pairs) says yes — p90
12.9 s vs 18.6 s, no-answers 2 vs 4, median 6.4 vs 5.9 s, extra requests 58% — but it assumed a
model's outcome does not change when the other model is started beside it (H3 in
docs/superpowers/specs/2026-09-24-verbal-hedge-proposal.md). This probe measures that.

**Instrument.** electron/test/golden/hedge-live.probe.mjs: s50m's 39 captured prompts (the
09-23 probe's set), each prompt run through both policies back to back, the order alternating by
prompt, 8 s between runs so the policies never overlap, each request capped at 45 s; recorded per
policy: the wait to the first token, which model spoke, whether a second request was made, and
every request's own outcome. Policies: electron/test/golden/hedge-live.policy.mjs, unit-tested.

**Windows.** H1 19:30, H2 21:30, H3 23:30 local, 2026-09-25, the app closed. Evening only: the
09-23 noon window was the worst of the three and is NOT covered here; a daytime window is owed
before any decision to ship the hedge, and its result will be read by the same rule.

**Decision** (electron/test/golden/hedge-live.decide.mjs, pooled over the three windows, a
no-answer counted as 45 s): the hedge goes to an env-flagged build only if all three hold:
1. hedge no-answers <= today's no-answers;
2. hedge p90 wait <= today's p90 wait;
3. hedge median wait <= today's median wait + 1.0 s.
Otherwise the hedge is not built and today's order stays. Per-window numbers are reported, not
gated. The independence check (each model's failure rate as the hedge's second request against
the same model as today's first request) is reported, not gated; a large gap there means the
replay's assumption was wrong, whichever way the verdict goes.

Written and committed before H1 ran. Not edited afterwards.
