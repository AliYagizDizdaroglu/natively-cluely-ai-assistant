// Gemma 4 thinking-level probe, 2026-09-24. Throwaway (scratchpad only).
//
// Sends interview60.answers.mjs's EXACT Gemini request (v1alpha streamGenerateContent SSE,
// temperature 0.4, maxOutputTokens 65536, thinkingConfig.thinkingLevel only when a level is
// set) on the app's captured s50m bytes, and records what answers.mjs cannot see: the HTTP
// refusal body, thought parts vs answer parts, time to the first of each, and usage counts.
// leakInAnswersMjs = answers.mjs joins EVERY part's text, so a thought part returned as text
// would be spoken; this flags a response where that join differs from the non-thought text.
//
// Calibration lane: gemini-3.1-flash-lite on S1Q02, where LOW is known to think (782 thought
// tokens, 2026-09-15) while MINIMAL does not and MEDIUM is silently ignored.
//
//   node gemma-levels-probe.mjs <out.json> [lanes=gemma-4-31b-it,gemma-4-26b-a4b-it,calib]
// The key is read in-process from MAIN/.env and never printed.
import fs from 'node:fs';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const KEY = fs.readFileSync(`${MAIN}/.env`, 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)?.[1]?.trim();
if (!KEY) { console.error('no GEMINI_API_KEY line in MAIN/.env'); process.exit(2); }
const PROMPTS = JSON.parse(fs.readFileSync(`${MAIN}/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m/interview60.prompts.json`, 'utf8'));
const OUT = process.argv[2];
if (!OUT) { console.error('usage: node gemma-levels-probe.mjs <out.json> [lanes]'); process.exit(2); }
const LANES = (process.argv[3] ?? 'gemma-4-31b-it,gemma-4-26b-a4b-it,calib').split(',');

const LEVELS = [null, 'MINIMAL', 'LOW', 'MEDIUM', 'HIGH'];
const IDS = ['S1Q02', 'S1Q06'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const words = (s) => (s.trim().match(/\S+/g) || []).length;
const results = [];
const save = () => fs.writeFileSync(OUT, JSON.stringify(results, null, 1));

async function once(model, level, id) {
    const c = PROMPTS[id];
    const body = {
        contents: [{ role: 'user', parts: [{ text: c.user }] }],
        systemInstruction: { parts: [{ text: c.system }] },
        generationConfig: { temperature: 0.4, maxOutputTokens: 65536, ...(level ? { thinkingConfig: { thinkingLevel: level } } : {}) },
    };
    const url = `https://generativelanguage.googleapis.com/v1alpha/models/${model}:streamGenerateContent?alt=sse`;
    const t0 = Date.now();
    let res;
    try {
        res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY }, body: JSON.stringify(body), signal: AbortSignal.timeout(300_000) });
    } catch (e) { return { error: `fetch: ${e.message}`, total: Date.now() - t0 }; }
    if (!res.ok) return { status: res.status, error: (await res.text()).replace(/\s+/g, ' ').slice(0, 300), total: Date.now() - t0 };
    let buf = '', thoughtText = '', answerText = '', allText = '';
    let tFirstThought = null, tFirstAnswer = null, finish = null, usage = null, thoughtParts = 0, answerParts = 0;
    const partKeys = new Set();
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    try {
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
                for (const p of cand?.content?.parts || []) {
                    for (const k of Object.keys(p)) partKeys.add(k);
                    const txt = p.text || '';
                    allText += txt;
                    if (p.thought) { thoughtParts++; thoughtText += txt; if (tFirstThought === null) tFirstThought = Date.now() - t0; }
                    else if (txt) { answerParts++; answerText += txt; if (tFirstAnswer === null) tFirstAnswer = Date.now() - t0; }
                }
                if (cand?.finishReason) finish = cand.finishReason;
                if (j.usageMetadata) usage = j.usageMetadata;
            }
        }
    } catch (e) { return { status: res.status, error: `stream: ${e.message}`, total: Date.now() - t0, answerWords: words(answerText) }; }
    return {
        status: res.status, finish, total: Date.now() - t0, tFirstThought, tFirstAnswer, thoughtParts, answerParts,
        thoughtsTokenCount: usage?.thoughtsTokenCount ?? 0, candidatesTokenCount: usage?.candidatesTokenCount ?? null, promptTokenCount: usage?.promptTokenCount ?? null,
        answerWords: words(answerText), thoughtWords: words(thoughtText), leakInAnswersMjs: allText !== answerText, partKeys: [...partKeys],
        has57: /\b57\b|57\s?%|57 percent/.test(answerText), answer: answerText, thought: thoughtText.slice(0, 4000),
    };
}

async function cell(model, level, id) {
    let r = await once(model, level, id), attempts = 1;
    // One retry on a transient: a 429 or 5xx is load, not an answer about the level.
    if (r.status === 429 || r.status >= 500 || (r.error && !r.status)) { await sleep(20_000); r = await once(model, level, id); attempts = 2; }
    const row = { model, level: level ?? 'none', id, attempts, ...r };
    results.push(row); save();
    const t = (ms) => (ms == null ? '-' : `${(ms / 1000).toFixed(1)}s`);
    console.log(`${model.padEnd(22)} ${String(level ?? 'none').padEnd(7)} ${id}  ${r.error ? `HTTP ${r.status ?? '-'} ${r.error.slice(0, 110)}` : `${r.finish}  thoughts ${String(r.thoughtsTokenCount).padStart(5)} (${r.thoughtParts} parts)  first-thought ${t(r.tFirstThought)}  first-answer ${t(r.tFirstAnswer)}  total ${t(r.total)}  ${r.answerWords}w${r.leakInAnswersMjs ? '  LEAK' : ''}${id === 'S1Q02' ? (r.has57 ? '  57%' : '  no-57') : ''}`}`);
}

async function lane(name) {
    if (name === 'calib') {
        for (const level of ['MINIMAL', 'LOW', 'MEDIUM']) { await cell('gemini-3.1-flash-lite', level, 'S1Q02'); await sleep(1500); }
        return;
    }
    for (const id of IDS) for (const level of LEVELS) { await cell(name, level, id); await sleep(1500); }
}

await Promise.all(LANES.map(lane));
console.log(`\nwrote ${results.length} rows to ${OUT}`);
