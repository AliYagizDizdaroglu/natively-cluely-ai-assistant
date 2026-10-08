// Throwaway (Task 2): final state of MAIN after the calibration cycles.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/boundary-repair';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const AUDIO = `${MAIN}/electron/audio`;
const sha = (p) => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const cr = (p) => fs.readFileSync(p).filter((x) => x === 13).length;

const finalMain = `${AUDIO}/DeepgramStreamingSTT.ts`;
const wiredStage = `${SP}/stage/electron/audio/DeepgramStreamingSTT.ts`;
console.log(`DeepgramStreamingSTT.ts       MAIN ${fs.statSync(finalMain).size} bytes, CR=${cr(finalMain)}, sha256 ${sha(finalMain)}`);
console.log(`  == wired staged file (Step 3): ${sha(finalMain) === sha(wiredStage) ? 'YES' : 'NO'}`);
const testMain = `${AUDIO}/DeepgramStreamingSTT.boundaryRepair.test.ts`;
console.log(`boundaryRepair.test.ts        MAIN ${fs.statSync(testMain).size} bytes, CR=${cr(testMain)}, sha256 ${sha(testMain)}`);
console.log(`  == staged test:                ${sha(testMain) === sha(`${SP}/stage/electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts`) ? 'YES' : 'NO'}`);

// The parsed event line: byte-identical to the original, and there is exactly one of it in each file.
const evLines = (p) => fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.includes('Transcript event'));
const a = evLines(`${SP}/sdd/t2-original.ts`), b = evLines(finalMain);
console.log(`'Transcript event' line: original x${a.length}, final x${b.length}, byte-identical: ${a.length === 1 && b.length === 1 && a[0] === b[0]}`);
console.log(`  ${JSON.stringify(b[0].trim())}`);

// Task 1's three files: the ledger records module sha 4653b898, test sha c57ef099, fixtures sha e65c6e74.
for (const [name, want] of [['deepgramBoundaryRepair.ts', '4653b898'], ['deepgramBoundaryRepair.test.ts', 'c57ef099'], ['deepgramBoundaryRepair.fixtures.json', 'e65c6e74']]) {
    const s = sha(`${AUDIO}/${name}`);
    console.log(`${name.padEnd(38)} ${fs.statSync(`${AUDIO}/${name}`).size} bytes, sha256 ${s.slice(0, 8)}... ledger ${want}: ${s.startsWith(want) ? 'MATCH' : 'MISMATCH'}`);
}

// Nothing else appeared in the folder: anything modified today, newest first.
const today = fs.readdirSync(AUDIO).map((n) => ({ n, m: fs.statSync(`${AUDIO}/${n}`).mtime }))
    .filter((x) => x.m >= new Date('2026-09-29T17:00:00+03:00')).sort((x, y) => y.m - x.m);
console.log('files in electron/audio modified since 2026-09-29 17:00:');
for (const x of today) console.log(`  ${x.m.toISOString()}  ${x.n}`);
