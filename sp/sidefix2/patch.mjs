// Builds the patched impl and test into <outdir> from MAIN's today files + the worktree's added hunks.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const MAIN = 'C:/Users/sotka/OneDrive/Masa\u00fcst\u00fc/natively-cluely-ai-assistant';
const WT = MAIN + '/.claude/worktrees/elastic-hertz-4344f1';
const OUT = process.argv[2];
const rd = (p) => fs.readFileSync(p, 'utf8');
const f = 'electron/llm/verbalStreamFilter';
// impl: the worktree's comment block + new held line replace MAIN's held line (which must equal the pre-image at fed4b07).
const wtImpl = rd(`${WT}/${f}.ts`).split('\n');
const iNew = wtImpl.findIndex((l) => l.includes('// The comma was one case of a wider split'));
const iHeld = wtImpl.findIndex((l, i) => i > iNew && l.startsWith('        const held = '));
if (iNew < 0 || iHeld < 0) throw new Error('worktree hunk not found');
const newBlock = wtImpl.slice(iNew, iHeld + 1).join('\n');
const preImage = execFileSync('git', ['-C', MAIN, 'show', 'fed4b07:' + f + '.ts'], { encoding: 'utf8', maxBuffer: 1 << 26 })
    .split('\n').find((l) => l.startsWith('        const held = '));
const lines = rd(`${MAIN}/${f}.ts`).split('\n');
const idx = lines.map((l, i) => (l.startsWith('        const held = ') ? i : -1)).filter((i) => i >= 0);
if (idx.length !== 1) throw new Error('held line not unique/absent in MAIN');
if (lines[idx[0]] !== preImage) throw new Error('MAIN held line differs from the worktree pre-image');
lines.splice(idx[0], 1, newBlock);
fs.writeFileSync(`${OUT}/verbalStreamFilter.ts`, lines.join('\n'));
// test: the worktree's two added `it` blocks go after the last `it` of the "formulas that start with a number" describe.
const wtTest = rd(`${WT}/${f}.test.ts`);
const a = wtTest.indexOf("    it('is identical for every chunk size on a typeset fraction");
const b = wtTest.indexOf("});\n\ndescribe('extractSuggestions");
if (a < 0 || b < a) throw new Error('worktree test hunk not found');
const added = wtTest.slice(a, b);
let test = rd(`${MAIN}/${f}.test.ts`);
const anchor = "            for (const size of [1, 2, 3, 4, 5, 7, 11]) expect(await runNotation(text, size)).toBe(ref);\n        }\n    });\n";
if (test.split(anchor).length !== 2) throw new Error('test anchor not unique');
test = test.replace(anchor, () => anchor + added);
fs.writeFileSync(`${OUT}/verbalStreamFilter.test.ts`, test);
console.log('built', newBlock.split('\n').length, 'impl lines;', added.split('\n').length, 'test lines');
