# Amendment A6 to PREREGISTER-router40.md: L back to thinking LOW (pre-data)

Written **2026-10-05, begun 21:47 TST by `date`** (Opus, the registration's author). **No router40 model call has
been made; no datum exists.** Earlier files are unedited. Precedence: **A6 > A5 > A4 > A3 > A2 > A1 > the
registration**. Read as: `AMENDMENT-A5.md` whole file `1bb7537e1e9abeeba07abc2ee3a8e5244fa0317304792c26bc5f84348f010161`
(seal `7b8f78fd…9896`).

**U4, the user's ruling (in chat ~21:50, before any call, relayed):** L runs 3.1-lite at thinking **LOW**, like the app
("we never use 3.1 lite high, only low" → chose LOW). U4 supersedes U3.

| item | ruling |
|---|---|
| L's thinking level | **LOW** everywhere: A5's U3 and A5.7 are withdrawn; registration §3.4's `thinkingConfig: { thinkingLevel: 'LOW' }` is in force again |
| P4 `lite-l.mjs` | the pinned constant is `'LOW'`; A5.6's request-body case reads: stub fetch capturing the body → `generationConfig` = `{temperature: 0.4, maxOutputTokens: 65536, thinkingConfig: {thinkingLevel: 'LOW'}}` exactly, model `gemini-3.1-flash-lite`; a mutated copy with `'HIGH'` → that case FAILs (known negative); every saved L record carries `thinking: 'LOW'` |
| What L is | again **the app's shipped back-leg config** (3.1-lite LOW); A5.7's "not the app's shipped back leg" and its CANDIDATE caveat are withdrawn |
| TTFT expectation | back to the LOW expectation in force before A5: A1.7 m2's "L TTFT p50 3–9 s" (which already replaced the registration's 1.5–3.5 s); A5.7's 5–20 s, its 90 s-abort remark and its quality remark are withdrawn |
| Everything else in A5 | **kept**: the tonight window [21:45, 23:15), the R smoke first then R full and L concurrently, the narrowed same-piece guard, the deadline with the remaining estimate (L's 40 s per later item is kept as written: it was sized for HIGH and is only stricter at LOW), the tonight line, cap 60 with the counter, grading rules, every A5.6 case except the thinking-level case above |

**Not covered:** the A5.6 harness changes and cases (now with `'LOW'`) still have to be built and pass before the
first call; L's TTFT is still measured concurrently with R's audio stream.
sha256 (of every byte above this line): fb32a0a0906d4d27255566640d35077527ca972e6aa92df52b3cd146530eda4e
