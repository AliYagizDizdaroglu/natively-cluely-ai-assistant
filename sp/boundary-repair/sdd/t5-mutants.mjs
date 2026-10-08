// Task 5 (throwaway): mutation calibration of the finals-parser tests on a MIRROR tree. MAIN is only READ (vitest
// and node_modules through a junction that this script removes again, then it deletes its own tree).
// The FINAL test file (byte-identical to MAIN's) runs against the FINAL module and against single-edit mutants of
// it; the failing-test set of every variant is compared with the prediction, so each test is shown to be able to fail.
//   node t5-mutants.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const G = 'electron/test/golden/';
const TREE = path.join(HERE, 't5-mirror');
const CACHE = path.join(HERE, '.vitecache-t5');
const sha16 = (b) => createHash('sha256').update(b).digest('hex').slice(0, 16);
const rdMain = (rel) => fs.readFileSync(path.join(MAIN, rel));

// ---- inputs (MAIN's current bytes)
const modBuf = rdMain(G + 'interview60.turns-finals.mjs');
const testBuf = rdMain(G + 'interview60.turns-finals.test.ts');
console.log(`final module ${modBuf.length} B ${sha16(modBuf)}; test ${testBuf.length} B ${sha16(testBuf)}`);
const mod = modBuf.toString('utf8');
// the OLD inline parse = the brief's first ```js block
const brief = fs.readFileSync(path.join(HERE, 'task-5-brief.md'), 'utf8');
const blocks = [];
{ let cur = null; for (const ln of brief.split('\n')) { if (ln.startsWith('```')) { if (cur === null) cur = []; else { blocks.push(cur.join('\n') + '\n'); cur = null; } } else if (cur !== null) cur.push(ln); } }
if (blocks.length !== 6) throw new Error(`expected 6 fenced blocks in the brief, found ${blocks.length}`);
const oldParse = blocks[1];

const once = (label, oldS, newS) => {
    const n = mod.split(oldS).length - 1;
    if (n !== 1) throw new Error(`mutation "${label}": expected exactly 1 occurrence of ${JSON.stringify(oldS)}, found ${n}`);
    return mod.replace(oldS, () => newS);
};
const T1 = 'T1 restored+raw', T2 = 'T2 interims/empties/since', T3 = 'T3 not-adjacent', P1 = 'P1 s50a parity', P2 = 'P2 after9 parity';
const keyOf = (title) => (/^a final directly followed by a boundary-repair line/.test(title) ? T1
    : /^keeps interims and empty finals out/.test(title) ? T2
    : /^a repair line that is not the very next line/.test(title) ? T3
    : /2026-09-09T15-00-55-s50a fixture/.test(title) ? P1
    : /2026-09-08T08-44-56-after9 fixture/.test(title) ? P2 : `? ${title}`);
// [name, module text, EXPECTED failing set (null = informational: print, do not assert)]
const variants = [
    ['control: the final module', mod, []],
    ['old inline parse (the brief\'s Step 3 calibration: 2 failed | 3 passed)', oldParse, [T1, T2]],
    ['adjacency: a repair line up to 2 lines after the final is applied', once('adjacency', 'lines[i + 1]?.match(REPAIR)', '(lines[i + 1]?.match(REPAIR) ?? lines[i + 2]?.match(REPAIR))'), [T1, T2, T3]],
    ['direction: the repair line is looked for BEFORE the final', once('direction', 'lines[i + 1]?.match(REPAIR)', 'lines[i - 1]?.match(REPAIR)'), [T1, T2]],
    ['order: raw text first, restored words after', once('order', '`${unq(rep[1])} ${unq(m[2])}`', '`${unq(m[2])} ${unq(rep[1])}`'), [T1, T2]],
    ['no empty-text filter', once('empty', 'if (text && at >= sinceMs)', 'if (at >= sinceMs)'), [T1, P1, P2]],
    ['no since filter', once('since', 'if (text && at >= sinceMs)', 'if (text)'), null],
    ['no trim', once('trim', ': unq(m[2])).trim();', ': unq(m[2]));'), null],
    ['since exclusive (> instead of >=)', once('gt', 'at >= sinceMs', 'at > sinceMs'), null],
];

