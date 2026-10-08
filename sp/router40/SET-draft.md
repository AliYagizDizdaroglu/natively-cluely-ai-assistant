# router40: the 3.8 Live ROUTER test set and its easy/hard definition (draft for the user's review; nothing run)

Written 2026-10-03 18:28 local; revised 18:37. The user (18:25): the easy questions they meet are "immutable, mutable
types in python / what is docker image / how do you do simple actions using aws (meant lambda)"; 20 such, 20 medium
and hard. **Approved by the user ~18:35** ("approve the list ... add some follow up questions on easy ones too"),
with both boundary calls (", and why" = HARD; all follow-ups HARD). §3b adds the easy-parent follow-ups,
**approved by the user at 18:48** ("approve the 7, add difficulty grade"); §6 step 5 is the difficulty grade.
No model call, no clip rendered, no label fixed yet. holdout40 never opened.

Why a new definition: L38R's class (one fact, ≤ 5 words) is what Live routes well, but it occurs 1 in 176 on our
rosters (l38base). The user's real easy questions are short DEFINITIONS (30–60 spoken words), a class L38R never
tested and L20c warns about (bare Live loses once answers get longer and multi-part). So the class widens to one
concept, and the test asks whether the separation still holds there.

## 1. EASY (the only class Live may answer)

EASY = all four:
1. **One named concept.** The interviewer names a thing and asks what it is, what it does, what it is for, or how it
   differs from ONE other named thing. The correct answer is general knowledge in about 30–60 spoken words.
2. **Stands alone.** No reference to anything earlier (that / this / it / the one / your design / earlier), nothing
   about the candidate (your project, your CV, have you, tell me about a time).
