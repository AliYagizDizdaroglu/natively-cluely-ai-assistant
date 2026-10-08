// The 20:30 smoke started the app fine and app-start.log stayed at 0 bytes. The first
// calibration only proved cmd.exe's own echo lands in the file; the real chain is
// cmd -> node(npm) -> cmd -> node(concurrently) -> children. Find the link that drops it.
// Nothing here starts the app: npm --version, a bare node print, and concurrently
// running a bare node print. Each variant is spawned with EXACTLY appStart's shape.
import { spawn } from 'node:child_process';
import { openSync, closeSync, readFileSync, existsSync, unlinkSync } from 'node:fs';
import path from 'node:path';

const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const CONC = path.join(PROJ, 'node_modules/concurrently/dist/bin/concurrently.js');
console.log('concurrently bin present:', existsSync(CONC));

const variants = [
    { name: 'cmd echo (known good)',           cmd: 'echo cmd-echo-ok',                                   detached: true },
    { name: 'cmd -> node -e',                   cmd: 'node -e "console.log(\'node-e-ok\')"',               detached: true },
    { name: 'cmd -> npm --version',             cmd: 'npm --version',                                      detached: true },
    { name: 'cmd -> node concurrently -> node', cmd: `node "${CONC}" "node -e console.log(\\"conc-ok\\")"`, detached: true },
    { name: 'cmd -> npm --version, NOT detached', cmd: 'npm --version',                                    detached: false },
];

for (const v of variants) {
    const out = path.join(process.env.TEMP, `cal2-${variants.indexOf(v)}.log`);
    if (existsSync(out)) unlinkSync(out);
    const fd = openSync(out, 'w');
    const child = spawn('cmd.exe', ['/c', v.cmd], {
        cwd: PROJ,
        env: { ...process.env },
        detached: v.detached,
        stdio: ['ignore', fd, fd],
        windowsHide: false,
    });
    child.unref();
    closeSync(fd);
    await new Promise((r) => setTimeout(r, 6000));
    const got = existsSync(out) ? readFileSync(out, 'utf8') : '';
    console.log(`${String(got.length).padStart(5)} bytes  ${v.name}  ${JSON.stringify(got.trim().slice(0, 80))}`);
}
