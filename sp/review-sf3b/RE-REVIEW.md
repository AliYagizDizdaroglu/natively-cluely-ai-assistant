VERDICT: APPROVE

Scope: MAIN working tree (branch fix/coding-style-suffix-all-gemini, HEAD 801442d), uncommitted cutAtWordBudget hunk in
electron/llm/verbalStreamFilter.ts (lines 847-848, 903-923, 974) and 6 new tests in verbalStreamFilter.test.ts (640-703).
Evidence: review-sf3b/probe.mjs -> probe.out.txt, probe2.mjs -> probe2.out.txt (counts only), probe3.cjs.
OLD = `git show HEAD:` built by node (byte-exact), NEW = working-tree copy (SHA-256 equal to MAIN's file); MAIN's dist untouched.

## (1) The finding is closed
Full chain (stripCueBlock -> filterCodeFences -> filterVerbalLines -> stripSuggestionBlock -> stripSpokenNotation -> cutAtWordBudget),
276-word body, chunk sizes 1, 2, 3, 9, whole:

| opener | reaches the stage as | NEW onDone (all 5 sizes) | = OLD (HEAD) |
|---|---|---|---|
| `{} is the empty dict.` | `{} is…` | words 189, cut true | yes |
| `{x} is a set.` | `{x} is…` | words 188, cut true | yes |
| `` `{}` is… `` | `{} is…` | words 189, cut true | yes |
| `**{a, b}** is a set.` | `{a, b} is…` | words 189, cut true | yes |

All clamped, `wc(out) == words`, onDone fires once. The previous round's `words=0` loss is gone.

Card and edge cases (stage, NEW):
- 277-word card, full chain, sizes 1/2/3/9/whole: output byte-identical to the card, parses, `{words:0,cut:false,allowance:false}`; OLD (HEAD) cuts it at 184 words, unparseable, all 5 sizes.
- blank-led card (`' '`, `'\n'`, card@7): passes whole, parses, words 0.
- sentinel then card: sentinel first, card whole, words 0.
- `{` then `"` split (and every size-1 test): payload, whole, words 0.
- lone `{`: emitted `{`, words 1, cut false (same as OLD). `'  ','{','\n'`: emitted as one chunk `"  {\n"`, words 1.
- `{`, ` `, `"a":1}`: decided speech at `"{ "`, words 2, same as OLD.
- `{ "` + long text: speech, clamped at 186, same as OLD. JSON.stringify cannot produce this: without a `space` argument it never emits whitespace, an object always begins `{"` and only the empty object is `{}`; both call sites (LLMHelper.ts:1141, :2450) call it with one argument on an object with the `__negotiationCoaching` key, so the card always begins `{"__`.
- empty stream and `['','','']`: no output, onDone `{0,false,false}` once.

Replay, my build: 624 replies x sizes 1/3/whole: OLD vs NEW text+onDone differ 0; chain outputs starting `{"` 0; first chunk reaching the stage a lone `{` 0; blank 1 (identical output). Matches the implementer's 0/624 at 1,2,3,7,90,whole.

## (2) No new state lost
- onDone: fires exactly once on natural end, on a cut and on an empty stream (n=1 in every case above); `finish()` is unchanged and the flush at 974 runs before it.
- Early consumer stop: speech and card, consumer breaks after 2 chunks, onDone 0 (unchanged contract).
- Sentinels: SENTINEL_CHUNK is still tested before the hold, so fallback/hedge/stall announcements pass immediately and never enter `probe`. withVerbalFallback sits inside the stage, so its `started` guard is unaffected by the hold.
- `chunk = probe` is taken when carry is '' and inWord is false, so the held text is counted exactly as if it had arrived in one chunk.
- tapFirstToken (outside the stage) times the first non-sentinel chunk; a held blank moves that time to the first non-blank chunk. Exposure measured: 1 of 624 replies, because the chain upstream already merges leading blanks with the first words (`'\n','\n',' ','Hello there.'` leaves the chain as `"\n\n Hello the"`).

## (3) Tests
- red.txt: on the previous round's code (bare `{` rule) exactly the new brace-opener test fails (`done.cut` false, line 674). The other tests pass there, as expected, because they guard the new hold.
- The lone-`{` test (682) pins the post-loop flush: mut.mjs shows the flush-less mutant emits `""` against an expected `"{"`.
- The size-1/2/3 + blank-led card test (691) would fail if the hold were removed and the decision kept on the first chunk, because the first chunk at size 1 is a bare `{`. That makes the hold load-bearing too.
- The brace-opener test checks `cut`, a 180-200 band, `wc(out) == words` and the preserved lead, at sizes 1/2/3/whole. Meaningful.

## (4) Comments
The block at 903-910 and the JSDoc at 847-848 now say what the code does: the decision is made on `{"`, text is held while blank or a single `{`, and the held text is processed as one chunk. They no longer claim stripSpokenNotation's rule. One leftover, see L1.

## Findings (none blocking)
- L1 (Low, test name), verbalStreamFilter.test.ts:650. The title "a payload is known by its first non-blank character, not by its first chunk" is stale: a card is now known by its first two non-blank characters (`{"`). Fix: "…by its first non-blank characters ({\"), not by its first chunk".
- L2 (Low, by-design residual), verbalStreamFilter.ts:920. A spoken answer whose chain output opens with `{"` (e.g. `{"a": 1} is a dict…`) passes unclamped with words=0 (probe: OLD 189 cut, NEW 0 not cut). In the replay 0/624 outputs start with `{"`, and stripSpokenNotation already passes such an answer through untouched. Accept it, or name it in the 908 comment as the known limit.
- I1 (Info), verbalStreamFilter.ts:915-918. There are two ordering effects of the hold, neither reachable in the app today:
  (a) If the source throws after only blanks or a lone `{`, that text is dropped. OLD emitted it before the error. The error still surfaces and onDone does not fire in either version.
  (b) A sentinel that arrives while text is held is emitted ahead of that text. withVerbalFallback only yields its sentinel when nothing non-empty came first, and the stall/hedge announcements precede the first filtered chunk, so neither case can hold text first.
- P1 (pre-existing, out of scope, HEAD), verbalStreamFilter.ts:745. stripSpokenNotation still uses the bare `{` rule this round removed from cutAtWordBudget. An answer opening `{} is \`x\` and **y**.` skips notation stripping entirely (output unchanged; `So {} is…` is stripped to `x and y`), so backticks and asterisks reach the reader. The fix would be the same `{"` decision with a held lone `{`. Worth a separate task.
- C1 (commit hygiene). The comment at 907 cites WhatToAnswerLLM.negotiationCard.test.ts, which is untracked in MAIN (`??`), so it must be committed with this change. MAIN also has unrelated dirty files (interview60.chains.json, interview60.report.md, natively_debug.log.1, probe dirs, resume_prompt.txt, retry_claude_print.bat), and none of them belong in this commit.

Not shown: no live app run. The probes drive the exported stages, not WhatToAnswerLLM's private stripModelSentinel/withVerbalFallback/nameStallSwitch wrappers, whose effect on this stage I traced by reading the code. The renderer's handling of the card was not exercised here. I did not re-run the full suite or tsc and relied on the implementer's suite.txt/tsc-*.txt.
