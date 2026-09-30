/**
 * Chain-question continuity test.
 *
 * Interviewers follow up: "…and how would you shrink IT?" is only answerable if
 * the answer path still knows what "it" is. The app's verbal path hands each
 * answer the recent transcript — interviewer turns AND previous suggestions —
 * formatted by SessionTracker.getFormattedContext. This test asks each
 * follow-up TWICE: once with that transcript, exactly as the app formats it,
 * and once standalone. If continuity works, the contextual answer resolves the
 * reference and stays on the thread while the standalone one goes generic or
 * asks what "it" is.
 *
 * Mechanical proxy per follow-up: how many of the chain's anchor terms (the
 * things named in turn 1) appear in each answer. The real judgement is a
 * reader's — both answers are stored for that.
 *
 *   node electron/test/golden/interview60.chains.mjs      # ~25 calls, run AFTER the hour
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(HERE, '../../..');
const require = createRequire(path.join(PROJ, 'package.json'));
const P = require(path.join(PROJ, 'dist-electron/electron/llm/prompts.js'));
const { filterVerbalLines, stripSuggestionBlock, stripSpokenNotation, stripCueBlock } =
    require(path.join(PROJ, 'dist-electron/electron/llm/verbalStreamFilter.js'));

const KEY = fs.readFileSync(path.join(PROJ, '.env'), 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)[1].trim();
const MODEL = 'gemini-3.1-flash-lite';
const OUT = path.join(HERE, 'interview60.chains.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const words = (s) => (s.trim().match(/\S+/g) || []).length;

// Follow-ups lean on pronouns and ellipsis on purpose — they are the test.
export const CHAINS = [
    { id: 'docker', anchors: ['image', 'layer', 'container', 'dockerfile'], turns: [
        'What is the difference between a Docker image and a container?',
        'Ours came out at 8 gigabytes. How would you shrink it?',
        'And once it is small, how do you keep its layers cached in CI so builds stay fast?',
    ] },
    { id: 'sagemaker', anchors: ['endpoint', 'latency', 'instance', 'cloudwatch'], turns: [
        'What is a SageMaker endpoint, and what does it actually host?',
        'Its p99 latency has been creeping up at ten thousand requests a second. Where do you look first?',
        'You looked, and it is compute-bound. What do you change?',
    ] },
    { id: 'drift', anchors: ['drift', 'distribution', 'retrain', 'threshold', 'baseline'], turns: [
        'How would you detect data drift on a model that is already in production?',
        'Say that check fires at three in the morning. What happens next, automatically?',
        'And if the retrain it kicked off comes back worse than the model already serving?',
    ] },
    { id: 'airflow', anchors: ['dag', 'task', 'retry', 'xcom', 'airflow'], turns: [
        'What is a DAG, and why does Airflow use that structure?',
        'One of its tasks fails intermittently because of a flaky API. How do you handle that?',
        'Now that same task produces five gigabytes of output. How do you hand it to the next task?',
    ] },
    { id: 'k8s', anchors: ['pod', 'deployment', 'autoscal', 'node', 'gpu'], turns: [
        'What is the difference between a Pod and a Deployment in Kubernetes?',
        'How would you autoscale that deployment for a model inference server?',
        'It scaled out to forty pods and the GPU nodes ran dry. What is the fix?',
    ] },
];

// Mirrors SessionTracker.getFormattedContext + WhatToAnswerLLM's fullMessage.
const transcriptOf = (turns) => turns.map((t) => `[${t.role === 'interviewer' ? 'INTERVIEWER' : 'ASSISTANT (PREVIOUS SUGGESTION)'}]: ${t.text}`).join('\n');
const fullMessageOf = (transcript) => `INTERVIEWER JUST SAID:\n${transcript}\n\nYOUR RESPONSE AS THE CANDIDATE (spoken aloud, first person, no clarifying questions back):`;

async function answer(fullMessage) {
    const body = {
        contents: [{ role: 'user', parts: [{ text: fullMessage }] }],
        systemInstruction: { parts: [{ text: P.VERBAL_WHAT_TO_ANSWER_PROMPT }] },
        generationConfig: { temperature: 0.4, maxOutputTokens: 65536 },
    };
    let lastErr;
    for (let a = 0; a < 4; a++) {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1alpha/models/${MODEL}:generateContent`, {
            method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY }, body: JSON.stringify(body),
        });
        if (res.status === 429 || res.status >= 500) { lastErr = `HTTP ${res.status}`; await sleep(8000 * (a + 1)); continue; }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        const raw = (j.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
        async function* gen() { for (const ch of raw) yield ch; }
        let spoken = '';
        // stripCueBlock innermost, as WhatToAnswerLLM places it (cue mode): the stored answer, the
        // anchor proxy and the history carry prose only; the cues are discarded like the offers.
        for await (const p of stripSpokenNotation(stripSuggestionBlock(filterVerbalLines(stripCueBlock(gen(), () => {})), () => {}))) spoken += p;
        return spoken.trim();
    }
    throw new Error(`answer failed: ${lastErr}`);
}

const anchorHits = (text, anchors) => anchors.filter((a) => text.toLowerCase().includes(a)).length;
const asksBack = (text) => /\b(which|what) (image|endpoint|model|task|deployment|check)\b.*\?|could you clarify|what do you mean|not sure what/i.test(text);

const store = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
console.log(`CHAIN CONTINUITY  model=${MODEL}  ${CHAINS.length} chains x 3 turns\n`);

for (const chain of CHAINS) {
    const rec = store[chain.id] ?? { id: chain.id, anchors: chain.anchors, turns: [] };
    const history = [];
    for (let i = 0; i < chain.turns.length; i++) {
        const q = chain.turns[i];
        let t = rec.turns[i];
        if (!t) {
            t = { q };
            history.push({ role: 'interviewer', text: q });
            t.contextual = await answer(fullMessageOf(transcriptOf(history)));
            await sleep(1500);
            if (i > 0) { t.standalone = await answer(fullMessageOf(transcriptOf([{ role: 'interviewer', text: q }]))); await sleep(1500); }
            rec.turns[i] = t;
            store[chain.id] = rec;
            fs.writeFileSync(OUT, JSON.stringify(store, null, 1));
        } else {
            history.push({ role: 'interviewer', text: q });
        }
        history.push({ role: 'assistant', text: t.contextual });
        const c = anchorHits(t.contextual, chain.anchors);
        const s = t.standalone != null ? anchorHits(t.standalone, chain.anchors) : null;
        console.log(`  ${chain.id.padEnd(9)} T${i + 1}  contextual: ${String(words(t.contextual)).padStart(3)}w anchors ${c}/${chain.anchors.length}${asksBack(t.contextual) ? ' ASKS-BACK' : ''}` +
            (s != null ? `   standalone: ${String(words(t.standalone)).padStart(3)}w anchors ${s}/${chain.anchors.length}${asksBack(t.standalone) ? ' ASKS-BACK' : ''}` : ''));
    }
}

// ── summary ────────────────────────────────────────────────────────────────
let followUps = 0, ctxBetter = 0, ctxAsksBack = 0, standaloneAsksBack = 0;
for (const chain of CHAINS) {
    const rec = store[chain.id]; if (!rec) continue;
    rec.turns.slice(1).forEach((t) => {
        if (!t?.standalone) return;
        followUps++;
        if (anchorHits(t.contextual, chain.anchors) > anchorHits(t.standalone, chain.anchors)) ctxBetter++;
        if (asksBack(t.contextual)) ctxAsksBack++;
        if (asksBack(t.standalone)) standaloneAsksBack++;
    });
}
console.log(`\n  follow-ups ${followUps}   contextual anchors > standalone: ${ctxBetter}/${followUps}   contextual asks-back: ${ctxAsksBack}   standalone asks-back: ${standaloneAsksBack}`);
console.log(`  (the proxy only says whether context was USED — read interview60.chains.json to judge whether it was used WELL)`);
console.log(`\n  wrote ${OUT}`);
