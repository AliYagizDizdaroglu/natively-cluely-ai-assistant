# Scenario 50 — source question set

The set exactly as written, before it was rendered for speech. This file is the
source of truth for wording; `scenario50.questions.mjs` is the harness rendering
of the same questions (see the header of that file for what changes and why).

Five scenarios of ten questions, each with one follow-up: 100 spoken items.
Unlike `interview60`, every question here is deliberately multi-sentence — the
regime where the STT closes the question as several finals.

> **Note on CV figures.** Q2 and Q12 quote metrics from a real CV (churn rate,
> risk-band capture, precision, extraction F1, hallucination reduction, multi-hop
> accuracy). No name, employer or account identifier appears anywhere in the set.

---

## Scenario 1 — Defend and extend your churn prediction system

**1. [Verbal · Short] Why did you choose XGBoost?**
Using your churn project, explain why XGBoost was suitable for the data and production constraints. What baseline would you compare it against?
*Follow-up:* Under what conditions would you prefer logistic regression, a neural network, or a rules-based approach?

**2. [Verbal · Reasoning] Can you reconcile the metrics on your CV?**
Your CV reports a 9.5% churn rate, a top-5% risk band capturing 30% of churners, and 60% precision. Assuming the same population and observation period, use 100,000 subscribers to estimate true positives, precision, and recall. Are the figures consistent within rounding?
*Follow-up:* What can you conclude from PR-AUC 0.38 and ROC-AUC 0.88? What additional information do you need before deciding the model is useful?

**3. [Verbal · Reasoning] Did the model actually reduce churn?**
Your CV reports churn decreasing from 9.5% to 8.1%. How would you distinguish the effect of the model and retention campaign from seasonality, customer mix, and other business changes?
*Follow-up:* Why might targeting the highest-risk customers be less profitable than targeting customers with the largest estimated treatment effect?

**4. [Coding · Medium] Implement evaluation for a fixed campaign budget.**
Write `evaluate_top_k(y_true, scores, k)` returning precision@k, recall@k, and lift over the population prevalence. Assume binary labels and finite scores; break score ties by original row order. Define behavior for invalid `k`, empty inputs, and no positive labels.
*Follow-up:* How would you reduce the sorting cost for millions of customers while preserving the tie rule?

**5. [Coding · Heavy] Build a leakage-safe churn training pipeline.**
Given customer snapshots containing `customer_id`, `snapshot_date`, numeric features, categorical features, and `churn_next_30d`, write a scikit-learn training and evaluation pipeline. Fit preprocessing only on training data and account for the label observation window when splitting chronologically.
*Follow-up:* Customers appear in multiple snapshots. When is this legitimate, and when would you also require a customer-level holdout?

**6. [Coding · SQL] Construct a point-in-time feature.**
Given `snapshots(customer_id, snapshot_time)` and `events(customer_id, event_time, ingested_at, event_type)`, write PostgreSQL SQL counting support calls in the 30 days before each snapshot. Include only events ingested by the snapshot time and preserve customers with zero calls.
*Follow-up:* How would you index these tables? What changes if historical records can be corrected after ingestion?

**7. [System design · Heavy] Design the next version of the churn platform.**
Support nightly scoring for 400,000 customers and on-demand scoring for customer service agents. Cover ingestion, feature computation, training, model registration, serving, prediction storage, and monitoring. Identify what should be shared between batch and online paths.
*Follow-up:* A nightly job fails halfway through. How do you resume without duplicate campaign actions or mixed model versions?

**8. [System design · Heavy] Add delayed outcomes and experimentation.**
Extend Q7 so churn outcomes arrive 30 days later and retention offers affect the observed labels. Design prediction logging, experiment assignment, outcome joins, and retraining data selection.
*Follow-up:* How could repeatedly training on customers affected by previous campaigns introduce bias?

**9. [Cloud · Medium] Translate your AWS experience into an Azure deployment.**
Describe an Azure implementation of Q7, covering object storage, training, model artifacts, container images, online inference, scheduling, identity, and monitoring. Explain the operational reasons for your choices.
*Follow-up:* Which workload would you put on Azure Machine Learning managed endpoints, Azure App Service, or AKS, and why?

**10. [Cloud · Reasoning] Secure the churn platform without embedded credentials.**
How would your inference service access model artifacts and PostgreSQL using Azure identity and networking controls? Explain authentication, authorization, secret handling where unavoidable, and environment separation.
*Follow-up:* The application receives an authorization error after deployment. How would you distinguish an identity problem from a permissions or network problem?

---

## Scenario 2 — Defend and scale your document intelligence platform

