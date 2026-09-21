/**
 * holdout40 — the technical-breadth roster that is NEVER tuned on. Verbatim source and the
 * reasoning behind every item: `holdout40.source.md`; design: the 2026-09-21 holdout spec.
 *
 * Same shape as `scenario50.questions.mjs`, so the harness reads it unchanged (`roster.mjs`
 * picks which one). What is deliberately different from scenario50:
 *
 *   - short and mostly single-part: a median of ~15 words against scenario50's 56, and
 *     7 of 33 mains asking two things against scenario50's 39 of 40 — the "omitted
 *     sub-part" defect scenario50 manufactures is a minority shape here, as in a real screen
 *   - seven areas across software and AI/ML, with AWS (SageMaker, Bedrock, S3) and
 *     Databricks (Delta Lake, MLflow, Unity Catalog, Jobs) named and Azure absent — the
 *     résumé the app holds is Azure-heavy, so every provider question here measures priming
 *   - shapes no roster has exercised: a redirect inside one turn (R10), a false premise (R08),
 *     questions at and below the STT detector's word floor (R18, R05), a follow-up chained two
 *     deep (R22F2), a long-form design (R13), a false-intro distractor (R11), a restatement
 *     (R16), fillers (R21, R26), an estimation (R23)
 *   - three résumé-reconciliation items (R31–R33) whose figures are the candidate's own, in
 *     {{SLOT}} markers filled by hand — metrics only, never a name, employer, account or
 *     client. `roster.mjs` refuses the roster while any marker survives.
 *
 * `q` is what the voice SAYS. Transforms from the written form, as scenario50's: class labels
 * move to `level`; hyphenated constructs SAPI mangles are unhyphenated ("PR-AUC" -> "PR AUC",
 * "fan-out" -> "fan out", "float32" -> "float 32"); em dashes become commas or colons; numerals
 * stay numerals ("10,000 requests", "70 percent") except where the written form spelt them.
 *
 * `long` is DERIVED from LONG_WORDS, never hand-written (scenario50's lesson: 54 of 100
 * hand-kept flags were wrong). `R` ids cannot collide with interview60's W/M/C/H/L or
 * scenario50's SnQnn, and the roster renders into its own TTS directory besides.
 */
import { GAP, LONG_WORDS, wordsOf } from './scenario50.questions.mjs';

export const AREAS = {
    A1: 'Algorithms & data structures, spoken',
    A2: 'Backend & systems',
    A3: 'System design, short',
    A4: 'Classical ML & statistics',
    A5: 'Deep learning & LLMs',
    A6: 'MLOps, data engineering & cloud platforms',
    A7: 'Résumé reconciliation',
};

