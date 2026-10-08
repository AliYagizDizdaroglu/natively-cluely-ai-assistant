// Task 4 fix round 2 (throwaway): snapshot the two MAIN files this round changes, exactly as round 1 left them, into sdd\t4-r1\ (a rollback
// point and the "before" side of every diff), refusing if MAIN differs from the round-1 hashes. Then (once the test is staged) prove the
// staged test file is a PURE INSERTION into MAIN's round-1 test file (prefix and tail byte-identical), print the inserted size, and run the
// check's own calibration. CR / BOM checks on the staged files. Read-only on MAIN.
//   node t4-fix2-snapshot.mjs            snapshot (first run) + check the staged test against the snapshot
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const STAGE = path.join(HERE, '..', 'stage');
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const OUT = path.join(HERE, 't4-r1');
const sha = (b) => createHash('sha256').update(b).digest('hex');
const R1 = {
    'electron/audio/DeepgramStreamingSTT.ts': '70683d814ac6a27f2d765938c86339ffdb6c1d9033a18c071f8fb18e42cdf1a0',
    'electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts': 'e80e5373b7d7b291154817382e5e10e2344d2893a411011ea63d6c1a1de318e1',
};
fs.mkdirSync(OUT, { recursive: true });
let bad = 0;
for (const [rel, want] of Object.entries(R1)) {
    const snap = path.join(OUT, path.basename(rel));
    if (fs.existsSync(snap)) {
        // already snapshotted: the snapshot must still be the round-1 file (MAIN may legitimately have moved on after the copy)
        const b = fs.readFileSync(snap);
        const ok = sha(b) === want;
        if (!ok) bad++;
        console.log(`${ok ? 'kept   ' : 'PROBLEM'} snapshot ${path.basename(rel)}: ${b.length} B sha256 ${sha(b).slice(0, 16)} ${ok ? '(is the round-1 file)' : '(NOT the round-1 file)'}`);
        continue;
    }
    const b = fs.readFileSync(path.join(MAIN, rel));
    const ok = sha(b) === want;
    if (!ok) bad++;
    else fs.writeFileSync(snap, b);
    console.log(`${ok ? 'saved  ' : 'REFUSED'} ${rel}: ${b.length} B sha256 ${sha(b).slice(0, 16)}`);
}
if (bad) process.exit(1);
const rel = 'electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts';
const before = fs.readFileSync(path.join(OUT, path.basename(rel)), 'utf8');
const staged = fs.readFileSync(path.join(STAGE, rel));
const stagedText = staged.toString('utf8');
const TAIL = '    });\n});\n';
if (!before.endsWith(TAIL)) throw new Error('round-1 test file does not end with the expected tail');
const prefix = before.slice(0, -TAIL.length);
const pure = stagedText.startsWith(prefix) && stagedText.endsWith(TAIL) && stagedText.length > prefix.length + TAIL.length;
const inserted = pure ? stagedText.slice(prefix.length, stagedText.length - TAIL.length) : '';
console.log(`staged test: ${staged.length} B (${stagedText.length} chars), sha256 ${sha(staged).slice(0, 16)}, CR=${staged.filter((x) => x === 13).length}, BOM=${staged[0] === 0xef && staged[1] === 0xbb && staged[2] === 0xbf}`);
console.log(`pure insertion into the round-1 file (prefix + tail byte-identical): ${pure ? 'YES' : 'NO'}; inserted ${inserted.length} chars, ${inserted.split('\n').length - 1} lines`);
const corrupted = stagedText.replace('const unchanged', 'const unchanged ');
console.log(`calibration (a character added inside the untouched prefix): ${corrupted.startsWith(prefix) ? 'still YES (BAD: the check cannot fail)' : 'NO (good: the check can fail)'}`);
process.exit(pure ? 0 : 1);
