// Task 4 (throwaway): final state of MAIN. For the four changed files: size, full sha256, CR count, BOM, valid UTF-8,
// stage == MAIN. For Task 3's two files: unchanged from the sizes/hashes recorded before Task 4 began. Leftover mirror
// trees / caches / junctions. The branch file. Read-only.
//   node t4-final-verify.mjs
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
const CHANGED = {
    'electron/audio/deepgramKeyterms.ts': 'b4431b9138d9688f',
    'electron/audio/deepgramKeyterms.test.ts': 'bfdd8a5d91f48da7',
    'electron/audio/DeepgramStreamingSTT.ts': '2af5409f94f0f3e5',
    'electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts': 'a2f0015faa7a30bf',
};
console.log('Changed files in MAIN:');
for (const [rel, want] of Object.entries(CHANGED)) {
    const m = fs.readFileSync(path.join(MAIN, rel));
    const s = fs.readFileSync(path.join(STAGE, rel));
    const cr = m.filter((x) => x === 13).length;
    const bom = m.length >= 3 && m[0] === 0xef && m[1] === 0xbb && m[2] === 0xbf;
    let utf8 = true; try { new TextDecoder('utf-8', { fatal: true }).decode(m); } catch { utf8 = false; }
    const h = sha(m);
    console.log(`  ${rel}\n    ${m.length} B  sha256 ${h}`);
    console.log('    ' + flag(h.startsWith(want), `sha prefix ${want}`) + ' | ' + flag(cr === 0, `CR=${cr}`) + ' | ' + flag(!bom, `BOM=${bom}`) + ' | ' + flag(utf8, `valid UTF-8=${utf8}`) + ' | ' + flag(sha(s) === h, 'stage == MAIN'));
}
console.log('Task 3 files (must be exactly as before Task 4):');
const T3 = { 'electron/audio/deepgramBoundaryRepair.ts': [10743, 'd5ba4da0650e75319b3e4be09dffd529edf48a80f36f8613a2797606e3accc27'], 'electron/audio/deepgramBoundaryRepair.test.ts': [13947, '6956aea35dfef746f1a6132153774c833cdb4b6ffb335154a19890c18c9faec4'] };
for (const [rel, [size, want]] of Object.entries(T3)) {
    const m = fs.readFileSync(path.join(MAIN, rel));
    console.log(`  ${rel}: ${m.length} B sha256 ${sha(m)}  ` + flag(m.length === size && sha(m) === want, 'unchanged'));
}
console.log('Leftovers under sdd\\ (mirror trees, vite caches):');
const left = fs.readdirSync(HERE).filter((n) => /^t4-mirror|^\.vitecache-t4/.test(n));
console.log('  ' + flag(left.length === 0, left.length ? left.join(', ') : 'none'));
console.log(`Branch file: ${JSON.stringify(fs.readFileSync(path.join(MAIN, '.git', 'HEAD'), 'utf8'))}`);
console.log(bad ? `\n${bad} problem(s)` : '\nall checks pass');
process.exit(bad ? 1 : 0);
