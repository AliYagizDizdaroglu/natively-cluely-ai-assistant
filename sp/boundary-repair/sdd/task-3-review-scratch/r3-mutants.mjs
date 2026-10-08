// Task 3 review (Opus), throwaway. Read-only on MAIN: MAIN's files are only READ; the mutants live in a mirror
// tree under this folder (node_modules = a junction to MAIN's, vite/vitest cache redirected here, MAIN's vitest
// config copied: jsdom, globals). vitest runs from os.tmpdir() (the brief's temp-cwd rule) with --root <mirror>.
// For each module variant: the unit tests (MAIN's test file) AND check-v4.mjs --module on its esbuild transpile.
// Then the PROPOSED test change (an NFD "résumé" expect inside the existing résumé test) on final / \p{M} mutant / v3.
//   node r3-mutants.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BR = path.resolve(HERE, '..', '..');
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const TREE = path.join(HERE, 't');
const AUDIO = path.join(TREE, 'electron', 'audio');
const CACHE = path.join(HERE, '.vc');
const finalModule = fs.readFileSync(path.join(MAIN, 'electron/audio/deepgramBoundaryRepair.ts'), 'utf8');
const v3Module = fs.readFileSync(path.join(HERE, '..', 't3-orig', 'deepgramBoundaryRepair.ts'), 'utf8');
const mainTest = fs.readFileSync(path.join(MAIN, 'electron/audio/deepgramBoundaryRepair.test.ts'), 'utf8');
const once = (label, text, oldS, newS) => {
    const n = text.split(oldS).length - 1;
    if (n !== 1) throw new Error(`mutation "${label}": expected exactly 1 occurrence, found ${n}`);
    return text.replace(oldS, () => newS);
};
const M = (label, oldS, newS) => [label, once(label, finalModule, oldS, newS)];
const variants = [
    ['final (MAIN as is)', finalModule],
    ['v3 module (t3-orig) = the RED state', v3Module],
    M('clear() keeps the latest interim', '            cut = null;\n            lastInterim = null;\n        },', '            cut = null;\n        },'),
    M('clear() keeps the cut', '        clear() {\n            cut = null;\n', '        clear() {\n'),
    M('window 4000', 'const REPAIR_WINDOW_MS = 5000;', 'const REPAIR_WINDOW_MS = 4000;'),
    M('window exclusive (<)', 'atMs - remembered.atMs <= REPAIR_WINDOW_MS', 'atMs - remembered.atMs < REPAIR_WINDOW_MS'),
    M('speechFinal ignored', 'if (lastInterim && !speechFinal && !NON_ASCII_LETTER.test(lastInterim)) {', 'if (lastInterim && !NON_ASCII_LETTER.test(lastInterim)) {'),
    M('speechFinal blocks F2\'s repair', 'if (remembered && atMs - remembered.atMs <= REPAIR_WINDOW_MS) {', 'if (remembered && !speechFinal && atMs - remembered.atMs <= REPAIR_WINDOW_MS) {'),
    M('length rule flipped to <', 'finalTok.length <= interimTok.length', 'finalTok.length < interimTok.length'),
    M('length rule dropped', ' && finalTok.length <= interimTok.length', ''),
    M('digit rule dropped', ' && !/\\d/.test(finalTok)', ''),
    M('first-letter rule dropped', 'finalTok[0] === interimTok[0] && ', ''),
    M('isRespelling args swapped', 'isRespelling(fw[fw.length - 1], iw[fw.length - 1])', 'isRespelling(iw[fw.length - 1], fw[fw.length - 1])'),
    M('non-ASCII guard removed', ' && !NON_ASCII_LETTER.test(lastInterim)', ''),
    M('non-ASCII guard on F1 instead of the interim', '!NON_ASCII_LETTER.test(lastInterim)', '!NON_ASCII_LETTER.test(text)'),
    M('\\p{M} dropped from the guard', '[\\p{L}\\p{M}]', '\\p{L}'),
];

// The proposed test change: a DECOMPOSED résumé inside the existing résumé test (count stays 68).
const RESUME_OLD = String.raw`        expect(play([at('tell me about your résumé and your last role', false, 0), at('Tell me about your', true, 100), at('and your last role.', true, 2100)]))
            .toBe('and your last role.');
    });`;
const RESUME_NEW = String.raw`        expect(play([at('tell me about your résumé and your last role', false, 0), at('Tell me about your', true, 100), at('and your last role.', true, 2100)]))
            .toBe('and your last role.');
        // The same word DECOMPOSED ("e" + U+0301, escaped so no editor can normalise it): the \p{M} half of the guard.
        expect(play([at('tell me about your re\u0301sume\u0301 and your last role', false, 0), at('Tell me about your', true, 100), at('and your last role.', true, 2100)]))
            .toBe('and your last role.');
    });`;
