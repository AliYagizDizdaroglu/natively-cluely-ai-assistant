// Throwaway: WHICH limit is the 429 on the full Flash models? One tiny call per model; on 429 print the
// error message and the QuotaFailure details (metric, id, limit value), which name the free-tier limit
// exactly. Never prints the key (read in-process from MAIN's .env). 3.1-flash-lite is the control.
import fs from 'node:fs';

const env = fs.readFileSync('C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.env', 'utf8');
const key = env.match(/^GEMINI_API_KEY=(.+)$/m)?.[1].trim().replace(/^["']|["']$/g, '');
if (!key) { console.log('GEMINI_API_KEY absent'); process.exit(2); }
const models = process.argv.slice(2).length ? process.argv.slice(2) : ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash'];
console.log(new Date().toTimeString().slice(0, 8));
for (const m of models) {
    const t0 = Date.now();
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
        method: 'POST', headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Reply with the single word OK.' }] }], generationConfig: { maxOutputTokens: 512 } }),
    });
    const text = await r.text();
    let j = null; try { j = JSON.parse(text); } catch {}
    const ms = Date.now() - t0;
    if (r.ok) { console.log(`${m.padEnd(22)} HTTP 200  ${ms} ms  reply "${(j?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '').trim().slice(0, 20)}"  thoughts ${j?.usageMetadata?.thoughtsTokenCount ?? 0}`); continue; }
    console.log(`${m.padEnd(22)} HTTP ${r.status}  ${ms} ms  ${j?.error?.status ?? ''}: ${String(j?.error?.message ?? text).slice(0, 300)}`);
    for (const d of j?.error?.details ?? []) {
        if (d['@type']?.endsWith('QuotaFailure')) for (const v of d.violations ?? []) console.log(`    quota: metric=${v.quotaMetric}  id=${v.quotaId}  value=${v.quotaValue ?? '?'}  dims=${JSON.stringify(v.quotaDimensions ?? {})}`);
        if (d['@type']?.endsWith('RetryInfo')) console.log(`    retry after: ${d.retryDelay}`);
    }
}
