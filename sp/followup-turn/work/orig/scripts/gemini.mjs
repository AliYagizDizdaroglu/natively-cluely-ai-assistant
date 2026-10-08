// The streamed Gemini call of the replay: a copy of interview60.answers.mjs's answerStreamedGemini (design 2 section 4)
// -- the same request shape (SSE, temperature 0.4, maxOutputTokens 65536, thinkingConfig.thinkingLevel), the same shipped
// filter chain fed character by character, the same record fields -- with the model and thinking level as ARGUMENTS
// (per leg) and `fetchImpl` injectable so the self-tests exercise the real code path without a network call.
// `thoughts` = usageMetadata.thoughtsTokenCount, REQUIRED by clause 5 (m8): a stream that reports none is written as
// null, never 0. Nothing here reads a key or a file.
import { createRequire } from 'node:module';
import { MAIN, FILTER_JS } from './common.mjs';

export const TEMPERATURE = 0.4;
export const MAX_OUTPUT_TOKENS = 65536;
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

/** One streamed call. Returns { transient } on 429/5xx, throws on another HTTP error, else the record fields. */
export async function answerStreamed({ system, user, model, thinking, key, filters, fetchImpl = fetch }) {
    const { url, body } = requestFor({ model, thinking, system, user });
    const t0 = Date.now();
    const res = await fetchImpl(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body) });
    if (res.status === 429 || res.status >= 500) return { transient: `HTTP ${res.status}` };
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '', raw = '', ttft = null, finish = null, thoughts = null;
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
            const tt = j.usageMetadata?.thoughtsTokenCount;
            if (typeof tt === 'number') thoughts = tt;       // m8: absent stays null, never 0
        }
    }
    const total = Date.now() - t0;
    async function* gen() { for (const ch of raw) yield ch; }
    let spoken = '', offers = null;
    for await (const p of filters.stripSpokenNotation(filters.stripSuggestionBlock(filters.filterVerbalLines(filters.filterCodeFences(gen())), (o) => { offers = o; }))) spoken += p;
    spoken = spoken.trim();
    return { spoken, offers, words: words(spoken), ttft, total, finish, rawLen: raw.length, raw, thoughts };
}
