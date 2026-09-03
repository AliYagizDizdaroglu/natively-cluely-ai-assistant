# 60-minute interview run

- started 2026-09-03T14:04:48.411Z
- ended   2026-09-03T15:05:21.168Z
- items played: 52 spoken questions + 3 screenshot cues

## Gate
- FAIL  Answered hands-free: 34/46 dispatched, 0 to nobody   (before: 26/52)
- FAIL  Heard by either detector: 46/52   (before: 51/52)
- PASS  Surfaced detections per question: 0 doubles, 0 caught, 0 unclaimed   (before: 12 doubles, 1 invented)
- PASS  STT socket closes / lost utterances / fragment chips: 0 / 0 / 0   (before: 299 / 2 / 5)
- PASS  Technical questions answered via the coaching path: 0   (before: 25)
- PASS  Spoken questions routed CODING: 0, 2 cue answers   (before: 4 routes (2 of them screenshot cues))
- PASS  Live expiry loops: 0   (before: 0)
- FAIL  Answer TTFT p90 · detect p50: 10.9 s · 3.7 s   (before: 3.7 s (answer-only pass) · 4.1 s)

**GATE FAILED — Answered hands-free; Heard by either detector; Answer TTFT p90 · detect p50**

## Answer routing
- routes taken: {"VERBAL-TECHNICAL (selected model, filtered)":48}
- fallback redirects: 31
- hard failures: 12

## Heard by neither detector
- W06: Why version model artifacts alongside code?
- M24: How would you backfill a year of data without overwhelming the scheduler?
- H07: How would you tell a genuine drift alert apart from a broken upstream feature pipeline?
- H10: How would you roll back a model that is already serving traffic and has written bad data downstream?
- H11: Your training job costs tripled after a code change with no accuracy gain. How do you find the cause?
- H12: How would you design for a region outage in a serving stack that must stay available?
