// Throwaway (Task 3, fix round 1): the mirror-tree proof. MAIN is only READ (vitest and node_modules through a junction that this
// script removes again, then it deletes its own tree). Runs the FINAL staged test file (13947 B) against
//   v3 original            BR\sdd\t3-orig (5940 B / 4653b898): the RED state -> must be 10 failed | 58 passed (68)
//   final                  the staged module (10691 B)                          -> must be 68 passed (harness calibration)
//   digit rule removed     `!/\d/.test(finalTok)` taken out of isRespelling      -> must fail exactly the "twenty five" test
//   \p{L}-only guard       [\p{L}\p{M}] narrowed to \p{L}                        -> must fail exactly the resume test
//   no non-ASCII guard     continuity with round 1                               -> the two non-ASCII tests, as before
// and prints, for every failing test of a mutant, the Expected / Received lines (so the failure is visibly the NEW expect).
// Then the two new expects are run DIRECTLY on the v3 module (the RED run stops at each test's first expect).
//   node t3-r1-proof.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const STAGE = path.join(HERE, '..', 'stage', 'electron', 'audio');
const TREE = path.join(HERE, 't3-r1-tree');
const sha16 = (b) => createHash('sha256').update(b).digest('hex').slice(0, 16);

const v3Buf = fs.readFileSync(path.join(HERE, 't3-orig', 'deepgramBoundaryRepair.ts'));
if (v3Buf.length !== 5940 || sha16(v3Buf) !== '4653b898dadc0885') throw new Error('t3-orig module is not the 5940 B / 4653b898 v3 original');
const finalBuf = fs.readFileSync(path.join(STAGE, 'deepgramBoundaryRepair.ts'));
const testBuf = fs.readFileSync(path.join(STAGE, 'deepgramBoundaryRepair.test.ts'));
console.log(`v3 original ${v3Buf.length} B ${sha16(v3Buf)}; final module ${finalBuf.length} B ${sha16(finalBuf)}; test ${testBuf.length} B ${sha16(testBuf)}`);
const v3Module = v3Buf.toString('utf8'), finalModule = finalBuf.toString('utf8'), finalTest = testBuf.toString('utf8');

const once = (label, text, oldS, newS) => {
    const n = text.split(oldS).length - 1;
    if (n !== 1) throw new Error(`mutation "${label}": expected exactly 1 occurrence, found ${n}`);
    return text.replace(oldS, () => newS);
};
const variants = [
    ['v3 original (the RED state)', v3Module],
    ['final', finalModule],
    ['MUTANT digit rule removed', once('digit', finalModule, ' && !/\\d/.test(finalTok)', '')],
    ['MUTANT \\p{L}-only guard (no \\p{M})', once('marks', finalModule, '[\\p{L}\\p{M}]', '\\p{L}')],
    ['MUTANT no non-ASCII guard', once('guard', finalModule, ' && !NON_ASCII_LETTER.test(lastInterim)', '')],
];

// ---- mirror tree
fs.mkdirSync(path.join(TREE, 'electron', 'audio'), { recursive: true });
const nm = path.join(TREE, 'node_modules');
if (!fs.existsSync(nm)) fs.symlinkSync(path.join(MAIN, 'node_modules'), nm, 'junction');
fs.writeFileSync(path.join(TREE, 'vitest.config.mjs'), `export default { cacheDir: ${JSON.stringify(path.join(HERE, '.vitecache-t3r1').replace(/\\/g, '/'))}, test: { environment: 'node', include: ['electron/**/*.test.ts'], globals: true, cache: false } };\n`);
fs.writeFileSync(path.join(TREE, 'electron', 'audio', 'deepgramBoundaryRepair.fixtures.json'), fs.readFileSync(path.join(MAIN, 'electron/audio/deepgramBoundaryRepair.fixtures.json')));
fs.writeFileSync(path.join(TREE, 'electron', 'audio', 'deepgramBoundaryRepair.test.ts'), finalTest);
const VITEST = path.join(MAIN, 'node_modules/vitest/vitest.mjs');

