// Task 4 fix round 1 (throwaway): final state of MAIN after this round. The four Task 4 files: size, full sha256, CR, BOM, valid UTF-8,
// stage == MAIN, and (for the two this round changed) the round-0 -> round-1 relation; the two files NOT changed this round still carry
// their round-0 hashes; Task 3's two files unchanged; no leftover mirror trees; the branch file. Read-only.
//   node t4-fix1-final-verify.mjs
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
// [MAIN-relative path, expected sha256 prefix, changed this round?]
const FILES = [
    ['electron/audio/deepgramKeyterms.ts', 'b4431b9138d9688f', false],
    ['electron/audio/deepgramKeyterms.test.ts', 'bfdd8a5d91f48da7', false],
    ['electron/audio/DeepgramStreamingSTT.ts', '70683d814ac6a27f', true],
    ['electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts', 'e80e5373b7d7b291', true],
];
console.log('Task 4 files in MAIN:');
for (const [rel, want, changed] of FILES) {
    const m = fs.readFileSync(path.join(MAIN, rel));
    const s = fs.readFileSync(path.join(STAGE, rel));
    const cr = m.filter((x) => x === 13).length;
    const bom = m.length >= 3 && m[0] === 0xef && m[1] === 0xbb && m[2] === 0xbf;
    let utf8 = true; try { new TextDecoder('utf-8', { fatal: true }).decode(m); } catch { utf8 = false; }
    const h = sha(m);
    console.log(`  ${rel}${changed ? '   (changed in fix round 1)' : ''}\n    ${m.length} B  sha256 ${h}`);
    console.log('    ' + [flag(h.startsWith(want), `sha prefix ${want}`), flag(cr === 0, `CR=${cr}`), flag(!bom, `BOM=${bom}`), flag(utf8, `valid UTF-8=${utf8}`), flag(sha(s) === h, 'stage == MAIN')].join(' | '));
}
const R0 = { 'DeepgramStreamingSTT.ts': '2af5409f94f0f3e51a248d3e1b72889de91907da0059bb6aae3b787cf40e7415', 'DeepgramStreamingSTT.boundaryRepair.test.ts': 'a2f0015faa7a30bf16cbaf6821b9aa4f274a91154ea8f7eba30e7c8118dddb77' };
for (const [name, want] of Object.entries(R0)) {
    const b = fs.readFileSync(path.join(HERE, 't4-r0', name));
    console.log(`  round-0 snapshot ${name}: ${b.length} B ` + flag(sha(b) === want, 'is the round-0 file'));
}
console.log('Task 3 files (must be exactly as before Task 4):');
const T3 = { 'electron/audio/deepgramBoundaryRepair.ts': [10743, 'd5ba4da0650e75319b3e4be09dffd529edf48a80f36f8613a2797606e3accc27'], 'electron/audio/deepgramBoundaryRepair.test.ts': [13947, '6956aea35dfef746f1a6132153774c833cdb4b6ffb335154a19890c18c9faec4'] };
for (const [rel, [size, want]] of Object.entries(T3)) {
    const m = fs.readFileSync(path.join(MAIN, rel));
    console.log(`  ${rel}: ${m.length} B sha256 ${sha(m).slice(0, 16)}  ` + flag(m.length === size && sha(m) === want, 'unchanged'));
}
const left = fs.readdirSync(HERE).filter((n) => /^t4-mirror|^\.vitecache-t4/.test(n));
console.log('Leftovers under sdd\\ (mirror trees, vite caches): ' + flag(left.length === 0, left.length ? left.join(', ') : 'none'));
console.log(`Branch file: ${JSON.stringify(fs.readFileSync(path.join(MAIN, '.git', 'HEAD'), 'utf8'))}`);
console.log(bad ? `\n${bad} problem(s)` : '\nall checks pass');
process.exit(bad ? 1 : 0);
