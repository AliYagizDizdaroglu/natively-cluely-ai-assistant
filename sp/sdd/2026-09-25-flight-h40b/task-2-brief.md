### Task 2: h40b launcher and guard, calibrated against the OLD build

**Files:**
- Create (scratchpad): `<SP>\launch-h40b.cmd`, `<SP>\launch-h40b-dry.cmd`, `<SP>\guard-h40b.mjs`

- [ ] **Step 1: The guard** — `<SP>\guard-h40b.mjs` is `guard-h40a.mjs` with the header's "h40a"/"BASELINE" wording replaced by:

```js
// Pre-flight guard for h40b, run from the repo root by launch-h40b.cmd AFTER the launcher has set
// the flight's environment. h40b = holdout40 again with ONE change: the R09 routing fix. So this
// checks the hour will measure exactly that: the roster the environment names is the one the harness
// loads, no model or thinking override reaches the app, the build's default and fallback models get
// the levels they honour, and the built classifier carries the fix. Every check answers differently
// if its premise is false; check 5 was run against the pre-fix build before arming.
```

and this check 5 inserted before the final `console.log`:

```js
// 5. The R09 fix is in the build: the built classifier no longer lists bare "salary" as a
//    negotiation term and carries the phrase terms instead.
const cls = fs.readFileSync(`${PROJ}/dist-electron/electron/knowledge/IntentClassifier.js`, 'utf8');
if (/["']salary["']\s*,/.test(cls)) fail('the build still routes any question with the word salary to negotiation coaching - rebuild after the R09 fix');
if (!cls.includes('salary expectations')) fail('the build lacks the R09 fix phrase terms - rebuild');
```

with the final line reading `GUARD OK: roster holdout40 (${R.INTERVIEW.length} items), no model or thinking override, ${primary} LOW with the ${fallback} fallback at HIGH, R09 fix in the build`.

- [ ] **Step 2: The launcher** — `<SP>\launch-h40b.cmd` is `launch-h40a.cmd` with: the `rem` header replaced by four lines saying h40b = holdout40 with the R09 fix, task Natively-flight-h40b, 2026-09-26 17:00 local, everything else the shipped default; every `h40a` in log names and the guard path replaced by `h40b` (`natively-h40b-launcher-error.log`, `flight-h40b.launcher.log`, `guard-h40b.mjs`); the last line `interview60.flight.mjs h40b`. `<SP>\launch-h40b-dry.cmd` = the same file without the last line, and its log named `flight-h40b-dry.launcher.log`.

- [ ] **Step 3: Calibrate check 5 on the OLD build** (dist-electron still predates the fix at this point)

Run from MAIN's root: `cmd /c "<SP>\launch-h40b-dry.cmd"; "exit $LASTEXITCODE"; Get-Content electron\test\golden\interview60.runs\flight-h40b-dry.launcher.log -Tail 3`
Expected: exit 4 and the log's last line `GUARD FAILED: the build still routes any question with the word salary ...`. This is the guard proving it can say no.

