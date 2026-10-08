Cue-block grading instrument (frozen by its sha256 once calibrated; SPEC-cue-grader.md section 1).
Everything above the `---` line is a header for people; follow EVERYTHING below it, verbatim. Do not paraphrase it, do not soften or tighten it, do not add a rubric of your own.

---

# What you are grading

A candidate in a live interview sees a short block of CUE LINES on screen while they speak an answer. You grade the cue block, not the answer.

Each item of the pairs file holds four fields: `key`, `question`, `cues` (the lines on screen, in order, 1 to 3 lines of at most 5 words) and `answer` (the full answer shown below the cues). Nothing else about an item is known to you, and you must not try to guess where an item came from, which model wrote it or how it was made. Judge each item on its own.

# Work order, for every item (this order is part of the instrument)

1. For EVERY cue line, score R, C and G (below), looking only at the question and the line.
2. Then score V for the block.
3. Only then read the full answer, and score K last.
4. D and the label last of all.

Why the order matters: the answer is evidence for CONSISTENCY (axis K). It is never evidence for truth (axis C), and it must not make a cue look better or worse than the cue is on its own.

# Per-line scores (0, 1 or 2 each)

R: answers the question
- 2: the line addresses a part the question asks.
- 1: on the topic, but not what was asked (an adjacent point, generic context).
- 0: off-question: about something not asked.

C: correct
- 2: true, or a pure label with no claim.
- 1: imprecise or ambiguous in a way that could mislead a little (a vague number, a near-miss term).
- 0: a false claim.
- C is judged against the QUESTION and the facts of the domain, NEVER against the answer below. A line that repeats a false claim that the answer also makes is C = 0: echoing the answer is not a defence. A line that is true stays C = 2 even when the answer below contradicts it.

G: usable at a glance
- 2: the candidate can speak from it in about one second: a specific term, number, named choice or mechanism.
- 1: usable but generic: a category word or a heading the candidate must expand.
- 0: filler or vague; needs re-reading; raw notation; or CUT MID-PHRASE or dangling (it ends on a connective, an article or a half-term, as a mechanical five-word cut produces).

# Per-block scores (0, 1 or 2 each)

V: coverage
- 2: every part the question asks is touched by the lines (grouping parts into themes counts); a one-part question with one good line is 2.
- 1: the main ask is covered, but a named part is missing.
- 0: the main ask is missing.

K: consistent with the answer
- 2: every line agrees with the full answer.
- 1: a line the answer does not support, but does not contradict.
- 0: a line contradicts the answer (a different choice, number or claim).

D: direct answer first, one of "yes", "no", "na". When the question asks for a choice, a yes/no or a number: does line 1 carry it? Use "na" when the question asks for none of those. D is only reported.

label: your overall view of the block, one of "good", "weak", "wrong". A good block is right, covers the question, and the candidate could speak from it. A weak block is right but incomplete, generic, dangling or at odds with its answer. A wrong block says something false or says nothing about the question. (The block verdict that counts is computed from your scores by a fixed rule, and your label is recorded only as a check; do not try to steer the rule.)

note: at most 12 words, no quotation of the question, the cues or the answer.

# Output

Write ONE JSON object to the verdicts file. Its keys are the item keys, exactly those of the pairs file, every one of them and no other. Each value:

{ "lines": [ { "R": 0-2, "C": 0-2, "G": 0-2 }, ... one per cue line, in order ],
  "V": 0-2, "K": 0-2, "D": "yes"|"no"|"na", "label": "good"|"weak"|"wrong", "note": "<= 12 words" }

`lines` must have exactly as many entries as the item has cue lines. Every score is the integer 0, 1 or 2. Write the file once, complete, as valid JSON, then re-read it to check it parses and covers every key.
