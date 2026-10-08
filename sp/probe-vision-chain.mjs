// THROWAWAY: generateWithVisionFallback tries providers in VISION_PROVIDER_ORDER —
// OpenAI (gpt-5.4) -> Gemini Flash -> Claude -> Gemini Pro -> Groq — and takes the
// FIRST one that is configured and succeeds. So which model actually reads a shared-editor
// screenshot depends on which keys are live, not on the dropdown. Find out which.
// Reads keys in-process; prints status only, never a value.
import fs from 'node:fs';

const env = fs.readFileSync('C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.env', 'utf8');
const keyOf = (n) => (env.match(new RegExp('^' + n + '=(.*)$', 'm')) ?? [, ''])[1].trim();
const K = { openai: keyOf('OPENAI_API_KEY'), gemini: keyOf('GEMINI_API_KEY'), claude: keyOf('CLAUDE_API_KEY'), groq: keyOf('GROQ_API_KEY') };
const scrub = (s) => Object.values(K).reduce((a, k) => (k ? a.split(k).join('<REDACTED>') : a), s);

async function show(label, p) {
    try {
        const r = await p;
        const body = scrub((await r.text()).slice(0, 200)).replace(/\s+/g, ' ');
        console.log(`${label.padEnd(30)} HTTP ${r.status}  ${r.ok ? 'LIVE' : body}`);
        return r.ok;
    } catch (e) { console.log(`${label.padEnd(30)} ERR ${scrub(e.message)}`); return false; }
}

console.log('VISION_PROVIDER_ORDER, in order — the first LIVE one is what reads your screenshots:\n');

const live = [];
if (K.openai) live.push(['1. OpenAI gpt-5.4', await show('1. OpenAI gpt-5.4', fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${K.openai}` },
    body: JSON.stringify({ model: 'gpt-5.4', messages: [{ role: 'user', content: 'hi' }], max_completion_tokens: 1 }),
}))]);
else console.log('1. OpenAI gpt-5.4              NO KEY — skipped by buildProviderForFamily');

live.push(['2. Gemini 3.1-flash-lite', await show('2. Gemini 3.1-flash-lite', fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': K.gemini },
    body: JSON.stringify({ contents: [{ parts: [{ text: 'hi' }] }], generationConfig: { maxOutputTokens: 1 } }),
}))]);

if (K.claude) live.push(['3. Claude sonnet-4-6', await show('3. Claude sonnet-4-6', fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': K.claude, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
}))]);
else console.log('3. Claude sonnet-4-6           NO KEY — skipped');

const first = live.find(([, ok]) => ok);
console.log(`\n=> a screenshot is read by: ${first ? first[0].replace(/^\d+\. /, '') : 'NOTHING in the cloud chain (falls through to local/Ollama)'}`);
