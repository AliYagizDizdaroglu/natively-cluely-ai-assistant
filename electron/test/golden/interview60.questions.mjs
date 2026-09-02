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

    { id: 'C01', level: 'coding', topic: 'Coding', kind: 'screenshot', q: "Now take a look at this problem on screen and walk me through how you would solve it.", gapMs: 150000 },

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

    { id: 'C02', level: 'coding', topic: 'Coding', kind: 'screenshot', q: "Here is another one on screen. Take a look and talk me through your approach.", gapMs: 150000 },

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

    { id: 'C03', level: 'coding', topic: 'Coding', kind: 'screenshot', q: "Last one on screen. Walk me through it, and mention the time complexity.", gapMs: 150000 },

    { id: 'H04', level: 'hard', topic: 'Kubernetes', q: "Inference pods are being evicted under load and you cannot reproduce it in staging. How do you approach that?", gapMs: 65000 },
    { id: 'H05', level: 'hard', topic: 'Airflow', q: "A DAG that ran fine for months now misses its SLA every night. Where do you start?", gapMs: 65000 },
    { id: 'H06', level: 'hard', topic: 'S3', q: "Training jobs are throttling on S3 reads at scale. What is happening and how do you fix it?", gapMs: 65000 },
    { id: 'H07', level: 'hard', topic: 'Monitoring/drift', q: "How would you tell a genuine drift alert apart from a broken upstream feature pipeline?", gapMs: 65000 },
    { id: 'H08', level: 'hard', topic: 'Docker', q: "The same image behaves differently on your laptop and in the cluster. How do you track that down?", gapMs: 65000 },
    { id: 'H09', level: 'hard', topic: 'CloudFormation/IaC', q: "Someone changed a resource by hand and now your stack will not update. What do you do?", gapMs: 65000 },
    { id: 'H10', level: 'hard', topic: 'CI/CD for ML', q: "How would you roll back a model that is already serving traffic and has written bad data downstream?", gapMs: 70000 },
    { id: 'H11', level: 'hard', topic: 'SageMaker', q: "Your training job costs tripled after a code change with no accuracy gain. How do you find the cause?", gapMs: 65000 },
    { id: 'H12', level: 'hard', topic: 'Kubernetes', q: "How would you design for a region outage in a serving stack that must stay available?", gapMs: 70000 },
];

/** Spoken items only — what the harness scores. Screenshot cues are operator-only. */
export const SPOKEN = INTERVIEW.filter((x) => x.kind !== 'screenshot');

export const PLAN = {
    total: INTERVIEW.length,
    spoken: SPOKEN.length,
    screenshots: INTERVIEW.filter((x) => x.kind === 'screenshot').length,
    byLevel: INTERVIEW.reduce((a, x) => ({ ...a, [x.level]: (a[x.level] || 0) + 1 }), {}),
};
