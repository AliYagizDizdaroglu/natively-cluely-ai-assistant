// Task 3 fix-round-1 re-review (Opus), throwaway. Read-only on MAIN (mirror tree for the mutants, as r3/r5).
// 1. fingerprints of the FINAL files; 2. escape bytes at byte level (calibrated); 3. transpile + check-v4 --module
// (and compiled-code identity with my round-1 transpile); 4. unit tests of the FINAL test file on final / v3 /
// digit-dropped / \p{L}-only, plus check-v4 on the mutants the new probes should now catch.
// No backslash-u sequence is typed in this file: the escape and the mark are built from char codes.
//   node r10-final.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BR = path.resolve(HERE, '..', '..');
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const MOD = path.join(MAIN, 'electron/audio/deepgramBoundaryRepair.ts');
const TST = path.join(MAIN, 'electron/audio/deepgramBoundaryRepair.test.ts');
const sha = (b) => createHash('sha256').update(b).digest('hex');

// ---- 1. fingerprints
const modB = fs.readFileSync(MOD), tstB = fs.readFileSync(TST);
for (const [n, b, size, pre] of [['module', modB, 10743, 'd5ba4da0'], ['test', tstB, 13947, '6956aea3']]) {
    const ok = b.length === size && sha(b).startsWith(pre);
    console.log(`${ok ? 'OK  ' : 'DIFF'} ${n}: ${b.length} B sha256 ${sha(b).slice(0, 16)} (expected ${size} B ${pre}); CR ${b.includes(13)}; BOM ${b[0] === 0xef}`);
    if (!ok) process.exit(1);
}

// ---- 2. escape bytes
const ESC = Buffer.from([0x5c, 0x75, 0x30, 0x33, 0x30, 0x31]);           // the six ASCII characters: backslash u 0 3 0 1
const MARK = Buffer.from(String.fromCharCode(0x301), 'utf8');            // U+0301 as UTF-8: CC 81
const countBuf = (hay, needle) => { let n = 0, i = -1; while ((i = hay.indexOf(needle, i + 1)) !== -1) n++; return n; };
console.log(`calibration: counter finds U+0301 in a built "re"+U+0301 buffer: ${countBuf(Buffer.from('re' + String.fromCharCode(0x301), 'utf8'), MARK)} (must be 1); MARK bytes ${MARK.toString('hex')}`);
for (const [n, b] of [['test', tstB], ['module', modB]]) {
    const s = b.toString('utf8');
    console.log(`${n}: literal escape sequences ${countBuf(b, ESC)}; U+0301 (CC 81) ${countBuf(b, MARK)}; any combining mark ${(s.match(/\p{M}/gu) ?? []).length}; NFC ${s === s.normalize('NFC')}`);
}
const lines = tstB.toString('utf8').split('\n');
lines.forEach((l, i) => { if (l.includes(ESC.toString('latin1'))) { const k = Buffer.from(l).indexOf(ESC); console.log(`  test.ts:${i + 1} bytes around the first escape: ${Buffer.from(l).subarray(k - 2, k + 8).toString('hex')} ("${l.slice(l.indexOf('re' + ESC.toString('latin1')) - 1, l.indexOf('re' + ESC.toString('latin1')) + 20)}")`); } });

// ---- 3. transpile + check-v4
const esbuild = createRequire(path.join(MAIN, 'package.json'))('esbuild');
const opts = { loader: 'ts', format: 'cjs', platform: 'node', target: 'node20' };
const finalSrc = modB.toString('utf8');
const js = esbuild.transformSync(finalSrc, opts).code;
const out = path.join(HERE, 'final-deepgramBoundaryRepair.js');
fs.writeFileSync(out, js);
const r1js = fs.readFileSync(path.join(HERE, 'deepgramBoundaryRepair.js'), 'utf8');   // my round-1 transpile (10,262 B module)
console.log(`transpiled final: ${Buffer.byteLength(js)} B sha256 ${sha(js).slice(0, 16)}; identical to my round-1 transpile (${Buffer.byteLength(r1js)} B): ${js === r1js}`);
const check = (p) => {
    const r = spawnSync(process.execPath, [path.join(BR, 'check-v4.mjs'), '--module', p], { encoding: 'utf8', timeout: 300000 });
    const t = `${r.stdout}${r.stderr}`;
    return { exit: r.status, text: t, lines: t.split('\n') };
};
const c = check(out);
fs.writeFileSync(path.join(HERE, 'r10-check-v4.out.txt'), c.text);
console.log(`check-v4.mjs --module (final): exit ${c.exit}; PASS ${c.lines.filter((l) => l.startsWith('PASS')).length}; FAIL ${c.lines.filter((l) => l.startsWith('FAIL')).length}; probe lines ${c.lines.filter((l) => /^(PASS|FAIL)\s+probe:/.test(l)).length}`);
for (const l of c.lines) if (/^(PASS  data:|EQUIVALENT|NOT EQUIVALENT|ALL CHECKS|\d+ CHECK)/.test(l)) console.log(`  ${l.slice(0, 260)}`);

