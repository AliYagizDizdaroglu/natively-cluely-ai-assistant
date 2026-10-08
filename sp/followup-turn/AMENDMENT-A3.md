## AMENDMENT A3 (2026-10-04 14:50 local; a separate note — the registration, sha256 eac1ad4f…290f5, is FINAL and unedited) — a provider-refused attempt is not a grader attempt; blind-5..9 are graded by fresh a3 attempts

Pre-decision. No decision has been run; no verdict of blind-5..9 exists. **The record** (`R\run.log` grader blocks 00:50:09–00:54:38 and the
00:54:57 `GRADING STOPPED` line; `work\grade-all.console.txt`; `R\blind\launches.jsonl`): blind-1..4, g1+g2 (8 slots), attempt 1 each, 00:50–00:53,
exit 0, `claude-opus-5-5`, ABSENT, tools {Read 2–3, Write 1}, verdicts valid on their pairs (20 keys). blind-5..9, g1+g2 (10 slots): every attempt —
a1 AND a2, 20 launches 00:53:24–00:54:38 — exit 1 within ~8 s, model empty, tools {}, verdicts file MISSING. Cause confirmed from the transcripts
(4 of the 20 read: 2b822973…, d98b8353…, c19e3e30…, ecd19da2…; all four identical): one assistant message "You've hit your session limit · resets
3am (Europe/Istanbul)", `"error":"rate_limit"`, `isApiErrorMessage: true`, model `<synthetic>` — the account's usage limit refused the request
before the model produced any turn. Not a grader verdict; not a grader death.

1. **A refused attempt is not a grader attempt.** An attempt the provider refused before the model produced any output — rate_limit / usage-limit
   API error (`isApiErrorMessage: true`), zero tool calls, no verdicts file — graded nothing. It is neither a grader of record nor the "grader that
   dies or writes an incomplete file" of §1 point "Graders" (A2 points 5, 11): it does NOT consume the slot's ONE replacement. Its `launches.jsonl`
   line and its `F\grading\<slot>-a<k>\` cwd stay as the record; that cwd is never reused (A2 point 9 unchanged). A refusal is read ONLY from the
   transcript's API-error marker; an attempt that produced any tool call or any model text and then failed is a death, judged under the original rule.
2. **The 20 refused attempts, by class:** every `launches.jsonl` line with `"exit":1`, `"model":""` for slots blind-5.g1 … blind-9.g2, attempts 1
   and 2 (20 lines, `startedAt` 2026-10-03T21:53:17Z–21:54:30Z; session ids as listed there, 2b822973… through c19e3e30…). All are refused
   attempts under point 1; none is a grader; none is a replacement.
3. **blind-5..9 are graded by fresh attempts a3**: `launch-grader.mjs blind-N.gX --attempt 3`, g1 and g2 of one file launched together, never more
   than 2 at once (the launcher's slot lock), the point-15 flags unchanged (`--model opus`, `--tools Read,Write,Edit`, no Bash, no `--add-dir`,
   `--strict-mcp-config`, the same dispatch text and allow rules), keys OUT of the graders' folder as at 00:48. A3's a3 is each slot's FIRST grader
   attempt; the one replacement of the original rule remains available to each slot as a4. Before launching: confirm the limit has reset (one
   throwaway probe, `--probe`, under its own cwd), so a3 is not a third refusal; if a3 is refused again, point 1 applies again and the record says so.
4. **graders.json** names each slot's `agent` = its a3 session (a4 if a3 died in the original sense); `replaced` lists ONLY true replacements — a
   grader that ran (tool calls or model text in its transcript) and died or wrote an incomplete file — never a refused attempt. The three derived
   files (models, memory, audit) run over the 18 agents of record plus any true replacement, as A2 point 5 says. `legs-decide.mjs`'s check that every
   slot's `agent` equals the `session_id` of an `exit: 0` `launches.jsonl` line is unchanged and is already met by construction: no refused line has exit 0.
5. **Why pre-decision, and the cost.** Nothing of what this rules on was chosen after seeing a verdict: `legs-decide.mjs` has not been run
   (`run.log` 00:54:57, "No decision run"), blind-1..4's verdict files have been validated against their pairs only (key count), and blind-5..9 have
   none. The cost is time-of-day drift: blind-1..4 were graded at 00:50–00:53, blind-5..9 will be graded today after the reset. What that cannot
   move: the graders are Opus 5.5 either way, pinned per transcript (a different model field → STOP, §1); the blind files are fixed and hashed
   before any grader read them; and the grader-context effect the registration guards against concerns the two ARMS within one file — each blind
   file holds both arms of its items (`R-keyhold\key.blind-N.json`: A 10 / B 10 in blind-1 and blind-5, A 12 / B 12 in blind-9), read by the same
   two graders in one sitting — so a drift between files moves both arms of a file together and cancels in the paired consensus. What it could
   still cost: a between-file level shift in the reported (never decided) either-grader and mean counts, and a reader's doubt; both are named here
   in advance and go into the result note.
6. **Nothing else changes.** §2's hashes, §5's consensus, §7's order, the parity check, the memory and audit rules, the VOID-first order and every
   A1/A2 point stand as registered.
