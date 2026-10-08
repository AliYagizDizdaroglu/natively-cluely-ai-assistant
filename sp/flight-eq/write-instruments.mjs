// A2.5: appends one line per post-hour instrument to E\instruments.sha256.txt:
// <stamp> <tool> sha256=<full> cal=<file>:<sha12> review=<file> (<verdict>)
// Refuses a missing file. Never reads the run folder.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const E = path.dirname(fileURLToPath(import.meta.url));
const sha = (f) => createHash('sha256').update(fs.readFileSync(path.join(E, f))).digest('hex');
const ROWS = JSON.parse(fs.readFileSync(path.join(E, process.argv[2]), 'utf8'));
const stamp = new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 19) + '+03';
const out = [];
for (const r of ROWS) {
  for (const f of [r.tool, r.cal, r.review].filter(Boolean)) if (!fs.existsSync(path.join(E, f))) { console.log(`REFUSED: missing ${f}`); process.exit(2); }
  out.push(`${stamp} ${r.tool} sha256=${sha(r.tool)} cal=${r.cal ? `${r.cal}:${sha(r.cal).slice(0, 12)}` : 'none'} review=${r.review} (${r.verdict})${r.note ? ` note: ${r.note}` : ''}`);
}
fs.appendFileSync(path.join(E, 'instruments.sha256.txt'), out.join('\n') + '\n');
console.log(out.map((l) => l.replace(/sha256=(\w{12})\w+/, 'sha256=$1')).join('\n'));
