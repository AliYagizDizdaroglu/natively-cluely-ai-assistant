// Throwaway (fix round 1): write the seven one-line mutants of the ORIGINAL module (sha256 7b684f16...) to t1/mut/.
// Each find string must occur exactly once; a mutant equals the original except for that one replacement; no CR.
//   node t1-make-mutants.mjs
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/boundary-repair';
const sha = (b) => createHash('sha256').update(b).digest('hex');
const orig = fs.readFileSync(`${SP}/t1/orig/deepgramBoundaryRepair.7b684f16.ts`);
if (!sha(orig).startsWith('7b684f16')) { console.log('REFUSED: saved original is not 7b684f16...'); process.exit(2); }
const src = orig.toString('utf8');

const RAW = "const rawTok = (s: string): string[] => stripThousands(s).match(/[A-Za-z0-9']+/g) ?? [];";
const M = [
    ['a', 'traw-lowercased', RAW, 'const rawTok = (s: string): string[] => tok(s);'],
    ['b', 'rawtok-no-apostrophe', RAW, "const rawTok = (s: string): string[] => stripThousands(s).match(/[A-Za-z0-9]+/g) ?? [];"],
    ['c', 'no-fw-length-gt-0', 'if (fw.length > 0 && fw.length < iw.length) {', 'if (fw.length < iw.length) {'],
    ['d', 'no-tolerant-ge-2', 'const tolerant = !strict && fw.length >= 2 && fw.slice(0, -1).every((w, i) => w === iw[i]);', 'const tolerant = !strict && fw.slice(0, -1).every((w, i) => w === iw[i]);'],
    ['e', 'no-lastinterim-reset', '            lastInterim = null;\n            return { text: out, restored };', '            return { text: out, restored };'],
    ['f', 'max-skip-3', 'const MAX_SKIPPED_WORDS = 2;', 'const MAX_SKIPPED_WORDS = 3;'],
    ['g', 'no-first-word-guard', 'if (f.length && f[0] !== T[0]) {', 'if (f.length) {'],
];
for (const [id, name, find, repl] of M) {
    const parts = src.split(find);
    if (parts.length !== 2) { console.log(`REFUSED ${id}: find string occurs ${parts.length - 1} times`); process.exit(2); }
    const mutated = parts.join(repl);
    if (mutated === src) { console.log(`REFUSED ${id}: mutant equals the original`); process.exit(2); }
    if (mutated.includes('\r')) { console.log(`REFUSED ${id}: CR in mutant`); process.exit(2); }
    const out = `${SP}/t1/mut/mut-${id}-${name}.ts`;
    fs.writeFileSync(out, mutated);
    console.log(`${id}  ${name.padEnd(22)} ${Buffer.byteLength(mutated)} bytes (orig ${orig.length})  sha256 ${sha(Buffer.from(mutated)).slice(0, 16)}  -> ${out.replace(SP + '/', '')}`);
}
