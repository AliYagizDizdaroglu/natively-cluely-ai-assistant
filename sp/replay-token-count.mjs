// Throwaway calibration for the AI Studio "Input Tokens per model" chart: the exact input tokens the
// follow-up replay (2026-09-26 18:28-18:45 local) sent to gemini-3.1-flash-lite: 3 reps x (10 prompts A + 10 B)
// + 1 retry after a 503. countTokens only (no generation, no generate quota). Key read in-process, never printed.
import fs from 'node:fs';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const env = fs.readFileSync('C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.env', 'utf8');
const key = env.match(/^GEMINI_API_KEY=(.+)$/m)?.[1].trim().replace(/^["']|["']$/g, '');
const MODEL = 'gemini-3.1-flash-lite';
async function count(p) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:countTokens`, {
        method: 'POST', headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
        body: JSON.stringify({ generateContentRequest: { model: `models/${MODEL}`, systemInstruction: { parts: [{ text: p.system }] }, contents: [{ role: 'user', parts: [{ text: p.user }] }] } }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(`HTTP ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
    return j.totalTokens;
}
let perRep = 0;
const sizes = [];
for (const arm of ['A', 'B']) {
    const P = JSON.parse(fs.readFileSync(`${SP}/followup-replay/prompts.${arm}.json`, 'utf8'));
    for (const [id, p] of Object.entries(P)) { const n = await count(p); sizes.push(n); perRep += n; }
}
const avg = Math.round(perRep / sizes.length);
console.log(`prompts ${sizes.length}; tokens per prompt min ${Math.min(...sizes)} avg ${avg} max ${Math.max(...sizes)}`);
console.log(`replay input = 3 reps x ${perRep} + 1 retry (~${avg}) = ${3 * perRep + avg} tokens`);
