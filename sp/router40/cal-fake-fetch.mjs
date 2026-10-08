// The calibration's stub fetch for lite-l.mjs (R40_FAKE_FETCH points here). No network. Scenario = R40_FAKE_SCENARIO, a comma list consumed one entry per call, then `ok`:
//   ok | 503 | 429 | 400 | nofinish | wrongmodel | nomodel | stall (the stream never ends until aborted) | stallfetch (the request never returns until aborted) | 503* (every call 503)
let call = 0;
const entries = (process.env.R40_FAKE_SCENARIO ?? 'ok').split(',').map((s) => s.trim()).filter(Boolean);
const sse = (obj) => `data: ${JSON.stringify(obj)}\n\n`;
const bodyOf = (chunks) => ({ getReader() { let i = 0; const enc = new TextEncoder(); return { read: async () => (i < chunks.length ? { value: enc.encode(chunks[i++]), done: false } : { value: undefined, done: true }) }; } });
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const sha12 = (s) => createHash('sha256').update(String(s)).digest('hex').slice(0, 12);
/** R40_FAKE_CAPTURE = a file path: each call appends the request's shape (never any prompt text): the URL's model segment, generationConfig, parts counts and the text shas. */
function capture(url, init) {
    if (!process.env.R40_FAKE_CAPTURE) return;
    let b = {}; try { b = JSON.parse(init.body); } catch { /* not json */ }
    fs.appendFileSync(process.env.R40_FAKE_CAPTURE, `${JSON.stringify({ urlModelSegment: /\/models\/([^:]+):/.exec(url)?.[1] ?? null, generationConfig: b.generationConfig ?? null, contentsParts: b.contents?.[0]?.parts?.length ?? null, userSha12: sha12(b.contents?.[0]?.parts?.[0]?.text), systemSha12: sha12(b.systemInstruction?.parts?.[0]?.text) })}\n`);
}
export default async function fakeFetch(url, init) {
    call++;
    capture(url, init);
    const e = entries.includes('503*') ? '503' : (entries[call - 1] ?? 'ok');
    if (/^\d{3}$/.test(e)) return { ok: false, status: Number(e), body: bodyOf([]) };
    if (e === 'stallfetch') return new Promise((_, rej) => init.signal.addEventListener('abort', () => rej(new Error('aborted'))));
    const version = e === 'wrongmodel' ? 'gemini-3.5-flash-lite-calibration' : 'gemini-3.1-flash-lite-calibration';
    const first = { candidates: [{ content: { parts: [{ text: 'THOUGHT-MARKER planning', thought: true }, { text: 'Sure. ' }] } }], ...(e === 'nomodel' ? {} : { modelVersion: version }) };
    const second = { candidates: [{ content: { parts: [{ text: 'It is the thing you asked about.' }] }, ...(e === 'nofinish' ? {} : { finishReason: 'STOP' }) }], usageMetadata: { thoughtsTokenCount: 7 }, ...(e === 'nomodel' ? {} : { modelVersion: version }) };
    if (e === 'stall') return { ok: true, status: 200, body: { getReader: () => ({ read: () => new Promise((_, rej) => init.signal.addEventListener('abort', () => rej(new Error('aborted')))) }) } };
    return { ok: true, status: 200, body: bodyOf([sse(first), sse(second)]) };
}
