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
 *   node electron/test/golden/interview60.answers.mjs --thinking LOW --tag low  # the default model at a thinking level → interview60.answers.gemini-3.1-flash-lite_low.json
 *
 * Resumable: results are written per question; transient errors (429/5xx)
 * are recorded as such and never scored as model failures.
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { pathToFileURL } from 'url';
// SCRATCHPAD COPY of MAIN's interview60.answers.mjs, made by gemma-answers-gen.mjs: golden
// modules from MAIN by absolute path, answers into GEMMA_ARMS_DIR, and thought parts never
// counted as answer text. Nothing else in the generator's own changes differs — EXCEPT three
// hand-applied changes (Task 4, not among the generator's changes 1-8; a regeneration drops all
// three — flash-h40b-sidecar.mjs's guard checks for them, see its comment): (1) a GEMMA_MAX_TRIES
// env var that bounds the per-item retry loop below (default 4, the sidecar sets 1); (2) that same
// loop's cut-stream re-ask respecting the `attempts` ceiling once MAX_TRIES>1, instead of always
// spending one more request (fix round 2, M1); (3) `cutRetried` written onto the TRANSIENT record
// too, not only the spoken one (fix round 2, N2). See the loop's own comments for what each does.
const GOLDEN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden';
const { INTERVIEW, ROSTER_ITEMS, ROSTER_NAME } = await import(pathToFileURL(`${GOLDEN}/roster.mjs`).href);
const { VERBAL_CHECKS } = await import(pathToFileURL(`${GOLDEN}/problems.verbal.mjs`).href);

