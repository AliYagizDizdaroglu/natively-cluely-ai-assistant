// THROWAWAY — give smoke-turn-noise.mjs its own app start that KEEPS the child's output
// (run.mjs app:start spawns with stdio ignored, so a failed `npm start` leaves no trace) and
// waits 180 s instead of 90, so "slow" and "dead" can be told apart. Same spawn shape as
// run.mjs appStart otherwise: cmd /c npm start, detached, autostart env, pid file.
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname.slice(1));
const FILE = path.join(HERE, 'smoke-turn-noise.mjs');
let s = fs.readFileSync(FILE, 'utf8');

const from = "    execFileSync(process.execPath, [RUN, 'app:start'], { cwd: PROJ, stdio: 'inherit' });";
const to = `    await appStartCaptured();`;
if (s.split(from).length - 1 !== 1) { console.error('app:start call not found exactly once'); process.exit(1); }
s = s.replace(from, to);

const helper = `
/** Diagnostic twin of run.mjs appStart: the child's stdout/stderr go to a file, and the
 *  deadline is 180 s. Everything else identical (spawn shape, env, pid file, the two log lines). */
async function appStartCaptured() {
    const { waitForLogLines } = await import('file:///' + path.join(HERE, 'interview60.lib.mjs').replace(/\\\\/g, '/'));
    const OUT_LOG = path.join(HERE, 'interview60.runs', 'smoke-app.out.log');
    const PID_FILE = path.join(HERE, 'interview60.runs', 'app.pid');
    const outFd = fs.openSync(OUT_LOG, 'w');
    const preSize = logSize(DEBUG_LOG);
    const t0 = Date.now();
    const deadline = t0 + 180_000;
    const child = spawn('cmd.exe', ['/c', 'npm', 'start'], {
        cwd: PROJ,
        env: { ...process.env, NATIVELY_AUTOSTART_MEETING: '1', NATIVELY_LIVE_MODE: 'auto', NATIVELY_CAPTURE_PROMPTS: '1' },
        detached: true,
        stdio: ['ignore', outFd, outFd],
        windowsHide: false,
    });
    child.unref();
    fs.writeFileSync(PID_FILE, String(child.pid));
    log(\`APP START (captured)  pid=\${child.pid}  output -> \${OUT_LOG}\`);
    while (preSize > 0 && logSize(DEBUG_LOG) >= preSize) {
        if (Date.now() >= deadline) { log(\`APP START FAILED after \${Math.round((Date.now() - t0) / 1000)} s — debug log never reset; see smoke-app.out.log\`); process.exit(1); }
        await new Promise((r) => setTimeout(r, 1000));
    }
    log(\`debug log reset after \${Math.round((Date.now() - t0) / 1000)} s\`);
    const r = await waitForLogLines(DEBUG_LOG, 0, [/\\[Main\\] Starting Meeting/, /\\[Main\\] Live Mode (restored )?→ auto/], { timeoutMs: Math.max(0, deadline - Date.now()), pollMs: 1000 });
    if (!r.ok) { log(\`APP START FAILED — never saw: \${r.missing.map(String).join(', ')}\`); process.exit(1); }
    log(\`APP START listening in Auto after \${Math.round((Date.now() - t0) / 1000)} s\`);
}
`;
const anchor = 'async function main() {';
if (s.split(anchor).length - 1 !== 1) { console.error('main() anchor not found exactly once'); process.exit(1); }
s = s.replace(anchor, helper + '\n' + anchor);
fs.writeFileSync(FILE, s);
console.log(`patched ${FILE}`);
