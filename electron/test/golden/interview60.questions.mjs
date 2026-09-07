/**
 * A 60-minute MLOps Engineer screen, as a single ordered question bank.
 *
 * Used twice, from one rendered audio file:
 *   - played into the real Electron app (covers UI, Gemma vision path, process stability)
 *   - streamed into the headless harness (covers scored quality, latency, Live survival)
 * Same stimulus both sides is the whole point — otherwise the two runs are two
 * loosely-related experiments rather than one comparison.
 *
 * Difficulty ramps the way a real screen does: definitions first, design and
 * tradeoffs in the middle, debugging and scale at the end. `gapMs` is the silence
 * AFTER the question — long enough for a candidate to answer, which is also what
 * makes the run take an hour of wall clock rather than compressing to ten minutes.
 *
 * SCREENSHOT cues are spoken aloud so the operator knows when to press Ctrl+H /
 * Ctrl+Enter; they are the only items the harness cannot reproduce.
 */

export const TOPICS = [
    'SageMaker', 'Monitoring/drift', 'S3', 'CloudFormation/IaC',
    'Airflow', 'Docker', 'Kubernetes', 'CI/CD for ML',
];

/** @type {{id:string,level:string,topic:string,q:string,gapMs:number,kind?:string}[]} */
export const INTERVIEW = [
    // ── Warm-up: definitions (12) ─────────────────────────────────────────────
    { id: 'W01', level: 'easy', topic: 'Docker', q: "To start, what is the difference between a Docker image and a container?", gapMs: 45000 },
    { id: 'W02', level: 'easy', topic: 'Docker', q: "Why do Docker layers matter for build times?", gapMs: 45000 },
    { id: 'W03', level: 'easy', topic: 'S3', q: "When would you use S3 Standard versus S3 Glacier for training data?", gapMs: 45000 },
    { id: 'W04', level: 'easy', topic: 'SageMaker', q: "What is a SageMaker endpoint, and what does it actually host?", gapMs: 45000 },
    { id: 'W05', level: 'easy', topic: 'Airflow', q: "What is a DAG, and why does Airflow use that structure?", gapMs: 45000 },
    { id: 'W06', level: 'easy', topic: 'CI/CD for ML', q: "Why version model artifacts alongside code?", gapMs: 45000 },
    { id: 'W07', level: 'easy', topic: 'Kubernetes', q: "What is the difference between a pod and a deployment?", gapMs: 45000 },
    { id: 'W08', level: 'easy', topic: 'Monitoring/drift', q: "What is the difference between data drift and concept drift?", gapMs: 45000 },
    { id: 'W09', level: 'easy', topic: 'CloudFormation/IaC', q: "What problem does infrastructure as code actually solve?", gapMs: 45000 },
    { id: 'W10', level: 'easy', topic: 'S3', q: "How would you organise an S3 bucket layout for a training dataset that gets versioned weekly?", gapMs: 50000 },
    { id: 'W11', level: 'easy', topic: 'Docker', q: "What goes in a multi-stage Dockerfile for a Python model server, and why?", gapMs: 50000 },
    { id: 'W12', level: 'easy', topic: 'Airflow', q: "What is the difference between an Airflow operator and a sensor?", gapMs: 45000 },

    // ── Design and tradeoffs (28) ─────────────────────────────────────────────
    { id: 'M01', level: 'medium', topic: 'Monitoring/drift', q: "How would you detect data drift in a model that is already running in production?", gapMs: 55000 },
    { id: 'M02', level: 'medium', topic: 'SageMaker', q: "Walk me through how you would structure a SageMaker pipeline for a scheduled retraining.", gapMs: 60000 },
    { id: 'M03', level: 'medium', topic: 'Kubernetes', q: "How would you handle autoscaling for a model inference service on Kubernetes?", gapMs: 55000 },
    { id: 'M04', level: 'medium', topic: 'CloudFormation/IaC', q: "Why would you use CloudFormation instead of configuring things by hand in the console?", gapMs: 50000 },
    { id: 'M05', level: 'medium', topic: 'S3', q: "How do you secure training data in S3 that contains customer information?", gapMs: 55000 },

    { id: 'C01', level: 'coding', topic: 'Coding', kind: 'screenshot', problem: 'PY4', q: "Now take a look at this problem on screen and walk me through how you would solve it.", gapMs: 150000 },
    // Follow-ups on the code just given (added 2026-09-08): `chain` names the cue, so the
    // judge export carries the on-screen problem into these questions too.
    { id: 'C01F1', level: 'followup', chain: 'C01', topic: 'Coding', q: "What is the time complexity of what you just wrote, and can you do better?", gapMs: 60000 },
    { id: 'C01F2', level: 'followup', chain: 'C01', topic: 'Coding', q: "Which inputs would break that solution?", gapMs: 60000 },

    { id: 'M06', level: 'medium', topic: 'CI/CD for ML', q: "What does a good CI pipeline for a machine learning repository actually test?", gapMs: 55000 },
    { id: 'M07', level: 'medium', topic: 'Airflow', q: "How would you handle a task in Airflow that intermittently fails because of an upstream API?", gapMs: 55000 },
    { id: 'M08', level: 'medium', topic: 'Docker', q: "Your training image is eight gigabytes. How would you approach shrinking it?", gapMs: 55000 },
    { id: 'M09', level: 'medium', topic: 'SageMaker', q: "When would you choose a real-time endpoint over batch transform?", gapMs: 50000 },
    { id: 'M10', level: 'medium', topic: 'Monitoring/drift', q: "Which metrics would you put on a dashboard for a production recommendation model?", gapMs: 55000 },
    { id: 'M11', level: 'medium', topic: 'Kubernetes', q: "How do you manage GPU resources across multiple teams sharing one cluster?", gapMs: 55000 },
    { id: 'M12', level: 'medium', topic: 'CI/CD for ML', q: "How would you roll out a new model version without risking a bad deployment?", gapMs: 55000 },
    { id: 'M13', level: 'medium', topic: 'CloudFormation/IaC', q: "How do you manage secrets in infrastructure as code without committing them?", gapMs: 55000 },
    { id: 'M14', level: 'medium', topic: 'S3', q: "How would you make a large S3 training dataset load faster into a training job?", gapMs: 55000 },
    { id: 'M15', level: 'medium', topic: 'Airflow', q: "How would you pass data between Airflow tasks when the payload is too large for XCom?", gapMs: 55000 },
    { id: 'M16', level: 'medium', topic: 'SageMaker', q: "How does the SageMaker Model Registry fit into a deployment workflow?", gapMs: 55000 },
    { id: 'M17', level: 'medium', topic: 'Monitoring/drift', q: "How would you monitor a model where ground truth labels arrive weeks late?", gapMs: 60000 },
    { id: 'M18', level: 'medium', topic: 'Docker', q: "How do you handle CUDA and driver compatibility in containers for GPU training?", gapMs: 55000 },

    { id: 'C02', level: 'coding', topic: 'Coding', kind: 'screenshot', problem: 'PY5', q: "Here is another one on screen. Take a look and talk me through your approach.", gapMs: 150000 },
    { id: 'C02F1', level: 'followup', chain: 'C02', topic: 'Coding', q: "Walk me through why your grouping key is correct, and what it costs per string.", gapMs: 60000 },
    { id: 'C02F2', level: 'followup', chain: 'C02', topic: 'Coding', q: "How would that change if the strings were unicode instead of lowercase letters?", gapMs: 60000 },

    { id: 'M19', level: 'medium', topic: 'Kubernetes', q: "What is your approach to health checks for a model serving container?", gapMs: 55000 },
    { id: 'M20', level: 'medium', topic: 'CI/CD for ML', q: "How would you test a data pipeline, given the data itself keeps changing?", gapMs: 55000 },
    { id: 'M21', level: 'medium', topic: 'CloudFormation/IaC', q: "How would you structure stacks for development, staging, and production?", gapMs: 55000 },
    { id: 'M22', level: 'medium', topic: 'SageMaker', q: "How would you approach hyperparameter tuning at scale without burning the budget?", gapMs: 55000 },
    { id: 'M23', level: 'medium', topic: 'Monitoring/drift', q: "What would make you decide to retrain a model rather than just alerting on drift?", gapMs: 55000 },
    { id: 'M24', level: 'medium', topic: 'Airflow', q: "How would you backfill a year of data without overwhelming the scheduler?", gapMs: 55000 },
    { id: 'M25', level: 'medium', topic: 'S3', q: "How would you handle a dataset that must be deleted on request for compliance?", gapMs: 55000 },
    { id: 'M26', level: 'medium', topic: 'Docker', q: "How do you keep base images patched across many model services?", gapMs: 55000 },
    { id: 'M27', level: 'medium', topic: 'Kubernetes', q: "When would you reach for a service mesh in an ML serving stack, and when would you not?", gapMs: 55000 },
    { id: 'M28', level: 'medium', topic: 'CI/CD for ML', q: "How do you keep feature engineering consistent between training and serving?", gapMs: 60000 },

    // ── Debugging and scale (12) ──────────────────────────────────────────────
    { id: 'H01', level: 'hard', topic: 'Monitoring/drift', q: "Your model accuracy dropped fifteen percent overnight, but the input schema is unchanged. How do you debug that?", gapMs: 65000 },
    { id: 'H02', level: 'hard', topic: 'SageMaker', q: "A SageMaker endpoint serving ten thousand requests per second has p99 latency creeping up. How do you diagnose and fix it?", gapMs: 65000 },
    { id: 'H03', level: 'hard', topic: 'CI/CD for ML', q: "How would you design a pipeline that retrains, validates, and deploys with no human in the loop, and what guardrails would you put in?", gapMs: 70000 },

    { id: 'C03', level: 'coding', topic: 'Coding', kind: 'screenshot', problem: 'PY2', q: "Last one on screen. Walk me through it, and mention the time complexity.", gapMs: 150000 },
    { id: 'C03F1', level: 'followup', chain: 'C03', topic: 'Coding', q: "How does your implementation tell a full queue from an empty one?", gapMs: 60000 },
    { id: 'C03F2', level: 'followup', chain: 'C03', topic: 'Coding', q: "What would you change to make that safe for two threads?", gapMs: 60000 },

    { id: 'H04', level: 'hard', topic: 'Kubernetes', q: "Inference pods are being evicted under load and you cannot reproduce it in staging. How do you approach that?", gapMs: 65000 },
    { id: 'H05', level: 'hard', topic: 'Airflow', q: "A DAG that ran fine for months now misses its SLA every night. Where do you start?", gapMs: 65000 },
    { id: 'H06', level: 'hard', topic: 'S3', q: "Training jobs are throttling on S3 reads at scale. What is happening and how do you fix it?", gapMs: 65000 },
    { id: 'H07', level: 'hard', topic: 'Monitoring/drift', q: "How would you tell a genuine drift alert apart from a broken upstream feature pipeline?", gapMs: 65000 },
    { id: 'H08', level: 'hard', topic: 'Docker', q: "The same image behaves differently on your laptop and in the cluster. How do you track that down?", gapMs: 65000 },
    { id: 'H09', level: 'hard', topic: 'CloudFormation/IaC', q: "Someone changed a resource by hand and now your stack will not update. What do you do?", gapMs: 65000 },
    { id: 'H10', level: 'hard', topic: 'CI/CD for ML', q: "How would you roll back a model that is already serving traffic and has written bad data downstream?", gapMs: 70000 },
    { id: 'H11', level: 'hard', topic: 'SageMaker', q: "Your training job costs tripled after a code change with no accuracy gain. How do you find the cause?", gapMs: 65000 },
    { id: 'H12', level: 'hard', topic: 'Kubernetes', q: "How would you design for a region outage in a serving stack that must stay available?", gapMs: 70000 },

    // ── Long system-design questions with follow-ups (appended 2026-09-08) ───────────
    // The 52 above stay intact for comparability across flights; these report as their
    // own rows. Each `long` question is 50–75 words in several sentences, which the STT
    // closes as several finals — the case the pipeline has never been measured on (the
    // roster's longest question was 24 words). `chain` names the question a follow-up
    // leans on; the judge export appends that question so the grader has the context.
    { id: 'L01', level: 'long', topic: 'SageMaker', q: "Let's do a design question. We have a recommendation model that is retrained every night on about two terabytes of click data, and it serves roughly five thousand requests per second during the day. Walk me through how you would build the training pipeline, how you would validate a new model before it replaces the old one, and how you would roll it out so that a bad model never reaches all of the traffic at once.", gapMs: 95000 },
    { id: 'L01F1', level: 'followup', chain: 'L01', topic: 'SageMaker', q: "And in that design, what happens when the nightly training job finishes late?", gapMs: 60000 },
    { id: 'L01F2', level: 'followup', chain: 'L01', topic: 'SageMaker', q: "How would you notice that the new model is worse only for one segment of users?", gapMs: 60000 },
    { id: 'L02', level: 'long', topic: 'Kubernetes', q: "Here is another one. Imagine you are serving three different models on GPUs in Kubernetes. One of them has very spiky traffic, one has a strict latency budget of fifty milliseconds, and the third is a batch scoring job that runs for hours. Tell me how you would lay out the cluster, how you would schedule and autoscale each of those workloads, and how you would keep the GPU bill from running away.", gapMs: 95000 },
    { id: 'L02F1', level: 'followup', chain: 'L02', topic: 'Kubernetes', q: "What would you change in that layout if the spiky one started stealing capacity from the latency-sensitive one?", gapMs: 60000 },
    { id: 'L02F2', level: 'followup', chain: 'L02', topic: 'Kubernetes', q: "And how would you know the autoscaler is actually keeping up?", gapMs: 60000 },
    { id: 'L03', level: 'long', topic: 'Monitoring/drift', q: "Let's talk about monitoring. Say you have twenty models in production, owned by four different teams, and today each team watches its own dashboards by hand. Design me a monitoring setup that catches data drift, prediction drift and plain infrastructure failures across all of them, and explain who gets paged for what, and how you would keep the false alarms low enough that people do not start ignoring it.", gapMs: 95000 },
    { id: 'L03F1', level: 'followup', chain: 'L03', topic: 'Monitoring/drift', q: "Which of those signals would you compute in real time, and which ones once a day?", gapMs: 60000 },
    { id: 'L03F2', level: 'followup', chain: 'L03', topic: 'Monitoring/drift', q: "How does a new team onboard a model into that system?", gapMs: 60000 },
    { id: 'L04', level: 'long', topic: 'Airflow', q: "Now a data engineering one. You own a feature pipeline in Airflow that builds daily features for a fraud model from about a dozen upstream tables, and the upstream data regularly arrives late or gets corrected a few days after the fact. Walk me through how you would design the DAG so that late data and corrections are handled correctly, how you would backfill a month without overwhelming the warehouse, and how you would make sure training and serving see the same feature values.", gapMs: 95000 },
    { id: 'L04F1', level: 'followup', chain: 'L04', topic: 'Airflow', q: "In that design, what exactly happens when one of the twelve upstream tables is corrected for last Tuesday?", gapMs: 60000 },
    { id: 'L04F2', level: 'followup', chain: 'L04', topic: 'Airflow', q: "And where would you store the features so that serving can read them fast?", gapMs: 60000 },
    { id: 'L05', level: 'long', topic: 'CloudFormation/IaC', q: "Let's go to infrastructure. We have development, staging and production, each in its own AWS account, and today every environment is slightly different because people fixed things by hand over the years. Describe how you would bring all of that under infrastructure as code, how you would structure the stacks and the parameters so that the same definitions produce all three environments, and how a change would move from a developer's branch to production safely.", gapMs: 95000 },
    { id: 'L05F1', level: 'followup', chain: 'L05', topic: 'CloudFormation/IaC', q: "How would you deal with the resources that already exist and were created by hand?", gapMs: 60000 },
    { id: 'L05F2', level: 'followup', chain: 'L05', topic: 'CloudFormation/IaC', q: "And what stops someone from applying a change straight to production from their laptop?", gapMs: 60000 },
    { id: 'L06', level: 'long', topic: 'CI/CD for ML', q: "Last design question. Picture a team of eight people shipping model changes a few times a week, and right now a release means someone runs a notebook and copies files around. I want a continuous delivery setup for the models: what gets tested automatically, what gates a candidate has to pass, who approves what, how the rollout to serving works, and how you roll back when a model that passed every gate still misbehaves in production.", gapMs: 95000 },
    { id: 'L06F1', level: 'followup', chain: 'L06', topic: 'CI/CD for ML', q: "Which of those gates would you make a hard block and which just a warning?", gapMs: 60000 },
    { id: 'L06F2', level: 'followup', chain: 'L06', topic: 'CI/CD for ML', q: "And how long would that whole pipeline take from merge to serving, realistically?", gapMs: 60000 },
];

/** Spoken items only — what the harness scores. Screenshot cues are operator-only. */
export const SPOKEN = INTERVIEW.filter((x) => x.kind !== 'screenshot');

export const PLAN = {
    total: INTERVIEW.length,
    spoken: SPOKEN.length,
    screenshots: INTERVIEW.filter((x) => x.kind === 'screenshot').length,
    byLevel: INTERVIEW.reduce((a, x) => ({ ...a, [x.level]: (a[x.level] || 0) + 1 }), {}),
};
