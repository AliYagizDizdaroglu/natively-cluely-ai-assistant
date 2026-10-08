// Throwaway: are the two Flash-Lite answer models accepting requests right now? One tiny call each, twice,
// 5 s apart; prints status and first-token time. Key read in-process, never printed.
import fs from 'node:fs';
import { createRequire } from 'node:module';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const { GoogleGenAI } = createRequire(`${MAIN}/package.json`)('@google/genai');
const apiKey = fs.readFileSync(`${MAIN}/.env`, 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)?.[1].trim().replace(/^["']|["']$/g, '');
const ai = new GoogleGenAI({ apiKey });
console.log(`local ${new Date().toLocaleTimeString('en-GB')} (${new Date().toISOString().slice(11, 16)} UTC)`);
for (let i = 0; i < 2; i++) {
    for (const [model, level] of [['gemini-3.5-flash-lite', 'HIGH'], ['gemini-3.1-flash-lite', 'LOW']]) {
        const t0 = Date.now();
        try {
            const r = await ai.models.generateContent({ model, contents: 'In one sentence, what is precision at k?', config: { thinkingConfig: { thinkingLevel: level }, maxOutputTokens: 200 } });
            console.log(`${model} ${level}: ok in ${Date.now() - t0} ms, ${r.usageMetadata?.candidatesTokenCount ?? '?'} out, thoughts ${r.usageMetadata?.thoughtsTokenCount ?? 0}`);
        } catch (e) { console.log(`${model} ${level}: ${String(e?.message ?? e).slice(0, 110)} after ${Date.now() - t0} ms`); }
    }
    await new Promise((r) => setTimeout(r, 5000));
}
