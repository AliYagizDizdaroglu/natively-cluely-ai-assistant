// Counts records per answers file in a run folder (ids only, never text) -> an upper-bound request count per model.
import fs from 'node:fs';
import path from 'node:path';
const dir = process.argv[2];
const tot = {};
for (const f of fs.readdirSync(dir).filter((n) => /^interview60\.answers\..+\.json$/.test(n))) {
  const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const recs = Array.isArray(j) ? j : (j.answers && typeof j.answers === 'object' ? Object.values(j.answers) : Object.values(j));
  const n = recs.length;
  const model = f.includes('3.5-flash-lite') ? '3.5-lite' : f.includes('3.1-flash-lite') ? '3.1-lite' : 'other';
  tot[model] = (tot[model] ?? 0) + n;
  console.log(`${f.replace('interview60.answers.', '')} records=${n}`);
}
console.log('TOTAL', JSON.stringify(tot));
