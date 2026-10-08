// Throwaway: HTTP status of a 1-token generateContent call per model (quota check).
// Reads GEMINI_API_KEY from the repo .env in-process; prints statuses only, never the key.
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2];
const m = fs.readFileSync(path.join(root, '.env'), 'utf8').match(/^GEMINI_API_KEY=(.+)$/m);
if (!m) { console.log('GEMINI_API_KEY not found in .env'); process.exit(1); }
const KEY = m[1].trim();
for (const model of process.argv.slice(3)) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
    body: JSON.stringify({ contents: [{ parts: [{ text: 'hi' }] }], generationConfig: { maxOutputTokens: 1 } }),
  });
  let detail = '';
  if (r.status !== 200) { try { const j = await r.json(); detail = (j.error?.message ?? '').replace(/key[^ ]*/gi, 'key').slice(0, 160); } catch {} }
  console.log(model, 'HTTP', r.status, detail);
}
