// Calibration for key-status.mjs: the same three endpoints with a deliberately invalid key must NOT
// return 200, or a 200 from key-status.mjs proves nothing.
const bad = 'not-a-real-key-' + Date.now();
const calls = [
    ['gemini metadata', () => fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite', { headers: { 'x-goog-api-key': bad } })],
    ['deepgram projects', () => fetch('https://api.deepgram.com/v1/projects', { headers: { Authorization: `Token ${bad}` } })],
    ['groq models', () => fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${bad}` } })],
];
for (const [label, call] of calls) {
    try { const r = await call(); console.log(`${label.padEnd(18)} with an invalid key: HTTP ${r.status}${r.status === 200 ? '  <-- CHECK IS BLIND' : ''}`); }
    catch (e) { console.log(`${label.padEnd(18)} network error: ${e.cause?.code ?? e.name}`); }
}
