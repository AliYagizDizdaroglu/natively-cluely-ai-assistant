// Throwaway (Task 3): print size, CR count, mtime and full sha256 of the two MAIN files this task changes (the path is
// hardcoded here because a non-ASCII argv is unreliable through the PowerShell tool). Read-only.
//   node t3-main-hash.mjs
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
for (const rel of ['electron/audio/deepgramBoundaryRepair.ts', 'electron/audio/deepgramBoundaryRepair.test.ts']) {
    const p = `${MAIN}/${rel}`;
    const b = fs.readFileSync(p);
    const cr = b.filter((x) => x === 13).length;
    const bom = b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF;
    let utf8ok = true;
    try { new TextDecoder('utf-8', { fatal: true }).decode(b); } catch { utf8ok = false; }
    const text = b.toString('utf8');
    const combining = text.split(String.fromCharCode(0x301)).length - 1;             // real U+0301 characters
    const escapes = text.split(`${String.fromCharCode(92)}u0301`).length - 1;        // the six literal characters backslash,u,0,3,0,1
    console.log(`${rel}: ${b.length} bytes, CR=${cr}, BOM=${bom}, valid UTF-8=${utf8ok}, ends with LF=${b[b.length - 1] === 10}, NFC=${text === text.normalize('NFC')}, U+0301 chars=${combining}, literal escapes=${escapes}, mtime ${fs.statSync(p).mtime.toISOString()}, sha256 ${createHash('sha256').update(b).digest('hex')}`);
}
