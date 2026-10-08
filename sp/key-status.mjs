// Throwaway: are MAIN's .env keys accepted right now? Prints key NAMES and HTTP status codes only —
// never a value. Metadata/list endpoints only: no generation, so no quota is spent.
import fs from 'node:fs';

const env = fs.readFileSync('C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.env', 'utf8');
const get = (name) => env.match(new RegExp(`^${name}=(.+)$`, 'm'))?.[1].trim().replace(/^["']|["']$/g, '') || null;
const checks = [
    ['GEMINI_API_KEY', (k) => fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite', { headers: { 'x-goog-api-key': k } })],
    ['GEMINI_API_KEY', (k) => fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite', { headers: { 'x-goog-api-key': k } })],
    ['DEEPGRAM_API_KEY', (k) => fetch('https://api.deepgram.com/v1/projects', { headers: { Authorization: `Token ${k}` } })],
    ['GROQ_API_KEY', (k) => fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${k}` } })],
];
const labels = ['gemini 3.1-flash-lite metadata', 'gemini 3.5-flash-lite metadata', 'deepgram projects', 'groq models'];
for (const [i, [name, call]] of checks.entries()) {
    const k = get(name);
    if (!k) { console.log(`${name.padEnd(17)} ABSENT from .env`); continue; }
    try { const r = await call(k); console.log(`${name.padEnd(17)} ${labels[i].padEnd(32)} HTTP ${r.status}`); }
    catch (e) { console.log(`${name.padEnd(17)} ${labels[i].padEnd(32)} network error: ${e.cause?.code ?? e.name}`); }
}
