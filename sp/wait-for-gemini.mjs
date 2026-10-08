// Health gate for a scheduled smoke: exit 0 as soon as EVERY model in --models answers a tiny request in the same
// attempt, else retry every --every minutes until --deadline HH:MM local, then exit 1. The default is the one model
// the 2026-09-29 gate probed; the cue re-smoke passes both lites, because under the hedge default a failing 3.5-lite
// would silently turn the smoke into a 3.1-lite run (Opus re-review N6). Reads MAIN's .env key in-process; prints
// times and statuses only, never the key.
//   node wait-for-gemini.mjs [--models gemini-3.1-flash-lite,gemini-3.5-flash-lite] [--deadline 09:00] [--every 15] [--once]
import fs from 'node:fs';
import { createRequire } from 'node:module';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const { GoogleGenAI } = createRequire(`${MAIN}/package.json`)('@google/genai');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const models = arg('--models', 'gemini-3.1-flash-lite').split(',').map((m) => m.trim()).filter(Boolean);
const [dh, dm] = arg('--deadline', '09:00').split(':').map(Number);
const every = Number(arg('--every', '15')) * 60000;
const once = process.argv.includes('--once');
if (!models.length || !models.every((m) => /^gemini-[\w.-]+$/.test(m))) { console.log(`bad --models: ${models.join(',')}`); process.exit(2); }
const apiKey = fs.readFileSync(`${MAIN}/.env`, 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)?.[1].trim().replace(/^["']|["']$/g, '');
if (!apiKey) { console.log('GEMINI_API_KEY absent from MAIN/.env'); process.exit(2); }
const ai = new GoogleGenAI({ apiKey });
const deadline = new Date(); deadline.setHours(dh, dm, 0, 0); if (deadline < new Date()) deadline.setDate(deadline.getDate() + 1);
const hhmm = (d) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
console.log(`gate: waiting for ${models.join(' AND ')}, deadline ${hhmm(deadline)} local, retry every ${every / 60000} min`);
for (;;) {
    let all = true;
    for (const model of models) {
        const t0 = Date.now();
        try {
            await ai.models.generateContent({ model, contents: 'Reply with the single word ready.', config: { thinkingConfig: { thinkingLevel: 'LOW' }, maxOutputTokens: 20 } });
            console.log(`${hhmm(new Date())} ${model} answered in ${Date.now() - t0} ms`);
        } catch (e) {
            all = false;
            const code = String(e?.message ?? e).match(/"code":\s*(\d+)/)?.[1] ?? 'error';
            console.log(`${hhmm(new Date())} ${model} ${code} after ${Date.now() - t0} ms`);
        }
    }
    if (all) { console.log(`${hhmm(new Date())} GATE OPEN (${models.join(', ')})`); process.exit(0); }
    if (once || Date.now() + every > deadline.getTime()) { console.log('GATE CLOSED: deadline reached'); process.exit(1); }
    await new Promise((r) => setTimeout(r, every));
}
