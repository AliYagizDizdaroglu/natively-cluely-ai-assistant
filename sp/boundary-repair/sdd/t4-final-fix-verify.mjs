// Task 4 final fix round (throwaway): final state of MAIN after the final fix dispatch. The four files this round changed: size, full sha256, CR, BOM,
// valid UTF-8, stage == MAIN; the two Task 4 files NOT changed this round still carry their earlier hashes; Task 3's TEST file (its module is one of the
// four) unchanged; the snapshots in sdd\t4-r2\ are the files of the dispatch table; no leftover mirror trees / vite caches; the branch file.
// Task 5's extractor (interview60.turns-finals.mjs) is not ours: size + sha prefix are printed only. Read-only.
//   node t4-final-fix-verify.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const STAGE = path.join(HERE, '..', 'stage');
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const sha = (b) => createHash('sha256').update(b).digest('hex');
let bad = 0;
const flag = (ok, msg) => { if (!ok) bad++; return ok ? msg : `PROBLEM: ${msg}`; };
// [MAIN-relative path, expected sha256 prefix, expected bytes]
const CHANGED = [
    ['electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts', '5f43849a3ce22ae0', 14252],
    ['electron/audio/DeepgramStreamingSTT.ts', '74fff12e86d916ae', 16232],
    ['electron/audio/deepgramBoundaryRepair.ts', '97f1ba9fee3268c4', 10955],
    ['electron/test/golden/interview60.turns-finals.test.ts', '0796ae6832b70d9f', 4144],
];
console.log('The four files changed in the final fix round:');
for (const [rel, want, size] of CHANGED) {
    const m = fs.readFileSync(path.join(MAIN, rel));
    const s = fs.readFileSync(path.join(STAGE, rel));
    const cr = m.filter((x) => x === 13).length;
    const bom = m.length >= 3 && m[0] === 0xef && m[1] === 0xbb && m[2] === 0xbf;
    let utf8 = true; try { new TextDecoder('utf-8', { fatal: true }).decode(m); } catch { utf8 = false; }
    const h = sha(m);
    console.log(`  ${rel}\n    ${m.length} B  sha256 ${h}`);
    console.log('    ' + [flag(h.startsWith(want) && m.length === size, `expected ${size} B, sha prefix ${want}`), flag(cr === 0, `CR=${cr}`), flag(!bom, `BOM=${bom}`), flag(utf8, `valid UTF-8=${utf8}`), flag(sha(s) === h, 'stage == MAIN')].join(' | '));
}
console.log('Task 4 files NOT changed this round:');
for (const [rel, want] of [['electron/audio/deepgramKeyterms.ts', 'b4431b9138d9688f'], ['electron/audio/deepgramKeyterms.test.ts', 'bfdd8a5d91f48da7']]) {
    const m = fs.readFileSync(path.join(MAIN, rel));
    console.log(`  ${rel}: ${m.length} B sha256 ${sha(m).slice(0, 16)}  ` + flag(sha(m).startsWith(want), 'unchanged'));
}
const t3 = fs.readFileSync(path.join(MAIN, 'electron/audio/deepgramBoundaryRepair.test.ts'));
console.log(`Task 3's test file: ${t3.length} B sha256 ${sha(t3).slice(0, 16)}  ` + flag(t3.length === 13947 && sha(t3).startsWith('6956aea35dfef746'), 'unchanged'));
console.log('Snapshots of the round-start files (sdd\\t4-r2\\):');
for (const [name, size, prefix] of [['DeepgramStreamingSTT.boundaryRepair.test.ts', 13838, '2f3eb860'], ['DeepgramStreamingSTT.ts', 16236, '57292516'], ['deepgramBoundaryRepair.ts', 10743, 'd5ba4da0'], ['interview60.turns-finals.test.ts', 4115, 'd40c6c23']]) {
    const b = fs.readFileSync(path.join(HERE, 't4-r2', name));
    console.log(`  ${name}: ${b.length} B ` + flag(b.length === size && sha(b).startsWith(prefix), 'is the dispatch-table file'));
}
const left = fs.readdirSync(HERE).filter((n) => /^t4-mirror|^\.vitecache-/.test(n));
console.log('Leftovers under sdd\\ (mirror trees, vite caches): ' + flag(left.length === 0, left.length ? left.join(', ') : 'none'));
const ex = fs.readFileSync(path.join(MAIN, 'electron/test/golden/interview60.turns-finals.mjs'));
console.log(`Task 5's extractor (not ours, not touched): interview60.turns-finals.mjs ${ex.length} B sha256 ${sha(ex).slice(0, 16)}`);
console.log(`Branch file: ${JSON.stringify(fs.readFileSync(path.join(MAIN, '.git', 'HEAD'), 'utf8'))}`);
console.log(bad ? `\n${bad} problem(s)` : '\nall checks pass');
process.exit(bad ? 1 : 0);
