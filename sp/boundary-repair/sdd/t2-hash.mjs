// Throwaway (Task 2): print size, CR count and full sha256 of each file given.
//   node t2-hash.mjs <file> [<file> ...]
import fs from 'node:fs';
import { createHash } from 'node:crypto';
for (const f of process.argv.slice(2)) {
    const b = fs.readFileSync(f);
    const cr = b.filter((x) => x === 13).length;
    console.log(`${b.length} bytes, CR=${cr}, sha256 ${createHash('sha256').update(b).digest('hex')}  ${f.split(/[\\/]/).slice(-3).join('/')}`);
}