const HERE = process.env.GEMMA_ARMS_DIR;
if (!HERE || !fs.existsSync(HERE)) { console.error('GEMMA_ARMS_DIR must name an existing folder'); process.exit(2); }
const PROJ = path.resolve(GOLDEN, '../../..');
const require = createRequire(path.join(PROJ, 'package.json'));
const P = require(path.join(PROJ, 'dist-electron/electron/llm/prompts.js'));
const { filterVerbalLines, stripSuggestionBlock, stripSpokenNotation, filterCodeFences } =
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
// --prompt-suffix <file> appends the file's text to the system prompt: ONE prompt variable
// changed, everything else (model, questions, filters, temperature) identical, so an answer-
// shape change can be measured against the same questions with the same grader. --tag <name>
// names such an arm <model>_<name> in the file, the store and the judge, so it never
// overwrites the plain arm.
const pi = process.argv.indexOf('--prompt-suffix');
const PROMPT_SUFFIX = pi >= 0 && process.argv[pi + 1] ? fs.readFileSync(process.argv[pi + 1], 'utf8').trim() : '';
const ti = process.argv.indexOf('--tag');
const TAG = ti >= 0 && process.argv[ti + 1] ? process.argv[ti + 1] : '';
if (PROMPT_SUFFIX && !TAG) { console.error('--prompt-suffix needs --tag <name>, or the variant would overwrite the plain arm'); process.exit(2); }
// --system-file <file> REPLACES the system prompt with the file's text (also needs --tag):
// the arm for "what the app actually sent" — e.g. the knowledge engine's swapped-in rules
// plus the profile notes, rebuilt offline — against the shipped verbal prompt.
const si = process.argv.indexOf('--system-file');
const SYSTEM_FILE = si >= 0 && process.argv[si + 1] ? fs.readFileSync(process.argv[si + 1], 'utf8').trim() : '';
if (SYSTEM_FILE && !TAG) { console.error('--system-file needs --tag <name>, or the variant would overwrite the plain arm'); process.exit(2); }
if (SYSTEM_FILE && PROMPT_SUFFIX) { console.error('--system-file and --prompt-suffix are exclusive: one prompt variable per arm'); process.exit(2); }
// --user-file <file> replaces the user text with the file's template, "{{question}}" standing
// for the question (also needs --tag): the app frames the question inside a context block
// and an intent header, and an arm that reproduces the app must send that framing.
const ui = process.argv.indexOf('--user-file');
const USER_TEMPLATE = ui >= 0 && process.argv[ui + 1] ? fs.readFileSync(process.argv[ui + 1], 'utf8') : '';
if (USER_TEMPLATE && !TAG) { console.error('--user-file needs --tag <name>'); process.exit(2); }
const userText = (question) => (USER_TEMPLATE ? USER_TEMPLATE.split('{{question}}').join(question) : `The interviewer just asked: "${question}"\n\nWhat should I say?`);
// --inline-system sends the system prompt INSIDE the user turn (`${system}\n\n${user}`, no
// systemInstruction) — how LLMHelper.streamChat talks to non-Gemma Gemini models.
const INLINE_SYSTEM = process.argv.includes('--inline-system');
if (INLINE_SYSTEM && !TAG) { console.error('--inline-system needs --tag <name>'); process.exit(2); }
if (INLINE_SYSTEM && IS_GROQ) { console.error('--inline-system reproduces the Gemini request shape; the Groq arm always sends a system message'); process.exit(2); }
// --captured <file>: replay the EXACT call the app made this hour — the system instruction
// and the user turn as `capturePrompt` recorded them, per question id — instead of the arm's
// own framing. Without it an arm sends `The interviewer just asked: "<scripted text>"` and no
// context block, no transcript, no pinned question and no trailer, which is a different
// experiment from the app's: s50d measured the app at 16 of 20 and that bare shape at 17 of
// 20 on the same questions. A model swap is only predictive of the app when the bytes match.
const ci = process.argv.indexOf('--captured');
const CAPTURED = ci >= 0 && process.argv[ci + 1] ? JSON.parse(fs.readFileSync(process.argv[ci + 1], 'utf8')) : null;
if (CAPTURED && (SYSTEM_FILE || USER_TEMPLATE || PROMPT_SUFFIX || INLINE_SYSTEM)) {
    console.error('--captured replays the app\'s own prompt; it cannot be combined with --system-file, --user-file, --prompt-suffix or --inline-system');
    process.exit(2);
}
// --thinking <MINIMAL|LOW|MEDIUM|HIGH> puts thinkingConfig.thinkingLevel on the Gemini request
// (needs --tag): the arm at a thinking level. Without it the request carries no thinkingConfig,
// the provider default — MINIMAL on the lites — which is what every arm through s50h sent and
// what the flight's "captured-minimal" arm replays, while the APP sends LOW since the 2026-09-17
// bench (geminiThinking.ts). Gemini only: the Groq arms have no such setting. Each record keeps
// the model's reported thoughtsTokenCount so an arm proves the level it actually got.
const thi = process.argv.indexOf('--thinking');
const THINKING = thi >= 0 && process.argv[thi + 1] ? process.argv[thi + 1].trim().toUpperCase() : '';
if (THINKING && !['MINIMAL', 'LOW', 'MEDIUM', 'HIGH'].includes(THINKING)) { console.error(`--thinking "${process.argv[thi + 1]}" is not a Gemini thinking level; use MINIMAL, LOW, MEDIUM or HIGH`); process.exit(2); }
if (THINKING && !TAG) { console.error('--thinking needs --tag <name>, or the variant would overwrite the plain arm'); process.exit(2); }
if (THINKING && IS_GROQ) { console.error('--thinking is a Gemini setting; the Groq arms have no thinking level'); process.exit(2); }
const GENERATION_CONFIG = { temperature: 0.4, maxOutputTokens: 65536, ...(THINKING ? { thinkingConfig: { thinkingLevel: THINKING } } : {}) };
const ARM = TAG ? `${MODEL}_${TAG}` : MODEL;
const SYSTEM_PROMPT = SYSTEM_FILE ? SYSTEM_FILE : PROMPT_SUFFIX ? `${P.VERBAL_WHAT_TO_ANSWER_PROMPT}\n\n${PROMPT_SUFFIX}` : P.VERBAL_WHAT_TO_ANSWER_PROMPT;
const FILE_TAG = ARM.replace(/\//g, '_');
const OUT = path.join(HERE, ARM === DEFAULT_MODEL ? 'interview60.answers.json' : `interview60.answers.${FILE_TAG}.json`);
// --limit <n>: first n questions only — a probe of a new model before the full arm.
const li = process.argv.indexOf('--limit');
const LIMIT = li >= 0 && process.argv[li + 1] ? Number(process.argv[li + 1]) : Infinity;
// --only <id,id,...>: just these questions — an arm of a model with a handful of free calls a
// day, pointed at the questions the default model fails most (flight s50c: the non-lite Flash
// models on 3.1-lite's five worst). Everything else about the call stays identical.
const oi = process.argv.indexOf('--only');
const ONLY = oi >= 0 && process.argv[oi + 1] ? new Set(process.argv[oi + 1].split(',').map((s) => s.trim()).filter(Boolean)) : null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const words = (s) => (s.trim().match(/\S+/g) || []).length;

async function answerStreamedGemini(question, captured) {
    const body = captured
        ? {
            contents: [{ role: 'user', parts: [{ text: captured.user }] }],
            systemInstruction: { parts: [{ text: captured.system }] },
            generationConfig: GENERATION_CONFIG,
        }
        : INLINE_SYSTEM
        ? { contents: [{ role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\n${userText(question)}` }] }], generationConfig: GENERATION_CONFIG }
        : {
            contents: [{ role: 'user', parts: [{ text: userText(question) }] }],
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            generationConfig: GENERATION_CONFIG,
        };
    const url = `https://generativelanguage.googleapis.com/v1alpha/models/${MODEL}:streamGenerateContent?alt=sse`;
    const t0 = Date.now();
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY }, body: JSON.stringify(body), signal: AbortSignal.timeout(CALL_TIMEOUT_MS) });
    if (res.status === 429 || res.status >= 500) return { transient: `HTTP ${res.status}` };
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '', raw = '', ttft = null, finish = null, thoughts = null, thoughtParts = 0, lastByteAt = Date.now();
    try {
    for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        lastByteAt = Date.now();
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, i).trim();
            buf = buf.slice(i + 1);
            if (!line.startsWith('data:')) continue;
            let j; try { j = JSON.parse(line.slice(5).trim()); } catch { continue; }
            const cand = j.candidates?.[0];
            // Thought parts are the model's reasoning, not its answer: Gemma 4 streams them even
            // without includeThoughts, and joining them spoke the reasoning aloud and started the
            // TTFT clock on the first thought.
            const parts = cand?.content?.parts || [];
            thoughtParts += parts.filter((p) => p.thought).length;
            const piece = parts.filter((p) => !p.thought).map((p) => p.text || '').join('');
            if (piece) { if (ttft === null) ttft = Date.now() - t0; raw += piece; }
            if (cand?.finishReason) finish = cand.finishReason;
            // usageMetadata rides on the last chunk; thoughtsTokenCount is absent when the model did not think.
            if (j.usageMetadata) thoughts = j.usageMetadata.thoughtsTokenCount ?? 0;
        }
    }
    } catch (e) {
        if (e.name !== 'TimeoutError') throw e;
        const err = new Error(`${thoughtParts} thought parts and ${raw.length} answer chars in, last byte ${((Date.now() - lastByteAt) / 1000).toFixed(0)} s before the cap`);
        err.name = 'TimeoutError';
        throw err;
    }
    const total = Date.now() - t0;

    // The shipped filter chain, fed character-by-character (the adversarial
    // chunking the app can see), exactly as WhatToAnswerLLM composes it.
    // filterCodeFences joined on 2026-09-20: without it an arm scored a correct SQL or
    // Python answer as an unspeakable code block while the app, which suppresses the
    // fence, scored the same answer acceptable — s50k lost four arm marks that way.
    async function* gen() { for (const ch of raw) yield ch; }
    let spoken = '', offers = null;
    for await (const p of stripSpokenNotation(stripSuggestionBlock(filterVerbalLines(filterCodeFences(gen())), (o) => { offers = o; }))) spoken += p;
    spoken = spoken.trim();
    // raw: what the model wrote before the filter chain — the only way to see what the
    // filter removed (lists, notation) when an arm is diagnosing the prompt, not the filter.
    return { spoken, offers, words: words(spoken), ttft, total, finish, rawLen: raw.length, raw, thoughts, thoughtParts };
}

