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
const MODEL = 'gemini-3.1-flash-lite';   // the app default (LLMHelper.ts GEMINI_FLASH_MODEL)
const OUT = path.join(HERE, 'interview60.answers.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const words = (s) => (s.trim().match(/\S+/g) || []).length;

async function answerStreamed(question) {
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

const store = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const todo = INTERVIEW.filter((i) => (i.kind ?? 'spoken') === 'spoken');
console.log(`ANSWER-ONLY PASS  model=${MODEL}  ${todo.length} spoken questions\n`);

for (const item of todo) {
    if (store[item.id]?.spoken) { continue; }
    let r, lastErr;
    for (let a = 0; a < 4; a++) {
        try {
            r = await answerStreamed(item.q);
            if (!r.transient) break;
            lastErr = r.transient; await sleep(8000 * (a + 1));
        } catch (e) { lastErr = e.message; await sleep(4000 * (a + 1)); }
    }
    if (!r || r.transient) {
        store[item.id] = { ...item, transientError: lastErr };
        console.log(`  ${item.id.padEnd(4)} TRANSIENT ${lastErr}`);
    } else {
        const ctx = { spoken: r.spoken, offers: r.offers, sentinel: P.SUGGESTIONS_SENTINEL, budget: P.SPOKEN_WORD_BUDGET, wordCount: r.words };
        const checks = Object.fromEntries(Object.entries(VERBAL_CHECKS).map(([n, f]) => [n, f(ctx).ok]));
        store[item.id] = { ...item, ...r, checks };
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
