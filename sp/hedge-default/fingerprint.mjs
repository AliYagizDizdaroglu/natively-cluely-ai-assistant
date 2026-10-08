// Throwaway (scratchpad only): bytes and full sha256 of files given by path (read-only; node copes with the >260-character
// scratchpad paths that Windows PowerShell 5.1 cannot open).
//   node fingerprint.mjs <path>...
import fs from 'node:fs';
import { createHash } from 'node:crypto';

for (const p of process.argv.slice(2)) {
    const b = fs.readFileSync(p);
    console.log(`${b.length} bytes, sha256 ${createHash('sha256').update(b).digest('hex')}  ${p.split(/[\\/]/).slice(-4).join('/')}`);
}