// Groq, OpenAI-compatible SSE: same system prompt, same user text, same filter chain,
// same record shape. The free tier meters 8K tokens per minute per model (read off the
// x-ratelimit headers, 2026-09-08) and each request carries the ~2.9K-token verbal
// prompt, so at most two answers a minute: the pass paces itself on the headers
// (below) instead of paying a 429 round-trip plus the blind 8 s backoff each time —
// measured unpaced: 10 answers in 8 min; the floor is ~26 min for 52.
export function parseGroqReset(s) {
    // "585ms" | "1.5s" | "4m19.2s" | "1h2m3s" → milliseconds; unknown → 0
    if (!s) return 0;
    let ms = 0;
    for (const [, n, unit] of s.matchAll(/([\d.]+)(ms|h|m|s)/g)) ms += Number(n) * ({ ms: 1, s: 1000, m: 60_000, h: 3_600_000 })[unit];
    return Math.round(ms);
}
let groqLimits = null; // { remainingTokens, resetTokensMs, lastRequestTokens } from the last response

async function answerStreamedGroq(question) {
    const key = groqKey();
    if (!key) throw new Error('GROQ_API_KEY missing in .env');
    const body = {
        model: MODEL, stream: true, temperature: 0.4,
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userText(question) },
        ],
    };
    const t0 = Date.now();
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` }, body: JSON.stringify(body),
    });
    const resetTokensMs = parseGroqReset(res.headers.get('x-ratelimit-reset-tokens'));
    if (res.status === 429 || res.status >= 500) return { transient: `HTTP ${res.status}`, retryAfterMs: Math.max(Number(res.headers.get('retry-after') ?? 0) * 1000, resetTokensMs) };
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
            // The last chunk carries the request's token usage — what the next one will cost.
            if (j.x_groq?.usage?.total_tokens) groqLimits = { remainingTokens: Number(res.headers.get('x-ratelimit-remaining-tokens') ?? 0), resetTokensMs, lastRequestTokens: j.x_groq.usage.total_tokens };
            if (choice?.finish_reason) finish = choice.finish_reason;
        }
    }
    const total = Date.now() - t0;
    // Same chain as the streamed path above, filterCodeFences included.
    async function* gen() { for (const ch of raw) yield ch; }
    let spoken = '', offers = null;
    for await (const p of stripSpokenNotation(stripSuggestionBlock(filterVerbalLines(filterCodeFences(gen())), (o) => { offers = o; }))) spoken += p;
    spoken = spoken.trim();
    // raw: what the model wrote before the filter chain — the only way to see what the
    // filter removed (lists, notation) when an arm is diagnosing the prompt, not the filter.
    return { spoken, offers, words: words(spoken), ttft, total, finish, rawLen: raw.length, raw };
}

const answerStreamed = (question, captured) => (IS_GROQ ? answerStreamedGroq(question) : answerStreamedGemini(question, captured));
const MIN_GAP_MS = Number(process.env.GEMMA_MIN_GAP_MS ?? 25000);
const CALL_TIMEOUT_MS = Number(process.env.GEMMA_CALL_TIMEOUT_MS ?? 180000);
let lastStart = 0;
async function pacedAnswer(question, captured) {
    const wait = lastStart + MIN_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastStart = Date.now();
    return answerStreamed(question, captured);
}

const store = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
// A resumed store must belong to THIS roster. It is keyed by item id, so an
// interview60 file resumed under scenario50 would keep every foreign answer and
// hand the judge a mixed export that looks like one run. Checked against the whole
// roster, not the scenario subset, so building a set scenario by scenario still
// accumulates. The flight moves old files aside, so reaching this means a manual
// run against a stale one.
const knownIds = new Set(ROSTER_ITEMS.map((i) => i.id));
const foreign = Object.keys(store).filter((id) => !knownIds.has(id));
if (foreign.length) {
    console.error(`\n${path.basename(OUT)} holds ${foreign.length} answer(s) that are not in roster ${ROSTER_NAME} (${foreign.slice(0, 3).join(', ')}${foreign.length > 3 ? ', ...' : ''}).`);
    console.error('Move it aside before resuming — otherwise it is exported as if it were this roster.');
    process.exit(3);
}
// Base roster plus the long design questions. Follow-ups are left out: answered
// standalone they have no parent to follow up on, so they would measure nothing and
// cost every arm 18 requests (2026-09-08 roster).
// A captured replay carries the parent turns inside the user text it replays, so a follow-up
// HAS its parent there and is worth answering; without a capture it is not.
const mains = INTERVIEW.filter((i) => (i.kind ?? 'spoken') === 'spoken' && (CAPTURED ? true : i.level !== 'followup'));
if (ONLY) {
    const missing = [...ONLY].filter((id) => !mains.some((i) => i.id === id));
    if (missing.length) { console.error(`--only names questions not in roster ${ROSTER_NAME} (or follow-ups/screenshots): ${missing.join(', ')}`); process.exit(2); }
}
if (CAPTURED) {
    // Refuse rather than silently fall back to the arm's own framing: an arm that replays the
    // app for four questions and invents the fifth is not one experiment, and the difference
    // would not show up anywhere in the graded output.
    const ids = ONLY ? [...ONLY] : mains.map((i) => i.id);
    const uncaptured = ids.filter((id) => !CAPTURED[id]?.system || !CAPTURED[id]?.user);
    if (uncaptured.length) { console.error(`--captured has no prompt for: ${uncaptured.join(', ')} (the app answered ${Object.keys(CAPTURED).length} question(s) that hour)`); process.exit(2); }
}
const todo = mains.filter((i) => !ONLY || ONLY.has(i.id)).slice(0, LIMIT);
console.log(`ANSWER-ONLY PASS  model=${MODEL}${TAG ? `  variant=${TAG} (prompt suffix ${PROMPT_SUFFIX.length} chars)` : ''}${THINKING ? `  thinking=${THINKING}` : ''}${CAPTURED ? '  prompts=captured (the app\'s own system + user turn, replayed)' : ''}  ${todo.length} spoken questions\n`);

// MAX_TRIES bounds retries after a TRANSIENT failure (429/503) or a thrown error. The capped Flash
// sidecar sets GEMMA_MAX_TRIES=1: such a failure is recorded, never retried. Computed and validated
// once, before any request (fix round 2, M6) — not per item, since the env var cannot change mid-run.
const MAX_TRIES_ENV = process.env.GEMMA_MAX_TRIES;
const MAX_TRIES = Math.max(1, Number(MAX_TRIES_ENV ?? 4));
if (!Number.isFinite(MAX_TRIES)) { console.error(`GEMMA_MAX_TRIES is not a finite number: "${MAX_TRIES_ENV}"`); process.exit(2); }

for (const item of todo) {
    if (store[item.id]?.spoken) { continue; }
    let r, lastErr, dropRetried = false, attempts = 0;
    while (true) {
        try {
            r = await pacedAnswer(item.q, CAPTURED?.[item.id] ?? null);
            attempts++;
            // A stream that ends with no finish reason was cut by the provider mid-answer
            // (2026-09-11: gemini-3.8-flash free tier, three of eight answers cut after 1-3
            // minutes). One more try. At MAX_TRIES=1 (the capped sidecar) `MAX_TRIES > 1` is always
            // false, so the re-ask is unconditional, as it must be. At MAX_TRIES>1 (every default
            // caller) the re-ask now also respects the same `attempts` ceiling a transient retry
            // would: a cut arriving as the last allowed attempt (e.g. the 4th call, after 3 prior
            // failures, at the default MAX_TRIES=4) ends the loop right there — fix round 2, M1 —
            // instead of spending an un-budgeted 5th request, reproducing the pre-Task-4 loop's
            // ending exactly in calls and outcome (0 differences over the reviewer's 46,656-sequence
            // enumeration at 4 tries; a residual terminal-sleep timing difference remains — that
            // claim is NOT made here). The STORED RECORD is not identical: N2 (below) adds a
            // `cutRetried` key to every transient-ending record, present in 20,880 of those 46,656
            // sequences. A second cut itself is kept as the truncated answer it is, `cutRetried:
            // true`, whichever branch below ends the loop.
            if (!r.transient && r.finish === null && !dropRetried) {
                dropRetried = true; lastErr = 'stream cut (no finishReason)'; await sleep(5000);
                if (MAX_TRIES > 1 && attempts >= MAX_TRIES) break;
                continue;
            }
            if (!r.transient) break;
            lastErr = r.transient;
            if (attempts >= MAX_TRIES) break;
            await sleep(Math.max(r.retryAfterMs ?? 0, 8000 * attempts));
        } catch (e) {
            attempts++;
            lastErr = e.message;
            if (e.name === 'TimeoutError') { lastErr = `no answer within ${CALL_TIMEOUT_MS / 1000} s: ${e.message}`; break; }
            if (attempts >= MAX_TRIES) break;
            await sleep(4000 * attempts);
        }
    }
    if (!r || r.transient) {
        // cutRetried here too (fix round 2, N2): a cut whose re-ask then hit a transient failure
        // still made 2 real requests. flash-h40b-sidecar.mjs's `used += cutRetried` accounting reads
        // this field regardless of which branch the record came from, and must count that 2nd
        // request even though the FINAL outcome is a transient error, not a spoken answer.
        store[item.id] = { ...item, model: ARM, transientError: lastErr, cutRetried: dropRetried };
        console.log(`  ${item.id.padEnd(4)} TRANSIENT ${lastErr}`);
    } else {
        const ctx = { spoken: r.spoken, offers: r.offers, sentinel: P.SUGGESTIONS_SENTINEL, budget: P.SPOKEN_WORD_BUDGET, wordCount: r.words };
        const checks = Object.fromEntries(Object.entries(VERBAL_CHECKS).map(([n, f]) => [n, f(ctx).ok]));
        store[item.id] = { ...item, model: ARM, ...r, checks, cutRetried: dropRetried };
        const bad = Object.entries(checks).filter(([, ok]) => !ok).map(([n]) => n);
        console.log(`  ${item.id.padEnd(4)} ${String(r.words).padStart(3)}w  ttft ${String(r.ttft).padStart(5)}ms  total ${String(r.total).padStart(5)}ms${r.thoughts != null ? `  thoughts ${String(r.thoughts).padStart(4)}` : ''}  ${bad.length ? 'FAIL ' + bad.join(',') : 'ok'}`);
    }
    fs.writeFileSync(OUT, JSON.stringify(store, null, 1));
    // Groq: the remaining-tokens header is what was left AFTER this request; when the
    // next one would not fit, wait for the window to refill instead of collecting a 429.
    if (IS_GROQ && groqLimits && groqLimits.remainingTokens < groqLimits.lastRequestTokens * 1.1) {
        await sleep(groqLimits.resetTokensMs + 300);
    } else {
        await sleep(1500);
    }
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
