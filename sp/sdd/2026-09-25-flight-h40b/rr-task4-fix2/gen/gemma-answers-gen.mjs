// Builds gemma-answers.mjs: MAIN's interview60.answers.mjs with exactly these changes, each
// applied by exact match and refused unless it matches once:
//   1. the golden modules come from MAIN by absolute path (the copy lives in the scratchpad);
//   2. answers are written to GEMMA_ARMS_DIR, never into MAIN's golden folder;
//   3. PROJ (dist, .env) is MAIN;
//   4. thought parts never count as answer text, and are counted per answer;
//   5. call starts are paced to the free tier's 16k input tokens per model per minute;
//   6. a cut stream is retried once even when it carried no answer text, and flagged;
//   7. every call is capped (180 s default); a capped call is a no-answer, not retried.
// Changes 4, 6 and 7 are the behavioural ones. Gemma 4 streams thought parts even without
// includeThoughts (2026-09-24 probe: 62-162 parts at HIGH), and the original join spoke them
// and started the TTFT clock on the first thought.
import fs from 'node:fs';

const SRC = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.answers.mjs';
const OUT = new URL('./gemma-answers.mjs', import.meta.url);
let t = fs.readFileSync(SRC, 'utf8');

function rep(from, to) {
    const n = t.split(from).length - 1;
    if (n !== 1) { console.error(`expected 1 match, found ${n}: ${from.slice(0, 80)}`); process.exit(1); }
    t = t.replace(from, () => to);
}

rep(`import { INTERVIEW, ROSTER_ITEMS, ROSTER_NAME } from './roster.mjs';
import { VERBAL_CHECKS } from './problems.verbal.mjs';`,
`import { pathToFileURL } from 'url';
// SCRATCHPAD COPY of MAIN's interview60.answers.mjs, made by gemma-answers-gen.mjs: golden
// modules from MAIN by absolute path, answers into GEMMA_ARMS_DIR, and thought parts never
// counted as answer text. Nothing else differs.
const GOLDEN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden';
const { INTERVIEW, ROSTER_ITEMS, ROSTER_NAME } = await import(pathToFileURL(\`\${GOLDEN}/roster.mjs\`).href);
const { VERBAL_CHECKS } = await import(pathToFileURL(\`\${GOLDEN}/problems.verbal.mjs\`).href);`);

rep(`const HERE = path.dirname(fileURLToPath(import.meta.url));`,
`const HERE = process.env.GEMMA_ARMS_DIR;
if (!HERE || !fs.existsSync(HERE)) { console.error('GEMMA_ARMS_DIR must name an existing folder'); process.exit(2); }`);

rep(`const PROJ = path.resolve(HERE, '../../..');`, `const PROJ = path.resolve(GOLDEN, '../../..');`);

rep(`let buf = '', raw = '', ttft = null, finish = null, thoughts = null;`,
`let buf = '', raw = '', ttft = null, finish = null, thoughts = null, thoughtParts = 0;`);

rep(`const piece = (cand?.content?.parts || []).map((p) => p.text || '').join('');`,
`// Thought parts are the model's reasoning, not its answer: Gemma 4 streams them even
            // without includeThoughts, and joining them spoke the reasoning aloud and started the
            // TTFT clock on the first thought.
            const parts = cand?.content?.parts || [];
            thoughtParts += parts.filter((p) => p.thought).length;
            const piece = parts.filter((p) => !p.thought).map((p) => p.text || '').join('');`);

rep(`return { spoken, offers, words: words(spoken), ttft, total, finish, rawLen: raw.length, raw, thoughts };`,
`return { spoken, offers, words: words(spoken), ttft, total, finish, rawLen: raw.length, raw, thoughts, thoughtParts };`);

