// Option B again, with the command line built by hand (windowsVerbatimArguments) so
// Node's own quoting of the /c argument cannot be what broke calibrate-capture-3.
// Also records whether the file exists at all — "0 bytes" hid missing-vs-empty.
import { spawn } from 'node:child_process';
import { readFileSync, existsSync, unlinkSync, statSync } from 'node:fs';
import path from 'node:path';

const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const CONC = path.join(PROJ, 'node_modules/concurrently/dist/bin/concurrently.js').replace(/\//g, '\\');

const variants = [
    { name: 'verbatim, detached, cmd redirects npm --version',         cmd: 'npm --version' },
    { name: 'verbatim, detached, cmd redirects node -e stderr',        cmd: 'node -e "console.error(\'err-side-ok\')"' },
    { name: 'verbatim, detached, cmd redirects concurrently -> node',  cmd: `node "${CONC}" "node -e console.log(1)"` },
    { name: 'verbatim, NOT detached, cmd redirects npm --version',     cmd: 'npm --version', notDetached: true },
];

for (const v of variants) {
    const out = path.join(process.env.TEMP, `cal4-${variants.indexOf(v)}.log`);
    if (existsSync(out)) unlinkSync(out);
    // Exact command line cmd.exe will see — no Node quoting layer in between.
    const line = `cmd.exe /d /s /c "${v.cmd} > ${out} 2>&1"`;
    const child = spawn('cmd.exe', [line], {
        cwd: PROJ,
        env: { ...process.env },
        detached: !v.notDetached,
        stdio: 'ignore',
        windowsHide: false,
        windowsVerbatimArguments: true,
    });
    child.unref();
    await new Promise((r) => setTimeout(r, 6000));
    const exists = existsSync(out);
    const got = exists ? readFileSync(out, 'utf8') : '';
    console.log(`${exists ? 'file  ' : 'NOFILE'} ${String(got.length).padStart(5)} bytes  ${v.name}  ${JSON.stringify(got.trim().slice(0, 80))}`);
}