**11. [Verbal · Short] Explain your RAG pipeline precisely.**
Walk through ingestion, parsing, chunking, embedding, retrieval, reranking, context assembly, and generation. Map these stages to your document intelligence experience.
*Follow-up:* Which stages can cause a correct source document to produce an incorrect answer?

**12. [Verbal · Reasoning] Defend the improvements reported on your CV.**
You report extraction F1 increasing from 72.4% to 95.4%, hallucinations decreasing by 84%, and multi-hop accuracy reaching 92%. Define the unit of evaluation, denominator, dataset construction, and uncertainty for each metric.
*Follow-up:* What ablations would separate the contributions of OCR, classification, retrieval, prompting, and agent orchestration? How would you check LLM-judge bias?

**13. [Verbal · Reasoning] When does an agent justify its complexity?**
Consider a question requiring evidence from three documents. Compare a fixed retrieval workflow, query decomposition, and an agent that chooses tools dynamically.
*Follow-up:* What stopping conditions, budgets, and failure policies would prevent loops and unnecessary tool calls?

**14. [Coding · Medium] Merge two retrieval result lists.**
Implement reciprocal rank fusion for keyword and vector results. Each list contains unique document IDs ordered from best to worst; use one-based ranks and a configurable positive constant `c`, with contribution `1 / (c + rank)`. Return the top `k` unique IDs with deterministic tie-breaking.
*Follow-up:* Why might you use rank fusion instead of adding raw scores? How would you add configurable weights for each retrieval source?

**15. [Coding · Medium] Pack retrieved evidence into a context budget.**
Implement `select_context(chunks, budget)`. Each chunk has an ID, document ID, relevance score, and positive token count. Use a greedy relevance-first policy, skip chunks that do not fit, deduplicate chunk IDs, and allow at most two chunks per document.
*Follow-up:* Construct an example where the greedy policy gives poor coverage. How would you incorporate redundancy or multi-hop dependencies?

**16. [Coding · Heavy] Implement an asynchronous evaluation runner.**
Given test cases and `async evaluate(case)`, process them with at most eight active evaluations, apply per-case timeouts, preserve input order, and record failures without cancelling unrelated cases.
*Follow-up:* Extend it to retry explicitly transient errors within an overall case deadline. How would you test concurrency and cancellation deterministically?

**17. [System design · Heavy] Design a multi-tenant RAG service over 10M documents.**
Support document updates and deletions, access-controlled retrieval, citations, asynchronous ingestion, and interactive queries. Explain index organization, metadata storage, permission enforcement, and evaluation.
*Follow-up:* A user loses access to a document while a query is running. Where and when must authorization be checked?

**18. [System design · Heavy] Migrate the embedding model without an outage.**
Extend Q17 to introduce embeddings with a different dimensionality. Documents continue changing throughout the migration. Describe versioning, backfill, update synchronization, quality comparison, cutover, and rollback.
*Follow-up:* How do you prove the replacement index is sufficiently complete and current before sending production traffic to it?

**19. [Cloud · Medium] Place the RAG components on Azure.**
Choose Azure services for document storage, ingestion events, work queues, workers, search, LLM access, and telemetry. Explain where managed services help and where custom components may be justified.
*Follow-up:* How would your design change if documents and their processing must remain within an approved region?

**20. [Cloud · Reasoning] Make ingestion recoverable under duplicate delivery.**
Suppose queue messages may arrive more than once and workers may crash after writing embeddings but before acknowledging a message. How would you use Azure messaging and durable state to make processing safe to repeat?
*Follow-up:* How would you handle poison documents, dead-letter replay, and a delete event racing with an older update?

---

## Scenario 3 — Build a production Python AI gateway

**21. [Verbal · Short] What does `async` actually buy you?**
Explain what happens when an `async` FastAPI endpoint calls a blocking HTTP client or performs expensive CPU work.
*Follow-up:* When would you use asynchronous I/O, a thread pool, separate processes, or an external worker?

**22. [Verbal · Reasoning] Define a useful latency contract.**
An AI endpoint has p50 latency of 400 ms and p99 latency of 8 seconds. Explain why this matters and how you would separate gateway time, queueing, retrieval, and generation.
*Follow-up:* For streaming responses, how do time to first token, inter-token delay, and total completion time change the contract?

**23. [Verbal · Reasoning] Which failures should be retried?**
An upstream LLM returns rate-limit errors, timeouts, and occasional server errors. Explain retryability, exponential backoff, jitter, deadlines, circuit breakers, and idempotency.
*Follow-up:* A timeout occurs after the provider may have processed the request. What duplicate work or billing risks remain?