// 5. Pacing (timing only, never content): the Gemma free tier meters 16,000 input tokens per
//    model per minute (GenerateContentInputTokensPerModelPerMinute-FreeTier, read off a 429 on
//    2026-09-24) and a captured prompt is ~5,100 tokens, so call STARTS are spaced
//    GEMMA_MIN_GAP_MS apart (default 25 s, room for the hour's longer late prompts).
rep(`const answerStreamed = (question, captured) => (IS_GROQ ? answerStreamedGroq(question) : answerStreamedGemini(question, captured));`,
`const answerStreamed = (question, captured) => (IS_GROQ ? answerStreamedGroq(question) : answerStreamedGemini(question, captured));
const MIN_GAP_MS = Number(process.env.GEMMA_MIN_GAP_MS ?? 25000);
let lastStart = 0;
async function pacedAnswer(question, captured) {
    const wait = lastStart + MIN_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastStart = Date.now();
    return answerStreamed(question, captured);
}`);
rep(`r = await answerStreamed(item.q, CAPTURED?.[item.id] ?? null);`, `r = await pacedAnswer(item.q, CAPTURED?.[item.id] ?? null);`);

// 6. A cut stream (no finishReason) is retried once even when it carried NO answer text: 31B
//    at HIGH returned 2 thought parts and nothing else, then the stream ended (2026-09-24,
//    S1Q01F), and the original retries only a cut that already spoke. Every record says
//    whether it needed that retry, so the arm's transport reliability is reported, not hidden.
rep(`if (!r.transient && r.finish === null && r.spoken && !dropRetried) {`, `if (!r.transient && r.finish === null && !dropRetried) {`);
rep(`store[item.id] = { ...item, model: ARM, ...r, checks };`, `store[item.id] = { ...item, model: ARM, ...r, checks, cutRetried: dropRetried };`);

// 7. A per-call cap: the original fetch has no timeout, and 26B HIGH sat on S1Q02F for 11+ min
//    with nothing arriving (2026-09-24 02:06), stalling the whole arm; after9 saw 26B run 11 min
//    to MAX_TOKENS. GEMMA_CALL_TIMEOUT_MS (default 180 s, ~2x the slowest valid answer seen,
//    85 s) aborts the call; a timed-out call is NOT retried and is kept as a no-answer with that
//    reason, because a runaway is the model failing, not the transport.
rep(`const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY }, body: JSON.stringify(body) });`,
`const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY }, body: JSON.stringify(body), signal: AbortSignal.timeout(CALL_TIMEOUT_MS) });`);
rep(`const MIN_GAP_MS = Number(process.env.GEMMA_MIN_GAP_MS ?? 25000);`,
`const MIN_GAP_MS = Number(process.env.GEMMA_MIN_GAP_MS ?? 25000);
const CALL_TIMEOUT_MS = Number(process.env.GEMMA_CALL_TIMEOUT_MS ?? 180000);`);
rep(`} catch (e) { lastErr = e.message; await sleep(4000 * (a + 1)); }`,
`} catch (e) {
            lastErr = e.message;
            if (e.name === 'TimeoutError') { lastErr = \`no answer within \${CALL_TIMEOUT_MS / 1000} s: \${e.message}\`; break; }
            await sleep(4000 * (a + 1));
        }`);

// 8. When the cap hits mid-stream, say whether bytes were still arriving: 26B HIGH capped 12
//    of its first 33 calls at 180 s, yet three of them re-asked finished in 38-82 s with
//    thoughts flowing, so "slow" and "stalled" have to be told apart per call.
rep(`let buf = '', raw = '', ttft = null, finish = null, thoughts = null, thoughtParts = 0;
    for (;;) {
        const { value, done } = await reader.read();
        if (done) break;`,
`let buf = '', raw = '', ttft = null, finish = null, thoughts = null, thoughtParts = 0, lastByteAt = Date.now();
    try {
    for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        lastByteAt = Date.now();`);
rep(`if (j.usageMetadata) thoughts = j.usageMetadata.thoughtsTokenCount ?? 0;
        }
    }
    const total = Date.now() - t0;`,
`if (j.usageMetadata) thoughts = j.usageMetadata.thoughtsTokenCount ?? 0;
        }
    }
    } catch (e) {
        if (e.name !== 'TimeoutError') throw e;
        const err = new Error(\`\${thoughtParts} thought parts and \${raw.length} answer chars in, last byte \${((Date.now() - lastByteAt) / 1000).toFixed(0)} s before the cap\`);
        err.name = 'TimeoutError';
        throw err;
    }
    const total = Date.now() - t0;`);

fs.writeFileSync(OUT, t);
console.log(`wrote ${OUT.pathname}`);
