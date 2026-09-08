/**
 * Scenario 50 — a five-scenario screen for an AI/ML platform role, as one ordered
 * question bank. Verbatim source: `scenario50.source.md`.
 *
 * Same shape as `interview60.questions.mjs`, so the harness reads it unchanged
 * (`roster.mjs` picks which one). Two things are deliberately different:
 *
 *   1. The questions are far longer. Measured: this set's main questions run a
 *      median of 40 words and 26 of 50 reach 40 or more; interview60's spoken
 *      items run a median of 14 and only 6 of 76 reach 40. Past ~40 words
 *      Deepgram closes the question as several finals and the reconciler has to
 *      corroborate against the joined window — the case interview60 could only
 *      exercise 6 times, and this set exercises 26.
 *   2. Every question has exactly one follow-up (`chain`), so the extend path
 *      is exercised 50 times rather than 18.
 *
 * WHAT THE RENDERING CHANGES, and why. `q` is what the voice SAYS; the written
 * form is in scenario50.source.md. Three transforms:
 *
 *   - Bracketed class labels ([Coding · Medium]) move to `level` — an
 *     interviewer does not read them aloud.
 *   - Code identifiers are spoken, not spelled: `evaluate_top_k(y_true, scores, k)`
 *     becomes "evaluate top k, taking true labels, scores and k". SAPI reads an
 *     underscore aloud, and an hour of "evaluate underscore top underscore k"
 *     would measure the TTS, not the pipeline.
 *   - Numerals stay numerals (SAPI speaks them correctly) except where a
 *     hyphenated construct would be mangled: "top-5%" -> "the top 5 percent".
 *
 * `long` is DERIVED, never hand-written: a question is long when it reaches
 * LONG_WORDS words. It was hand-written first, and the check found 54 of the 100
 * flags wrong — a flag maintained by hand beside 100 questions will be wrong again.
 * `interview60` encodes the same fact as `level: 'long'`; this set cannot, because
 * `level` carries the question's class.
 *
 * IDS NEVER COLLIDE WITH interview60. The local TTS builder caches clips by id
 * and returns early when the file exists, so a shared id would silently speak
 * the OTHER roster's question for a whole hour. S1Q01-style ids cannot collide
 * with W/M/C/H/L, and this roster renders into its own TTS directory besides.
 */

export const SCENARIOS = {
    S1: 'Churn prediction',
    S2: 'Document intelligence / RAG',
    S3: 'Python AI gateway',
    S4: 'Inference on Kubernetes',
    S5: 'Retail AI product',
};

export const TOPICS = Object.values(SCENARIOS);

/**
 * Silence AFTER each question, by class. Derived from interview60's measured
 * gaps: its `easy` items got 45-50s, `long` design 95s, screenshot coding 150s.
 * Every question here is at least as demanding as an interview60 `medium`, so
 * nothing is below 60s.
 */
export const GAP = {
    verbal: 60_000,      // a short definition, but still two sentences
    reasoning: 75_000,   // requires an argument, not a recall
    coding: 150_000,     // spoken coding: state the signature, then the body
    codingHeavy: 180_000,
    sql: 150_000,
    design: 150_000,
    cloud: 90_000,
    cloudHeavy: 120_000,
    followup: 60_000,
};