/** @type {{id:string,level:string,scenario:string,topic:string,q:string,gapMs:number,chain?:string}[]} */
const RAW = [
    // ── Area 1 — Algorithms & data structures, spoken ──────────────────────────
    {
        id: 'R01', level: 'verbal', scenario: 'A1', topic: AREAS.A1, gapMs: GAP.verbal,
        q: "What would you reach for to get constant time lookups with insertion order preserved, and why?",
    },
    {
        id: 'R02', level: 'coding', scenario: 'A1', topic: AREAS.A1, gapMs: GAP.coding,
        q: "Okay, a quick one out loud: how would you implement an LRU cache? Just talk me through the structure.",
    },
    {
        id: 'R02F', level: 'followup', chain: 'R02', scenario: 'A1', topic: AREAS.A1, gapMs: GAP.followup,
        q: "What changes if it has to be safe across multiple threads?",
    },
    {
        id: 'R03', level: 'reasoning', scenario: 'A1', topic: AREAS.A1, gapMs: GAP.reasoning,
        q: "You've got a stream of a billion events and you need the top hundred most frequent keys. How would you do that in bounded memory?",
    },
    {
        id: 'R04', level: 'coding', scenario: 'A1', topic: AREAS.A1, gapMs: GAP.coding,
        q: "Write me a function that finds the first duplicate in an array, say it in words. What does it do for an empty input?",
    },
    {
        id: 'R04F', level: 'followup', chain: 'R04', scenario: 'A1', topic: AREAS.A1, gapMs: GAP.followup,
        q: "And if the array is already sorted, what changes?",
    },
    {
        // Three words: below the STT detector's floor (interviewerTurn <4, questionShape <4).
        // Whether the Live ear carries it is what the baseline measures.
        id: 'R05', level: 'verbal', scenario: 'A1', topic: AREAS.A1, gapMs: GAP.verbal,
        q: "Redis or Memcached?",
    },

    // ── Area 2 — Backend & systems ────────────────────────────────────────────
    {
        id: 'R06', level: 'verbal', scenario: 'A2', topic: AREAS.A2, gapMs: GAP.verbal,
        q: "How do you make a payment endpoint idempotent?",
    },
    {
        id: 'R07', level: 'reasoning', scenario: 'A2', topic: AREAS.A2, gapMs: GAP.reasoning,
        q: "Two workers pick up the same job from a queue. How do you stop that happening?",
    },
    {
        id: 'R07F', level: 'followup', chain: 'R07', scenario: 'A2', topic: AREAS.A2, gapMs: GAP.followup,
        q: "And if the worker that claimed it crashes halfway?",
    },
    {
        // False premise. The answer has to correct it, not build on it.
        id: 'R08', level: 'reasoning', scenario: 'A2', topic: AREAS.A2, gapMs: GAP.reasoning,
        q: "Since Kafka guarantees exactly once delivery out of the box, how do you lean on that in a consumer?",
    },
    {
        id: 'R09', level: 'sql', scenario: 'A2', topic: AREAS.A2, gapMs: GAP.sql,
        q: "Give me the SQL for the second highest salary in each department. Say it out loud.",
    },
    {
        id: 'R09F', level: 'followup', chain: 'R09', scenario: 'A2', topic: AREAS.A2, gapMs: GAP.followup,
        q: "Now without a subquery. Can you do it with a window function?",
    },
    {
        // A redirect inside one turn: only the second ask is the question.
        id: 'R10', level: 'reasoning', scenario: 'A2', topic: AREAS.A2, gapMs: GAP.reasoning,
        q: "How would you shard a Postgres table by tenant, actually, scrap that, how would you choose between sharding and read replicas in the first place?",
    },

    // ── Area 3 — System design, short ─────────────────────────────────────────
    {
        // False-intro distractor: "walk me through your background" is an intro pattern, and
        // the 11-word scenario sentence before it is what keeps the intro path from firing —
        // if the whole turn reaches the assembler. A lone second sentence would fire it.
        id: 'R11', level: 'design', scenario: 'A3', topic: AREAS.A3, gapMs: GAP.design,
        q: "Say the API sees 10,000 requests a second at peak. Walk me through your background assumptions before you size a rate limiter.",
    },
    {
        id: 'R11F', level: 'followup', chain: 'R11', scenario: 'A3', topic: AREAS.A3, gapMs: GAP.followup,
        q: "How does it behave when there are ten instances of the service?",
    },
    {
        id: 'R12', level: 'design', scenario: 'A3', topic: AREAS.A3, gapMs: GAP.design,
        q: "Design notification fan out for a million followers. Where does it get expensive?",
    },
    {
        // Long-form by invitation: the one answer that should not be short.
        id: 'R13', level: 'design', scenario: 'A3', topic: AREAS.A3, gapMs: GAP.design,
        q: "Take a few minutes on this one: design a feature store end to end, ingestion, storage, serving, and how training and serving stay consistent.",
    },
    {
        id: 'R13F', level: 'followup', chain: 'R13', scenario: 'A3', topic: AREAS.A3, gapMs: GAP.followup,
        q: "What do you do when an upstream table lands late?",
    },
    {
        id: 'R14', level: 'design', scenario: 'A3', topic: AREAS.A3, gapMs: GAP.design,
        q: "How would you serve a model behind an endpoint that has to answer in under 50 milliseconds?",
    },

    // ── Area 4 — Classical ML & statistics ────────────────────────────────────
    {
        id: 'R15', level: 'verbal', scenario: 'A4', topic: AREAS.A4, gapMs: GAP.verbal,
        q: "Bias versus variance, one breath.",
    },
    {
        // A restatement mid-question.
        id: 'R16', level: 'reasoning', scenario: 'A4', topic: AREAS.A4, gapMs: GAP.reasoning,
        q: "Your fraud model trains on data that's, sorry, let me put that differently: the positives are 1 percent of rows. What do you change, and what do you leave alone?",
    },
    {
        id: 'R17', level: 'reasoning', scenario: 'A4', topic: AREAS.A4, gapMs: GAP.reasoning,
        q: "How does target leakage sneak into a feature pipeline?",
    },
    {
        id: 'R17F', level: 'followup', chain: 'R17', scenario: 'A4', topic: AREAS.A4, gapMs: GAP.followup,
        q: "Give me one leak that a time based split wouldn't catch.",
    },
    {
        // Four words as written, five if the transcript splits "PR AUC": on or one above the
        // STT detector's floor, from the passing side.
        id: 'R18', level: 'verbal', scenario: 'A4', topic: AREAS.A4, gapMs: GAP.verbal,
        q: "When is PR AUC better?",
    },
    {
        id: 'R19', level: 'reasoning', scenario: 'A4', topic: AREAS.A4, gapMs: GAP.reasoning,
        q: "A model says 70 percent. What does it take for that number to actually mean 70 percent?",
    },

    // ── Area 5 — Deep learning & LLMs ─────────────────────────────────────────
    {
        id: 'R20', level: 'verbal', scenario: 'A5', topic: AREAS.A5, gapMs: GAP.verbal,
        q: "Attention, in one breath: what is it actually computing?",
    },
    {
        id: 'R21', level: 'reasoning', scenario: 'A5', topic: AREAS.A5, gapMs: GAP.reasoning,
        q: "So, like, fine tune or retrieval, how do you decide for a support bot?",
    },
    {
        id: 'R22', level: 'reasoning', scenario: 'A5', topic: AREAS.A5, gapMs: GAP.reasoning,
        q: "How do you cut hallucinations in a RAG answer without just making it refuse?",
    },
    {
        id: 'R22F', level: 'followup', chain: 'R22', scenario: 'A5', topic: AREAS.A5, gapMs: GAP.followup,
        q: "And how do you measure that you did?",
    },
    {
        // The one follow-up chained two deep. judge.mjs brackets it with R22F's text only.
        id: 'R22F2', level: 'followup', chain: 'R22F', scenario: 'A5', topic: AREAS.A5, gapMs: GAP.followup,
        q: "What breaks in that measurement when the questions drift?",
    },
    {
        id: 'R23', level: 'reasoning', scenario: 'A5', topic: AREAS.A5, gapMs: GAP.reasoning,
        q: "Roughly how much memory for 10 million embeddings at 768 dimensions in float 32, and what would you do about it?",
    },
    {
        id: 'R24', level: 'reasoning', scenario: 'A5', topic: AREAS.A5, gapMs: GAP.reasoning,
        q: "How would you evaluate an LLM feature before launch when there's no ground truth?",
    },

    // ── Area 6 — MLOps, data engineering & cloud platforms ────────────────────
    {
        id: 'R25', level: 'cloud', scenario: 'A6', topic: AREAS.A6, gapMs: GAP.cloud,
        q: "How do you monitor drift on a SageMaker endpoint?",
    },
    {
        id: 'R26', level: 'reasoning', scenario: 'A6', topic: AREAS.A6, gapMs: GAP.reasoning,
        q: "Um, so, how would you backfill a Delta Lake feature table on Databricks Jobs for the last two years without stalling the daily run?",
    },
    {
        id: 'R26F', level: 'followup', chain: 'R26', scenario: 'A6', topic: AREAS.A6, gapMs: GAP.followup,
        q: "How do you know the backfill matched what the daily job would have produced?",
    },
    {
        id: 'R27', level: 'cloud', scenario: 'A6', topic: AREAS.A6, gapMs: GAP.cloud,
        q: "Shadow deployment or canary for a new model version on SageMaker: which, and why?",
    },
    {
        id: 'R28', level: 'reasoning', scenario: 'A6', topic: AREAS.A6, gapMs: GAP.reasoning,
        q: "What does MLflow's model registry give you that a versioned S3 path doesn't?",
    },
    {
        id: 'R28F', level: 'followup', chain: 'R28', scenario: 'A6', topic: AREAS.A6, gapMs: GAP.followup,
        q: "Where does reproducibility still break?",
    },
    {
        id: 'R29', level: 'cloud', scenario: 'A6', topic: AREAS.A6, gapMs: GAP.cloud,
        q: "What would you use Unity Catalog for that you couldn't do with plain workspace permissions?",
    },
    {
        id: 'R30', level: 'reasoning', scenario: 'A6', topic: AREAS.A6, gapMs: GAP.reasoning,
        q: "Bedrock or self hosted: how do you think about inference cost and latency for a nightly batch summarisation job?",
    },

    // ── Area 7 — Résumé reconciliation ────────────────────────────────────────
    // FILL THE {{SLOTS}} FROM YOUR OWN CV, HERE, before building audio. Metrics only — no name,
    // employer, account or client — and not the figures scenario50 already uses (churn rate,
    // risk-band capture, precision, PR-AUC/ROC-AUC, the RAG F1 / hallucination / multi-hop set).
    // `holdout40.source.md` keeps the unfilled template. roster.mjs refuses the roster while any
    // marker survives, and the audio builder re-renders a clip whose text changed.
    {
        // METRIC_NAME a rate or score; BEFORE / AFTER its two values; N a population size;
        // UNIT what it counts (users, requests, documents); OTHER_CLAIM a second CV figure the
        // first should agree with.
        id: 'R31', level: 'reasoning', scenario: 'A7', topic: AREAS.A7, gapMs: GAP.reasoning,
        q: "Your CV says you moved {{METRIC_NAME}} from {{BEFORE}} to {{AFTER}} on roughly {{N}} {{UNIT}}. If that's right, about how many {{UNIT}} does the difference come to, and does it sit with the {{OTHER_CLAIM}} figure you also list?",
    },
    {
        id: 'R31F', level: 'followup', chain: 'R31', scenario: 'A7', topic: AREAS.A7, gapMs: GAP.followup,
        q: "What else would you need to know before calling that improvement real?",
    },
    {
        // PCT the percentage on the CV; WHAT the thing improved (latency, cost, accuracy).
        id: 'R32', level: 'reasoning', scenario: 'A7', topic: AREAS.A7, gapMs: GAP.reasoning,
        q: "You report a {{PCT}} percent improvement in {{WHAT}}. Improvement over what baseline, measured how, on what sample, and would you call it significant?",
    },
    {
        // TECH_P / TECH_Q two technologies or roles listed on one project that an interviewer
        // would want reconciled (a batch framework and a streaming one; "led" and "supported").
        id: 'R33', level: 'reasoning', scenario: 'A7', topic: AREAS.A7, gapMs: GAP.reasoning,
        q: "The same project lists both {{TECH_P}} and {{TECH_Q}}. Which did you actually own, and how did they fit together?",
    },
];

export const HOLDOUT40 = RAW.map((x) => ({ ...x, long: wordsOf(x.q) >= LONG_WORDS }));

/** Spoken items only, matching the other rosters' export. Nothing here is a screenshot cue. */
export const SPOKEN = HOLDOUT40.filter((x) => x.kind !== 'screenshot');

export const PLAN = {
    total: HOLDOUT40.length,
    spoken: SPOKEN.length,
    screenshots: 0,
    byLevel: HOLDOUT40.reduce((a, x) => ({ ...a, [x.level]: (a[x.level] || 0) + 1 }), {}),
    byArea: HOLDOUT40.reduce((a, x) => ({ ...a, [x.scenario]: (a[x.scenario] || 0) + 1 }), {}),
};
