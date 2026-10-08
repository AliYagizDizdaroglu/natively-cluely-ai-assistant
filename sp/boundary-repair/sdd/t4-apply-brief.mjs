// Task 4 (throwaway): rebuild the four Task 4 files from the ORIGINALS in sdd\t4-orig\ by applying the brief's
// edits straight out of the brief's fenced blocks, then compare with the staged copies and with MAIN.
//   node t4-apply-brief.mjs
// Calibration: for every edit, the staged file compared with "the brief minus that edit" must say DIFFERENT
// once the edit has been applied to the staged file (and IDENTICAL to the original before it) — i.e. the
// comparison can fail. Read-only on MAIN and on the stage.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const STAGE = path.join(HERE, '..', 'stage');
const ORIG = path.join(HERE, 't4-orig');
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const brief = fs.readFileSync(path.join(HERE, 'task-4-brief.md'), 'utf8');
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
    blocks.forEach((b, i) => console.log(`block ${i}: ${b.length} chars, first line: ${b.split('\n')[0].slice(0, 90)}`));
    process.exit(0);
}
// Block map (checked with --list; the indented ```powershell fence of the Global Constraints is not a block here):
// 0 keyterms test appendix, 1/2 old/new `results` line, 3 nested describe, 4/5 old/new keyterms.ts block,
// 6/7 old/new (b), 8/9 old/new (c), 10/11 old/new (d).
const B = { kwTest: blocks[0], resOld: blocks[1], resNew: blocks[2], nested: blocks[3], kwOld: blocks[4], kwNew: blocks[5], bOld: blocks[6], bNew: blocks[7], cOld: blocks[8], cNew: blocks[9], dOld: blocks[10], dNew: blocks[11] };
if (blocks.length !== 12) throw new Error(`expected 12 fenced blocks in the brief, found ${blocks.length}`);
for (const [k, v] of Object.entries(B)) if (typeof v !== 'string') throw new Error(`brief block ${k} missing`);
const importNew = /change the import on line 2 to `([^`]+)`/.exec(brief)?.[1];
const adapterImportNew = /Line 13: replace `[^`]+` with `([^`]+)`/.exec(brief)?.[1];
if (!importNew || !adapterImportNew) throw new Error('inline import edits not found in the brief');
const ADAPTER_IMPORT_OLD = "import { keytermsFor } from './deepgramKeyterms';";
const KW_IMPORT_OLD = "import { DEEPGRAM_KEYTERMS, keytermsFor } from './deepgramKeyterms';";

const once = (hay, needle, what) => {
    const first = hay.indexOf(needle);
    if (first < 0 || hay.indexOf(needle, first + 1) >= 0) throw new Error(`${what}: anchor found ${first < 0 ? 0 : 'more than 1'} times`);
    return first;
};
const replaceOnce = (hay, oldS, newS, what) => { const i = once(hay, oldS, what); return hay.slice(0, i) + newS + hay.slice(i + oldS.length); };
const rd = (p) => fs.readFileSync(p, 'utf8');
const orig = {
    kw: rd(path.join(ORIG, 'deepgramKeyterms.ts')),
    kwTest: rd(path.join(ORIG, 'deepgramKeyterms.test.ts')),
    adapter: rd(path.join(ORIG, 'DeepgramStreamingSTT.ts')),
    adapterTest: rd(path.join(ORIG, 'DeepgramStreamingSTT.boundaryRepair.test.ts')),
};

// Every edit as a named function on one file's text; `skip` names the edit to leave out.
const EDITS = {
    kwTest: [
        ['kwTest.import', (t) => replaceOnce(t, KW_IMPORT_OLD, importNew, 'kwTest import')],
        ['kwTest.append', (t) => { if (!t.endsWith('});\n')) throw new Error('kwTest: unexpected end'); return t + '\n' + B.kwTest; }],
    ],
    adapterTest: [
        ['adapterTest.results', (t) => replaceOnce(t, B.resOld, B.resNew, 'adapterTest results line')],
        ['adapterTest.nested', (t) => { if (!t.endsWith('    });\n});\n')) throw new Error('adapterTest: unexpected end'); return t.slice(0, -'});\n'.length) + '\n' + B.nested + '});\n'; }],
    ],
    kw: [['kw.predicate', (t) => replaceOnce(t, B.kwOld, B.kwNew, 'keyterms block')]],
    adapter: [
        ['adapter.a.import', (t) => replaceOnce(t, ADAPTER_IMPORT_OLD, adapterImportNew, 'adapter (a)')],
        ['adapter.b.gate', (t) => replaceOnce(t, B.bOld, B.bNew, 'adapter (b)')],
        ['adapter.c.handler', (t) => replaceOnce(t, B.cOld, B.cNew, 'adapter (c)')],
        ['adapter.d.utteranceEnd', (t) => replaceOnce(t, B.dOld, B.dNew, 'adapter (d)')],
    ],
};
const build = (key, skip) => EDITS[key].reduce((t, [name, fn]) => (name === skip ? t : fn(t)), orig[key]);
const PATHS = {
    kw: 'electron/audio/deepgramKeyterms.ts',
    kwTest: 'electron/audio/deepgramKeyterms.test.ts',
    adapter: 'electron/audio/DeepgramStreamingSTT.ts',
    adapterTest: 'electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts',
};
const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);
const verdict = (a, b) => (a === b ? 'IDENTICAL' : 'DIFFERENT');
let mismatches = 0;
console.log('(state legend: each file is compared with the ORIGINAL, with the FULL brief edit set, and with the brief minus each single edit)');
for (const key of Object.keys(PATHS)) {
    const rel = PATHS[key];
    const staged = rd(path.join(STAGE, rel));
    const mainT = rd(path.join(MAIN, rel));
    const full = build(key, null);
    console.log(`\n${rel}`);
    console.log(`  original ${orig[key].length} chars ${sha(orig[key])} | expected-from-brief ${full.length} chars ${sha(full)} | staged ${staged.length} chars ${sha(staged)} | MAIN ${mainT.length} chars ${sha(mainT)}`);
    console.log(`  staged vs original:            ${verdict(staged, orig[key])}`);
    console.log(`  staged vs expected-from-brief: ${verdict(staged, full)}`);
    console.log(`  MAIN   vs staged:              ${verdict(mainT, staged)}`);
    for (const [name] of EDITS[key]) {
        const minus = build(key, name);
        console.log(`  calibration: staged vs brief-minus-[${name}]: ${verdict(staged, minus)}`);
    }
    if (process.argv.includes('--expect-full') && staged !== full) mismatches++;
    if (process.argv.includes('--expect-tests') && (key === 'kwTest' || key === 'adapterTest') && staged !== full) mismatches++;
    if (process.argv.includes('--expect-tests') && (key === 'kw' || key === 'adapter') && staged !== orig[key]) mismatches++;
}
console.log(`\nmismatches against the requested expectation: ${mismatches}`);
process.exit(mismatches ? 1 : 0);
