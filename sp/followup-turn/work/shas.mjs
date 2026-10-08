import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const FT = process.cwd();
const sha = (f) => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const files = [];
for (const d of ['R', 'R/scripts']) for (const f of fs.readdirSync(path.join(FT, d)).filter((x) => x.endsWith('.mjs')).sort()) files.push(`${d}/${f}`);
const orig = path.join(FT, 'work', 'orig');
for (const f of files) {
    const o = path.join(orig, path.basename(f));
    const changed = fs.existsSync(o) ? (sha(o) !== sha(path.join(FT, f)) ? 'changed' : 'unchanged') : 'new/unknown';
    console.log(`${sha(path.join(FT, f))}  ${f}  [${changed}]`);
}
for (const f of ['earlierQuestion.ref.mjs', 'stamp-turn.mjs', 'gate-report-turn.mjs', 'fill-section2.mjs']) if (fs.existsSync(f)) console.log(`${sha(f)}  ${f}`);
