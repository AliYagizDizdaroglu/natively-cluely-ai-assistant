import { execFileSync } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path';
const out = process.argv[2]; const files = process.argv.slice(3);
for (const f of files) {
  const buf = execFileSync('git', ['show', `391f1fc:${f}`], { maxBuffer: 1 << 28 });
  const p = path.join(out, f); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, buf);
  console.log('wrote', f, buf.length);
}
