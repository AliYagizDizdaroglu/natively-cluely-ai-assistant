// THROWAWAY: does each key actually work? Reads keys in-process; prints only status,
// never a value (every response is scrubbed of the key before it is printed).
import fs from 'node:fs';

const env = fs.readFileSync('C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.env', 'utf8');
const keyOf = (n) => (env.match(new RegExp('^' + n + '=(.*)$', 'm')) ?? [, ''])[1].trim();
const scrub = (s, ...secrets) => secrets.reduce((a, k) => (k ? a.split(k).join('<REDACTED>') : a), s);

const GEM = keyOf('GEMINI_API_KEY'), GROQ = keyOf('GROQ_API_KEY'), DG = keyOf('DEEPGRAM_API_KEY');

async function show(label, p) {
    try {
        const r = await p;
        const body = scrub((await r.text()).slice(0, 260), GEM, GROQ, DG).replace(/\s+/g, ' ');
        console.log(`${label.padEnd(28)} HTTP ${r.status}  ${r.ok ? 'OK' : body}`);
    } catch (e) { console.log(`${label.padEnd(28)} ERR ${scrub(e.message, GEM, GROQ, DG)}`); }
}

await show('gemini 3.1-flash-lite', fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': GEM },
    body: JSON.stringify({ contents: [{ parts: [{ text: 'hi' }] }], generationConfig: { maxOutputTokens: 1 } }),
}));
await show('gemini 3.5-flash-lite', fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': GEM },
    body: JSON.stringify({ contents: [{ parts: [{ text: 'hi' }] }], generationConfig: { maxOutputTokens: 1 } }),
}));
await show('groq gpt-oss-20b (detector)', fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${GROQ}` },
    body: JSON.stringify({ model: 'openai/gpt-oss-20b', messages: [{ role: 'user', content: 'hi' }], max_tokens: 1 }),
}));
await show('deepgram (STT)', fetch('https://api.deepgram.com/v1/projects', { headers: { authorization: `Token ${DG}` } }));