**24. [Coding · Medium] Implement a token-bucket rate limiter.**
Write a per-tenant in-memory limiter using an injected monotonic clock, capacity `B`, and refill rate `r`. Each accepted request consumes one token. Return an admission decision and an estimated wait time when rejected.
*Follow-up:* What breaks with multiple API workers? Describe how you would make the admission decision atomic using shared storage.

**25. [Coding · Medium] Implement a bounded TTL cache.**
Build `get` and `put` operations with expiry, a maximum entry count, and LRU eviction. Use an injected clock. Explain what a safe cache key must include for an authenticated AI request.
*Follow-up:* How would you prevent concurrent misses from triggering many identical upstream requests? When should an answer never be cached?

**26. [Coding · Heavy] Build a streaming AI endpoint.**
Implement a FastAPI endpoint around a provided asynchronous token iterator. Validate the request, obtain the tenant from an authentication dependency, impose a deadline, and stop upstream work when the client disconnects.
*Follow-up:* How do you report a provider failure after response headers have been sent? What information belongs in logs versus the client response?

**27. [System design · Heavy] Design a shared AI gateway.**
Several product teams need access to multiple LLM deployments. Design authentication, tenant quotas, routing, request validation, usage accounting, observability, and provider isolation.
*Follow-up:* One tenant generates a traffic spike. How do you preserve capacity for others while still using spare capacity efficiently?

**28. [System design · Heavy] Add provider failover and caching.**
Extend Q27 to survive a provider outage while respecting data residency, output-format requirements, latency, and spending limits. Define which requests can fail over automatically.
*Follow-up:* A streamed response has already delivered 200 tokens. Would you fail over mid-response? Explain the client-visible behavior and alternatives.

**29. [Cloud · Medium] Divide responsibility between the gateway and application.**
For Azure API Management or Kong in front of Python services, decide where authentication, quotas, schema validation, retries, caching, and telemetry belong.
*Follow-up:* How could retries or rate limits configured at multiple layers interact badly? How would you verify the effective behavior?

**30. [Cloud · Reasoning] Debug an Azure private-connectivity failure.**
After public access to an upstream service is disabled, your deployed application times out while local development still works through another route. Describe your investigation of name resolution, routing, private endpoints, network rules, TLS, and identity.
*Follow-up:* What tests would you run from inside the application's actual runtime to avoid misleading results from your laptop?

---

## Scenario 4 — Operate and optimize ML inference on Kubernetes

**31. [Verbal · Short] Distinguish the three probe types.**
Explain startup, readiness, and liveness probes for a model server that needs 90 seconds to load its model.
*Follow-up:* Should temporary unavailability of an upstream database fail the liveness probe? Defend your decision.

**32. [Verbal · Reasoning] Optimize inference systematically.**
A service spends time on preprocessing, model execution, and network calls. How would you profile it before changing worker counts, batch size, model precision, or implementation language?
*Follow-up:* Explain the trade-offs between throughput and latency when introducing dynamic batching.

**33. [Verbal · Reasoning] Recognize training-serving skew.**
Offline performance is strong, but production predictions degrade immediately after release. What would you inspect before concluding that the population has drifted?
*Follow-up:* How would you distinguish preprocessing differences, stale features, model-version mismatch, and genuine concept drift?

**34. [Coding · Medium] Implement a batched inference adapter.**
Given a synchronous model exposing `predict(batch)`, write an adapter that accepts records, validates feature shape, processes configurable batches, and returns predictions in input order. Define whether invalid records fail the request or produce per-record errors.
*Follow-up:* How would you handle a batch that fails because of one record without repeatedly executing successful batches?

**35. [Coding · Heavy] Build an asynchronous micro-batcher.**
Implement a component that collects requests until either 32 items are ready or the oldest item has waited 10 ms, then calls a provided `async predict_batch(items)`. Return each result to its original caller and bound the pending queue.
*Follow-up:* Handle caller cancellation, batch failure, overload, and shutdown. Which invariants must hold so no caller waits forever?

**36. [Coding · Medium] Calculate serving metrics from logs.**
Given records containing timestamp, model version, status code, and latency, write Python to report request count, 5xx rate, and nearest-rank p95 latency for each minute and model version. Assume the input fits in memory; define handling for invalid records.
*Follow-up:* Why is averaging per-instance p95 values not a correct fleet-wide p95? How would you aggregate at larger scale?

**37. [System design · Heavy] Size and autoscale an inference service.**
Normal load is 100 requests/second, peaks reach 500, and a measured replica handles 40 requests/second while meeting the latency target. Estimate baseline capacity, then incorporate headroom, replica failure, startup time, and burst handling.
*Follow-up:* Which signals would drive scaling: CPU, GPU utilization, queue depth, concurrency, or latency? When might each mislead you?

