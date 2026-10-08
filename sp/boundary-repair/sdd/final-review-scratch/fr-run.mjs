// Final review (throwaway): run MAIN's tests the repo's way (cwd = %TEMP%, --root MAIN) and both tsc gates. Read-only on MAIN
// except vitest's own cache under MAIN/node_modules/.vite (the controller's sanctioned command does the same).
//   node fr-run.mjs vitest <path-or-file> [...]      |   node fr-run.mjs tsc
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
const [mode, ...rest] = process.argv.slice(2);
if (mode === 'vitest') {
    // --cwd-main: only for a pre-existing READ-only test that resolves its fixtures from process.cwd() (interviewerTurn.replay.test.ts:7).
    const cwd = rest.includes('--cwd-main') ? MAIN : os.tmpdir();
    const files = rest.filter((a) => !a.startsWith('--'));
    const r = spawnSync(process.execPath, [path.join(MAIN, 'node_modules/vitest/vitest.mjs'), 'run', '--root', MAIN, '--reporter=verbose', ...files], { cwd, encoding: 'utf8', timeout: 600000 });
    const text = strip(`${r.stdout}\n${r.stderr}`);
    const lines = text.split('\n');
    const keep = lines.filter((l) => /^\s*(Test Files|Tests|Duration)\s/.test(l) || /^\s*[×]/.test(l) || /FAIL|Error:|skipped|↓/.test(l));
    console.log(`exit ${r.status}; cwd ${cwd}`);
    console.log(keep.join('\n'));
    if (process.argv.includes('--all')) console.log(text);
} else if (mode === 'tsc') {
    const TSC = path.join(MAIN, 'node_modules/typescript/bin/tsc');
    for (const p of ['tsconfig.json', 'electron/tsconfig.json']) {
        const r = spawnSync(process.execPath, [TSC, '--noEmit', '-p', path.join(MAIN, p)], { cwd: os.tmpdir(), encoding: 'utf8', timeout: 600000 });
        const out = strip(`${r.stdout}${r.stderr}`).split('\n').filter((l) => l.trim());
        const errs = out.filter((l) => /error TS\d+/.test(l));
        console.log(`tsc -p ${p}: exit ${r.status}, ${errs.length} error line(s)`);
        for (const l of errs) console.log('  ' + l.replace(/^.*?natively-cluely-ai-assistant[\\/]/, ''));
    }
} else {
    console.log('usage: node fr-run.mjs vitest <files...> | tsc');
    process.exit(2);
}
