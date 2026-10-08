// Prints the SHAPE of the 25 Sep 3.8-flash answer files: per row id, ttft, words, thoughts, error flag.
// Never prints answer text or prompts (they can carry the user's profile).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
for (const f of fs.readdirSync(HERE).filter((n) => n.startsWith('interview60.answers.gemini-3.8-flash'))) {
  const j = JSON.parse(fs.readFileSync(path.join(HERE, f), 'utf8'));
  const rows = Array.isArray(j) ? j : (j.answers ?? Object.values(j));
  console.log(`${f}: top-level ${Array.isArray(j) ? 'array' : Object.keys(j).slice(0, 8).join(',')} rows ${rows.length}`);
  for (const r of rows) {
    if (!r || typeof r !== 'object') { console.log('  row not an object'); continue; }
    const text = typeof r.answer === 'string' ? r.answer : (typeof r.text === 'string' ? r.text : '');
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    console.log(`  id ${r.id ?? r.qid ?? '?'} ttftMs ${r.ttftMs ?? r.ttft ?? '?'} words ${words} thoughts ${r.thoughts ?? '?'} error ${r.error ? 'yes' : 'no'} keys ${Object.keys(r).join(',')}`);
  }
}
