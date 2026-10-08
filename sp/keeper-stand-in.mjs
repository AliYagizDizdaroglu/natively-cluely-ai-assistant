// Stand-in for a `run.mjs app:keep` process: itself DETACHED (no console, keeps its handles),
// it spawns its children NON-detached with windowsHide (CREATE_NO_WINDOW) and stdio to a
// file — the shape a GUI process uses to run a console child with captured output.
// Children: npm --version (cmd -> batch -> node) and concurrently -> node, the real chain's links.
import { spawn } from 'node:child_process';
import { openSync, closeSync, appendFileSync } from 'node:fs';
const out = process.argv[2];
const CONC = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\node_modules\\concurrently\\dist\\bin\\concurrently.js';
appendFileSync(out, `keeper pid ${process.pid} alive at ${new Date().toISOString()}\n`);
for (const cmd of ['npm --version', `node "${CONC}" "node -e console.log(\\"conc-via-keeper-ok\\")"`]) {
    const fd = openSync(out, 'a');
    const child = spawn('cmd.exe', ['/c', cmd], {
        cwd: 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant',
        detached: false,
        windowsHide: true,
        stdio: ['ignore', fd, fd],
    });
    closeSync(fd);
    await new Promise((r) => child.on('exit', r));
}
// Prove the keeper is still alive long after its parent exited.
await new Promise((r) => setTimeout(r, 6000));
appendFileSync(out, `keeper still alive at ${new Date().toISOString()}, parent long gone\n`);
