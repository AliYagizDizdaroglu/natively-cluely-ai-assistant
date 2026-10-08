# Fact-check: 2026-09-29-h40c-result.md

Version checked: the note as of 2026-09-29 16:18:54 local (17,243 bytes, sha256 ae2ff53f61febbc0...).
The note changed while this check ran: the first read (16:06, 13,236 bytes) had no "Why the ten misses
happened" section. Everything else is unchanged between the two versions; both were checked, and the new
section is included below. If the note changes again, re-check the diff.

Method: every number was recomputed from the primary files (debug log, diag log, timeline, judge pairs,
raw verdict files, merged judge files, pass records, launcher logs, watcher outputs, grading transcripts,
git objects). The scratchpad scripts were re-run and a sample of each was checked against the raw files.
This check wrote only this file. At the start it also created one temporary file in this folder (a copy of
the committed INDEX, for a diff) and deleted it straight away.

Abbreviations: G = MAIN\electron\test\golden; run = G\interview60.runs\2026-09-29T11-42-00-h40c;
dbg = run\natively_debug.log (window from byte 37528); diag = run\verbal-diag.log (from byte 2858663);
SP = scratchpad. Times are local (UTC+3) unless marked Z.

## Claims checked

| # | Claim (note) | Source checked | Verdict | Evidence |
|---|---|---|---|---|
| 1 | Pre-registration is PREREGISTER-h40c.md, commit 0e1e8b2 | `git show --stat 0e1e8b2` | CORRECT | The commit adds only that file (303 lines) |
| 2 | 0e1e8b2 is the registered HEAD | PREREGISTER line 62; flight launcher log line 2 | CORRECT | "this pre-registration's own commit, which is the registered HEAD"; guard "HEAD pinned at 0e1e8b2b..." |
| 3 | Written before the hour | git log | CORRECT | Committed 2026-09-26 23:28:24 +0300 |
| 4 | Not edited | MAIN file vs `git show 0e1e8b2:` blob | CORRECT | `cmp` finds them byte-identical |
| 5 | The pass record is written by the flight and the judge merges | File times; launcher log | CORRECT | Created 15:32:49 (the flight's pass-record step ran 12:32:49-52Z); last written 15:48:22, after the last merge (15:48:21) |
| 6 | The pass record is never hand-edited | File times | UNVERIFIABLE | Nothing has written it since 15:48:22. The negative can't be proven |
| 7 | "The hour flew as registered" | Launcher logs, watchers, quota file, blocking-1 record, session transcript | CORRECT | Task fired 13:30:00; guard OK with HEAD pinned and tree clean; playback 13:36 (in window); dry twin GUARD OK (log created 26 Sep 23:32, last written 29 Sep 13:24:14); blocking-1 stats run recorded 26 Sep 23:28:42 (after the commit, before the flight task was registered on 28 Sep 19:26); quota ledger checked 10:49 (0 lite requests since the reset). The note shows none of this evidence (see MISSING) |
| 8 | Task fired at 13:30:00 | bugx2l6s5.output | CORRECT | "lastRun=2026-09-29 13:30:00" |
| 9 | Dry twin's guard printed GUARD OK at 13:24 | bcvli42x8.output; dry launcher log time | CORRECT | "PRECHECK 13:24:10 ... dry-twin guard chain: result=0x0" plus GUARD OK; log last written 13:24:14 |
| 10 | Flight's own guard at 13:30 (HEAD 0e1e8b2, tree clean, hedge ON 5000 ms, follow-up parent OFF) | flight-h40c.launcher.log lines 1-4 | CORRECT | GUARD OK line comes before "10:30:01.903Z FLIGHT h40c start" and carries each named item |
| 11 | Playback 13:36:10 to 14:42:00 | timeline.json; report.md | CORRECT | startedAt 10:36:10.200Z, endedAt 11:42:00.891Z |
| 12 | Task ended at 15:33 | Launcher log; flight.done.json; watcher | CORRECT | DONE 12:32:52.8Z (15:32:52); watcher saw "FINISHED at 15:33:38". Correct once rounded |
| 13 | Exit code 0 | bugx2l6s5.output | CORRECT | "result=0x0" (the auto step itself exited 1 because the gate failed, which the launcher expects) |
| 14 | Order: replay arms, chains, judge exports, ungraded pass record | Launcher log lines 29-79 | CORRECT | Same order |
| 15 | Grader claude-opus-5-5, read from all seven grading agents' transcripts | h40c-grader-models.mjs re-run; each transcript's first prompt | CORRECT | All 7 PINNED, one model each (23/16/16/13/15/18/14 assistant messages). The tag-to-agent mapping was confirmed from each transcript's VERDICTS path |
| 16 | Rubric stamp 8564ba96369a | graderPrompt in the 7 merged judge files | CORRECT | All seven carry 8564ba96369a |
| 17 | Window: 13:36, IN WINDOW | Stats script; timeline | CORRECT | "playback start 13:36 local — IN WINDOW 12:00-15:00" |
| 18 | 1(a): startup line is exactly `[Main] verbal hedge: on trigger=5000ms` | dbg line 2 | CORRECT | The only match in the file, at 10:34:08.567Z, before startDebug |
| 19 | 1(b): 45 of 45 windows have a front= line | Windows rebuilt independently from dbg | CORRECT | 45 `dispatch: answer` and 0 `supersede`; every window has exactly one front= and one won-by line |
| 20 | 1(c): 0 of 45 front-error | dbg back-started lines | CORRECT | 7 back-starts in the window, all reason=trigger |
| 21 | Rule 2 thresholds 6.026 s / 13.608 s / 0 | PREREGISTER rule 2; h40b diag recomputed | CORRECT | h40b gives 5026 ms and 13608 ms |
| 22 | First-token median 4.1 s | diag, 45 "first token" lines | CORRECT | Sorted index 22 = 4100 ms |
| 23 | First-token p90 6.498 s | Same | CORRECT | Index floor(45*0.9) = 40, value 6498 ms |
| 24 | Answer failures 0 | dbg | CORRECT | No `Stream failed` and no `no answer` lines in the window |
| 25 | First-token lines cover 45 of 45 won-by windows | diag / dbg | CORRECT | 45 lines against 45 won-by windows |
| 26 | Rule 2 PASS | Rows 21-25 | CORRECT | Every sub-clause decided and passing; 0 unresolved windows |
| 27 | Rule 3's registered condition, as the note restates it | PREREGISTER rule 3 | CORRECT | A faithful restatement |
| 28 | 35 of 45 acceptable | h40c-rule3.mjs; recount from the raw verdict files | CORRECT | Merged judge.json matches the raw scores (0 mismatches); 35 items acceptable |
| 29 | Zero wrong on the 40; R09F wrong and excluded | Raw verdicts | CORRECT | The in-app arm's only wrong answer is R09F |
| 30 | Rule 3 PASS | Rows 28-29 | CORRECT | |
| 31 | Grader pinned, all seven | Row 15 | CORRECT | |
| 32 | VERDICT: PASS inside the daytime window | Rows 17-31 | CORRECT | |
| 33 | Quote of what a PASS licenses | PREREGISTER lines 207-210 | CORRECT | Matches character for character once the source's `**` bold markers and line break are removed. The em dash is U+2014 in both |
| 34 | The commit carrying this note changes no app code | — | UNVERIFIABLE | The commit does not exist yet |
| 35 | The hedge stays behind NATIVELY_VERBAL_HEDGE, off by default | electron/llm/verbalHedge.ts | CORRECT | Unset or '0' means off |
| 36 | 45 windows / 45 front= / 45 won by / 0 no-answer / 0 redirects | Rebuilt from dbg | CORRECT | |
| 37 | The back leg (3.1-lite LOW) started in 7 windows | dbg | CORRECT | 7 in-window back-starts; 3.1-lite usage lines read thinking=LOW |
| 38 | Every back-start was reason=trigger, at 5000-5016 ms | dbg | CORRECT | 5000, 5004, 5016, 5004, 5012, 5011, 5004 |
| 39 | 3.5-lite HIGH was slow, never failing, and never errored before a first token this hour | dbg | CORRECT | No front-error and no failure lines in the window; 3.5-lite usage reads thinking=HIGH. (Outside the window, the pre-hour warm-up race at 10:35:48Z logged `other=failed` for the 3.1-lite back leg; see MISSING) |
| 40 | 3.5-lite share 44 of 45 (98%) | Stats script; dbg | CORRECT | |
| 41 | The one 3.1-lite win is R20 | dbg lines 4533-4559 | CORRECT | The window dispatched 11:17:03.180Z, anchor "Attention, in one breath. What is it actually computing?", won by gemini-3.1-flash-lite |
| 42 | R20's question text | timeline q | CORRECT | Identical |
| 43 | Dispatched at 11:17:03Z | dbg | CORRECT | |
| 44 | Back leg started at 5011 ms, won at 9961 ms, 3.5-lite aborted | dbg 4549, 4558 | CORRECT | "other=aborted" |
| 45 | In the other six back-start windows 3.5-lite won and 3.1-lite was aborted | dbg | CORRECT | |
| 46 | h40a policy: 3.1-lite LOW first, 3.5-lite HIGH after a 503 or a 10 s stall | h40a dbg | CORRECT | "verbal stall race: trying gemini-3.1-flash-lite (fallback=gemini-3.5-flash-lite after 10000ms)"; thinking=LOW |
| 47 | h40b: the same policy | h40b dbg | CORRECT | Same lines: 5 stall fallbacks and 1 primary 503 |
| 48 | h40c: 3.5-lite HIGH first, 3.1-lite LOW beside it from 5 s | PREREGISTER da28f25; dbg | CORRECT | A simplification: it leaves out "or on a failure before one" |
| 49 | Detection p50 1.5 / 1.5 / 1.1 s | "detect p50" in the three pass records | CORRECT | |
| 50 | Dispatch p50/p90, h40a 1.6 / 6.8 s | h40c-latency.mjs | CORRECT | |
| 51 | Dispatch p50/p90, h40b 1.5 / 2.1 s | Same | CORRECT | |
| 52 | Dispatch p50/p90, h40c 1.2 / 3.5 s | Own recomputation (pairs and timeline) | CORRECT | 1195 / 3524 ms |
| 53 | TTFT h40a 5.8 / 7.8 / 14.1 s | Script | CORRECT | |
| 54 | TTFT h40b 5.0 / 13.6 / 29.9 s | Own recomputation from h40b diag | CORRECT | 5026 / 13608 / 29890 ms |
| 55 | TTFT h40c 4.1 / 6.5 / 10.5 s | Own recomputation | CORRECT | 4100 / 6498 / 10514 ms |
| 56 | First token after question end, h40a 7.6 / 16.5 / 34.9 s | Script | CORRECT | |
| 57 | First token after question end, h40b 6.7 / 14.9 / 31.4 s | Script | CORRECT | |
| 58 | First token after question end, h40c 5.7 / 8.5 / 37.0 s | Own recomputation | CORRECT | 5678 / 8465 / 37002 ms |
| 59 | Words h40a 60 / 100 / 111 | h40a gate rows | CORRECT | |
| 60 | Words h40b 66 / 86 / 188 | h40b gate rows | CORRECT | These are the gate's figures over 44 answers; counting the 43 judge pairs instead gives p50 65 |
| 61 | Words h40c 57 / 72 / 92 | h40c gate rows | CORRECT | |
| 62 | h40b's five slowest first tokens ran 13.6-29.9 s | h40b diag | CORRECT | 29890, 15368, 14877, 14771, 13608 ms |
| 63 | ...and they were its five 3.1-lite stalls answered by 3.5-lite after 10 s | h40b dbg | CORRECT | Five "gemini-3.1-flash-lite stalled after 10000ms — falling back" lines, each shortly before one of those tokens |
| 64 | h40c's slowest was R20 at 10.5 s | diag | CORRECT | 10514 ms at 11:17:13.697Z |
| 65 | That was the one answer 3.1-lite won after 3.5-lite stalled | dbg | CORRECT | |
| 66 | "nothing else exceeded 8.2 s" | diag | CORRECT | True at 0.1 s precision only: the next values are 8204 and 8101 ms, and 8204 ms is above 8.200 s |
| 67 | "The dispatch p90 of 3.5 s ... come[s] from one answer, R18's second" | Pairs plus timeline, sorted dispatch offsets | WRONG | The p90 sample (index 40 of 45) is R15's own Live-ear dispatch at 3.52 s. R18#2 (33.42 s) is the maximum; it only moves the p90 up by one rank |
| 68 | The 37.0 s maximum comes from R18#2 | Own recomputation | CORRECT | 37002 ms |
| 69 | The Live ear dispatched "When is PR AUC better than ROC AUC?" 33.4 s after R18's clip ended | dbg 11:15:08.717Z; timeline | CORRECT | The clip ended 11:14:35.298Z, so 33.42 s; source=live |
| 70 | Without it, dispatch p90 is 3.0 s and the maximum 4.0 s | Own recomputation | CORRECT | 2977 / 4003 ms |
| 71 | Rule 2's own reading is the stats script's: 4.1 s, 6.498 s, 45 samples | Script re-run | CORRECT | |
| 72 | The TTFT row reads the same diag lines as the gate and reproduces 7.8 s and 13.6 s | Script; pass records | CORRECT | |
| 73 | 35 of 45: 28/33 mains, 7/12 follow-ups | Raw verdicts | CORRECT | |
| 74 | The floor is 35, so there is no margin | PREREGISTER | CORRECT | |
| 75 | Zero wrong on the 40; the only wrong answer is R09F | Raw verdicts | CORRECT | |
| 76 | R05 unanswered | Pairs | CORRECT | No pair for R05 |
| 77 | R08 weak, with its reason | Raw verdict | CORRECT | Paraphrase; the grader wrote "Kafka gives exactly-once out of the box" |
| 78 | R14 weak, with its reason | Raw verdict | CORRECT | Paraphrase ("misplaced onto Kubernetes") |
| 79 | R22 weak, with its reason | Raw verdict | CORRECT | |
| 80 | R22F weak, with its reason | Raw verdict | CORRECT | |
| 81 | R23 weak, with its reason | Raw verdict | CORRECT | |
| 82 | R02F weak, with its reason | Raw verdict | CORRECT | |
| 83 | R04F weak, with its reason | Raw verdict | CORRECT | |
| 84 | R09F wrong, with its reason | Raw verdict | CORRECT | c0 |
| 85 | R11F weak, with its reason | Raw verdict | CORRECT | c1 t1 |
| 86 | R13F acceptable | Raw verdict | CORRECT | |
| 87 | R05 was heard (45 of 45 row) but no answer was dispatched | Pass record gate; dbg | CORRECT | |
| 88 | R05 is not a hedge failure: no dispatch window, nothing for rule 2 to charge | PREREGISTER failure definition | CORRECT | |
| 89 | R18 was answered twice: Deepgram ear (match), then the Live ear 33.4 s later (unverifiable, R18#2) | Pairs; dbg | CORRECT | R18 source=whisper/match at 11:14:36.812Z; R18#2 live/unverifiable at 11:15:08.717Z |
| 90 | Both R18 answers are acceptable | Raw verdicts | CORRECT | |
| 91 | The counting rulings were written before any verdict came back | Session transcript; file times | CORRECT | Rulings added by an edit at 15:35:40. Graders were dispatched 15:34:11-15:34:43; the first verdict file appeared 15:44:22 |
| 92 | R18 counts once toward 35; both answers count for the zero-wrong clause | h40c-grader-dispatch.txt | CORRECT | |
| 93 | The pre-registration warned that e311019 makes the in-app count more generous | PREREGISTER lines 10-24 | CORRECT | |
| 94 | 44 answers dispatched as verdict=match, 1 (R18#2) as unverifiable, none as paraphrase | dbg `dispatch: answer` lines | CORRECT | |
| 95 | h40c's 35 is counted the way h40b's 35 was | e311019 description; row 94 | CORRECT | e311019 only changes how paraphrase dispatches are attributed, and there were none |
| 96 | Five items became acceptable: R07, R12, R26, R30, R07F | h40b vs h40c merged judge.json | CORRECT | |
| 97 | h40b answered R07F but attributed it to nobody | h40b pass record ("1 to nobody"); h40b dbg paraphrase dispatch | CORRECT | |
| 98 | Five items stopped being acceptable: R04F, R14, R22, R22F, R23 | Same | CORRECT | |
| 99 | R11F wrong to weak; R09F stayed wrong; R02F and R08 stayed weak; R05 unanswered on both hours | Same | CORRECT | |
| 100 | "The captured twins re-ask each in-app prompt as the app built it" | prompts.json | CORRECT | With a caveat: 44 of the 45 in-app prompts are replayed. R18's twins replay R18#2's prompt (captured 11:15:09.227Z), not the first answer's (see MISLEADING) |
| 101 | Winners joined by hand "from the stats script's per-window winners" and the judge's pairing | Stats script source and output | CORRECT | The result is right, but the stated source is not: the script prints only a tally (44/1), so R20 can only be identified from the raw won-by line (see MISLEADING) |
| 102 | Every window was won by 3.5-lite except R20's | Rebuilt windows | CORRECT | |
| 103 | R20 read against the LOW twins, the other 43 against HIGH; R05 has no prompt and no twin | prompts.json (44 ids, no R05) | CORRECT | |
| 104 | HIGH twins 36 / 37 / 38 of 44 | Raw verdict recount | CORRECT | |
| 105 | HIGH twins wrong 1 / 0 / 2 | Same | CORRECT | R09F; none; R02F and R09F. All on excluded items |
| 106 | LOW twins 37 / 37 of 44, 36 of 43 | Same | CORRECT | |
| 107 | LOW twins wrong 2 / 1 / 2 | Same | CORRECT | R08 and R11F; R11F; R09F and R11F |
| 108 | In-app 35 of the same 44 | Same | CORRECT | |
| 109 | In-app wrong: "0 on the 40 gated items" | Same | CORRECT | True, but not on the basis of the twin rows beside it (see MISLEADING) |
| 110 | The in-app 35 is one below the HIGH band, 36-38 | Same | CORRECT | |
| 111 | Below all three twins: R04F, R14, R23 | Same | CORRECT | |
| 112 | Above all three: none | Same | CORRECT | |
| 113 | R20 acceptable in-app and in all three LOW twins | Same | CORRECT | |
| 114 | R22 weak in-app and in all six twins | Same | CORRECT | |
| 115 | R11F weak in-app and in all HIGH twins, wrong in all LOW twins | Same | CORRECT | |
| 116 | R22F weak in all HIGH twins, acceptable in all LOW twins | Same | CORRECT | |
| 117 | h40b's twins: LOW 40/40/38, HIGH 38/36/39 | h40b pass record summary | CORRECT | |
| 118 | The two hours' twins do not share prompts | By construction | CORRECT | |
| 119 | Two replay requests got HTTP 503 and hold no answer: R10 (captured-low r3), R20 (captured-minimal) | All 11 answer files scanned | CORRECT | These are the only two entries without spoken text; both read transientError "HTTP 503" |
| 120 | The three miss scripts exist and are read-only over the run folders and merged judge files | SP scripts | CORRECT | |
| 121 | "the bare arms answer the roster text under the same system prompt" | interview60.answers.mjs; prompts.json | WRONG | The bare arms send only VERBAL_WHAT_TO_ANSWER_PROMPT (12,784 chars). The app's captured system prompt is 16,223 chars: a 448-char language preface, then that base prompt, a candidate-identity line and a ~2.9k-char `<user_context>` profile block |
| 122 | The bare arms have no conversation context and hold no follow-ups | answers.mjs; files with 33 entries | CORRECT | |
| 123 | R05: the model received nothing | Pairs; prompts.json | CORRECT | |
| 124 | R05: Deepgram's final read "Riedes or MEMC eight." and the turn closed as not-a-question | dbg 1362-1372 | CORRECT | |
| 125 | R05: "(11:46:07Z)" | dbg | WRONG | classify at 10:46:07.084Z, close at 10:46:07.575Z |
| 126 | R05: the Live ear heard "Redis or Memcached?" exactly and it was dropped as a fragment | dbg 1379-1380 | CORRECT | |
| 127 | R05: the same two lines as on h40b | h40b dbg 1261-1278 | CORRECT | |
| 128 | R05: "the bare arms answer the roster text 7 of 8 times on h40a and h40b" | Bare judge files | CORRECT | Only as a count of acceptable answers: all 8 answered, 7 acceptable (h40b's bare 3.1-lite default was weak). See MISLEADING |
| 129 | R09F: the follow-up line alone | prompts.json | CORRECT | |
| 130 | R09F: the parent had left the 120 s window | Pairs | CORRECT | R09 was dispatched 153 s before R09F |
| 131 | R09F: the 203-char preview ends "I filter for wher", before "rank two" | prompts.json; R09 answer | CORRECT | The answer continues "where that rank equals two" (the quoted "rank two" is not verbatim) |
| 132 | R09F: 1 of 6 twins | Raw verdicts | CORRECT | LOW r1 |
| 133 | R11F: the follow-up line alone; neither it nor the preview names the rate limiter | prompts.json | CORRECT | |
| 134 | R11F: 0 of 6 twins | Raw verdicts | CORRECT | |
| 135 | R11F: 0 of 6 on h40b's prompt as well | h40b judge files | CORRECT | HIGH X w X, LOW X w X |
| 136 | R11F: h40a's prompt carried "Regarding the rate limiter" and 7 of 8 arms were acceptable | h40a prompts.json; judge files | CORRECT | in-app A, LOW A w A, HIGH A A A, minimal A |
| 137 | R22: the model received "How do you cut in a rag answer without just making it refuse?" | prompts.json | CORRECT | The prompt also carries R21's line as context |
| 138 | R22: the interim at 11:19:27.809Z read "How do you cut hallucinations in a rag answer without just making" | dbg 4765 | CORRECT | |
| 139 | R22: the final 17 ms later read "How do you cut"; the next final "in a rag answer without just making it refuse?" | dbg 4766, 4776 | CORRECT | 11:19:27.826Z; 11:19:29.373Z |
| 140 | R22: the two finals were dispatched joined, without "hallucinations" | dbg 4785 | CORRECT | |
| 141 | R22: the Live ear delivered the full question 1.6 s after the dispatch and it was only marked | dbg 4807-4808 | CORRECT | 1.574 s later; `dispatch: mark source=live` |
| 142 | R22: 0 of 6 twins; acceptable in-app on h40a and h40b; 7 of 8 bare | Judge files | CORRECT | |
| 143 | R22F: the R22 exchange with the damaged line, then "And how do you measure that you did?" | prompts.json | CORRECT | |
| 144 | R22F: 3 of 6 (LOW 3/3, HIGH 0/3); the model that won it is the one that misses it | Raw verdicts; dbg | CORRECT | |
| 145 | R08: the question intact, with its false premise | prompts.json | CORRECT | |
| 146 | R08: 2 of 6; 5 of 18 across hours; bare 6 of 8; in-app weak on all three hours | h40c-miss-tallies.mjs; judge files | CORRECT | |
| 147 | R02F: the follow-up line plus the preview of R02's answer (hash map and doubly linked list) | prompts.json | CORRECT | |
| 148 | R02F: "so the prompt says it is an LRU" | prompts.json (user and system) | WRONG | Neither the user nor the system text contains "LRU". The preview describes the structure only ("hash map with a doubly linked list ... any cached node ... maintains the access order so we can tra...") |
| 149 | R02F: 0 of 6; across hours HIGH 0 of 9, LOW 5 of 9 | Tallies | CORRECT | |
| 150 | R02F: a repeat miss of 3.5-lite HIGH (a reader-writer lock) | Judge files | CORRECT | |
| 151 | R04F, R14, R23: "Intact prompts" | prompts.json; pairs; PREREGISTER | WRONG | For R04F: its prompt is the follow-up line alone plus a 203-char preview of R04's answer. R04 was dispatched 154 s earlier, outside the 120 s window, and R04F is one of the five parentless follow-ups the pre-registration names. R14 and R23 are intact |
| 152 | R14 and R23 carry the Live ear's rendering | prompts.json | CORRECT | Live-block prompts: R07F, R09, R13, R14, R15, R18, R23, R28, R31 |
| 153 | R23's Deepgram line reads "flow 32" for "float 32" | prompts.json | CORRECT | |
| 154 | R04F/R14/R23: twins 5/6, 6/6, 6/6; all acceptable in-app on h40a and h40b | Judge files | CORRECT | |
| 155 | Four pipeline, two mixed, one repeat model miss, three single draws (ten misses) | Count | CORRECT | |
| 156 | "The hedge accounts for at most R02F and R22F, the two items its winner misses and 3.1-lite LOW gets" | Twin verdicts on h40a, h40b, h40c | CORRECT | For R02F this holds across hours only: on h40c's own prompt LOW went 0 of 3 (see MISLEADING) |
| 157 | No pipeline miss is the hedge's, since R05, R09F and R11F failed the same way on h40b | h40b judge.json; dbg | CORRECT | h40b: R05 unanswered, R09F wrong, R11F wrong. R22's cause, upstream of the answer path, is shown separately |
| 158 | The earlier-questions design is pending / awaits review (stated twice) | Not in the listed sources | UNVERIFIABLE | Matches AGENDA.md ("only if you approved the spec") |
| 159 | Answered hands-free: 44 of 44, 0 to nobody | Pass record gate | CORRECT | |
| 160 | h40b failed this row on R07F | h40b gate ("1 to nobody") | CORRECT | |
| 161 | Surfaced detections: FAIL on the one double, R18 | Pass record gate and R18 section | CORRECT | |
| 162 | Lost utterances: 1, as on h40a and h40b | The three pass records | CORRECT | The value is right, but the row FAILS on all three hours and the note doesn't say so (see MISLEADING) |
| 163 | TTFT p90 6.5 s PASS; h40b failed at 13.6 s | Gate rows | CORRECT | |
| 164 | Answer length PASS (p90 72, 2/45 over 85, 0 over 150); h40b failed the 150-word row | Gate rows | CORRECT | |
| 165 | Coaching 0, CODING 0, expiry 0, long question whole, 45/45 pinned | Gate rows | CORRECT | |
| 166 | 22 Live reconnects (h40b 25, h40a 24) | Pass records; dbg | CORRECT | 22 reconnect episodes (23 attempt lines) |
| 167 | 7 of 45 answers from the Live ear (h40b 3 of 43, h40a 9 of 45) | dbg; h40c-confounds.mjs | CORRECT | R07F, R13, R14, R15, R18#2, R28, R31 |
| 168 | 9 of 44 prompts carry its rendering (h40b 4, h40a 17) | prompts.json of each hour | CORRECT | |
| 169 | Quality held: 35 is the floor exactly, five items each way, one below the HIGH band, one more weak answer fails | Rows 28, 96-98, 110 | CORRECT | |
| 170 | The bare arms measured noise of up to 5 of 33 on h40b, are ungraded here, and no rule reads them | Pass records; INDEX; PREREGISTER | CORRECT | Bare 3.1-lite went from 30 to 25 |
| 171 | The hedge's cost: 7 back legs in 45 answers, no redirects | dbg | CORRECT | |
| 172 | 0 supersedes; rule 1(c) counted no 3.5-lite errors | dbg | CORRECT | |
| 173 | The 98% share is above the live probe's 95 of 117 | PREREGISTER | CORRECT | 95/117 = 81% |
| 174 | A heavier-load hour gives 3.1-lite more of the answers | — | UNVERIFIABLE | A prediction; consistent with the design |
| 175 | The two models fail on different items (R22F) | Twin verdicts | CORRECT | |
| 176 | R09F is a follow-up without its parent; the 6c50ec3 restore flies off | prompts.json; dbg line 3 | CORRECT | "[Main] follow-up parent: off" |
| 177 | R05 is lost before any answer path runs | dbg 1380 | CORRECT | Dropped at the dispatcher (`verdict=fragment`) |
| 178 | The stats script was calibrated before arming, on synthetic cases and the pre-hour smoke | SP cal folders; h40c-blocking1.txt; file times; transcript | CORRECT | Script unchanged since 26 Sep 22:21; blocking-1 record 26 Sep 23:28:42; flight task registered 28 Sep 19:26 |
| 179 | The appendix is the script's output | Fresh run compared line by line | CORRECT | Identical apart from the omitted header line |
| 180 | h40c-rule3.mjs reads the merged judge files | Script source | CORRECT | |
| 181 | It reproduces h40b's 35 (27/33, 8/12) and fails h40a on R09 | Re-run on both hours | CORRECT | |
| 182 | Every assistant message in the seven transcripts names claude-opus-5-5 | Row 15 | CORRECT | |
| 183 | The pin check was calibrated on known Opus, known Sonnet and missing transcripts | Re-run | CORRECT | PINNED / "NOT PINNED" (claude-sonnet-5-5) / "NO TRANSCRIPT FOUND" |
| 184 | One grading agent per arm, as on h40b | h40b transcripts | CORRECT | h40b had 14 grading agents for its 14 arms, one of them in-app |
| 185 | Dispatched with h40b's dispatch text verbatim | 7 transcripts vs agent-a75bedc970d3f2404 | CORRECT | All 7 first prompts are identical to h40b's in-app prompt once the paths and tag are substituted |
| 186 | A runbook line from before the hour said "two Opus agents" | AGENDA.md line 33 | CORRECT | In substance. The line actually reads "(two Opus 5.5 graders)", so the quote is not verbatim |
| 187 | ...superseded before any h40c data existed | Session transcript | CORRECT | Dispatch file first written 13:32:05 and AGENDA ruling 13:32:13; the app started 13:34:08 and playback 13:36:10 |
| 188 | ...because the pre-registration names no second in-app grader and h40b's 35 came from one | PREREGISTER; row 184 | CORRECT | |
| 189 | Graded: in-app and six captured twins; bare, low, high and minimal ungraded | INDEX row; judge files | CORRECT | |
| 190 | The first INDEX write moved h40b to delivered 44 (R07F) | INDEX diff against the committed file | CORRECT | Only h40b's delivered count changed (43 to 44), plus the new h40c row. That the +1 is R07F rests on the pre-registration's replay; intermediate INDEX writes can't be observed |
| 191 | As the pre-registration said it would | PREREGISTER lines 21-24 | CORRECT | |
| 192 | h40b's own pass record and registered 35 are unchanged | cmp against the committed files | CORRECT | Byte-identical; last written 26 Sep 16:45 |

Totals: 192 claims checked. 183 CORRECT, 5 WRONG, 4 UNVERIFIABLE (rows 6, 34, 158, 174).
Rows 66, 100, 101, 109, 128, 131, 156, 162 and 186 are CORRECT as written but are listed under MISLEADING.

## WRONG

1. Row 67, the "Rule 2" bullet. The dispatch p90 is not R18#2's value. Correction: "**The 37.0 s maximum comes from one answer**, R18's second: the Live ear dispatched "When is PR AUC better than ROC AUC?" 33.4 s after R18's clip ended. That answer is also the 33.4 s dispatch maximum. The dispatch p90 of 3.5 s is R15's own Live-ear dispatch (3.52 s after its clip). R18#2 adds one sample above it; without R18#2, or without any one of the five answers dispatched 3.5 s or later (R18#2, R07F 4.0, R14 3.9, R31F 3.6, R15 3.5), the p90 is 3.0 s (R23) and the maximum 4.0 s. Four of those five came from the Live ear. Even without R18#2 the dispatch p90 is above h40b's 2.1 s."
2. Row 121, "Why the ten misses happened", intro. The bare arms do not run under the app's system prompt. Correction: "the bare arms answer the roster text under the base verbal prompt (VERBAL_WHAT_TO_ANSWER_PROMPT, 12,784 chars). They do not get the app's language preface, candidate-identity line or ~2.9k-char `<user_context>` profile block (the app's captured system prompt is 16,223 chars). They have no conversation context and hold no follow-ups." This matters for R08: its bare-vs-twin gap (6/8 against 5/18) goes with exactly that framing difference.
3. Row 125, the R05 row. The time is wrong. Change "(11:46:07Z)" to "(10:46:07Z)". classify was at 10:46:07.084Z and close reason=not-a-question at 10:46:07.575Z. 11:46:07Z would be 14:46 local, after the hour.
4. Row 148, the R02F row. "so the prompt says it is an LRU" is not what the prompt says. Correction: "so the prompt describes an LRU's structure (a hash map and doubly linked list that 'maintains the access order' of cached nodes) without naming it". The words "LRU" or "least recently used" appear nowhere in R02F's user or system text.
5. Row 151, the R04F/R14/R23 row. R04F's prompt is not intact. Correction: "R14 and R23: intact prompts (both with the Live ear's rendering; R23's Deepgram line reads 'flow 32'). R04F: the follow-up line alone plus a 203-char preview of R04's answer (hash set). R04 was dispatched 154 s earlier, outside the 120 s window, the same shape as R02F. The twins still got R04F 5 of 6 on that prompt." R04F is one of the five follow-ups the pre-registration says arrive without their parent.

## MISSING

1. **The twin-band reading is not reported per item, and the combined band is not named.** The pre-registration asks for it "Reported PER ITEM, against the captured twin of the model that actually won that item ..., alongside the combined band for context", joined by hand in the note. The note gives the arm totals and the exceptions only. It needs:
   - a per-item row for each of the 44 items (in-app / winner / three twins), which h40c-rule3.mjs already prints;
   - the combined band named: 36-38 over all six arms, and 36 / 37 / 38 for the winner-matched r1/r2/r3 counts;
   - the join shown: which window answered which item, and which model won it.
2. **The gate's overall verdict is missing.** The pass record reads "Overall: **FAIL**", with two FAIL rows:
   - surfaced detections;
   - STT socket closes / lost utterances / fragment chips. This row FAILs on h40a and h40b as well.

   Two PASS rows go unmentioned: the 200-word-guard row, and the acceptable-answers row, which counts per pair ("29 acceptable ... of 33"). The note should also reconcile that 29 with its own 28 of 33 (R18 counted twice per pair).
3. **The hedge's likely upside is not stated.** This matters for "The hedge accounts for at most R02F and R22F":
   - On this hour's own prompts, 3.1-lite LOW's twins were wrong on R11F 3 of 3, where 3.5-lite HIGH was weak 3 of 3.
   - 3.1-lite LOW r1 was wrong on R08, a gated item. The same answer in-app would have failed rule 3's zero-wrong clause.
   - One draw each, but the note gives only the downside.
4. **Dispatch-tail context is missing.**
   - Four of the five latest dispatches (R18#2, R07F, R14, R15) came from the Live ear, which dispatched 7 answers this hour against 3 on h40b.
   - Without R18#2, the dispatch p90 (3.0 s) is still above h40b's 2.1 s.
   - The dispatch tail is an ear effect, not the hedge's, and the note does not say so.
5. **The evidence behind "The hour flew as registered" is not shown.** In particular:
   - The quota rule was met through the ledger check (h40c-baseline/quota-2026-09-29.txt, 10:49, 0 lite requests since the reset). The 30 Sep 05:00 cue smoke falls on the same quota day, so a ledger check was required.
   - Blocking item 1: the stats run on the pre-hour smoke is recorded in h40c-blocking1.txt (26 Sep 23:28:42, after the registered commit, with a COMPARE line). The flight task was registered on 28 Sep.
6. **The pre-hour warm-up race is not mentioned.** It ran at 13:35:40-48, before playback, so it is correctly outside every rule. 3.5-lite took 7.4 s and the 3.1-lite back leg failed (`other=failed`). It is the only leg failure in the log, and a reader of "never failing" / "rule 1 (c) counted none" may want to know that the back leg failed once.
7. **Two minor omissions.** The note never names rule 2's percentile method (the element at index min(n-1, floor(n*p))), which the pre-registration specifies. It also never says in prose that rule 2 is decided, not INCOMPLETE (0 unresolved windows, 45/45 coverage). The appendix shows both.

## MISLEADING

1. **Twin table, "wrong" column (row 109).** The twin rows count wrong answers over all 44 items; the in-app row counts only the 40 gated items. On the same basis:
   - All 44 items: in-app 1 (R09F), HIGH 1 / 0 / 2, LOW 2 / 1 / 2.
   - The 40 gated items: in-app 0, HIGH 0 / 0 / 0, LOW 1 / 0 / 0 (R08).

   As printed, the in-app arm looks cleaner than its own twins, and it is not.
2. **"Lost utterances: 1, as on h40a and h40b" (row 162).** This row FAILs on all three hours, and the gate's overall verdict is FAIL. The section lists every other row with its PASS or FAIL except this one.
3. **Join provenance (row 101).** "from the stats script's per-window winners": the script prints only a tally. R20 was identified from the raw won-by line (11:17:13Z) and the dispatch time (11:17:03Z), which this check confirmed.
4. **"The captured twins re-ask each in-app prompt" (row 100).** 44 of the 45 in-app prompts are replayed. R18's twins replay R18#2's Live-ear prompt, which already contains R18's first answer. R18's in-app grade is taken from the first answer. It makes no numeric difference: all acceptable.
5. **R05 diagnosis contradiction.** The Rule 3 bullet still says R05 was not answered and "this note does not diagnose why". The new "Why the ten misses happened" section diagnoses it from the log. Drop the Rule 3 sentence or point it to the new section.
6. **R05 bare arms (row 128).** "the bare arms answer the roster text 7 of 8 times" reads as if one bare arm gave no answer. All 8 answered; 7 were acceptable.
7. **"The hedge accounts for at most R02F and R22F, the two items its winner misses and 3.1-lite LOW gets" (row 156).** It holds for R22F (LOW 3/3 against HIGH 0/3 on h40c's prompt). It does not hold for R02F on this hour:
   - LOW went 0 of 3 (w w w) on h40c's own prompt; "LOW gets" rests only on h40a/h40b's twins (5 of 6).
   - The in-app 3.1-lite LOW answers to R02F were wrong on h40a and weak on h40b.

   On this hour's evidence the hedge accounts for at most R22F. The note's own R02F row shows "0 of 6", which contradicts the summary.
8. **"The slow tail is what moved."** The median moved too: TTFT p50 went from 5.0 to 4.1 s and first-token-after-question p50 from 6.7 to 5.7 s. The tail moved most.
9. Nits:
   - "nothing else exceeded 8.2 s": the next value is 8204 ms.
   - "before "rank two"": the answer's words are "that rank equals two".
   - The runbook line quoted as "two Opus agents" actually reads "(two Opus 5.5 graders)".