3. **No multi-part structure.** No second question ("and why", "and how would you"), no list to cover ("the three
   probe types", "ingestion, training, serving"), no "walk me through / design / compare / explain the trade-offs".
4. **No situation.** No numbers, constraints or story to reason over ("your image is eight gigabytes", "two thousand
   calls a day with a two-second SLA", "pods are being evicted").
When in doubt, HARD: a wrong HARD costs nothing (the pipeline answers it anyway); a wrong EASY is a line on screen.

Boundary cases, decided:
- "Difference between X and Y" → EASY when both are single named concepts (image vs container, merge vs rebase).
- "When would you use X" / "X or Y?" / "when would you choose X over Y" → EASY when no situation is named (the
  answer is each option's textbook condition: real-time vs batch transform, Parquet or CSV). The same choice with
  numbers or constraints → HARD (RH19 below, beside RE09).
- "Why X?" about one concept ("why do Docker layers matter for build times") → EASY: it asks the concept's purpose.
  "Why that one?" / "why did you choose" → HARD (back-reference, the candidate).
- "How do you X" where X is ONE routine action with one canonical tool or command ("run code on AWS without a
  server" → Lambda; "undo the last commit") → EASY. "How would you [detect / handle / approach / debug / shrink /
  monitor] …" → HARD: a procedure with choices, even when short.
- A second clause about the SAME concept ("what is X, and what does it host") → EASY. "…, and why?" → HARD, always
  (the tightest line; RH04 tests it).
- Typed questions are out of scope (3.8 Live takes no text).

## 2. HARD (= medium + hard; everything else)

Explicitly HARD: multi-part questions; design and "how would you" questions; debugging scenarios; anything about the
candidate's experience or projects; code; and EVERY follow-up that refers back, both kinds:
- **QF** question-based (resolvable from the earlier question alone): HARD by rule 2, although L38F showed Live
  gets them right 12/12; reported as its own class (a Live answer here is a rule miss, not an unsafe line).
- **AF** answer-based (depends on what the candidate said): HARD, always the pipeline, which has the answer on
  screen; Live never hears the candidate and invents (L38F 4/12, L38M "O(1)." to "your rate limiter").

## 3. The 20 EASY (spoken wording; new unless a source id is given)

| id | question | domain | note |
|---|---|---|---|
| RE01 | What is the difference between mutable and immutable types in Python? | Python | the user's |
| RE02 | What is a Docker image? | Docker | the user's |
| RE03 | How do you run a small piece of code on AWS without managing a server? | AWS | the user's (Lambda); "how do you" + one action |
| RE04 | What is a Python decorator? | Python | |
| RE05 | What is the GIL in Python? | Python | |
| RE06 | Why do Docker layers matter for build times? | Docker | = interview60 W02; "why X" on one concept |
| RE07 | What is a readiness probe in Kubernetes? | Kubernetes | pairs with RH05 |
| RE08 | What is the difference between a pod and a deployment? | Kubernetes | = interview60 W07 |
| RE09 | When would you choose a real-time endpoint over batch transform? | AWS / SageMaker | = interview60 M09; a choice, no situation; pairs with RH19 |
| RE10 | What is the Azure equivalent of AWS Lambda? | Azure | |
| RE11 | What is overfitting? | ML | |
| RE12 | What is the difference between precision and recall? | ML | |
| RE13 | What is the difference between data drift and concept drift? | ML | = interview60 W08 |
| RE14 | Parquet or CSV for storing a large training set? | ML / data | a choice, no situation; parent of RH02 |
| RE15 | What is the difference between an inner join and a left join? | SQL | |
| RE16 | What is a database index for? | SQL | |
| RE17 | What is the difference between git merge and git rebase? | git | |
| RE18 | How do you undo your last commit in git? | git | "how do you" + one action |
| RE19 | What does it mean for an API endpoint to be idempotent? | APIs | |
| RE20 | When would you return a 400 versus a 500 status code? | APIs | a choice, no situation |

Python 3, Docker 2, Kubernetes 2, AWS 2, Azure 1, ML 4, SQL 2, git 2, APIs 2.

## 3b. Easy-parent follow-ups (EF; added on the user's 18:35 request)

HARD by the approved rule (a follow-up refers back), reported as their own class: the shape where Live has just
answered the parent itself and is most tempted to continue. Seven: a third of the easy parents, enough to read a
rate, while 11 easy questions stay bare so the plain easy-path reading (§7) is not diluted. Two are answer-based.

| id | question | parent | class |
|---|---|---|---|
| EF01 | What's the difference between that and a container? | RE02 | QF |
| EF02 | Have you used it in production? | RE03 | AF |
| EF03 | Can you give me an example? | RE04 | QF |
| EF04 | What happens when it fails? | RE07 | QF |
| EF05 | How would you detect it? | RE11 | QF |
| EF06 | What's the downside? | RE16 | QF |
| EF07 | Which one do you use day to day, and why? | RE17 | AF |

With RH01 (after RE01) and RH02 (after RE14), 9 of the 20 easy parents now carry a follow-up.

## 4. The 20 MEDIUM/HARD

Classes: H standalone, QF / AF as in §2, T = near-easy trap (short, looks easy). Source ids are interview60 (W/M/H/L),
scenario50 (S…) or L38M (SP\l38m\items.json); texts are quoted because none is holdout.

| id | question | class | source / why hard |
|---|---|---|---|
| RH01 | Can you give me an example of each? | QF, T | after RE01; "each" refers back |
| RH02 | Why that one? | AF, T | after RE14; depends on the candidate's pick |
| RH03 | How would you detect data drift in a model that is already running in production? | H, T | interview60 M01; 12 words, a procedure |
| RH04 | What is a DAG, and why does Airflow use that structure? | H, T | interview60 W05; "and why" |
| RH05 | Distinguish the three probe types: explain startup, readiness, and liveness probes for a model server that needs 90 seconds to load its model. | H | scenario50 S4Q01; a list + a situation (RE07 is the easy twin) |
| RH06 | Should temporary unavailability of an upstream database fail the liveness probe? Defend your decision. | QF | S4Q01F |
| RH07 | What does async actually buy you? Explain what happens when an async FastAPI endpoint calls a blocking HTTP client, or performs expensive CPU work. | H | scenario50 S3Q01 |
| RH08 | When would you use asynchronous I/O, a thread pool, separate processes, or an external worker? | QF | S3Q01F; four-way comparison |
| RH09 | (interview60 L01, verbatim: the nightly-retrained recommender, 5,000 rps; training pipeline, validation, rollout) | H | long design, the L20c loss shape |
| RH10 | And in that design, what happens when the nightly training job finishes late? | AF | L01F1; "that design" = the candidate's |
| RH11 | How would you notice that the new model is worse only for one segment of users? | QF | L01F2 |
| RH12 | Design a Python AI gateway that fronts three LLM providers, with failover, per-tenant rate limits and cost tracking. | H | L38M H05 |
| RH13 | What's the time complexity of your rate limiter? | AF, T | L38M H05F; Live answered "O(1)." twice (L38F, L38M) |
| RH14 | And how would you monitor it? | AF, T | new, after RH12/RH13; "it" = the candidate's gateway |
| RH15 | Tell me about a model you shipped that hurt a business metric, and what you changed afterwards. | H | L38M H20; experience |
| RH16 | Was that the right call, in hindsight? | AF, T | L38M H20F; L38F's invented "Absolutely…" shape |
| RH17 | Your model accuracy dropped fifteen percent overnight, but the input schema is unchanged. How do you debug that? | H | interview60 H01; debugging scenario |
| RH18 | Your training image is eight gigabytes. How would you approach shrinking it? | H, T | interview60 M08; short, a situation |
| RH19 | Real-time, serverless or batch transform for a model called two thousand times a day with a two-second SLA? | H, T | new; RE09's choice WITH a situation |
| RH20 | Which cloud have you worked with most, and what did you build on it? | H, T | new; the candidate's experience, 13 words |

Counts over all 47 turns: EASY 20; HARD 27 = standalone H 11 + follow-ups 16 (AF 7: RH02, RH10, RH13, RH14, RH16,
EF02, EF07; QF 9: RH01, RH06, RH08, RH11, EF01, EF03, EF04, EF05, EF06); easy-parent follow-ups 9 (EF01–07, RH01,
RH02); traps 10. Reused: interview60 11 (W02, W07, W08, M09 in the easy set; M01, W05, L01, L01F1, L01F2, H01, M08),
scenario50 4, L38M 4; new 28. Existing clips (MAIN's tts-local folders, L38M's clips) carry the same voice and can be reused; the
rest render into SP\router40\clips (never the golden folders).

## 5. Chain order (one session per chain; follow-ups ~10 s after the parent's answer window, 60 s for hard parents, 20 s for easy ones)

C01 RE01→RH01 · C02 RE02→EF01 · C03 RH03 · C04 RE03→EF02 · C05 RE08 · C06 RE04→EF03 · C07 RE05 · C08 RH04 ·
C09 RE06 · C10 RH07→RH08 · C11 RE07→EF04 · C12 RH05→RH06 · C13 RH09→RH10→RH11 · C14 RE09 · C15 RH19 · C16 RE10 ·
C17 RE11→EF05 · C18 RH12→RH13→RH14 · C19 RE12 · C20 RE13 · C21 RH17 · C22 RE14→RH02 · C23 RE15 · C24 RH15→RH16 ·
C25 RE16→EF06 · C26 RE17→EF07 · C27 RH18 · C28 RE18 · C29 RH20 · C30 RE19 · C31 RE20.
31 chains, 47 turns, easy and hard interleaved; every EF follows its easy parent in the same session; the twins sit
together (RH19 right after RE09, RH05 right after RE07's chain) so each pair is heard in the same minutes. A continuous-session variant plays the same order (L38M: continuous routed easy
better, 20/20 vs 14/20; the router has its own session now, so the ear cost does not apply).

## 6. Fixing the labels before any call

1. The user approved the 40 and the §1 boundary decisions at ~18:35 and the seven EF items at 18:48 (recorded above).
2. Two Opus agents (`claude-opus-5-5`, read from each transcript), blind to each other, classify all 47 turns from
   `turns-for-classifiers.json` (chain order, neutral ids T01–T47, spoken text, the parent's text shown for a
   follow-up as the router hears it; no classes, no source; the T→item key is in `keyhold/key.json`) with the
   dispatch text `classifier-dispatch.txt` (§1–2 verbatim): route EASY / HARD plus a ≤ 12-word reason, as SP\l38base
   did. Agreement is reported per class (EASY, H, QF, AF, with the easy-parent follow-ups as their own row); both
   verdict files are saved verbatim.
3. Disagreements, and any item where both graders disagree with the draft label, go to the user; the user's call is
   final. Labels then freeze in `items.json` (id, text, class, parent, source, expected terms for the easy 20) before
   the first clip is sent.
4. Calibration of the definition (rule 8), zero cost: the same prompt on L38R's 22 known items (expected: the 12
   simple EASY, the 10 hard HARD) and on interview60's 76 spoken items, which also gives the new class's base rate on
   a roster (my reading: about 8 of 76, against 1 of 176 under L38R's definition; scenario50 still 0 of 100).
5. **Difficulty grade** (the user, 18:48). In the same pass, each classifier gives every turn a second, independent
   3-way grade. Descriptive only: it decides nothing in the router test (the route label alone does); it trains and
   tests an offline separator for roadmap step 4, routing hard questions to a stronger model. A follow-up is graded
   on its own text with its parent in view.
   - **EASY** = the approved router definition (§1): one named concept, standalone, general knowledge in 30–60
     words. Anchors: RE02 "What is a Docker image?", RE12 precision vs recall.
   - **MEDIUM** = needs more than one concept, but a strong small model (3.5-lite HIGH) handles it: a one-part design
     or how-to with a standard answer, a routine trade-off, a procedure with few branches. Anchors: RH03 "How would
     you detect data drift in a model already in production?", RH18 the eight-gigabyte image.
   - **HARD** = a small model likely leaves a part out or errs: multi-part designs, quantitative reasoning, subtle
     trade-offs or edge cases, anything the answer must reconcile across several constraints. Anchors: RH09 (L01,
     the nightly-retrained recommender: pipeline, validation and rollout in one answer), RH05 (three probe types
     for a server with a 90 s load).
   Reported: the 3×3 agreement table, disagreements with both reasons, and the grade distribution per route class.
   Not resolved by the user unless asked (descriptive); a consensus grade is the two agreeing, else "split".

## 7. The separation technique to test

Two separators, scored on the same 40 against the frozen labels:
- **A. Live decides, in its OWN session** (never the ear's prompt: L38M cost the ear 15 captures). L38R's routing
  block rewritten for §1: "If the interviewer names ONE concept and asks what it is, what it does, or how it differs
  from one other concept, with no reference to earlier questions, the candidate, or a situation, answer it in at most
  80 words. Otherwise say the single word hard. Anything with that / this / it / your / earlier / why that / tell me
  about → hard." Output gate: a line over 80 words, with markup, or in another language is dropped (L38R's two long
  misroutes, L38M's garbled lines). Two reps; first word p50/p90; easy answers graded by two Opus agents blind beside
  the pipeline's.
- **B. An offline rule separator on the transcript text**, zero cost, deterministic: HARD on any back-reference token
  (that / this / it / your / you / earlier / the one), experience cue (tell me about, have you, your project), multi-part
  cue (", and why", ", and how", "walk me through", design / explain / compare / approach / handle / debug / shrink /
  monitor, three or more listed items), a situation (a digit, "your … is"), or more than 20 words; EASY otherwise.
  Calibrated first (rule 8) on L38R's 22 and the user's three; the known weak spots are the §1 exceptions ("how do
  you" + one action, "why X"), which is what the comparison is for. It runs on the ear's transcript, so it needs no
  second Live session and no quota; it could later gate A's output.
- **Which error matters:** a HARD question kept by Live (false EASY) is the one that costs: an invented or partial
  line on screen (an AF answered is the worst case). A false HARD costs nothing today. So the primary reading is
  false-EASY on the 27 hard turns (AF, and the easy-parent follow-ups where Live has just spoken, each reported
  separately), the secondary is EASY caught (the benefit), then correctness of the easy answers and first-word
  latency; QF misroutes are listed apart (§2). The pipeline runs on all 47 regardless and supersedes in place; the
  composed "A + pipeline" line is reported beside the pipeline alone, as L38M did.

Not covered by this draft: the pre-registration (bars, reps, quota day), clips, the in-app path, cost, real
interviewers, typed questions, holdout40.