// ---- 4. mutants: unit tests (FINAL test file) + check-v4
const v3Module = fs.readFileSync(path.join(HERE, '..', 't3-orig', 'deepgramBoundaryRepair.ts'), 'utf8');
const once = (label, text, a, b) => { const n = text.split(a).length - 1; if (n !== 1) throw new Error(`${label}: ${n} occurrences`); return text.replace(a, () => b); };
const variants = [
    ['final (MAIN as is)', finalSrc, false],
    ['v3 module (t3-orig), the RED state', v3Module, false],
    ['digit rule dropped', once('digit', finalSrc, ' && !/\\d/.test(finalTok)', ''), true],
    ['\\p{L} only (\\p{M} dropped)', once('marks', finalSrc, '[\\p{L}\\p{M}]', '\\p{L}'), true],
    ['clear() keeps the latest interim', once('clear', finalSrc, '            cut = null;\n            lastInterim = null;\n        },', '            cut = null;\n        },'), true],
];
const TREE = path.join(HERE, 't'), AUDIO = path.join(TREE, 'electron', 'audio'), CACHE = path.join(HERE, '.vc');
fs.mkdirSync(AUDIO, { recursive: true });
const nm = path.join(TREE, 'node_modules');
try {
    if (!fs.existsSync(nm)) fs.symlinkSync(path.join(MAIN, 'node_modules'), nm, 'junction');
    fs.writeFileSync(path.join(TREE, 'vitest.config.mjs'), `export default { cacheDir: ${JSON.stringify(CACHE.replace(/\\/g, '/'))}, test: { environment: 'jsdom', include: ['electron/**/*.test.ts'], globals: true } };\n`);
    fs.copyFileSync(path.join(MAIN, 'electron/audio/deepgramBoundaryRepair.fixtures.json'), path.join(AUDIO, 'deepgramBoundaryRepair.fixtures.json'));
    fs.writeFileSync(path.join(AUDIO, 'deepgramBoundaryRepair.test.ts'), tstB);                       // the FINAL test file, byte for byte
    const VITEST = path.join(MAIN, 'node_modules/vitest/vitest.mjs');
    for (const [name, src, runCheck] of variants) {
        fs.writeFileSync(path.join(AUDIO, 'deepgramBoundaryRepair.ts'), src);
        const r = spawnSync(process.execPath, [VITEST, 'run', '--root', TREE, 'electron/audio/deepgramBoundaryRepair.test.ts'], { cwd: os.tmpdir(), encoding: 'utf8', timeout: 300000 });
        const ls = `${r.stdout}\n${r.stderr}`.replace(/\x1b\[[0-9;]*m/g, '').split('\n');
        const summary = ls.filter((l) => /^\s*Tests\s/.test(l)).map((l) => l.trim().replace(/\s+/g, ' ')).join(' | ') || `(no summary; exit ${r.status})`;
        const failed = [...new Set(ls.filter((l) => /^\s*(×|FAIL)\s.*>/.test(l)).map((l) => l.trim().replace(/\s\d+ms$/, '').split(' > ').pop()))];
        const recv = ls.filter((l) => /^\s*(Expected|Received):/.test(l)).map((l) => l.trim()).slice(0, 2);
        let cv = '';
        if (runCheck) {
            const p = path.join(HERE, 'mutant.js');
            fs.writeFileSync(p, esbuild.transformSync(src, opts).code);
            const k = check(p);
            const v = k.lines.find((l) => /^(EQUIVALENT|NOT EQUIVALENT)/.test(l)) ?? `(no verdict, exit ${k.exit})`;
            cv = `; check-v4: ${v.startsWith('EQUIVALENT') ? 'EQUIVALENT (survives)' : 'NOT EQUIVALENT'} ${k.lines.filter((l) => l.startsWith('FAIL')).map((l) => l.replace(/^FAIL\s+/, '').split(' — ')[0].slice(0, 70)).join(' | ')}`;
        }
        console.log(`[${name}] ${summary}${cv}`);
        failed.forEach((f) => console.log(`   failed: ${f}`));
        if (runCheck) recv.forEach((l) => console.log(`   ${l}`));
    }
} finally {
    spawnSync('cmd', ['/c', 'rmdir', nm], { encoding: 'utf8' });
    const gone = !fs.existsSync(nm);
    console.log(`junction removed: ${gone}; MAIN's vitest present: ${fs.existsSync(path.join(MAIN, 'node_modules/vitest/package.json'))}`);
    if (gone) { fs.rmSync(TREE, { recursive: true, force: true }); fs.rmSync(CACHE, { recursive: true, force: true }); fs.rmSync(path.join(HERE, 'mutant.js'), { force: true }); }
    console.log(`mirror tree deleted: ${!fs.existsSync(TREE)}; MAIN files unchanged: ${sha(fs.readFileSync(MOD)).startsWith('d5ba4da0') && sha(fs.readFileSync(TST)).startsWith('6956aea3')}`);
}