// ---- mirror tree
const nm = path.join(TREE, 'node_modules');
const rmdirJunction = () => { if (fs.existsSync(nm)) spawnSync('cmd', ['/c', 'rmdir', nm], { encoding: 'utf8' }); };
rmdirJunction();
fs.rmSync(TREE, { recursive: true, force: true });
fs.mkdirSync(path.join(TREE, 'electron', 'test', 'golden', 'fixtures'), { recursive: true });
fs.symlinkSync(path.join(MAIN, 'node_modules'), nm, 'junction');
fs.writeFileSync(path.join(TREE, 'vitest.config.mjs'), `export default { cacheDir: ${JSON.stringify(CACHE.replace(/\\/g, '/'))}, test: { environment: 'jsdom', include: ['electron/**/*.test.ts'], globals: true } };\n`);
const put = (rel, buf) => { fs.mkdirSync(path.dirname(path.join(TREE, rel)), { recursive: true }); fs.writeFileSync(path.join(TREE, rel), buf); };
put(G + 'interview60.turns-finals.test.ts', testBuf);
for (const name of ['2026-09-09T15-00-55-s50a', '2026-09-08T08-44-56-after9']) {
    for (const f of ['interview60.timeline.json', 'natively_debug.log']) put(`${G}interview60.runs/${name}/${f}`, rdMain(`${G}interview60.runs/${name}/${f}`));
    put(`${G}fixtures/${name}-turns.json`, rdMain(`${G}fixtures/${name}-turns.json`));
}
// information for the trim/empty variants: do the real logs hold whitespace-padded or empty finals at all?
{
    const FINAL = /^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=true, text="((?:[^"\\]|\\.)*)"/;
    for (const name of ['2026-09-09T15-00-55-s50a', '2026-09-08T08-44-56-after9']) {
        const lines = rdMain(`${G}interview60.runs/${name}/natively_debug.log`).toString('utf8').split('\n');
        let finals = 0, empty = 0, padded = 0;
        for (const l of lines) { const m = l.match(FINAL); if (!m) continue; finals++; if (m[2] === '') empty++; else if (m[2] !== m[2].trim()) padded++; }
        console.log(`log ${name}: ${finals} final lines, ${empty} with empty text, ${padded} whitespace-padded`);
    }
}

const VITEST = path.join(MAIN, 'node_modules/vitest/vitest.mjs');
let bad = 0;
try {
    for (const [name, text, expected] of variants) {
        put(G + 'interview60.turns-finals.mjs', text);
        const outFile = path.join(HERE, 't5-mutants-run.json');
        fs.rmSync(outFile, { force: true });
        const r = spawnSync(process.execPath, [VITEST, 'run', '--root', TREE, '--reporter=json', `--outputFile=${outFile}`, G + 'interview60.turns-finals.test.ts'], { cwd: os.tmpdir(), encoding: 'utf8', timeout: 300000 });
        let failed = [], passed = 0, total = 0;
        if (fs.existsSync(outFile)) {
            const j = JSON.parse(fs.readFileSync(outFile, 'utf8'));
            for (const f of j.testResults) for (const a of f.assertionResults) { total++; if (a.status === 'passed') passed++; else failed.push(keyOf(a.title)); }
            if (!j.testResults.length) failed.push('(no test file collected)');
        } else {
            failed.push(`(no result file; exit ${r.status}) ${(r.stdout + r.stderr).replace(/\x1b\[[0-9;]*m/g, '').slice(0, 300)}`);
        }
        failed.sort();
        const want = expected ? [...expected].sort() : null;
        const ok = want === null ? true : JSON.stringify(failed) === JSON.stringify(want);
        if (!ok) bad++;
        console.log(`[${want === null ? 'info' : ok ? 'as expected' : 'UNEXPECTED'}] ${name}: ${failed.length} failed | ${passed} passed (${total}); failing: ${failed.length ? failed.join('; ') : 'none'}${want !== null && !ok ? `; EXPECTED failing: ${want.join('; ') || 'none'}` : ''}`);
    }
} finally {
    rmdirJunction();
    const gone = !fs.existsSync(nm);
    console.log(`junction removed: ${gone}; MAIN's vitest still present: ${fs.existsSync(path.join(MAIN, 'node_modules/vitest/package.json'))}`);
    if (gone) { fs.rmSync(TREE, { recursive: true, force: true }); fs.rmSync(CACHE, { recursive: true, force: true }); fs.rmSync(path.join(HERE, 't5-mutants-run.json'), { force: true }); }
    console.log(`scratch tree deleted: ${!fs.existsSync(TREE)}`);
}
console.log(`variants that differed from the prediction: ${bad}`);
process.exit(bad ? 1 : 0);
