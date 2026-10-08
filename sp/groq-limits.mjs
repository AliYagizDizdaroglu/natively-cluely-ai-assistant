// THROWAWAY: read Groq's rate-limit headers for the two arm models (one tiny request
// each). The key is read in-process from .env and never printed.
import fs from 'fs';
const KEY = fs.readFileSync('C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.env', 'utf8').match(/^GROQ_API_KEY=(.+)$/m)[1].trim();
for (const model of ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b']) {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: 'Say ok.' }], max_tokens: 4 }),
    });
    const h = (n) => r.headers.get(n);
    console.log(model.padEnd(22), 'HTTP', r.status, '| RPM', h('x-ratelimit-limit-requests'), 'rem', h('x-ratelimit-remaining-requests'), '| TPM', h('x-ratelimit-limit-tokens'), 'rem', h('x-ratelimit-remaining-tokens'), '| reset req', h('x-ratelimit-reset-requests'), 'tok', h('x-ratelimit-reset-tokens'));
    if (!r.ok) console.log('   body:', (await r.text()).slice(0, 200));
}
