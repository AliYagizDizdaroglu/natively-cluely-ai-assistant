// Throwaway (2026-09-30): the 10 boundary-repair files in MAIN must be exactly the reviewed bytes before the
// commit (sizes + sha256 prefixes from the final review and its scoped re-review). Exit 0 only if all match.
import fs from 'node:fs';
import crypto from 'node:crypto';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const WANT = [
    ['electron/audio/deepgramBoundaryRepair.ts', 10955, '97f1ba9f'],
    ['electron/audio/deepgramBoundaryRepair.test.ts', 13947, '6956aea3'],
    ['electron/audio/deepgramBoundaryRepair.fixtures.json', 22788, 'e65c6e74'],
    ['electron/audio/DeepgramStreamingSTT.ts', 16232, '74fff12e'],
    ['electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts', 14252, '5f43849a'],
    ['electron/audio/deepgramKeyterms.ts', 5801, 'b4431b91'],
    ['electron/audio/deepgramKeyterms.test.ts', 3429, 'bfdd8a5d'],
    ['electron/test/golden/interview60.turns-finals.mjs', 2119, '365cca38'],
    ['electron/test/golden/interview60.turns-finals.test.ts', 4144, '0796ae68'],
    ['electron/test/golden/interview60.turns-fixture.mjs', 5470, 'cfd7c876'],
];
let bad = 0;
for (const [p, size, sha] of WANT) {
    const b = fs.readFileSync(`${MAIN}/${p}`);
    const h = crypto.createHash('sha256').update(b).digest('hex');
    const ok = b.length === size && h.startsWith(sha) && !b.includes('\r\n');
    if (!ok) bad++;
    console.log(`${ok ? 'OK ' : 'BAD'} ${p}  ${b.length} B ${h.slice(0, 8)}${ok ? '' : `  (want ${size} B ${sha})`}`);
}
console.log(bad ? `HASHES DIFFER: ${bad}` : 'ALL 10 MATCH THE REVIEWED BYTES');
process.exit(bad ? 1 : 0);
