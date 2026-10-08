// Throwaway: is the 503 the API or these models? One tiny generateContent call per model, the known-good
// 3.1-flash-lite as the control, run at the same moment. Prints the HTTP status, the error's status/message
// fields, and the time to the response — never the key (read in-process from MAIN's .env).
import fs from 'node:fs';

const env = fs.readFileSync('C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.env', 'utf8');
const key = env.match(/^GEMINI_API_KEY=(.+)$/m)?.[1].trim().replace(/^["']|["']$/g, '');
if (!key) { console.log('GEMINI_API_KEY absent'); process.exit(2); }
const models = process.argv.slice(2).length ? process.argv.slice(2) : ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'];
const one = async (m) => {
    const t0 = Date.now();
    try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
            method: 'POST', headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
            body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Reply with the single word OK.' }] }], generationConfig: { maxOutputTokens: 64 } }),
        });
        const text = await r.text();
        let j = null; try { j = JSON.parse(text); } catch {}
        const err = j?.error ? `${j.error.status ?? ''} ${String(j.error.message ?? '').slice(0, 160)}` : '';
        const out = j?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('').trim();
        const u = j?.usageMetadata;
        const usage = u ? `  thoughts ${u.thoughtsTokenCount ?? 0}  out ${u.candidatesTokenCount ?? '?'}  in ${u.promptTokenCount ?? '?'}` : '';
        return `${m.padEnd(22)} HTTP ${r.status}  ${String(Date.now() - t0).padStart(5)} ms  ${err || `reply "${(out ?? '').slice(0, 20)}"`}${usage}`;
    } catch (e) { return `${m.padEnd(22)} network error ${e.cause?.code ?? e.name}`; }
};
console.log(new Date().toTimeString().slice(0, 8));
for (const line of await Promise.all(models.map(one))) console.log(line);
