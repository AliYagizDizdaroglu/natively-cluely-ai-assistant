// Gemma 4 transport probe, 2026-09-24. Throwaway (scratchpad only).
//
// gemma-levels-probe.mjs found every THINKING Gemma stream cut at ~33 s with zero bytes
// received (HTTP 200, then "terminated"), and 31B MINIMAL cut after one word at 24 s with no
// finishReason. Hypothesis: a stream that stays silent while the model thinks is dropped as
// idle. Two ways around it, each tested here on the same captured bytes and the same
// generationConfig as interview60.answers.mjs:
//   stream+thoughts  streamGenerateContent with thinkingConfig.includeThoughts = true, so
//                    thought parts flow while the model thinks (the answer = non-thought parts)
//   unary            generateContent, no stream: one response when the model is done
// Control row: plain stream (the answers.mjs shape), re-run so the cut is seen twice.
//
//   node gemma-transport-probe.mjs <out.json>
// The key is read in-process from MAIN/.env and never printed.
import fs from 'node:fs';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const KEY = fs.readFileSync(`${MAIN}/.env`, 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)?.[1]?.trim();
if (!KEY) { console.error('no GEMINI_API_KEY line in MAIN/.env'); process.exit(2); }
const PROMPTS = JSON.parse(fs.readFileSync(`${MAIN}/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m/interview60.prompts.json`, 'utf8'));
const OUT = process.argv[2];
if (!OUT) { console.error('usage: node gemma-transport-probe.mjs <out.json>'); process.exit(2); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const words = (s) => (s.trim().match(/\S+/g) || []).length;
// A 429's QuotaFailure/RetryInfo details name WHICH quota tripped; the message alone does not.
function errText(raw) {
    let j; try { j = JSON.parse(raw); } catch { return raw.replace(/\s+/g, ' ').slice(0, 200); }
    const bits = [j.error?.message?.slice(0, 80) ?? ''];
    for (const d of j.error?.details ?? []) {
        if (d['@type']?.endsWith('QuotaFailure')) for (const v of d.violations ?? []) bits.push(`quota=${v.quotaId} value=${v.quotaValue}`);
        if (d['@type']?.endsWith('RetryInfo')) bits.push(`retry=${d.retryDelay}`);
    }
    return bits.join(' | ');
}
const results = [];
const save = () => fs.writeFileSync(OUT, JSON.stringify(results, null, 1));

function bodyFor(id, level, includeThoughts) {
    const c = PROMPTS[id];
    const thinkingConfig = { ...(level ? { thinkingLevel: level } : {}), ...(includeThoughts ? { includeThoughts: true } : {}) };
    return {
        contents: [{ role: 'user', parts: [{ text: c.user }] }],
        systemInstruction: { parts: [{ text: c.system }] },
        generationConfig: { temperature: 0.4, maxOutputTokens: 65536, ...(Object.keys(thinkingConfig).length ? { thinkingConfig } : {}) },
    };
}

async function streamCall(model, id, level, includeThoughts) {
    const t0 = Date.now();
    let res;
    try {
        res = await fetch(`https://generativelanguage.googleapis.com/v1alpha/models/${model}:streamGenerateContent?alt=sse`, {
            method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
            body: JSON.stringify(bodyFor(id, level, includeThoughts)), signal: AbortSignal.timeout(300_000),
        });
    } catch (e) { return { error: `fetch: ${e.message}`, total: Date.now() - t0 }; }
    if (!res.ok) return { status: res.status, error: errText(await res.text()), total: Date.now() - t0 };
    let buf = '', answer = '', thought = '', tFirstByte = null, tFirstThought = null, tFirstAnswer = null, tLastByte = null, finish = null, usage = null, maxGap = 0;
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let error = null;
    try {
        for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            const now = Date.now() - t0;
            if (tFirstByte === null) tFirstByte = now;
            if (tLastByte !== null) maxGap = Math.max(maxGap, now - tLastByte);
            tLastByte = now;
            buf += dec.decode(value, { stream: true });
            let i;
            while ((i = buf.indexOf('\n')) >= 0) {
                const line = buf.slice(0, i).trim();
                buf = buf.slice(i + 1);
                if (!line.startsWith('data:')) continue;
                let j; try { j = JSON.parse(line.slice(5).trim()); } catch { continue; }
                const cand = j.candidates?.[0];
                for (const p of cand?.content?.parts || []) {
                    if (p.thought) { thought += p.text || ''; if (tFirstThought === null && p.text) tFirstThought = now; }
                    else if (p.text) { answer += p.text; if (tFirstAnswer === null) tFirstAnswer = now; }
                }
                if (cand?.finishReason) finish = cand.finishReason;
                if (j.usageMetadata) usage = j.usageMetadata;
            }
        }
    } catch (e) { error = `stream: ${e.message}`; }
    return { status: res.status, error, finish, total: Date.now() - t0, tFirstByte, tFirstThought, tFirstAnswer, maxGapMs: maxGap, thoughtsTokenCount: usage?.thoughtsTokenCount ?? 0, answerWords: words(answer), thoughtWords: words(thought), has57: /\b57\b|57\s?%|57 percent/.test(answer), answer };
}

