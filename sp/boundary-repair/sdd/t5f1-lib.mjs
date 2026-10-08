// Task 5 fix round 1 (throwaway): a mirror-tree vitest runner shared by the t5f1-* scripts. MAIN is only READ: vitest and
// node_modules come through a junction that dispose() removes again (rmdir on the link, then the tree), the vite cache is
// redirected into the scratchpad, and vitest runs with cwd = %TEMP% like the repo's TEST command. Same vitest settings as MAIN's
// vitest.config.ts (jsdom, globals). The mirror holds only the files put into it, plus (runs: true) copies of the two committed
// fixtures and their run logs; runs: false is "a clean checkout": no interview60.runs/ at all.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
export const G = 'electron/test/golden/';
export const TEST_REL = G + 'interview60.turns-finals.test.ts';
export const MOD_REL = G + 'interview60.turns-finals.mjs';
export const RUNS = ['2026-09-09T15-00-55-s50a', '2026-09-08T08-44-56-after9'];
const VITEST = path.join(MAIN, 'node_modules/vitest/vitest.mjs');
export const rdMain = (rel) => fs.readFileSync(path.join(MAIN, rel));
const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');

export function makeMirror(name, { runs }) {
    const TREE = path.join(HERE, name);
    const CACHE = path.join(HERE, `.vitecache-${name}`);
    const nm = path.join(TREE, 'node_modules');
    const rmdirJunction = () => { if (fs.existsSync(nm)) spawnSync('cmd', ['/c', 'rmdir', nm], { encoding: 'utf8' }); };
    rmdirJunction();
    fs.rmSync(TREE, { recursive: true, force: true });
    fs.mkdirSync(path.join(TREE, 'electron', 'test', 'golden'), { recursive: true });
    fs.symlinkSync(path.join(MAIN, 'node_modules'), nm, 'junction');
    fs.writeFileSync(path.join(TREE, 'vitest.config.mjs'), `export default { cacheDir: ${JSON.stringify(CACHE.replace(/\\/g, '/'))}, test: { environment: 'jsdom', include: ['electron/**/*.test.ts'], globals: true } };\n`);
    const put = (rel, data) => { const p = path.join(TREE, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, data); };
    if (runs) {
        for (const n of RUNS) {
            for (const f of ['interview60.timeline.json', 'natively_debug.log']) put(`${G}interview60.runs/${n}/${f}`, rdMain(`${G}interview60.runs/${n}/${f}`));
            put(`${G}fixtures/${n}-turns.json`, rdMain(`${G}fixtures/${n}-turns.json`));
        }
    }
    /** vitest, verbose reporter: the printed summary lines exactly as vitest prints them, plus one entry per test. */
    const runVerbose = (testRel = TEST_REL) => {
        const r = spawnSync(process.execPath, [VITEST, 'run', '--root', TREE, '--reporter=verbose', testRel], { cwd: os.tmpdir(), encoding: 'utf8', timeout: 300000 });
        const text = strip(`${r.stdout}\n${r.stderr}`);
        const lines = text.split('\n');
        const tests = lines.map((l) => l.match(/^\s*([✓×↓])\s+(.*?)(?:\s+\d+ms)?\s*$/)).filter(Boolean).map((m) => ({ mark: m[1], title: m[2].split(' > ').slice(2).join(' > ') || m[2] }));
        return { status: r.status, text, testsLine: lines.find((l) => /^\s*Tests\s/.test(l)) ?? '(no Tests line)', filesLine: lines.find((l) => /^\s*Test Files\s/.test(l)) ?? '(no Test Files line)', tests };
    };
    /** vitest, JSON reporter: per-test status (passed / failed / skipped) for the mutant tables. */
    const runJson = (testRel = TEST_REL) => {
        const outFile = path.join(HERE, `${name}-run.json`);
        fs.rmSync(outFile, { force: true });
        const r = spawnSync(process.execPath, [VITEST, 'run', '--root', TREE, '--reporter=json', `--outputFile=${outFile}`, testRel], { cwd: os.tmpdir(), encoding: 'utf8', timeout: 300000 });
        const results = [];
        if (fs.existsSync(outFile)) {
            const j = JSON.parse(fs.readFileSync(outFile, 'utf8'));
            for (const f of j.testResults) for (const a of f.assertionResults) results.push({ title: a.title, status: a.status });
            fs.rmSync(outFile, { force: true });
        }
        return { status: r.status, results, raw: strip(`${r.stdout}\n${r.stderr}`).slice(0, 400) };
    };
    const dispose = () => {
        rmdirJunction();
        const gone = !fs.existsSync(nm);
        const vitestOk = fs.existsSync(path.join(MAIN, 'node_modules/vitest/package.json'));
        if (gone) { fs.rmSync(TREE, { recursive: true, force: true }); fs.rmSync(CACHE, { recursive: true, force: true }); }
        return `junction removed: ${gone}; MAIN's vitest still present: ${vitestOk}; scratch tree deleted: ${!fs.existsSync(TREE)}`;
    };
    return { TREE, put, runVerbose, runJson, dispose };
}
