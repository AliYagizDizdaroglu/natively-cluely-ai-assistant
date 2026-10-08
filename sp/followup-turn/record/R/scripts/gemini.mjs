// The streamed Gemini call of the replay: a copy of interview60.answers.mjs's answerStreamedGemini (design 2 section 4)
// -- the same request shape (SSE, temperature 0.4, maxOutputTokens 65536, thinkingConfig.thinkingLevel), the same shipped
// filter chain fed character by character, the same record fields -- with the model and thinking level as ARGUMENTS
// (per leg) and `fetchImpl` injectable so the self-tests exercise the real code path without a network call.
// `thoughts` = usageMetadata.thoughtsTokenCount, REQUIRED by clause 5 (m8): a stream that reports none is written as
// null, never 0. Nothing here reads a key or a file.
// A2: the whole request + stream runs under AbortSignal.timeout(120000) (a hung SSE stream becomes a transient inside the 5-attempt
// budget); a 429/5xx hands back the server's Retry-After (capped at 60 s); a stream that ends with no text AND no finishReason is a
// transient too (EMPTY_STREAM), never an answer. A finishReason with an empty answer stays a real record (section 5: 0/0/0).
import { createRequire } from 'node:module';
import { MAIN, FILTER_JS, CALL_TIMEOUT_MS } from './common.mjs';

export const TEMPERATURE = 0.4;
export const MAX_OUTPUT_TOKENS = 65536;
export const EMPTY_STREAM = 'empty stream (no text, no finishReason)';
export const RETRY_AFTER_CAP_MS = 60000;
/** Retry-After as milliseconds (delta-seconds or an HTTP date), capped at 60 s; null when absent or unusable. */
export function retryAfterMs(headers, now = Date.now()) {
    const v = headers?.get?.('retry-after');
    if (v == null) return null;
    const ms = /^\s*\d+(\.\d+)?\s*$/.test(v) ? Number(v) * 1000 : Date.parse(v) - now;
    return Number.isFinite(ms) && ms >= 0 ? Math.min(Math.round(ms), RETRY_AFTER_CAP_MS) : null;
}
const words = (s) => (s.trim().match(/\S+/g) || []).length;

export function loadFilters(filterJs = FILTER_JS) {
    const require = createRequire(`${MAIN}/package.json`);
    const m = require(filterJs);
    const { filterVerbalLines, stripSuggestionBlock, stripSpokenNotation, filterCodeFences } = m;
    if (![filterVerbalLines, stripSuggestionBlock, stripSpokenNotation, filterCodeFences].every((f) => typeof f === 'function')) throw new Error(`${filterJs} lacks one of the four filters`);
    return { filterVerbalLines, stripSuggestionBlock, stripSpokenNotation, filterCodeFences };
}

export const requestFor = ({ model, thinking, system, user }) => ({
    url: `https://generativelanguage.googleapis.com/v1alpha/models/${model}:streamGenerateContent?alt=sse`,
    body: { contents: [{ role: 'user', parts: [{ text: user }] }], systemInstruction: { parts: [{ text: system }] }, generationConfig: { temperature: TEMPERATURE, maxOutputTokens: MAX_OUTPUT_TOKENS, thinkingConfig: { thinkingLevel: thinking } } },
});

/** One streamed call. Returns { transient[, retryAfterMs] } on 429/5xx, a timeout or an empty stream; throws on another HTTP error; else the record fields. */
export async function answerStreamed({ system, user, model, thinking, key, filters, fetchImpl = fetch, timeoutMs = CALL_TIMEOUT_MS }) {
    const { url, body } = requestFor({ model, thinking, system, user });
    const t0 = Date.now();
    const signal = AbortSignal.timeout(timeoutMs);
    // A fetch (or a test mock) that ignores `signal` must still be cut: every await below is raced against the abort.
    const aborted = new Promise((_, reject) => { signal.addEventListener('abort', () => reject(new Error(`timeout ${timeoutMs} ms`)), { once: true }); });
    aborted.catch(() => {});                                  // no unhandled rejection when the call finishes first
    const guard = (p) => Promise.race([p, aborted]);
    // AbortSignal.timeout's own timer is unref'd: a stream that never produces a byte would let the process exit (unsettled await) before it
    // fires. This ref'd timer keeps the loop alive until the signal has fired or the call is done.
    const keepAlive = setTimeout(() => {}, timeoutMs + 1000);
    let reader = null;
    const dec = new TextDecoder();
    let buf = '', raw = '', ttft = null, finish = null, thoughts = null;
    try {
        const res = await guard(fetchImpl(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body), signal }));
        if (res.status === 429 || res.status >= 500) return { transient: `HTTP ${res.status}`, retryAfterMs: retryAfterMs(res.headers) };
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        reader = res.body.getReader();
        for (;;) {
            const { value, done } = await guard(reader.read());
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
                const tt = j.usageMetadata?.thoughtsTokenCount;
                if (typeof tt === 'number') thoughts = tt;       // m8: absent stays null, never 0
            }
        }
    } catch (e) {
        if (signal.aborted) { reader?.cancel().catch(() => {}); return { transient: `timeout ${timeoutMs} ms` }; }
        throw e;
    } finally { clearTimeout(keepAlive); }
    if (finish === null && raw === '') return { transient: EMPTY_STREAM };    // A2 point 4 (I3): transport failure, not an answer
    const total = Date.now() - t0;
    async function* gen() { for (const ch of raw) yield ch; }
    let spoken = '', offers = null;
    for await (const p of filters.stripSpokenNotation(filters.stripSuggestionBlock(filters.filterVerbalLines(filters.filterCodeFences(gen())), (o) => { offers = o; }))) spoken += p;
    spoken = spoken.trim();
    return { spoken, offers, words: words(spoken), ttft, total, finish, rawLen: raw.length, raw, thoughts };
}