**38. [System design · Heavy] Roll out a new model safely.**
Extend Q37 to release a model with different feature requirements and a larger memory footprint. Compare shadowing, canary, and blue-green deployment. Define technical and model-quality gates.
*Follow-up:* How would you roll back if an associated database migration or feature change is incompatible with the old model?

**39. [Cloud · Practical] Write and review an AKS workload configuration.**
Draft Kubernetes manifests for a model-serving Deployment and Service. Include resource requests and limits, probes, graceful termination, a non-root security context, and configuration handling. Explain your assumptions.
*Follow-up:* What would you add for autoscaling, disruption tolerance, workload identity, and network isolation?

**40. [Cloud · Reasoning] Diagnose a broken rollout.**
A new AKS rollout produces intermittent 502s; some pods restart, while others remain Pending. Walk through the evidence you would gather and the order of your checks.
*Follow-up:* How would your response differ for `OOMKilled`, failed readiness probes, an image-pull failure, and insufficient node capacity?

---

## Scenario 5 — Test, secure, and recover a retail AI product

**41. [Verbal · Short] Explain consistency in an AI workflow.**
A document upload is stored successfully, but its searchable representation is not ready. What should the API return, and how should a client discover progress?
*Follow-up:* What does "read your own writes" mean here, and what would providing it cost?

**42. [Verbal · Reasoning] Define testing for nondeterministic outputs.**
Distinguish unit tests, API contract tests, integration tests, end-to-end tests, load tests, and model-quality evaluations for an LLM product. Give a concrete example of each.
*Follow-up:* Which tests should block a release? How would you avoid fragile assertions based on exact generated wording?

**43. [Verbal · Reasoning] Define the trust boundary for an agent.**
A retail assistant retrieves a document containing instructions to reveal customer information and has tools for looking up orders. How should the system treat retrieved content and authorize tool calls?
*Follow-up:* What controls must live outside the model? How would you test unauthorized tool arguments and data leakage?

**44. [Coding · SQL] Measure reliability without mixing tenants.**
Given `requests(request_id, tenant_id, model_version, started_at, latency_ms, status_code)`, write PostgreSQL SQL returning hourly request count, 5xx rate, and p95 latency by tenant and model version. Show only groups with at least 100 requests.
*Follow-up:* What index or partitioning strategy would you consider at high volume? How would you use a query plan to validate your choice?

**45. [Coding · Heavy] Make job creation idempotent.**
Design the PostgreSQL schema and Python transaction flow for `POST /document-jobs` with a tenant-scoped idempotency key. Concurrent identical requests must return the same job; reuse of the key with a different payload must return a conflict.
*Follow-up:* How do you reliably publish work after committing the job? Explain recovery if the process crashes between database commit and message publication.

**46. [Coding · Practical] Write a representative load test.**
Using Locust or k6, implement a test for short requests, long streaming requests, and invalid requests. Include multiple tenants, ramp-up, steady load, and a spike. Define measurable pass/fail criteria.
*Follow-up:* How will you avoid a test dominated by cache hits, account for slow responses reducing generated traffic, and separate backend capacity from provider quotas?

**47. [System design · Heavy] Design a retail shopping assistant end to end.**
The assistant answers product questions, checks inventory, and retrieves authenticated order status. Design the API, retrieval, tool execution, authorization, streaming interface, state storage, and monitoring. Explain where freshness is critical.
*Follow-up:* The model recommends an out-of-stock product or requests another customer's order. Where should each error be prevented or detected?

**48. [System design · Incident] Lead a production incident.**
After a release, p95 latency doubles, LLM spending triples, and answer-quality complaints rise, while the HTTP error rate remains normal. Explain your first 15 minutes, mitigation options, and investigation.
*Follow-up:* What evidence would distinguish an agent loop, cache failure, retrieval regression, and provider slowdown? What if rollback only partly resolves the problem?

**49. [Cloud · Heavy] Design the Azure delivery pipeline.**
Describe CI/CD for the application, infrastructure, and model/prompt artifacts. Include dependency and image checks, tests, identity for deployment, artifact promotion, evaluation gates, staged release, and rollback.
*Follow-up:* How do you ensure the artifact tested in staging is the one released to production? How would you handle a prompt-only release?

**50. [Cloud · Heavy] Plan recovery from a regional outage.**
The retail assistant must recover within one hour and lose no more than 15 minutes of committed application data. Design an Azure recovery strategy covering PostgreSQL, object storage, search indexes, queues, configuration, and model access. State where rebuilds are acceptable.
*Follow-up:* How would you test those recovery targets? What happens to in-flight jobs, and how do you prevent duplicate processing or conflicting writes during failover?
