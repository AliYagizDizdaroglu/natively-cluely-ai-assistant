// Task 5 (throwaway): are the staged (and MAIN) Task 5 files byte-exact renderings of the brief's fenced blocks?
//   node t5-verify-brief.mjs --list
//   node t5-verify-brief.mjs --expect test[,module-old|module-v4][,extractor] [--main]
// Each expectation compares the STAGED file with the text derived from the brief; --main also compares MAIN's
// copy with the staged one. Calibration is built in: every comparison is repeated against a deliberately
// perturbed derivation (one em dash turned into a hyphen, one trailing newline dropped), which must say DIFFERENT.
// Read-only on MAIN and on the stage.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const STAGE = path.join(HERE, '..', 'stage');
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const G = 'electron/test/golden/';
const brief = fs.readFileSync(path.join(HERE, 'task-5-brief.md'), 'utf8');
if (brief.includes('\r')) throw new Error('brief holds CR bytes');
const blocks = [];
{
    let cur = null;
    for (const ln of brief.split('\n')) {
        if (ln.startsWith('```')) { if (cur === null) cur = []; else { blocks.push(cur.join('\n') + '\n'); cur = null; } }
        else if (cur !== null) cur.push(ln);
    }
}
if (process.argv.includes('--list')) {
    blocks.forEach((b, i) => console.log(`block ${i}: ${b.length} chars, first line: ${b.split('\n')[0].slice(0, 100)}`));
    process.exit(0);
}
// Block map (checked with --list): 0 test file, 1 OLD-parse module, 2 v4 module, 3 old extractor lines 53-54,
// 4 their replacement, 5 the extractor run command.
if (blocks.length !== 6) throw new Error(`expected 6 fenced blocks in the brief, found ${blocks.length}`);
const B = { test: blocks[0], moduleOld: blocks[1], moduleV4: blocks[2], extOld: blocks[3], extNew: blocks[4] };
const rd = (p) => fs.readFileSync(p, 'utf8');
const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);
const once = (hay, needle, what) => {
    const first = hay.indexOf(needle);
    if (first < 0 || hay.indexOf(needle, first + 1) >= 0) throw new Error(`${what}: anchor found ${first < 0 ? 0 : 'more than 1'} times`);
    return first;
};
const replaceOnce = (hay, o, n, what) => { const i = once(hay, o, what); return hay.slice(0, i) + n + hay.slice(i + o.length); };
const IMPORT_ANCHOR = "import { fileURLToPath } from 'node:url';\n";
const IMPORT_NEW = "import { finalsFrom } from './interview60.turns-finals.mjs';\n";
const extractorFromBrief = () => {
    const orig = rd(path.join(HERE, 't5-orig', 'interview60.turns-fixture.mjs'));
    const withImport = replaceOnce(orig, IMPORT_ANCHOR, IMPORT_ANCHOR + IMPORT_NEW, 'extractor import anchor');
    return replaceOnce(withImport, B.extOld, B.extNew, 'extractor lines 53-54');
};
const WANT = {
    test: { rel: G + 'interview60.turns-finals.test.ts', expected: () => B.test },
    'module-old': { rel: G + 'interview60.turns-finals.mjs', expected: () => B.moduleOld },
    'module-v4': { rel: G + 'interview60.turns-finals.mjs', expected: () => B.moduleV4 },
    extractor: { rel: G + 'interview60.turns-fixture.mjs', expected: extractorFromBrief },
};
const perturb = (t) => (t.includes('\u2014') ? t.replace('\u2014', '-') : t.slice(0, -1));
const arg = process.argv[process.argv.indexOf('--expect') + 1] ?? '';
const wants = arg.split(',').filter(Boolean);
if (!wants.length) throw new Error('usage: --expect test[,module-old|module-v4][,extractor] [--main]');
let bad = 0;
for (const w of wants) {
    const spec = WANT[w];
    if (!spec) throw new Error(`unknown expectation ${w}`);
    const exp = spec.expected();
    const staged = rd(path.join(STAGE, spec.rel));
    const ok = staged === exp;
    const cal = staged === perturb(exp);
    console.log(`${w}: ${spec.rel}`);
    console.log(`  staged ${staged.length} chars ${sha(staged)} | derived-from-brief ${exp.length} chars ${sha(exp)} -> ${ok ? 'IDENTICAL' : 'DIFFERENT'}`);
    console.log(`  calibration (staged vs perturbed derivation): ${cal ? 'IDENTICAL (BAD: the comparison cannot fail)' : 'DIFFERENT (good)'}`);
    if (!ok || cal) bad++;
    if (process.argv.includes('--main')) {
        const main = rd(path.join(MAIN, spec.rel));
        const same = main === staged;
        console.log(`  MAIN ${main.length} chars ${sha(main)} vs staged -> ${same ? 'IDENTICAL' : 'DIFFERENT'}`);
        if (!same) bad++;
    }
}
console.log(bad ? `PROBLEMS: ${bad}` : 'all requested comparisons IDENTICAL, all calibrations DIFFERENT');
process.exit(bad ? 1 : 0);
