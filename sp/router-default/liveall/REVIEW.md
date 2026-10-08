# Review: Live-all blind-grading kit (2026-10-07)

Verdict: **GO for the two grader launches. One addition is needed before the result is read: a scorer (finding 5).**

Method: I read the builder, merge and launcher, then ran a read-only check script
(scratchpad la-check.mjs / la-check2.mjs) plus `launch-grader-la.mjs --plan` and `--dry-run`.
There were no model calls, no claude -p launches and no git. Only ids, counts and hashes were printed.

## 1. Pairing and merge: OK
- Every one of the 90 packet items maps through key-liveall.json to an id and an arm. For each item:
  - the answer equals the merged Live-all answer (LIVEALL) or `interview60.judge.pairs.json` `.answer` (INAPP);
  - the question equals that id's judge-pairs question.
  Mismatches: 0. Coverage: 45 ids, each with exactly one LIVEALL and one INAPP item.
- `interview60.prompts.json` is not referenced by any liveall script.
- The packet, answers and judge-pairs sha256 all match build-record-liveall.json.
- The questions match r1's router-blind packets on all 42 shared items (heard → question).
- merge.mjs: 0 mismatches. s1 = exactly the ids with a session-1 generationComplete (29, RE01..RH13); s2 = 18 (RH14..RE20).
  RH12 and RH13 were answered in both sessions, and the s1 copy is used, as the rule says.
- The holes, EF01 (s1, blank) and RH14 (s2, blank), are excluded from both arms (build-blind-la.mjs:36-41) and are listed in the key.

## 2. Blinding: OK, with one weak tell (noted, not fixed)
- Item fields are identical to r1's packets (key,id,kind,level,topic,question,heard,source,answer). The packet has no arm or id field.
- Pair order: LIVEALL comes first in 21 of 45 pairs; 2 pairs are adjacent.
- The key is in router-default\keyhold, outside the grader cwd. The grader's allowed Read covers only the packet and the grader-prompt file.
- Formatting tell (build-blind-la.mjs:44 passes `j.answer` untrimmed):

  | | INAPP | LIVEALL |
  |---|---|---|
  | leading whitespace | 3 | 0 |
  | trailing whitespace | 6 | 0 |
  | contains a newline | 8 | 3 |
  | no closing punctuation | 6 | 0 |
  | median words | 44 | 38 |

  There is no markdown on either arm. A grader is unlikely to read these differences as an arm signal.

## 3. Rubric and prompt: OK
- The packet's `rubric` and `model` equal interview60.judge.mjs `RUBRIC` and `JUDGE_MODEL`, and equal r1's blind packets.
- The dispatch comes from the same rd-grader-dispatch.txt (sha12 ad35cdefdd08) through the rd launcher's `buildPromptFiles`.
  The same frozen interview60.grader-prompt.md is read.
- Comparability caveats:
  - Each grader grades 90 items in one session; r1's blind files held about 10 items each.
  - Each question appears twice in the packet.

## 4. Launcher: OK
- Pin: exactly claude-opus-5-5 (launch-grader-la.mjs:42 and :64).
- Flags: `--setting-sources project,local`, `--strict-mcp-config`, dontAsk, Read/Write/Edit, and no add-dir. These come from the rd launcher's FLAGS/pairsArgs (shown in the dry run).
- Probe gate: required before a real launch (:84). It is OK now (opus -> claude-opus-5-5).
- Exit 0 requires memory ABSENT, the pin, gated tools and valid verdicts (:105).
- Records: launches.jsonl (:93) and verdicts.la-1.g{1,2}.json (:34), in the {key: {correctness, on_topic, delivery}} shape that score-rd's loadVerdicts reads.
- A failed launch still appends its record (:93). The scorer must therefore refuse any record that is not memory ABSENT, pinned, and gated-tools only.

## 5. Scorer: MISSING (needed)
No liveall script scores the verdicts. score-rd.mjs is bound to key-rd.json and build-record-rd.json (score-rd.mjs:378). Add score-la.mjs that:
- reads key-liveall.json plus verdicts.la-1.g1/g2;
- reuses score-rd's `accept` / `isWrong` (score-rd.mjs:36-37): acceptable = both graders give correctness 2 and on_topic 2; wrong = either grader gives correctness 0;
- prints per-arm acceptable/weak/wrong over the 45 graded ids;
- lists the holes EF01 and RH14 separately (Live-all gave no answer; count them as not acceptable when reporting over 47);
- refuses on a missing or invalid verdict, the same session grading both g1 and g2, or a launch record that is not ABSENT/pinned;
- is calibrated on a fake verdict set with a known answer.
