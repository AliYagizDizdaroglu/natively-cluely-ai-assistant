// Throwaway: which Live-capable models does this key see? models.list only (no generation, no quota spend).
// Reads the key in-process from MAIN's .env; prints model names and methods, never the key.
import fs from 'node:fs';
const env = fs.readFileSync('C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.env', 'utf8');
const key = env.match(/^GEMINI_API_KEY=(.+)$/m)?.[1].trim().replace(/^["']|["']$/g, '');
if (!key) { console.log('GEMINI_API_KEY absent'); process.exit(2); }
let url = 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000';
const all = [];
while (url) {
    const r = await fetch(url, { headers: { 'x-goog-api-key': key } });
    if (!r.ok) { console.log(`HTTP ${r.status}`); process.exit(1); }
    const j = await r.json();
    all.push(...(j.models ?? []));
    url = j.nextPageToken ? `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000&pageToken=${j.nextPageToken}` : null;
}
console.log(`models visible: ${all.length}`);
for (const m of all.filter((m) => /live|native-audio|3\.8/i.test(m.name) || (m.supportedGenerationMethods ?? []).includes('bidiGenerateContent'))) {
    console.log(`${m.name.padEnd(52)} in=${m.inputTokenLimit} out=${m.outputTokenLimit} thinking=${m.thinking ?? '?'} methods=${(m.supportedGenerationMethods ?? []).join(',')}`);
}
