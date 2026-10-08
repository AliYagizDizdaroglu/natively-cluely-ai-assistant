// Task 5 preconditions (throwaway): branch, MAIN's extractor size/sha, staged copy identical?, new files absent.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const BR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STAGE = path.join(BR, 'stage');
const sha = (b) => createHash('sha256').update(b).digest('hex');
const HEAD = fs.readFileSync(path.join(MAIN, '.git', 'HEAD'), 'utf8');
console.log(`MAIN .git/HEAD: ${JSON.stringify(HEAD)}`);
console.log(`branch is fix/coding-style-suffix-all-gemini: ${HEAD.trim() === 'ref: refs/heads/fix/coding-style-suffix-all-gemini'}`);
const rel = 'electron/test/golden/interview60.turns-fixture.mjs';
const m = fs.readFileSync(path.join(MAIN, rel));
const s = fs.existsSync(path.join(STAGE, rel)) ? fs.readFileSync(path.join(STAGE, rel)) : null;
console.log(`MAIN  ${rel}: ${m.length} bytes (expected 5485: ${m.length === 5485}), sha256 ${sha(m).slice(0, 16)}, CR bytes ${m.filter((x) => x === 13).length}`);
if (s) console.log(`STAGE ${rel}: ${s.length} bytes, sha256 ${sha(s).slice(0, 16)}, byte-identical to MAIN: ${Buffer.compare(m, s) === 0}`);
else console.log(`STAGE ${rel}: MISSING`);
for (const n of ['interview60.turns-finals.mjs', 'interview60.turns-finals.test.ts']) {
    const r = `electron/test/golden/${n}`;
    console.log(`${r}: in MAIN ${fs.existsSync(path.join(MAIN, r))}, in STAGE ${fs.existsSync(path.join(STAGE, r))}`);
}
// The two committed fixtures and run folders the parity tests read.
for (const name of ['2026-09-09T15-00-55-s50a', '2026-09-08T08-44-56-after9']) {
    const files = [
        `electron/test/golden/interview60.runs/${name}/interview60.timeline.json`,
        `electron/test/golden/interview60.runs/${name}/natively_debug.log`,
        `electron/test/golden/fixtures/${name}-turns.json`,
    ];
    for (const f of files) {
        const p = path.join(MAIN, f);
        console.log(`${f}: ${fs.existsSync(p) ? fs.statSync(p).size + ' bytes' : 'MISSING'}`);
    }
}