/** Words in a question, counted the way the pipeline counts them. */
export const wordsOf = (q) => (q.match(/[A-Za-z0-9']+/g) ?? []).length;

/** At or above this many words, Deepgram closes the question as several finals. */
export const LONG_WORDS = 40;

/** @type {{id:string,level:string,topic:string,q:string,gapMs:number,chain?:string,scenario:string}[]} */
const RAW = [
    // ── Scenario 1 — Defend and extend your churn prediction system ───────────
    {
        id: 'S1Q01', level: 'verbal', scenario: 'S1', topic: SCENARIOS.S1, gapMs: GAP.verbal,
        q: "Why did you choose XGBoost? Using your churn project, explain why XGBoost was suitable for the data and the production constraints, and what baseline you would compare it against.",
    },
    {
        id: 'S1Q01F', level: 'followup', chain: 'S1Q01', scenario: 'S1', topic: SCENARIOS.S1, gapMs: GAP.followup,
        q: "Under what conditions would you prefer logistic regression, a neural network, or a rules-based approach?",
    },
    {
        id: 'S1Q02', level: 'reasoning', scenario: 'S1', topic: SCENARIOS.S1, gapMs: GAP.reasoning,
        q: "Can you reconcile the metrics on your CV? Your CV reports a 9.5 percent churn rate, a top 5 percent risk band capturing 30 percent of churners, and 60 percent precision. Assuming the same population and observation period, use 100,000 subscribers to estimate true positives, precision, and recall. Are those figures consistent within rounding?",
    },
    {
        id: 'S1Q02F', level: 'followup', chain: 'S1Q02', scenario: 'S1', topic: SCENARIOS.S1, gapMs: GAP.followup,
        q: "What can you conclude from a PR AUC of 0.38 and an ROC AUC of 0.88, and what else would you need before deciding the model is useful?",
    },
    {
        id: 'S1Q03', level: 'reasoning', scenario: 'S1', topic: SCENARIOS.S1, gapMs: GAP.reasoning,
        q: "Did the model actually reduce churn? Your CV reports churn decreasing from 9.5 percent to 8.1 percent. How would you distinguish the effect of the model and the retention campaign from seasonality, customer mix, and other business changes?",
    },
    {
        id: 'S1Q03F', level: 'followup', chain: 'S1Q03', scenario: 'S1', topic: SCENARIOS.S1, gapMs: GAP.followup,
        q: "Why might targeting the highest-risk customers be less profitable than targeting the customers with the largest estimated treatment effect?",
    },
    {
        id: 'S1Q04', level: 'coding', scenario: 'S1', topic: SCENARIOS.S1, gapMs: GAP.coding,
        q: "Let's do some code: implement evaluation for a fixed campaign budget. Write a function called evaluate top k, taking true labels, scores, and k, that returns precision at k, recall at k, and lift over the population prevalence. Assume binary labels and finite scores, and break score ties by original row order. Tell me what it does for an invalid k, for empty inputs, and when there are no positive labels.",
    },
    {
        id: 'S1Q04F', level: 'followup', chain: 'S1Q04', scenario: 'S1', topic: SCENARIOS.S1, gapMs: GAP.followup,
        q: "How would you reduce the sorting cost for millions of customers while preserving the tie rule?",
    },
    {
        id: 'S1Q05', level: 'codingHeavy', scenario: 'S1', topic: SCENARIOS.S1, gapMs: GAP.codingHeavy,
        q: "Build a leakage-safe churn training pipeline: you are given customer snapshots containing a customer id, a snapshot date, numeric features, categorical features, and a label, churn in the next 30 days. Write a scikit-learn training and evaluation pipeline. Fit the preprocessing only on the training data, and account for the label observation window when you split chronologically.",
    },
    {
        id: 'S1Q05F', level: 'followup', chain: 'S1Q05', scenario: 'S1', topic: SCENARIOS.S1, gapMs: GAP.followup,
        q: "Customers appear in multiple snapshots. When is that legitimate, and when would you also require a customer-level holdout?",
    },
    {
        id: 'S1Q06', level: 'sql', scenario: 'S1', topic: SCENARIOS.S1, gapMs: GAP.sql,
        q: "Now a SQL one: construct a point-in-time feature. You have a snapshots table with a customer id and a snapshot time, and an events table with a customer id, an event time, an ingested at time, and an event type. Write PostgreSQL that counts support calls in the 30 days before each snapshot, includes only events ingested by the snapshot time, and preserves customers with zero calls.",
    },
    {
        id: 'S1Q06F', level: 'followup', chain: 'S1Q06', scenario: 'S1', topic: SCENARIOS.S1, gapMs: GAP.followup,
        q: "How would you index those tables, and what changes if historical records can be corrected after ingestion?",
    },
    {
        id: 'S1Q07', level: 'design', scenario: 'S1', topic: SCENARIOS.S1, gapMs: GAP.design,
        q: "Design the next version of the churn platform: it has to support nightly scoring for 400,000 customers, and on-demand scoring for customer service agents. Cover ingestion, feature computation, training, model registration, serving, prediction storage, and monitoring, and identify what should be shared between the batch and the online paths.",
    },
    {
        id: 'S1Q07F', level: 'followup', chain: 'S1Q07', scenario: 'S1', topic: SCENARIOS.S1, gapMs: GAP.followup,
        q: "A nightly job fails halfway through. How do you resume it without duplicate campaign actions or mixed model versions?",
    },
    {
        id: 'S1Q08', level: 'design', scenario: 'S1', topic: SCENARIOS.S1, gapMs: GAP.design,
        q: "Now add delayed outcomes and experimentation: extend that design so churn outcomes arrive 30 days later, and retention offers affect the labels you observe. Design the prediction logging, the experiment assignment, the outcome joins, and how you select data for retraining.",
    },
    {
        id: 'S1Q08F', level: 'followup', chain: 'S1Q08', scenario: 'S1', topic: SCENARIOS.S1, gapMs: GAP.followup,
        q: "How could repeatedly training on customers affected by previous campaigns introduce bias?",
    },
    {
        id: 'S1Q09', level: 'cloud', scenario: 'S1', topic: SCENARIOS.S1, gapMs: GAP.cloud,
        q: "Translate your AWS experience into an Azure deployment: describe an Azure implementation of that churn platform, covering object storage, training, model artifacts, container images, online inference, scheduling, identity, and monitoring, and explain the operational reasons for your choices.",
    },
    {
        id: 'S1Q09F', level: 'followup', chain: 'S1Q09', scenario: 'S1', topic: SCENARIOS.S1, gapMs: GAP.followup,
        q: "Which workload would you put on Azure Machine Learning managed endpoints, which on Azure App Service, and which on AKS, and why?",
    },
    {
        id: 'S1Q10', level: 'cloud', scenario: 'S1', topic: SCENARIOS.S1, gapMs: GAP.cloud,
        q: "Secure the churn platform without embedded credentials: how would your inference service access the model artifacts and PostgreSQL using Azure identity and networking controls? Explain the authentication, the authorization, how you handle secrets where that is unavoidable, and how you separate environments.",
    },
    {
        id: 'S1Q10F', level: 'followup', chain: 'S1Q10', scenario: 'S1', topic: SCENARIOS.S1, gapMs: GAP.followup,
        q: "The application receives an authorization error after deployment. How would you distinguish an identity problem from a permissions problem or a network problem?",
    },

    // ── Scenario 2 — Defend and scale your document intelligence platform ─────
    {
        id: 'S2Q01', level: 'verbal', scenario: 'S2', topic: SCENARIOS.S2, gapMs: GAP.verbal,
        q: "Explain your RAG pipeline precisely: walk through ingestion, parsing, chunking, embedding, retrieval, reranking, context assembly, and generation, and map those stages to your document intelligence experience.",
    },
    {
        id: 'S2Q01F', level: 'followup', chain: 'S2Q01', scenario: 'S2', topic: SCENARIOS.S2, gapMs: GAP.followup,
        q: "Which of those stages can cause a correct source document to produce an incorrect answer?",
    },
    {
        id: 'S2Q02', level: 'reasoning', scenario: 'S2', topic: SCENARIOS.S2, gapMs: GAP.reasoning,
        q: "Defend the improvements reported on your CV: you report extraction F1 increasing from 72.4 percent to 95.4 percent, hallucinations decreasing by 84 percent, and multi-hop accuracy reaching 92 percent. For each of those metrics, define the unit of evaluation, the denominator, how the dataset was constructed, and the uncertainty.",
    },
    {
        id: 'S2Q02F', level: 'followup', chain: 'S2Q02', scenario: 'S2', topic: SCENARIOS.S2, gapMs: GAP.followup,
        q: "What ablations would separate the contributions of OCR, classification, retrieval, prompting, and agent orchestration, and how would you check for LLM judge bias?",
    },
    {
        id: 'S2Q03', level: 'reasoning', scenario: 'S2', topic: SCENARIOS.S2, gapMs: GAP.reasoning,
        q: "When does an agent justify its complexity? Consider a question that requires evidence from three documents, and compare a fixed retrieval workflow, query decomposition, and an agent that chooses tools dynamically.",
    },
    {
        id: 'S2Q03F', level: 'followup', chain: 'S2Q03', scenario: 'S2', topic: SCENARIOS.S2, gapMs: GAP.followup,
        q: "What stopping conditions, budgets, and failure policies would prevent loops and unnecessary tool calls?",
    },
    {
        id: 'S2Q04', level: 'coding', scenario: 'S2', topic: SCENARIOS.S2, gapMs: GAP.coding,
        q: "Merge two retrieval result lists: implement reciprocal rank fusion for a keyword list and a vector list. Each list contains unique document ids ordered from best to worst. Use one-based ranks and a configurable positive constant c, with each contribution being one over c plus rank, and return the top k unique ids with deterministic tie-breaking.",
    },
    {
        id: 'S2Q04F', level: 'followup', chain: 'S2Q04', scenario: 'S2', topic: SCENARIOS.S2, gapMs: GAP.followup,
        q: "Why might you use rank fusion instead of adding the raw scores, and how would you add a configurable weight for each retrieval source?",
    },
    {
        id: 'S2Q05', level: 'coding', scenario: 'S2', topic: SCENARIOS.S2, gapMs: GAP.coding,
        q: "Pack retrieved evidence into a context budget: implement a function called select context, taking chunks and a budget. Each chunk has an id, a document id, a relevance score, and a positive token count. Use a greedy relevance-first policy, skip chunks that do not fit, deduplicate chunk ids, and allow at most two chunks per document.",
    },
    {
        id: 'S2Q05F', level: 'followup', chain: 'S2Q05', scenario: 'S2', topic: SCENARIOS.S2, gapMs: GAP.followup,
        q: "Construct an example where that greedy policy gives poor coverage, and tell me how you would incorporate redundancy or multi-hop dependencies.",
    },
    {
        id: 'S2Q06', level: 'codingHeavy', scenario: 'S2', topic: SCENARIOS.S2, gapMs: GAP.codingHeavy,
        q: "Implement an asynchronous evaluation runner: you are given test cases, and an async evaluate function that takes one case. Process them with at most eight active evaluations, apply a per-case timeout, preserve the input order, and record failures without cancelling unrelated cases.",
    },
    {
        id: 'S2Q06F', level: 'followup', chain: 'S2Q06', scenario: 'S2', topic: SCENARIOS.S2, gapMs: GAP.followup,
        q: "Extend it to retry explicitly transient errors within an overall deadline for the case. How would you test the concurrency and the cancellation deterministically?",
    },
    {
        id: 'S2Q07', level: 'design', scenario: 'S2', topic: SCENARIOS.S2, gapMs: GAP.design,
        q: "Design a multi-tenant RAG service over 10 million documents: it has to support document updates and deletions, access-controlled retrieval, citations, asynchronous ingestion, and interactive queries. Explain the index organization, the metadata storage, how permissions are enforced, and how you evaluate it.",
    },
    {
        id: 'S2Q07F', level: 'followup', chain: 'S2Q07', scenario: 'S2', topic: SCENARIOS.S2, gapMs: GAP.followup,
        q: "A user loses access to a document while a query is running. Where and when must authorization be checked?",
    },
    {
        id: 'S2Q08', level: 'design', scenario: 'S2', topic: SCENARIOS.S2, gapMs: GAP.design,
        q: "Migrate the embedding model without an outage: extend that service to introduce embeddings with a different dimensionality, while documents keep changing throughout the migration. Describe the versioning, the backfill, how updates stay synchronized, the quality comparison, the cutover, and the rollback.",
    },
    {
        id: 'S2Q08F', level: 'followup', chain: 'S2Q08', scenario: 'S2', topic: SCENARIOS.S2, gapMs: GAP.followup,
        q: "How do you prove the replacement index is sufficiently complete and current before you send production traffic to it?",
    },
    {
        id: 'S2Q09', level: 'cloud', scenario: 'S2', topic: SCENARIOS.S2, gapMs: GAP.cloud,
        q: "Place the RAG components on Azure: choose Azure services for document storage, ingestion events, work queues, workers, search, LLM access, and telemetry, and explain where managed services help and where a custom component may be justified.",
    },
    {
        id: 'S2Q09F', level: 'followup', chain: 'S2Q09', scenario: 'S2', topic: SCENARIOS.S2, gapMs: GAP.followup,
        q: "How would your design change if the documents and their processing had to remain within an approved region?",
    },
    {
        id: 'S2Q10', level: 'cloud', scenario: 'S2', topic: SCENARIOS.S2, gapMs: GAP.cloud,
        q: "Make ingestion recoverable under duplicate delivery: suppose queue messages may arrive more than once, and workers may crash after writing embeddings but before acknowledging a message. How would you use Azure messaging and durable state to make the processing safe to repeat?",
    },
    {
        id: 'S2Q10F', level: 'followup', chain: 'S2Q10', scenario: 'S2', topic: SCENARIOS.S2, gapMs: GAP.followup,
        q: "How would you handle poison documents, dead-letter replay, and a delete event racing with an older update?",
    },

    // ── Scenario 3 — Build a production Python AI gateway ─────────────────────
    {
        id: 'S3Q01', level: 'verbal', scenario: 'S3', topic: SCENARIOS.S3, gapMs: GAP.verbal,
        q: "What does async actually buy you? Explain what happens when an async FastAPI endpoint calls a blocking HTTP client, or performs expensive CPU work.",
    },
    {
        id: 'S3Q01F', level: 'followup', chain: 'S3Q01', scenario: 'S3', topic: SCENARIOS.S3, gapMs: GAP.followup,
        q: "When would you use asynchronous I/O, a thread pool, separate processes, or an external worker?",
    },
    {
        id: 'S3Q02', level: 'reasoning', scenario: 'S3', topic: SCENARIOS.S3, gapMs: GAP.reasoning,
        q: "Define a useful latency contract: an AI endpoint has a p50 latency of 400 milliseconds and a p99 latency of 8 seconds. Explain why that matters, and how you would separate gateway time, queueing, retrieval, and generation.",
    },
    {
        id: 'S3Q02F', level: 'followup', chain: 'S3Q02', scenario: 'S3', topic: SCENARIOS.S3, gapMs: GAP.followup,
        q: "For streaming responses, how do time to first token, inter-token delay, and total completion time change that contract?",
    },
    {
        id: 'S3Q03', level: 'reasoning', scenario: 'S3', topic: SCENARIOS.S3, gapMs: GAP.reasoning,
        q: "Which failures should be retried? An upstream LLM returns rate-limit errors, timeouts, and occasional server errors. Explain retryability, exponential backoff, jitter, deadlines, circuit breakers, and idempotency.",
    },
    {
        id: 'S3Q03F', level: 'followup', chain: 'S3Q03', scenario: 'S3', topic: SCENARIOS.S3, gapMs: GAP.followup,
        q: "A timeout occurs after the provider may already have processed the request. What duplicate work or billing risks remain?",
    },
    {
        id: 'S3Q04', level: 'coding', scenario: 'S3', topic: SCENARIOS.S3, gapMs: GAP.coding,
        q: "Implement a token-bucket rate limiter: write a per-tenant in-memory limiter using an injected monotonic clock, a capacity B, and a refill rate r. Each accepted request consumes one token. Return an admission decision, and an estimated wait time when it rejects.",
    },
    {
        id: 'S3Q04F', level: 'followup', chain: 'S3Q04', scenario: 'S3', topic: SCENARIOS.S3, gapMs: GAP.followup,
        q: "What breaks with multiple API workers? Describe how you would make the admission decision atomic using shared storage.",
    },
    {
        id: 'S3Q05', level: 'coding', scenario: 'S3', topic: SCENARIOS.S3, gapMs: GAP.coding,
        q: "Implement a bounded TTL cache: build get and put operations with expiry, a maximum entry count, and LRU eviction, using an injected clock. Then explain what a safe cache key must include for an authenticated AI request.",
    },
    {
        id: 'S3Q05F', level: 'followup', chain: 'S3Q05', scenario: 'S3', topic: SCENARIOS.S3, gapMs: GAP.followup,
        q: "How would you prevent concurrent misses from triggering many identical upstream requests, and when should an answer never be cached?",
    },
    {
        id: 'S3Q06', level: 'codingHeavy', scenario: 'S3', topic: SCENARIOS.S3, gapMs: GAP.codingHeavy,
        q: "Build a streaming AI endpoint: implement a FastAPI endpoint around an asynchronous token iterator you are given. Validate the request, obtain the tenant from an authentication dependency, impose a deadline, and stop the upstream work when the client disconnects.",
    },
    {
        id: 'S3Q06F', level: 'followup', chain: 'S3Q06', scenario: 'S3', topic: SCENARIOS.S3, gapMs: GAP.followup,
        q: "How do you report a provider failure after the response headers have been sent, and what information belongs in the logs rather than in the client response?",
    },
    {
        id: 'S3Q07', level: 'design', scenario: 'S3', topic: SCENARIOS.S3, gapMs: GAP.design,
        q: "Design a shared AI gateway: several product teams need access to multiple LLM deployments. Design the authentication, the tenant quotas, the routing, request validation, usage accounting, observability, and provider isolation.",
    },
    {
        id: 'S3Q07F', level: 'followup', chain: 'S3Q07', scenario: 'S3', topic: SCENARIOS.S3, gapMs: GAP.followup,
        q: "One tenant generates a traffic spike. How do you preserve capacity for the others while still using spare capacity efficiently?",
    },
    {
        id: 'S3Q08', level: 'design', scenario: 'S3', topic: SCENARIOS.S3, gapMs: GAP.design,
        q: "Add provider failover and caching: extend that gateway to survive a provider outage while respecting data residency, output-format requirements, latency, and spending limits, and define which requests can fail over automatically.",
    },
    {
        id: 'S3Q08F', level: 'followup', chain: 'S3Q08', scenario: 'S3', topic: SCENARIOS.S3, gapMs: GAP.followup,
        q: "A streamed response has already delivered 200 tokens. Would you fail over mid-response? Explain the client-visible behaviour and the alternatives.",
    },
    {
        id: 'S3Q09', level: 'cloud', scenario: 'S3', topic: SCENARIOS.S3, gapMs: GAP.cloud,
        q: "Divide responsibility between the gateway and the application: for Azure API Management, or Kong, in front of Python services, decide where authentication, quotas, schema validation, retries, caching, and telemetry belong.",
    },
    {
        id: 'S3Q09F', level: 'followup', chain: 'S3Q09', scenario: 'S3', topic: SCENARIOS.S3, gapMs: GAP.followup,
        q: "How could retries or rate limits configured at multiple layers interact badly, and how would you verify the effective behaviour?",
    },
    {
        id: 'S3Q10', level: 'cloud', scenario: 'S3', topic: SCENARIOS.S3, gapMs: GAP.cloud,
        q: "Debug an Azure private-connectivity failure: after public access to an upstream service is disabled, your deployed application times out, while local development still works through another route. Describe your investigation of name resolution, routing, private endpoints, network rules, TLS, and identity.",
    },
    {
        id: 'S3Q10F', level: 'followup', chain: 'S3Q10', scenario: 'S3', topic: SCENARIOS.S3, gapMs: GAP.followup,
        q: "What tests would you run from inside the application's actual runtime, to avoid misleading results from your laptop?",
    },

    // ── Scenario 4 — Operate and optimize ML inference on Kubernetes ──────────
    {
        id: 'S4Q01', level: 'verbal', scenario: 'S4', topic: SCENARIOS.S4, gapMs: GAP.verbal,
        q: "Distinguish the three probe types: explain startup, readiness, and liveness probes for a model server that needs 90 seconds to load its model.",
    },
    {
        id: 'S4Q01F', level: 'followup', chain: 'S4Q01', scenario: 'S4', topic: SCENARIOS.S4, gapMs: GAP.followup,
        q: "Should temporary unavailability of an upstream database fail the liveness probe? Defend your decision.",
    },
    {
        id: 'S4Q02', level: 'reasoning', scenario: 'S4', topic: SCENARIOS.S4, gapMs: GAP.reasoning,
        q: "Optimize inference systematically: a service spends its time on preprocessing, model execution, and network calls. How would you profile it before changing worker counts, batch size, model precision, or the implementation language?",
    },
    {
        id: 'S4Q02F', level: 'followup', chain: 'S4Q02', scenario: 'S4', topic: SCENARIOS.S4, gapMs: GAP.followup,
        q: "Explain the trade-offs between throughput and latency when you introduce dynamic batching.",
    },
    {
        id: 'S4Q03', level: 'reasoning', scenario: 'S4', topic: SCENARIOS.S4, gapMs: GAP.reasoning,
        q: "Recognize training-serving skew: offline performance is strong, but production predictions degrade immediately after release. What would you inspect before concluding that the population has drifted?",
    },
    {
        id: 'S4Q03F', level: 'followup', chain: 'S4Q03', scenario: 'S4', topic: SCENARIOS.S4, gapMs: GAP.followup,
        q: "How would you distinguish preprocessing differences, stale features, a model-version mismatch, and genuine concept drift?",
    },
    {
        id: 'S4Q04', level: 'coding', scenario: 'S4', topic: SCENARIOS.S4, gapMs: GAP.coding,
        q: "Implement a batched inference adapter: given a synchronous model that exposes predict, taking a batch, write an adapter that accepts records, validates the feature shape, processes configurable batches, and returns predictions in the input order. Define whether invalid records fail the whole request, or produce per-record errors.",
    },
    {
        id: 'S4Q04F', level: 'followup', chain: 'S4Q04', scenario: 'S4', topic: SCENARIOS.S4, gapMs: GAP.followup,
        q: "How would you handle a batch that fails because of one record, without repeatedly executing the batches that already succeeded?",
    },
    {
        id: 'S4Q05', level: 'codingHeavy', scenario: 'S4', topic: SCENARIOS.S4, gapMs: GAP.codingHeavy,
        q: "Build an asynchronous micro-batcher: implement a component that collects requests until either 32 items are ready, or the oldest item has waited 10 milliseconds, and then calls a provided async predict batch function. Return each result to its original caller, and bound the pending queue.",
    },
    {
        id: 'S4Q05F', level: 'followup', chain: 'S4Q05', scenario: 'S4', topic: SCENARIOS.S4, gapMs: GAP.followup,
        q: "Handle caller cancellation, batch failure, overload, and shutdown. Which invariants must hold so that no caller waits forever?",
    },
    {
        id: 'S4Q06', level: 'coding', scenario: 'S4', topic: SCENARIOS.S4, gapMs: GAP.coding,
        q: "Calculate serving metrics from logs: given records containing a timestamp, a model version, a status code, and a latency, write Python to report the request count, the 5xx rate, and the nearest-rank p95 latency for each minute and model version. Assume the input fits in memory, and define how you handle invalid records.",
    },
    {
        id: 'S4Q06F', level: 'followup', chain: 'S4Q06', scenario: 'S4', topic: SCENARIOS.S4, gapMs: GAP.followup,
        q: "Why is averaging per-instance p95 values not a correct fleet-wide p95, and how would you aggregate at larger scale?",
    },
    {
        id: 'S4Q07', level: 'design', scenario: 'S4', topic: SCENARIOS.S4, gapMs: GAP.design,
        q: "Size and autoscale an inference service: normal load is 100 requests per second, peaks reach 500, and a measured replica handles 40 requests per second while meeting the latency target. Estimate the baseline capacity, then incorporate headroom, replica failure, startup time, and burst handling.",
    },
    {
        id: 'S4Q07F', level: 'followup', chain: 'S4Q07', scenario: 'S4', topic: SCENARIOS.S4, gapMs: GAP.followup,
        q: "Which signals would drive the scaling: CPU, GPU utilization, queue depth, concurrency, or latency? When might each of them mislead you?",
    },
    {
        id: 'S4Q08', level: 'design', scenario: 'S4', topic: SCENARIOS.S4, gapMs: GAP.design,
        q: "Roll out a new model safely: extend that service to release a model with different feature requirements and a larger memory footprint. Compare shadowing, canary, and blue-green deployment, and define the technical and the model-quality gates.",
    },
    {
        id: 'S4Q08F', level: 'followup', chain: 'S4Q08', scenario: 'S4', topic: SCENARIOS.S4, gapMs: GAP.followup,
        q: "How would you roll back if an associated database migration or feature change is incompatible with the old model?",
    },
    {
        id: 'S4Q09', level: 'cloudHeavy', scenario: 'S4', topic: SCENARIOS.S4, gapMs: GAP.cloudHeavy,
        q: "Write and review an AKS workload configuration: draft the Kubernetes manifests for a model-serving Deployment and Service. Include resource requests and limits, probes, graceful termination, a non-root security context, and configuration handling, and explain your assumptions.",
    },
    {
        id: 'S4Q09F', level: 'followup', chain: 'S4Q09', scenario: 'S4', topic: SCENARIOS.S4, gapMs: GAP.followup,
        q: "What would you add for autoscaling, disruption tolerance, workload identity, and network isolation?",
    },
    {
        id: 'S4Q10', level: 'cloud', scenario: 'S4', topic: SCENARIOS.S4, gapMs: GAP.cloud,
        q: "Diagnose a broken rollout: a new AKS rollout produces intermittent 502s. Some pods restart, while others remain Pending. Walk through the evidence you would gather, and the order of your checks.",
    },
    {
        id: 'S4Q10F', level: 'followup', chain: 'S4Q10', scenario: 'S4', topic: SCENARIOS.S4, gapMs: GAP.followup,
        q: "How would your response differ for a pod that was OOM killed, a failed readiness probe, an image-pull failure, and insufficient node capacity?",
    },

    // ── Scenario 5 — Test, secure, and recover a retail AI product ────────────
    {
        id: 'S5Q01', level: 'verbal', scenario: 'S5', topic: SCENARIOS.S5, gapMs: GAP.verbal,
        q: "Explain consistency in an AI workflow: a document upload is stored successfully, but its searchable representation is not ready. What should the API return, and how should a client discover progress?",
    },
    {
        id: 'S5Q01F', level: 'followup', chain: 'S5Q01', scenario: 'S5', topic: SCENARIOS.S5, gapMs: GAP.followup,
        q: "What does read your own writes mean here, and what would providing it cost?",
    },
    {
        id: 'S5Q02', level: 'reasoning', scenario: 'S5', topic: SCENARIOS.S5, gapMs: GAP.reasoning,
        q: "Define testing for nondeterministic outputs: distinguish unit tests, API contract tests, integration tests, end-to-end tests, load tests, and model-quality evaluations for an LLM product, and give a concrete example of each.",
    },
    {
        id: 'S5Q02F', level: 'followup', chain: 'S5Q02', scenario: 'S5', topic: SCENARIOS.S5, gapMs: GAP.followup,
        q: "Which tests should block a release, and how would you avoid fragile assertions based on exact generated wording?",
    },
    {
        id: 'S5Q03', level: 'reasoning', scenario: 'S5', topic: SCENARIOS.S5, gapMs: GAP.reasoning,
        q: "Define the trust boundary for an agent: a retail assistant retrieves a document containing instructions to reveal customer information, and it has tools for looking up orders. How should the system treat retrieved content, and how should it authorize tool calls?",
    },
    {
        id: 'S5Q03F', level: 'followup', chain: 'S5Q03', scenario: 'S5', topic: SCENARIOS.S5, gapMs: GAP.followup,
        q: "What controls must live outside the model, and how would you test for unauthorized tool arguments and data leakage?",
    },
    {
        id: 'S5Q04', level: 'sql', scenario: 'S5', topic: SCENARIOS.S5, gapMs: GAP.sql,
        q: "Measure reliability without mixing tenants: given a requests table with a request id, a tenant id, a model version, a started at time, a latency in milliseconds, and a status code, write PostgreSQL returning the hourly request count, the 5xx rate, and p95 latency by tenant and model version. Show only groups with at least 100 requests.",
    },
    {
        id: 'S5Q04F', level: 'followup', chain: 'S5Q04', scenario: 'S5', topic: SCENARIOS.S5, gapMs: GAP.followup,
        q: "What index or partitioning strategy would you consider at high volume, and how would you use a query plan to validate your choice?",
    },
    {
        id: 'S5Q05', level: 'codingHeavy', scenario: 'S5', topic: SCENARIOS.S5, gapMs: GAP.codingHeavy,
        q: "Make job creation idempotent: design the PostgreSQL schema and the Python transaction flow for a POST to document jobs, with a tenant-scoped idempotency key. Concurrent identical requests must return the same job, and reuse of the key with a different payload must return a conflict.",
    },
    {
        id: 'S5Q05F', level: 'followup', chain: 'S5Q05', scenario: 'S5', topic: SCENARIOS.S5, gapMs: GAP.followup,
        q: "How do you reliably publish work after committing the job? Explain your recovery if the process crashes between the database commit and the message publication.",
    },
    {
        id: 'S5Q06', level: 'coding', scenario: 'S5', topic: SCENARIOS.S5, gapMs: GAP.coding,
        q: "Write a representative load test: using Locust or k6, implement a test for short requests, long streaming requests, and invalid requests. Include multiple tenants, a ramp-up, steady load, and a spike, and define measurable pass and fail criteria.",
    },
    {
        id: 'S5Q06F', level: 'followup', chain: 'S5Q06', scenario: 'S5', topic: SCENARIOS.S5, gapMs: GAP.followup,
        q: "How will you avoid a test dominated by cache hits, account for slow responses reducing generated traffic, and separate backend capacity from provider quotas?",
    },
    {
        id: 'S5Q07', level: 'design', scenario: 'S5', topic: SCENARIOS.S5, gapMs: GAP.design,
        q: "Design a retail shopping assistant end to end: the assistant answers product questions, checks inventory, and retrieves authenticated order status. Design the API, the retrieval, tool execution, authorization, the streaming interface, state storage, and monitoring, and explain where freshness is critical.",
    },
    {
        id: 'S5Q07F', level: 'followup', chain: 'S5Q07', scenario: 'S5', topic: SCENARIOS.S5, gapMs: GAP.followup,
        q: "The model recommends an out-of-stock product, or requests another customer's order. Where should each of those errors be prevented or detected?",
    },
    {
        id: 'S5Q08', level: 'incident', scenario: 'S5', topic: SCENARIOS.S5, gapMs: GAP.design,
        q: "Lead a production incident: after a release, p95 latency doubles, LLM spending triples, and answer-quality complaints rise, while the HTTP error rate remains normal. Explain your first 15 minutes, your mitigation options, and your investigation.",
    },
    {
        id: 'S5Q08F', level: 'followup', chain: 'S5Q08', scenario: 'S5', topic: SCENARIOS.S5, gapMs: GAP.followup,
        q: "What evidence would distinguish an agent loop, a cache failure, a retrieval regression, and a provider slowdown, and what if a rollback only partly resolves the problem?",
    },
    {
        id: 'S5Q09', level: 'cloudHeavy', scenario: 'S5', topic: SCENARIOS.S5, gapMs: GAP.cloudHeavy,
        q: "Design the Azure delivery pipeline: describe CI/CD for the application, the infrastructure, and the model and prompt artifacts. Include dependency and image checks, tests, the identity used for deployment, artifact promotion, evaluation gates, staged release, and rollback.",
    },
    {
        id: 'S5Q09F', level: 'followup', chain: 'S5Q09', scenario: 'S5', topic: SCENARIOS.S5, gapMs: GAP.followup,
        q: "How do you ensure the artifact tested in staging is the one released to production, and how would you handle a prompt-only release?",
    },
    {
        id: 'S5Q10', level: 'cloudHeavy', scenario: 'S5', topic: SCENARIOS.S5, gapMs: GAP.cloudHeavy,
        q: "Plan recovery from a regional outage: the retail assistant must recover within one hour, and lose no more than 15 minutes of committed application data. Design an Azure recovery strategy covering PostgreSQL, object storage, search indexes, queues, configuration, and model access, and state where rebuilds are acceptable.",
    },
    {
        id: 'S5Q10F', level: 'followup', chain: 'S5Q10', scenario: 'S5', topic: SCENARIOS.S5, gapMs: GAP.followup,
        q: "How would you test those recovery targets? What happens to in-flight jobs, and how do you prevent duplicate processing or conflicting writes during failover?",
    },
];

/** The roster the harness reads. `long` is derived here so it can never disagree with the text. */
export const SCENARIO50 = RAW.map((x) => ({ ...x, long: wordsOf(x.q) >= LONG_WORDS }));

/** Spoken items only, matching interview60's export. Nothing here is a screenshot cue. */
export const SPOKEN = SCENARIO50.filter((x) => x.kind !== 'screenshot');

/** One scenario, main questions and their follow-ups, in order. */
export const scenario = (key) => SCENARIO50.filter((x) => x.scenario === key);

export const PLAN = {
    total: SCENARIO50.length,
    spoken: SPOKEN.length,
    screenshots: 0,
    byLevel: SCENARIO50.reduce((a, x) => ({ ...a, [x.level]: (a[x.level] || 0) + 1 }), {}),
    byScenario: SCENARIO50.reduce((a, x) => ({ ...a, [x.scenario]: (a[x.scenario] || 0) + 1 }), {}),
};
