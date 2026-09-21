# holdout40 — source question set

The set exactly as written, before it is rendered for speech. This file is the source of
truth for wording; `holdout40.questions.mjs` is the harness rendering of the same questions.

Design: `docs/superpowers/specs/2026-09-21-holdout-roster-design.md` (v5). Seven areas, 33
mains + 12 follow-ups = 45 spoken items. Median question ~15 words; seven mains ask two things on
purpose and three more carry an "and why" rider. AWS and Databricks are named; Azure is not. **This roster is never tuned
on** — every change is developed on scenario50 and validated here once.

> **Slots.** The three résumé-reconciliation items (R31–R33) carry `{{SLOT}}` markers. The
> candidate fills them from their own CV before audio is built — metrics only, never a name,
> employer, account or client. `roster.test.ts` refuses the roster while any `{{` survives.
> The figures must not be the ones scenario50 already uses (churn rate, risk-band capture,
> precision, PR-AUC/ROC-AUC, the RAG F1 / hallucination / multi-hop set).

> **Shapes from the final check (2026-09-21).** One redirect inside a single turn (R10), one
> false premise (R08), three short questions — R15 at five words, R18 at four (exactly the STT
> detector's floor, from the passing side) and R05 at three (below it: the STT detector drops
> it, and whether Live carries it is what the baseline measures), one depth-two follow-up chain (R22 → R22F → R22F2), one long-form design (R13), a
> false-intro distractor (R11), a restatement (R16), and fillers (R21, R26).

---

## Area 1 — Algorithms & data structures, spoken

**R01. [Verbal · Short]** What would you reach for to get constant-time lookups with insertion order preserved, and why?

**R02. [Coding · Spoken]** Okay, a quick one out loud: how would you implement an LRU cache? Just talk me through the structure.
*Follow-up R02F:* What changes if it has to be safe across multiple threads?

**R03. [Reasoning]** You've got a stream of a billion events and you need the top hundred most frequent keys — how would you do that in bounded memory?

**R04. [Coding · Spoken]** Write me a function that finds the first duplicate in an array — say it in words. What does it do for an empty input?
*Follow-up R04F:* And if the array is already sorted, what changes?

**R05. [Verbal · Short — three words, below the STT floor]** Redis or Memcached?

## Area 2 — Backend & systems

**R06. [Verbal]** How do you make a payment endpoint idempotent?

**R07. [Reasoning]** Two workers pick up the same job from a queue — how do you stop that happening?
*Follow-up R07F:* And if the worker that claimed it crashes halfway?

**R08. [Reasoning · false premise]** Since Kafka guarantees exactly-once delivery out of the box, how do you lean on that in a consumer?

**R09. [SQL · Spoken]** Give me the SQL for the second-highest salary in each department — say it out loud.
*Follow-up R09F:* Now without a subquery — can you do it with a window function?

**R10. [Reasoning · redirect]** How would you shard a Postgres table by tenant — actually, scrap that — how would you choose between sharding and read replicas in the first place?

## Area 3 — System design, short

**R11. [Design · false-intro distractor]** Say the API sees ten thousand requests a second at peak. Walk me through your background assumptions before you size a rate limiter.
*Follow-up R11F:* How does it behave when there are ten instances of the service?

**R12. [Design]** Design notification fan-out for a million followers — where does it get expensive?

**R13. [Design · long-form]** Take a few minutes on this one: design a feature store end to end — ingestion, storage, serving, and how training and serving stay consistent.
*Follow-up R13F:* What do you do when an upstream table lands late?

**R14. [Design]** How would you serve a model behind an endpoint that has to answer in under fifty milliseconds?

## Area 4 — Classical ML & statistics

**R15. [Verbal · Short — five words]** Bias versus variance, one breath.

**R16. [Reasoning · restatement]** Your fraud model trains on data that's — sorry, let me put that differently — the positives are one percent of rows. What do you change, and what do you leave alone?

**R17. [Reasoning]** How does target leakage sneak into a feature pipeline?
*Follow-up R17F:* Give me one leak that a time-based split wouldn't catch.

**R18. [Verbal · Short — four words, on the STT floor]** When is PR-AUC better?

**R19. [Reasoning]** A model says seventy percent — what does it take for that number to actually mean seventy percent?

## Area 5 — Deep learning & LLMs

**R20. [Verbal]** Attention, in one breath — what is it actually computing?

**R21. [Reasoning · filler]** So, like, fine-tune or retrieval — how do you decide for a support bot?

**R22. [Reasoning]** How do you cut hallucinations in a RAG answer without just making it refuse?
*Follow-up R22F:* And how do you measure that you did?
*Follow-up R22F2 (depth two):* What breaks in that measurement when the questions drift?

**R23. [Reasoning · estimation]** Roughly how much memory for ten million embeddings at seven hundred sixty-eight dimensions in float32 — and what would you do about it?

**R24. [Reasoning]** How would you evaluate an LLM feature before launch when there's no ground truth?

## Area 6 — MLOps, data engineering & cloud platforms

**R25. [Cloud]** How do you monitor drift on a SageMaker endpoint?

**R26. [Reasoning · filler]** Um, so — how would you backfill a Delta Lake feature table on Databricks Jobs for the last two years without stalling the daily run?
*Follow-up R26F:* How do you know the backfill matched what the daily job would have produced?

**R27. [Cloud]** Shadow deployment or canary for a new model version on SageMaker — which, and why?

**R28. [Reasoning]** What does MLflow's model registry give you that a versioned S3 path doesn't?
*Follow-up R28F:* Where does reproducibility still break?

**R29. [Cloud]** What would you use Unity Catalog for that you couldn't do with plain workspace permissions?

**R30. [Reasoning]** Bedrock or self-hosted — how do you think about inference cost and latency for a nightly batch summarisation job?

## Area 7 — Résumé reconciliation (slots to fill)

**R31. [Reasoning · Reconciliation — metric consistency]** Your CV says you moved {{METRIC_NAME}} from {{BEFORE}} to {{AFTER}} on roughly {{N}} {{UNIT}} — if that's right, about how many {{UNIT}} does the difference come to, and does it sit with the {{OTHER_CLAIM}} figure you also list?
*Follow-up R31F:* What else would you need to know before calling that improvement real?

> Slots: `METRIC_NAME` a rate or score (e.g. "conversion rate"); `BEFORE`/`AFTER` its two
> values; `N` a population size; `UNIT` what it counts (users, requests, documents);
> `OTHER_CLAIM` a second figure on the CV the first one should agree with.

**R32. [Reasoning · Reconciliation — claim provenance]** You report a {{PCT}} percent improvement in {{WHAT}} — improvement over what baseline, measured how, on what sample, and would you call it significant?

> Slots: `PCT` the percentage on the CV; `WHAT` the thing improved (latency, cost, accuracy).

**R33. [Reasoning · Reconciliation — claim consistency]** The same project lists both {{TECH_P}} and {{TECH_Q}} — which did you actually own, and how did they fit together?

> Slots: `TECH_P`/`TECH_Q` two technologies or roles listed on one project that an interviewer
> would want reconciled (e.g. a batch framework and a streaming one; "led" and "supported").
