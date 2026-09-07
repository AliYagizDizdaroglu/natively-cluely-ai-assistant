/**
 * Answer-only pass over the 60-minute interview's spoken questions.
 *
 * The app pass (interview60.run.mjs) measures detection, routing, Live
 * stability and fallback behaviour — but the app does not persist answer text
 * outside a formal meeting, so answer QUALITY is unobservable from that run.
 * This fills the gap without a second hour: the same questions, the same model
 * and prompt the app uses (gemini-3.1-flash-lite + VERBAL_WHAT_TO_ANSWER_PROMPT),
 * the same shipped filter chain, scored with the golden verbal checks, plus
 * streamed TTFT/total latency. ~52 calls, a few minutes.
 *
 * Run AFTER the app pass finishes — same Gemini key, so running concurrently
 * would just make both measure quota contention instead of the app.
 *
 *   node electron/test/golden/interview60.answers.mjs
 *   node electron/test/golden/interview60.answers.mjs --model gemma-4-31b-it   # another arm of the comparison → interview60.answers.<model>.json
 *
 * Resumable: results are written per question; transient errors (429/5xx)
 * are recorded as such and never scored as model failures.
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { INTERVIEW } from './interview60.questions.mjs';
import { VERBAL_CHECKS } from './problems.verbal.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(HERE, '../../..');
const require = createRequire(path.join(PROJ, 'package.json'));
const P = require(path.join(PROJ, 'dist-electron/electron/llm/prompts.js'));
const { filterVerbalLines, stripSuggestionBlock, stripSpokenNotation } =
    require(path.join(PROJ, 'dist-electron/electron/llm/verbalStreamFilter.js'));

const KEY = fs.readFileSync(path.join(PROJ, '.env'), 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)[1].trim();
// Read only when a Groq arm runs, so a Gemini arm never needs the key. Never printed.
const groqKey = () => (fs.readFileSync(path.join(PROJ, '.env'), 'utf8').match(/^GROQ_API_KEY=(.+)$/m) ?? [])[1]?.trim();
const DEFAULT_MODEL = 'gemini-3.1-flash-lite';   // the app default (LLMHelper.ts GEMINI_FLASH_MODEL)
// --model <id>: the same pass on another arm (same questions, prompt, filters) for the
// model comparison; written beside, never over, the default arm's file the report reads.
const mi = process.argv.indexOf('--model');
const MODEL = mi >= 0 && process.argv[mi + 1] ? process.argv[mi + 1] : DEFAULT_MODEL;
// Provider follows the model id: Groq ids carry a vendor prefix ("openai/gpt-oss-120b",
// "qwen/qwen3.8-27b"); everything else, Gemma included, is served by the Gemini API.
const IS_GROQ = MODEL.includes('/');
// The arm's file name cannot carry the "/" — flight.mjs answersFileFor and the judge's
// tag apply the same substitution.
const FILE_TAG = MODEL.replace(/\//g, '_');
const OUT = path.join(HERE, MODEL === DEFAULT_MODEL ? 'interview60.answers.json' : `interview60.answers.${FILE_TAG}.json`);
// --limit <n>: first n questions only — a probe of a new model before the full arm.
const li = process.argv.indexOf('--limit');
const LIMIT = li >= 0 && process.argv[li + 1] ? Number(process.argv[li + 1]) : Infinity;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const words = (s) => (s.trim().match(/\S+/g) || []).length;

async function answerStreamedGemini(question) {
    const body = {
        contents: [{ role: 'user', parts: [{ text: `The interviewer just asked: "${question}"\n\nWhat should I say?` }] }],
        systemInstruction: { parts: [{ text: P.VERBAL_WHAT_TO_ANSWER_PROMPT }] },
        generationConfig: { temperature: 0.4, maxOutputTokens: 65536 },
    };
    const url = `https://generativelanguage.googleapis.com/v1alpha/models/${MODEL}:streamGenerateContent?alt=sse`;
    const t0 = Date.now();
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY }, body: JSON.stringify(body) });
    if (res.status === 429 || res.status >= 500) return { transient: `HTTP ${res.status}` };
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '', raw = '', ttft = null, finish = null;
    for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, i).trim();
            buf = buf.slice(i + 1);
            if (!line.startsWith('data:')) continue;
            let j; try { j = JSON.parse(line.slice(5).trim()); } catch { continue; }
            const cand = j.candidates?.[0];
            const piece = (cand?.content?.parts || []).map((p) => p.text || '').join('');
            if (piece) { if (ttft === null) ttft = Date.now() - t0; raw += piece; }
            if (cand?.finishReason) finish = cand.finishReason;
        }
    }
    const total = Date.now() - t0;

    // The shipped filter chain, fed character-by-character (the adversarial
    // chunking the app can see), exactly as WhatToAnswerLLM composes it.
    async function* gen() { for (const ch of raw) yield ch; }
    let spoken = '', offers = null;
    for await (const p of stripSpokenNotation(stripSuggestionBlock(filterVerbalLines(gen()), (o) => { offers = o; }))) spoken += p;
    spoken = spoken.trim();
    return { spoken, offers, words: words(spoken), ttft, total, finish, rawLen: raw.length };
}

// Groq, OpenAI-compatible SSE: same system prompt, same user text, same filter chain,
// same record shape. The free tier meters 8K tokens per minute per model and answers a
// 429 with retry-after seconds, which the retry loop honours.
async function answerStreamedGroq(question) {
    const key = groqKey();
    if (!key) throw new Error('GROQ_API_KEY missing in .env');
    const body = {
        model: MODEL, stream: true, temperature: 0.4,
        messages: [
            { role: 'system', content: P.VERBAL_WHAT_TO_ANSWER_PROMPT },
            { role: 'user', content: `The interviewer just asked: "${question}"\n\nWhat should I say?` },
        ],
    };
    const t0 = Date.now();
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` }, body: JSON.stringify(body),
    });
    if (res.status === 429 || res.status >= 500) return { transient: `HTTP ${res.status}`, retryAfterMs: Number(res.headers.get('retry-after') ?? 0) * 1000 };
    if (res.status === 401 || res.status === 403) {
        // Retrying a rejected key only burns time: stop the arm and say which variable to fix.
        console.error(`\nGroq rejected GROQ_API_KEY from .env (HTTP ${res.status}). Refresh the key and re-run; nothing was written.`);
        process.exit(3);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '', raw = '', ttft = null, finish = null;
    for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, i).trim();
            buf = buf.slice(i + 1);
            if (!line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();
            if (payload === '[DONE]') continue;
            let j; try { j = JSON.parse(payload); } catch { continue; }
            const choice = j.choices?.[0];
            const piece = choice?.delta?.content ?? '';
            if (piece) { if (ttft === null) ttft = Date.now() - t0; raw += piece; }
            if (choice?.finish_reason) finish = choice.finish_reason;
        }
    }
    const total = Date.now() - t0;
    async function* gen() { for (const ch of raw) yield ch; }
    let spoken = '', offers = null;
    for await (const p of stripSpokenNotation(stripSuggestionBlock(filterVerbalLines(gen()), (o) => { offers = o; }))) spoken += p;
    spoken = spoken.trim();
    return { spoken, offers, words: words(spoken), ttft, total, finish, rawLen: raw.length };
}

const answerStreamed = (question) => (IS_GROQ ? answerStreamedGroq(question) : answerStreamedGemini(question));

const store = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const todo = INTERVIEW.filter((i) => (i.kind ?? 'spoken') === 'spoken').slice(0, LIMIT);
console.log(`ANSWER-ONLY PASS  model=${MODEL}  ${todo.length} spoken questions\n`);

for (const item of todo) {
    if (store[item.id]?.spoken) { continue; }
    let r, lastErr;
    for (let a = 0; a < 4; a++) {
        try {
            r = await answerStreamed(item.q);
            if (!r.transient) break;
            lastErr = r.transient; await sleep(Math.max(r.retryAfterMs ?? 0, 8000 * (a + 1)));
        } catch (e) { lastErr = e.message; await sleep(4000 * (a + 1)); }
    }
    if (!r || r.transient) {
        store[item.id] = { ...item, model: MODEL, transientError: lastErr };
        console.log(`  ${item.id.padEnd(4)} TRANSIENT ${lastErr}`);
    } else {
        const ctx = { spoken: r.spoken, offers: r.offers, sentinel: P.SUGGESTIONS_SENTINEL, budget: P.SPOKEN_WORD_BUDGET, wordCount: r.words };
        const checks = Object.fromEntries(Object.entries(VERBAL_CHECKS).map(([n, f]) => [n, f(ctx).ok]));
        store[item.id] = { ...item, model: MODEL, ...r, checks };
        const bad = Object.entries(checks).filter(([, ok]) => !ok).map(([n]) => n);
        console.log(`  ${item.id.padEnd(4)} ${String(r.words).padStart(3)}w  ttft ${String(r.ttft).padStart(5)}ms  total ${String(r.total).padStart(5)}ms  ${bad.length ? 'FAIL ' + bad.join(',') : 'ok'}`);
    }
    fs.writeFileSync(OUT, JSON.stringify(store, null, 1));
    await sleep(1500);
}

// ── summary ────────────────────────────────────────────────────────────────
const done = Object.values(store).filter((v) => v.spoken);
const transient = Object.values(store).filter((v) => v.transientError);
const pct = (a, p) => a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))];
const ttfts = done.map((v) => v.ttft), totals = done.map((v) => v.total), ws = done.map((v) => v.words);
console.log(`\n  answered ${done.length}/${todo.length}   transient ${transient.length}`);
if (done.length) {
    console.log(`  TTFT   p50 ${pct(ttfts, .5)}ms  p90 ${pct(ttfts, .9)}ms  max ${Math.max(...ttfts)}ms`);
    console.log(`  TOTAL  p50 ${pct(totals, .5)}ms  p90 ${pct(totals, .9)}ms  max ${Math.max(...totals)}ms`);
    console.log(`  words  median ${pct(ws, .5)}  max ${Math.max(...ws)}  over ${P.SPOKEN_WORD_BUDGET}w: ${ws.filter((w) => w > P.SPOKEN_WORD_BUDGET).length}/${done.length}`);
    for (const n of Object.keys(VERBAL_CHECKS)) {
        const ok = done.filter((v) => v.checks[n]).length;
        console.log(`  ${n.padEnd(18)} ${ok}/${done.length}`);
    }
}
console.log(`\n  wrote ${OUT}`);
