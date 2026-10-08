// Task 4 final fix round (throwaway): the drift check. For the four MAIN files the final fix dispatch changes:
//   1. MAIN's size + sha256 prefix must equal the dispatch's table (final-fix1.md); a difference means STOP and report;
//   2. is the STAGED copy byte-identical to MAIN's (size + sha256)? (ABSENT / DIFFERENT means: re-seed that one file with seed-stage.mjs);
//   3. the files are snapshotted, exactly as MAIN holds them, into sdd\t4-r2\ (the "before" side of every diff; a rollback point).
// Read-only on MAIN. Exit 1 on any drift.
//   node t4-final-snapshot.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const STAGE = path.join(HERE, '..', 'stage');
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const OUT = path.join(HERE, 't4-r2');
const sha = (b) => createHash('sha256').update(b).digest('hex');
// [MAIN-relative path, bytes, sha256 prefix]  (the table of final-fix1.md)
const TABLE = [
    ['electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts', 13838, '2f3eb860'],
    ['electron/audio/DeepgramStreamingSTT.ts', 16236, '57292516'],
    ['electron/audio/deepgramBoundaryRepair.ts', 10743, 'd5ba4da0'],
    ['electron/test/golden/interview60.turns-finals.test.ts', 4115, 'd40c6c23'],
];
fs.mkdirSync(OUT, { recursive: true });
let drift = 0, unstaged = 0;
for (const [rel, size, prefix] of TABLE) {
    const m = fs.readFileSync(path.join(MAIN, rel));
    const okSize = m.length === size, okSha = sha(m).startsWith(prefix);
    if (!okSize || !okSha) drift++;
    const sp = path.join(STAGE, rel);
    let stagedState;
    if (!fs.existsSync(sp)) { stagedState = 'ABSENT (seed it)'; unstaged++; }
    else { const s = fs.readFileSync(sp); const same = s.length === m.length && sha(s) === sha(m); stagedState = same ? `IDENTICAL (${s.length} B)` : `DIFFERENT (${s.length} B vs MAIN ${m.length} B: re-seed it)`; if (!same) unstaged++; }
    console.log(`${rel}\n   MAIN ${m.length} B sha256 ${sha(m)}  table ${size} B ${prefix}…: ${okSize && okSha ? 'MATCH' : 'DRIFT'} | CR=${m.filter((x) => x === 13).length}\n   staged copy: ${stagedState}`);
    if (okSize && okSha) fs.writeFileSync(path.join(OUT, path.basename(rel)), m);
}
console.log(drift ? `\nDRIFT in ${drift} file(s): STOP and report` : `\nno drift; ${unstaged} file(s) need seeding into the stage; snapshots written to t4-r2\\`);
process.exit(drift ? 1 : 0);