async function unaryCall(model, id, level) {
    const t0 = Date.now();
    let res;
    try {
        res = await fetch(`https://generativelanguage.googleapis.com/v1alpha/models/${model}:generateContent`, {
            method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
            body: JSON.stringify(bodyFor(id, level, false)), signal: AbortSignal.timeout(300_000),
        });
    } catch (e) { return { error: `fetch: ${e.message}`, total: Date.now() - t0 }; }
    const text = await res.text().catch((e) => `READ FAILED ${e.message}`);
    if (!res.ok) return { status: res.status, error: errText(text), total: Date.now() - t0 };
    let j; try { j = JSON.parse(text); } catch { return { status: res.status, error: `unparseable body (${text.length} chars)`, total: Date.now() - t0 }; }
    const cand = j.candidates?.[0];
    const answer = (cand?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || '').join('');
    return { status: res.status, finish: cand?.finishReason ?? null, total: Date.now() - t0, thoughtsTokenCount: j.usageMetadata?.thoughtsTokenCount ?? 0, answerWords: words(answer), has57: /\b57\b|57\s?%|57 percent/.test(answer), answer };
}

async function cell(model, id, level, variant) {
    const r = variant === 'unary' ? await unaryCall(model, id, level)
        : await streamCall(model, id, level, variant === 'stream+thoughts');
    results.push({ model, id, level: level ?? 'none', variant, ...r }); save();
    const t = (ms) => (ms == null ? '-' : `${(ms / 1000).toFixed(1)}s`);
    console.log(`${model.padEnd(20)} ${String(level ?? 'none').padEnd(7)} ${variant.padEnd(15)} ${id}  ${r.error && !r.answerWords ? `ERR ${r.status ?? '-'} ${r.error.slice(0, 90)} after ${t(r.total)}` : `${r.finish ?? 'NO-FINISH'}  thoughts ${String(r.thoughtsTokenCount).padStart(5)}  first-answer ${t(r.tFirstAnswer)}  total ${t(r.total)}  ${r.maxGapMs != null ? `max-gap ${t(r.maxGapMs)}  ` : ''}${r.answerWords}w${id === 'S1Q02' ? (r.has57 ? '  57%' : '  no-57') : ''}${r.error ? `  (${r.error})` : ''}`}`);
}

async function lane(model) {
    for (const [level, variant] of [
        // First: the exact call that was cut at 33 s at 01:42, now on a warm model. Completing
        // here points at a cold start; a second cut at ~33 s points at the idle stream.
        [null, 'stream'],
        ['HIGH', 'stream+thoughts'], [null, 'stream+thoughts'], ['HIGH', 'unary'], ['MINIMAL', 'stream'], ['MINIMAL', 'unary'], ['HIGH', 'stream'],
    ]) { await cell(model, 'S1Q02', level, variant); await sleep(1500); }
}

await Promise.all(['gemma-4-31b-it', 'gemma-4-26b-a4b-it'].map(lane));
console.log(`\nwrote ${results.length} rows to ${OUT}`);
