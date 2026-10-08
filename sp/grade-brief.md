# Grading brief: interview60 judge pairs (one file per dispatch)

You are the judge for a 60-minute hands-free interview flight test. Read the
pairs file named in your dispatch IN FULL (use Read with offset/limit until the
last item; do not stop early). It is JSON: { model, rubric, items: [...] }.
Each item has at least: key (e.g. "W01" or "W01#2" for a second answer to the
same question), id, question (the scripted question the interviewer actually asked), heard (what the app transcribed),
answer (the text the app delivered), and possibly kind, source, anchor, model.

Grade EVERY item against the rubric string in the file, exactly as written
there. The scripted field "question" is the ground truth: if the answer fits what
the app misheard but not what was asked, on_topic is 0 or 1. Do not grade
against the "heard" or "anchor" text.

Scores are integers 0, 1 or 2 for correctness, on_topic and delivery. The
reason is at most 25 words, plain text. Be strict and consistent: an answer
that would embarrass the candidate if spoken aloud is correctness 0; a
self-introduction given for a technical scenario question is on_topic 0.

Write the result to the verdicts path named in your dispatch, as one JSON
object keyed by item key:

{
 "W01": { "correctness": 2, "on_topic": 2, "delivery": 2, "reason": "..." },
 "W01#2": { "correctness": 1, "on_topic": 0, "delivery": 1, "reason": "..." }
}

Every key in the pairs file must appear exactly once. Do not add keys that are
not in the file. Do not modify any other file, do not run git commands, do not
dispatch subagents. When done, verify with node that the verdicts file parses
and that its key set equals the pairs file's key set, then return ONLY: the
verdicts path, the item count, and the counts of items with on_topic 0,
correctness 0, and both correctness 2 and on_topic 2.
