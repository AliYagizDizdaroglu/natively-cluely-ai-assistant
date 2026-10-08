// Task 5 fix round 1 (throwaway): start check. For both files the fix round edits: MAIN's size + sha256 must be the size the
// fix note names (module 1,592 B 52e2cd63..., test 3,793 B fb02da7b...), and the staged copy must be byte-identical to MAIN's.
// Snapshots the round-0 files into sdd\t5f1-orig\ (before any byte of the fix round reaches MAIN). Read-only on MAIN and the stage.
//   node t5f1-preconditions.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const STAGE = path.join(HERE, '..', 'stage');
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const G = 'electron/test/golden/';
const sha = (b) => createHash('sha256').update(b).digest('hex');
console.log(`MAIN .git/HEAD: ${JSON.stringify(fs.readFileSync(path.join(MAIN, '.git', 'HEAD'), 'utf8'))}`);
const FILES = [[G + 'interview60.turns-finals.mjs', 1592, '52e2cd63'], [G + 'interview60.turns-finals.test.ts', 3793, 'fb02da7b']];
let stop = false, reseed = [];
for (const [rel, size, pre] of FILES) {
    const m = fs.readFileSync(path.join(MAIN, rel));
    const sPath = path.join(STAGE, rel);
    const s = fs.existsSync(sPath) ? fs.readFileSync(sPath) : null;
    const mainOk = m.length === size && sha(m).startsWith(pre);
    const same = s !== null && Buffer.compare(m, s) === 0;
    console.log(`${rel}\n  MAIN  ${m.length} B sha256 ${sha(m).slice(0, 16)}  (fix note: ${size} B ${pre}...) -> ${mainOk ? 'as named' : 'DIFFERS: STOP'}`);
    console.log(`  STAGE ${s ? `${s.length} B sha256 ${sha(s).slice(0, 16)}` : 'MISSING'} -> ${same ? 'byte-identical to MAIN' : 'DIFFERENT: re-seed this file'}`);
    if (!mainOk) stop = true;
    if (!same) reseed.push(rel);
    const dst = path.join(HERE, 't5f1-orig', path.basename(rel));
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    if (!fs.existsSync(dst)) fs.writeFileSync(dst, m);
    const c = fs.readFileSync(dst);
    console.log(`  snapshot t5f1-orig\\${path.basename(rel)}: ${c.length} B, identical to MAIN: ${Buffer.compare(c, m) === 0}`);
}
console.log(stop ? 'STOP: a MAIN file differs from the size the fix note names' : reseed.length ? `re-seed needed for: ${reseed.join(', ')}` : 'ok: MAIN as named, stage == MAIN for both files');
process.exit(stop ? 1 : reseed.length ? 3 : 0);
