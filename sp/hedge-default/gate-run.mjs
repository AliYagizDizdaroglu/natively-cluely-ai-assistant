// Throwaway (scratchpad only): run one gate against MAIN from a scratch cwd, then print its verdict.
//   node gate-run.mjs vitest <out.json> [--root <dir>] [--env K=V]... -- <test filters>...
//       runs MAIN's vitest (or a scratch project with --root) with cwd = a scratch dir, never MAIN, so every cwd-relative write
//       lands there; the three NATIVELY_VERBAL_* variables are scrubbed from the child environment unless given with --env,
//       so an "unpolluted" run is unpolluted whatever this shell exports; then prints vitest-summary.mjs's per-file lines.
//   node gate-run.mjs tsc root|electron
//       tsc --noEmit (root config) or tsc --noEmit -p electron/tsconfig.json, cwd = MAIN; prints the exit code and every line.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const VITEST = path.join(MAIN, 'node_modules/vitest/vitest.mjs');
const TSC = path.join(MAIN, 'node_modules/typescript/bin/tsc');
const FLAGS = ['NATIVELY_VERBAL_HEDGE', 'NATIVELY_VERBAL_HEDGE_TRIGGER_MS', 'NATIVELY_VERBAL_PRIMARY_MODEL'];

const [cmd, ...rest] = process.argv.slice(2);

if (cmd === 'vitest') {
    const out = rest.shift();
    if (!out) { console.log('usage: gate-run.mjs vitest <out.json> [--root <dir>] [--env K=V]... -- <filters>...'); process.exit(2); }
    let root = MAIN;
    let cwdArg = null;
    const env = { ...process.env };
    for (const k of FLAGS) delete env[k];
    const given = [];
    const filters = [];
    for (let i = 0; i < rest.length; i++) {
        if (rest[i] === '--root') root = rest[++i];
        else if (rest[i] === '--cwd') cwdArg = rest[++i];
        else if (rest[i] === '--env') {
            const kv = rest[++i];
            const at = kv.indexOf('=');
            if (at < 1 || !FLAGS.includes(kv.slice(0, at))) throw new Error(`--env takes only ${FLAGS.join(' / ')} as K=V, got: ${kv}`);
            env[kv.slice(0, at)] = kv.slice(at + 1);
            given.push(kv);
        } else if (rest[i] === '--') { filters.push(...rest.slice(i + 1)); break; }
        else throw new Error(`unexpected argument before --: ${rest[i]}`);
    }
    if (!fs.existsSync(VITEST)) throw new Error(`vitest not found at ${VITEST}`);
    const cwd = cwdArg ?? path.join(os.tmpdir(), 'hedge-gate-cwd');
    if (cwdArg && path.resolve(cwd).toLowerCase().startsWith(path.resolve(MAIN).toLowerCase())) throw new Error(`--cwd must not be inside MAIN: ${cwd}`);
    fs.mkdirSync(cwd, { recursive: true });
    const args = [VITEST, 'run', '--root', root];
    if (root === MAIN) args.push('--config', path.join(MAIN, 'vitest.config.ts'));
    args.push('--reporter=json', '--outputFile', out, ...filters);
    console.log(`vitest: root=${root === MAIN ? 'MAIN' : root}; cwd=${cwd}; ${filters.length} filter(s); child env: ${FLAGS.map((k) => `${k}=${env[k] === undefined ? '(unset)' : JSON.stringify(env[k])}`).join(' ')}`);
    try { fs.rmSync(out, { force: true }); } catch { /* a stale result must not pass for this run's */ }
    const r = spawnSync(process.execPath, args, { cwd, env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 540000 });
    console.log(`vitest exit code: ${r.status}${r.signal ? ` (signal ${r.signal})` : ''}${r.error ? ` (spawn error ${r.error.code})` : ''}`);
    if (r.status !== 0 && r.stderr) console.log(`stderr tail:\n${r.stderr.split('\n').slice(-12).join('\n')}`);
    if (!fs.existsSync(out)) { console.log(`NO RESULT FILE at ${out}`); process.exit(1); }
    spawnSync(process.execPath, [path.join(HERE, 'vitest-summary.mjs'), out], { stdio: 'inherit' });
    console.log(`scratch cwd now holds: ${fs.readdirSync(cwd).join(', ') || '(empty)'}`);
    process.exit(0);
}

if (cmd === 'tsc') {
    const which = rest[0];
    if (which !== 'root' && which !== 'electron') { console.log('usage: gate-run.mjs tsc root|electron'); process.exit(2); }
    const args = [TSC, '--noEmit', ...(which === 'electron' ? ['-p', 'electron/tsconfig.json'] : [])];
    const r = spawnSync(process.execPath, args, { cwd: MAIN, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 540000 });
    const lines = `${r.stdout ?? ''}${r.stderr ?? ''}`.split('\n').filter((l) => l.trim());
    console.log(`tsc ${which}: exit code ${r.status}${r.signal ? ` (signal ${r.signal})` : ''}; ${lines.length} output line(s)`);
    for (const l of lines) console.log(`  ${l.slice(0, 260)}`);
    process.exit(0);
}

console.log('usage: gate-run.mjs vitest ... | tsc root|electron');
process.exit(2);
