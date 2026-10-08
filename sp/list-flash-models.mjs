// Throwaway: which Gemini models does MAIN's key serve? Metadata endpoint only (no quota spent);
// prints model NAMES and the HTTP status — never the key. Reads the key in-process from .env.
import fs from 'node:fs';

const env = fs.readFileSync('C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.env', 'utf8');
const key = env.match(/^GEMINI_API_KEY=(.+)$/m)?.[1].trim().replace(/^["']|["']$/g, '');
if (!key) { console.log('GEMINI_API_KEY absent from .env'); process.exit(2); }
const names = [];
let page = '';
do {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=100${page ? `&pageToken=${page}` : ''}`, { headers: { 'x-goog-api-key': key } });
    if (!r.ok) { console.log(`models list: HTTP ${r.status}`); process.exit(1); }
    const j = await r.json();
    for (const m of j.models ?? []) names.push(`${m.name.replace(/^models\//, '')}  [${(m.supportedGenerationMethods ?? []).includes('generateContent') ? 'generateContent' : 'no generateContent'}]${m.thinking !== undefined ? `  thinking=${m.thinking}` : ''}`);
    page = j.nextPageToken ?? '';
} while (page);
console.log(`${names.length} models on the key; the flash/gemma ones:`);
for (const n of names.filter((x) => /flash|gemma/i.test(x)).sort()) console.log(`  ${n}`);
