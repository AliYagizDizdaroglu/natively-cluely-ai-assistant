// Task 4 final fix round (throwaway): a mirror-tree vitest runner. MAIN is only READ: node_modules comes through a junction that dispose()
// removes again (rmdir removes only the link), the vite cache lives in this folder, vitest runs with cwd = %TEMP% and the same settings as
// MAIN's vitest.config.ts (jsdom, globals). runJson() uses vitest's JSON reporter, so every test has a status (passed / failed / skipped).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const STAGE = path.join(HERE, '..', 'stage');
export const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const VITEST = path.join(MAIN, 'node_modules/vitest/vitest.mjs');
export const sha16 = (b) => createHash('sha256').update(b).digest('hex').slice(0, 16);
export const rdMain = (rel) => fs.readFileSync(path.join(MAIN, rel));
export const rdStage = (rel) => fs.readFileSync(path.join(STAGE, rel));
export const rdR2 = (name) => fs.readFileSync(path.join(HERE, 't4-r2', name));
/** exactly one occurrence of `a` in `s`, replaced by `b` (throws otherwise) */
export const sub = (s, a, b) => { if (s.split(a).length !== 2) throw new Error(`expected exactly one occurrence of: ${a.slice(0, 90)}`); return s.replace(a, () => b); };
const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');

export function makeMirror(name) {
    const TREE = path.join(HERE, name);
    const CACHE = path.join(HERE, `.vitecache-${name}`);
    const nm = path.join(TREE, 'node_modules');
    const rmdirJunction = () => { if (fs.existsSync(nm)) spawnSync('cmd', ['/c', 'rmdir', nm], { encoding: 'utf8' }); };
    rmdirJunction();
    fs.rmSync(TREE, { recursive: true, force: true });
    fs.mkdirSync(TREE, { recursive: true });
    fs.symlinkSync(path.join(MAIN, 'node_modules'), nm, 'junction');
    fs.writeFileSync(path.join(TREE, 'vitest.config.mjs'), `export default { cacheDir: ${JSON.stringify(CACHE.replace(/\\/g, '/'))}, test: { environment: 'jsdom', include: ['electron/**/*.test.ts'], globals: true } };\n`);
    const put = (rel, data) => { const p = path.join(TREE, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, data); };
    const runJson = (testRel) => {
        const outFile = path.join(HERE, `${name}-run.json`);
        fs.rmSync(outFile, { force: true });
        const r = spawnSync(process.execPath, [VITEST, 'run', '--root', TREE, '--reporter=json', `--outputFile=${outFile}`, testRel], { cwd: os.tmpdir(), encoding: 'utf8', timeout: 300000 });
        const results = [];
        if (fs.existsSync(outFile)) {
            const j = JSON.parse(fs.readFileSync(outFile, 'utf8'));
            for (const f of j.testResults) {
                if (!f.assertionResults.length && f.message) results.push({ title: '(file)', status: 'failed', msg: f.message.slice(0, 300) });
                for (const a of f.assertionResults) results.push({ title: a.title, status: a.status, msg: (a.failureMessages ?? []).join(' ').split('\n')[0].slice(0, 200) });
            }
            fs.rmSync(outFile, { force: true });
        }
        return { status: r.status, results, raw: strip(`${r.stdout}\n${r.stderr}`).slice(0, 600) };
    };
    /** vitest's default reporter: the unedited text (ANSI colours stripped), for quoting a failure block. */
    const runRaw = (testRel) => {
        const r = spawnSync(process.execPath, [VITEST, 'run', '--root', TREE, testRel], { cwd: os.tmpdir(), encoding: 'utf8', timeout: 300000, env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' } });
        return { status: r.status, text: strip(`${r.stdout}\n${r.stderr}`) };
    };
    const dispose = () => {
        rmdirJunction();
        const gone = !fs.existsSync(nm);
        const vitestOk = fs.existsSync(path.join(MAIN, 'node_modules/vitest/package.json'));
        if (gone) { fs.rmSync(TREE, { recursive: true, force: true }); fs.rmSync(CACHE, { recursive: true, force: true }); }
        return `junction removed: ${gone}; MAIN's vitest still present: ${vitestOk}; scratch tree deleted: ${!fs.existsSync(TREE)}`;
    };
    return { TREE, put, runJson, runRaw, dispose };
}
