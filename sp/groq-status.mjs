// Throwaway: is the Groq key working again? Reports the HTTP status and the key's SHAPE
// only (length and prefix length), never its value. Run from MAIN with --env-file=.env.
const KEY = process.env.GROQ_API_KEY;
if (!KEY) { console.log('GROQ_API_KEY: not set in the environment'); process.exit(0); }
console.log(`GROQ_API_KEY present: ${KEY.length} chars, starts "gsk_": ${KEY.startsWith('gsk_')}`);
const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model: 'openai/gpt-oss-20b', messages: [{ role: 'user', content: 'reply with the single word: ok' }], max_tokens: 5 }),
});
const body = await res.text();
console.log(`HTTP ${res.status} ${res.statusText}`);
console.log(`body: ${body.slice(0, 300)}`);