let results;
try {
    results = variants.map(([name, src]) => {
        fs.writeFileSync(path.join(TREE, 'electron', 'audio', 'deepgramBoundaryRepair.ts'), src);
        const r = spawnSync(process.execPath, [VITEST, 'run', '--root', TREE, 'electron/audio/deepgramBoundaryRepair.test.ts'], { cwd: os.tmpdir(), encoding: 'utf8', timeout: 300000 });
        const out = `${r.stdout}\n${r.stderr}`.replace(/\x1b\[[0-9;]*m/g, '');
        const lines = out.split('\n');
        const summary = lines.filter((l) => /^\s*Tests\s/.test(l)).map((l) => l.trim().replace(/\s+/g, ' ')).join(' | ') || `(no summary; exit ${r.status})`;
        const failed = [...new Set(lines.filter((l) => /^\s+×\s/.test(l)).map((l) => l.trim().replace(/\s\d+ms$/, '').split(' > ').pop()))];
        // Expected/Received pairs, one per failing test, in order of appearance in the detailed failure blocks
        const pairs = [];
        for (let i = 0; i < lines.length; i++) if (/^\s*Expected:/.test(lines[i]) && /^\s*Received:/.test(lines[i + 1] ?? '')) pairs.push(`${lines[i].trim()}  |  ${lines[i + 1].trim()}`);
        console.log(`\n[${name}] exit ${r.status}: ${summary}`);
        failed.forEach((f) => console.log(`   failed: ${f}`));
        if (name.startsWith('MUTANT')) pairs.forEach((p) => console.log(`   ${p}`));
        return { name, summary, failed, exit: r.status };
    });
} finally {
    // Leave no junction to MAIN's node_modules behind (`rmdir` removes only the link), then delete the scratch tree.
    spawnSync('cmd', ['/c', 'rmdir', nm], { encoding: 'utf8' });
    const gone = !fs.existsSync(nm);
    console.log(`\njunction to MAIN's node_modules removed: ${gone}; MAIN's vitest still present: ${fs.existsSync(path.join(MAIN, 'node_modules/vitest/package.json'))}`);
    if (gone) { fs.rmSync(TREE, { recursive: true, force: true }); fs.rmSync(path.join(HERE, '.vitecache-t3r1'), { recursive: true, force: true }); }
    console.log(`scratch tree deleted: ${!fs.existsSync(TREE)}`);
}

// ---- the two new expects run DIRECTLY on the v3 module (a vitest test stops at its first failing expect, so the RED run above
// never reaches them), and on the final module.
const esbuild = createRequire(path.join(MAIN, 'package.json'))('esbuild');
const load = (ts) => { const js = esbuild.transformSync(ts, { loader: 'ts', format: 'cjs' }).code; const m = { exports: {} }; new Function('module', 'exports', js)(m, m.exports); return m.exports; };
const play = (mod, events) => { const r = mod.createBoundaryRepair(); let out = ''; for (const e of events) { const res = r.onTranscript(e.text, e.isFinal, e.atMs); if (e.isFinal) out = res.text; } return out; };
const at = (text, isFinal, atMs) => ({ text, isFinal, atMs });
const NEW_EXPECTS = [
    ['digit pin ("version two" -> "v2")', [at('we shipped version two last week', false, 0), at('We shipped v2', true, 100), at('last week, then rolled it back.', true, 2100)], 'last week, then rolled it back.'],
    // the same string the test file holds: literal backslash-u escapes are decoded by the TS/JS compiler, here built from char codes
    ['decomposed resume (e + U+0301)', [at(`tell me about your re${String.fromCharCode(0x301)}sume${String.fromCharCode(0x301)} and your last role`, false, 0), at('Tell me about your', true, 100), at('and your last role.', true, 2100)], 'and your last role.'],
];
console.log('\nThe two NEW expects run directly (want = the test\'s expected value):');
for (const [modName, src] of [['v3 original', v3Module], ['final', finalModule]]) {
    const mod = load(src);
    for (const [label, events, want] of NEW_EXPECTS) {
        const got = play(mod, events);
        console.log(`   [${modName}] ${label}: ${got === want ? 'passes' : 'FAILS'} — got ${JSON.stringify(got)}`);
    }
}
