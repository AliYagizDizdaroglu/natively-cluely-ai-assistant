// Throwaway (Task 3): calibrate the tests that now carry the guard the ruling removed the alignment guard in favour of.
// Builds a mirror tree (sdd\t3-tree: node_modules junction to MAIN's, vitest cache redirected here — the way verify-plan-v4.mjs
// does it, MAIN is only READ) and runs the FINAL staged test file against
//   final                              the staged module            -> must be 68 passed (the harness is calibrated)
//   no-non-ascii-guard                 `&& !NON_ASCII_LETTER.test(lastInterim)` removed   -> the Turkish and résumé tests must fail
//   letters-only-guard (no \p{M})      [\p{L}\p{M}] narrowed to \p{L}                     -> expected SURVIVOR: no test uses a combining mark
// then probes the \p{M} half directly with a DECOMPOSED "résumé" (r e U+0301 s u m e U+0301) on the same modules.
//   node t3-mutants.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const STAGE = path.join(HERE, '..', 'stage', 'electron', 'audio');
const TREE = path.join(HERE, 't3-tree');
const finalModule = fs.readFileSync(path.join(STAGE, 'deepgramBoundaryRepair.ts'), 'utf8');
const finalTest = fs.readFileSync(path.join(STAGE, 'deepgramBoundaryRepair.test.ts'), 'utf8');
const once = (label, text, oldS, newS) => {
    const n = text.split(oldS).length - 1;
    if (n !== 1) throw new Error(`mutation "${label}": expected exactly 1 occurrence, found ${n}`);
    return text.replace(oldS, () => newS);
};
const mutants = {
    'final': finalModule,
    'no-non-ascii-guard': once('no guard', finalModule, ' && !NON_ASCII_LETTER.test(lastInterim)', ''),
    'letters-only-guard (no \\p{M})': once('no marks', finalModule, '[\\p{L}\\p{M}]', '\\p{L}'),
};

// ---- mirror tree
fs.mkdirSync(path.join(TREE, 'electron', 'audio'), { recursive: true });
const nm = path.join(TREE, 'node_modules');
if (!fs.existsSync(nm)) fs.symlinkSync(path.join(MAIN, 'node_modules'), nm, 'junction');
fs.writeFileSync(path.join(TREE, 'vitest.config.mjs'), `export default { cacheDir: ${JSON.stringify(path.join(HERE, '.vitecache-t3').replace(/\\/g, '/'))}, test: { environment: 'node', include: ['electron/**/*.test.ts'], globals: true, cache: false } };\n`);
fs.writeFileSync(path.join(TREE, 'electron', 'audio', 'deepgramBoundaryRepair.fixtures.json'), fs.readFileSync(path.join(MAIN, 'electron/audio/deepgramBoundaryRepair.fixtures.json')));
fs.writeFileSync(path.join(TREE, 'electron', 'audio', 'deepgramBoundaryRepair.test.ts'), finalTest);
const VITEST = path.join(MAIN, 'node_modules/vitest/vitest.mjs');

for (const [name, src] of Object.entries(mutants)) {
    fs.writeFileSync(path.join(TREE, 'electron', 'audio', 'deepgramBoundaryRepair.ts'), src);
    const r = spawnSync(process.execPath, [VITEST, 'run', '--root', TREE, 'electron/audio/deepgramBoundaryRepair.test.ts'], { cwd: os.tmpdir(), encoding: 'utf8', timeout: 300000 });
    const out = `${r.stdout}\n${r.stderr}`.replace(/\x1b\[[0-9;]*m/g, '');
    const lines = out.split('\n');
    const summary = lines.filter((l) => /^\s*Tests\s/.test(l)).map((l) => l.trim().replace(/\s+/g, ' ')).join(' | ') || '(no summary)';
    const failed = lines.filter((l) => /^\s+×\s/.test(l)).map((l) => l.trim().replace(/\s\d+ms$/, '').split(' > ').pop());
    console.log(`\n[${name}] exit ${r.status}: ${summary}`);
    failed.forEach((f) => console.log(`   failed: ${f}`));
}

// ---- direct probe of the \p{M} half: DECOMPOSED "résumé"
const esbuild = createRequire(path.join(MAIN, 'package.json'))('esbuild');
const load = (ts) => { const js = esbuild.transformSync(ts, { loader: 'ts', format: 'cjs' }).code; const m = { exports: {} }; new Function('module', 'exports', js)(m, m.exports); return m.exports; };
const play = (mod, events) => { const r = mod.createBoundaryRepair(); let out = ''; for (const e of events) { const res = r.onTranscript(e.text, e.isFinal, e.atMs); if (e.isFinal) out = res.text; } return out; };
const ev = (interim) => [{ text: interim, isFinal: false, atMs: 0 }, { text: 'Tell me about your', isFinal: true, atMs: 100 }, { text: 'and your last role.', isFinal: true, atMs: 2100 }];
const NFC = 'tell me about your r\u00e9sum\u00e9 and your last role';
const NFD = 'tell me about your re\u0301sume\u0301 and your last role';
console.log('\nDecomposed-accent probe (F2 = "and your last role."; "unchanged" is the wanted answer):');
for (const [name, src] of Object.entries(mutants)) {
    const mod = load(src);
    console.log(`   [${name}] NFC résumé -> ${JSON.stringify(play(mod, ev(NFC)))}   NFD résumé -> ${JSON.stringify(play(mod, ev(NFD)))}`);
}

// Leave no junction to MAIN's node_modules behind (a recursive delete of this tree would follow it): `rmdir` removes only the link.
spawnSync('cmd', ['/c', 'rmdir', nm], { encoding: 'utf8' });
console.log(`\njunction to MAIN's node_modules removed: ${!fs.existsSync(nm)}; MAIN's vitest still present: ${fs.existsSync(path.join(MAIN, 'node_modules/vitest/package.json'))}`);
// Then delete the scratch tree itself (it holds the LAST mutant as deepgramBoundaryRepair.ts, which must not be mistaken for the module).
// Only when the junction is really gone; Node's rmSync handles this deep path, where PowerShell's Remove-Item hits the 260-char limit.
if (!fs.existsSync(nm)) { fs.rmSync(TREE, { recursive: true, force: true }); fs.rmSync(path.join(HERE, '.vitecache-t3'), { recursive: true, force: true }); }
console.log(`scratch tree deleted: ${!fs.existsSync(TREE)}`);
