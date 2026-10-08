// Does the app's request shape get Gemini's IMPLICIT cache? Sends the same captured s50m prompt (system + user,
// S1Q01F) twice, 3 s apart, on each lite model, and prints promptTokenCount / cachedContentTokenCount / first token.
// Calibration is built in: the second call of an identical request is the case most likely to hit; a 0 there means
// no implicit caching for this shape (below the minimum or not offered). Numbers only; key never printed.
import fs from 'node:fs';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const P = JSON.parse(fs.readFileSync(`${MAIN}/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m/interview60.prompts.json`, 'utf8')).S1Q01F;
const KEY = fs.readFileSync(`${MAIN}/.env`, 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)?.[1]?.trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const [model, level] of [['gemini-3.1-flash-lite', 'LOW'], ['gemini-3.5-flash-lite', 'HIGH']]) {
    for (const n of [1, 2]) {
        const body = { contents: [{ role: 'user', parts: [{ text: P.user }] }], systemInstruction: { parts: [{ text: P.system }] }, generationConfig: { temperature: 0.4, maxOutputTokens: 65536, thinkingConfig: { thinkingLevel: level } } };
        const t0 = Date.now();
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY }, body: JSON.stringify(body) });
        const j = await res.json();
        const u = j.usageMetadata ?? {};
        console.log(`${model} call ${n}: HTTP ${res.status}  prompt ${u.promptTokenCount}  cached ${u.cachedContentTokenCount ?? 0}  thoughts ${u.thoughtsTokenCount ?? 0}  total ms ${Date.now() - t0}`);
        await sleep(3000);
    }
}
