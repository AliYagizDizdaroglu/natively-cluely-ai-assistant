// Throwaway: WHICH Gemini quota a Gemma 429 is (per-minute tokens, per-minute requests, or
// per-day), from the QuotaFailure / RetryInfo details the API attaches to the error. Sends a
// 1-token "hi" and then the full captured S1Q02 prompt capped at 1 output token, per model.
// Prints statuses and quota ids/values only; the key is read in-process and never printed.
import fs from 'node:fs';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const KEY = fs.readFileSync(`${MAIN}/.env`, 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)?.[1]?.trim();
if (!KEY) { console.error('no GEMINI_API_KEY line in MAIN/.env'); process.exit(2); }
const C = JSON.parse(fs.readFileSync(`${MAIN}/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m/interview60.prompts.json`, 'utf8')).S1Q02;

async function call(model, label, body) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1alpha/models/${model}:generateContent`, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY }, body: JSON.stringify(body),
    });
    let out = `${model.padEnd(20)} ${label.padEnd(6)} HTTP ${r.status}`;
    if (r.status !== 200) {
        const j = await r.json().catch(() => ({}));
        for (const d of j.error?.details ?? []) {
            if (d['@type']?.endsWith('QuotaFailure')) for (const v of d.violations ?? []) out += `\n    quota ${v.quotaId ?? '?'}  value=${v.quotaValue ?? '?'}  metric=${(v.quotaMetric ?? '').split('/').pop()}`;
            if (d['@type']?.endsWith('RetryInfo')) out += `\n    retryDelay ${d.retryDelay}`;
        }
        if (!(j.error?.details ?? []).length) out += `  ${(j.error?.message ?? '').slice(0, 120)}`;
    } else {
        const j = await r.json().catch(() => ({}));
        out += `  promptTokens=${j.usageMetadata?.promptTokenCount ?? '?'}`;
    }
    console.log(out);
    return r.status;
}

for (const model of ['gemma-4-31b-it', 'gemma-4-26b-a4b-it']) {
    const tiny = await call(model, 'tiny', { contents: [{ parts: [{ text: 'hi' }] }], generationConfig: { maxOutputTokens: 1, thinkingConfig: { thinkingLevel: 'MINIMAL' } } });
    if (tiny === 200) await call(model, 'full', {
        contents: [{ role: 'user', parts: [{ text: C.user }] }], systemInstruction: { parts: [{ text: C.system }] },
        generationConfig: { maxOutputTokens: 1, thinkingConfig: { thinkingLevel: 'MINIMAL' } },
    });
}
