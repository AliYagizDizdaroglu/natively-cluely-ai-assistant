# L20b notes (records, not rules — the rule is PREREGISTER-l20b.md)

- 2026-09-29 ~17:16–17:21 local: pre-flight ad-hoc health probe (`l20/health-probe.mjs`, compression on):
  answered 5/5, abnormal closes 0; first words S1Q02 2.4 s, S2Q08 2.1 s, S2Q01 1.5 s, S1Q06 2.1 s,
  S1Q04 1.4 s. Json `l20/health/2026-09-29T14-16-22-775Z.json`, console
  `l20/health/adhoc-2026-09-29-1725.console.txt` (misnamed; it started ~17:16). Not a scheduled gate run.
- Pre-flight holds -> L20b launched ~17:23 local: `node run.mjs --rep 1`, then 2, then 3, sequential,
  consoles in `runs/r<n>.console.txt`.
