// Option B: keep the app detached exactly as every flight has run it, but let cmd.exe do
// the redirection itself. cmd sets explicit std handles for a redirected child, which is
// what a console-less parent needs for a console-subsystem child like node to keep them.
// Nothing here starts the app.
import { spawn } from 'node:child_process';
import { readFileSync, existsSync, unlinkSync } from 'node:fs';
import path from 'node:path';

const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const CONC = path.join(PROJ, 'node_modules/concurrently/dist/bin/concurrently.js');

const variants = [
    { name: 'detached, cmd redirects npm --version',            cmd: 'npm --version' },
    { name: 'detached, cmd redirects node -e (stderr side)',    cmd: 'node -e "console.error(\'err-side-ok\')"' },
    { name: 'detached, cmd redirects concurrently -> node',     cmd: `node "${CONC}" "node -e console.log(\\"conc-ok\\")"` },
];

for (const v of variants) {
    const out = path.join(process.env.TEMP, `cal3-${variants.indexOf(v)}.log`);
    if (existsSync(out)) unlinkSync(out);
    const child = spawn('cmd.exe', ['/c', `${v.cmd} > "${out}" 2>&1`], {
        cwd: PROJ,
        env: { ...process.env },
        detached: true,
        stdio: 'ignore',
        windowsHide: false,
    });
    child.unref();
    await new Promise((r) => setTimeout(r, 6000));
    const got = existsSync(out) ? readFileSync(out, 'utf8') : '';
    console.log(`${String(got.length).padStart(5)} bytes  ${v.name}  ${JSON.stringify(got.trim().slice(0, 80))}`);
}