const proposedTest = once('proposed NFD expect', mainTest, RESUME_OLD, RESUME_NEW);

// ---- mirror tree
fs.mkdirSync(AUDIO, { recursive: true });
const nm = path.join(TREE, 'node_modules');
if (!fs.existsSync(nm)) fs.symlinkSync(path.join(MAIN, 'node_modules'), nm, 'junction');
fs.writeFileSync(path.join(TREE, 'vitest.config.mjs'), `export default { cacheDir: ${JSON.stringify(CACHE.replace(/\\/g, '/'))}, test: { environment: 'jsdom', include: ['electron/**/*.test.ts'], globals: true } };\n`);
fs.copyFileSync(path.join(MAIN, 'electron/audio/deepgramBoundaryRepair.fixtures.json'), path.join(AUDIO, 'deepgramBoundaryRepair.fixtures.json'));
const VITEST = path.join(MAIN, 'node_modules/vitest/vitest.mjs');
const esbuild = createRequire(path.join(MAIN, 'package.json'))('esbuild');

function vitest(moduleSrc, testSrc) {
    fs.writeFileSync(path.join(AUDIO, 'deepgramBoundaryRepair.ts'), moduleSrc);
    fs.writeFileSync(path.join(AUDIO, 'deepgramBoundaryRepair.test.ts'), testSrc);
    const r = spawnSync(process.execPath, [VITEST, 'run', '--root', TREE, 'electron/audio/deepgramBoundaryRepair.test.ts'], { cwd: os.tmpdir(), encoding: 'utf8', timeout: 300000 });
    const out = `${r.stdout}\n${r.stderr}`.replace(/\x1b\[[0-9;]*m/g, '');
    const lines = out.split('\n');
    const summary = lines.filter((l) => /^\s*Tests\s/.test(l)).map((l) => l.trim().replace(/\s+/g, ' ')).join(' | ') || `(no summary; exit ${r.status}) ${out.slice(0, 400)}`;
    const failed = [...new Set(lines.filter((l) => /^\s*(×|FAIL)\s.*>/.test(l)).map((l) => l.trim().replace(/\s\d+ms$/, '').split(' > ').pop()))];
    return { summary, failed };
}
function checkV4(moduleSrc) {
    const js = esbuild.transformSync(moduleSrc, { loader: 'ts', format: 'cjs', platform: 'node', target: 'node20' }).code;
    const p = path.join(HERE, 'mutant.js');
    fs.writeFileSync(p, js);
    const r = spawnSync(process.execPath, [path.join(BR, 'check-v4.mjs'), '--module', p], { encoding: 'utf8', timeout: 300000 });
    const lines = `${r.stdout}${r.stderr}`.split('\n');
    const verdict = lines.find((l) => /^(EQUIVALENT|NOT EQUIVALENT)/.test(l)) ?? `(no verdict; exit ${r.status})`;
    const fails = lines.filter((l) => l.startsWith('FAIL')).map((l) => l.replace(/^FAIL\s+/, '').split(' — ')[0]);
    return { verdict: verdict.startsWith('EQUIVALENT') ? 'check-v4 EQUIVALENT (survives)' : `check-v4 NOT EQUIVALENT (${fails.length} FAIL)`, fails };
}

console.log('== module variants: MAIN\'s test file (68 tests) + check-v4.mjs --module ==');
for (const [name, src] of variants) {
    const u = vitest(src, mainTest);
    const c = checkV4(src);
    console.log(`\n[${name}]\n   unit: ${u.summary}\n   ${c.verdict}`);
    u.failed.forEach((f) => console.log(`   unit failed: ${f}`));
    c.fails.slice(0, 6).forEach((f) => console.log(`   check-v4 FAIL: ${f}`));
}

console.log('\n== the proposed test change (NFD "résumé" expect folded into the résumé test) ==');
for (const [name, src] of [variants[0], variants[1], variants.find(([n]) => n.startsWith('\\p{M}'))]) {
    const u = vitest(src, proposedTest);
    console.log(`[${name}] unit: ${u.summary}`);
    u.failed.forEach((f) => console.log(`   unit failed: ${f}`));
}

// ---- cleanup: the junction first (rmdir removes only the link), then the tree and caches
spawnSync('cmd', ['/c', 'rmdir', nm], { encoding: 'utf8' });
console.log(`\njunction removed: ${!fs.existsSync(nm)}; MAIN's vitest still present: ${fs.existsSync(path.join(MAIN, 'node_modules/vitest/package.json'))}`);
if (!fs.existsSync(nm)) { fs.rmSync(TREE, { recursive: true, force: true }); fs.rmSync(CACHE, { recursive: true, force: true }); fs.rmSync(path.join(HERE, 'mutant.js'), { force: true }); }
console.log(`mirror tree deleted: ${!fs.existsSync(TREE)}`);
