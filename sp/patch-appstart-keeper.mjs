// Replace appStart with the measured two-level shape (detached node keeper -> non-detached
// npm start, both streams captured) plus one retry, and wire app:keep. Every anchor must be
// present exactly once or the file is left untouched (rule 11).
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.run.mjs';
let src = readFileSync(FILE, 'utf8');
if (src.includes('\r')) throw new Error('file is not LF-only');
if (src.includes('app:keep')) throw new Error('already patched');

function once(anchor, what) {
    const hits = src.split(anchor).length - 1;
    if (hits !== 1) throw new Error(`${what}: anchor found ${hits} times, expected exactly 1`);
}

// 1. The whole appStart function, doc comment to closing brace.
const START = '/** Spawn `npm start` with the autostart flag; wait for the two log lines that prove it is listening in Auto. */\n';
const END = "    console.log('APP START  listening in Auto');\n}\n";
once(START, 'appStart start'); once(END, 'appStart end');
const a = src.indexOf(START), b = src.indexOf(END) + END.length;
if (b <= a) throw new Error('appStart end precedes its start');

const NEW_BLOCK = String.raw`/**
 * Start the app and wait for the two log lines that prove it is listening in Auto.
 *
 * Two levels, because the one-level shape cannot be diagnosed (measured 2026-09-20): a
 * cmd.exe spawned DETACHED from here — needed so app:start can return and the app outlives
 * it — has no console, and every node child of a console-less cmd loses the handles it was
 * given: cmd's own echo arrives, npm's output does not, cmd's own redirection does not help.
 * A NON-detached child dies with this process instead (libuv's kill-on-close job). So this
 * spawns a detached node KEEPER, which keeps its handles, and the keeper spawns npm start
 * non-detached with both streams into app-start.log — that shape captured npm's stdout and
 * a node child's stderr, and the keeper outlived its parent.
 *
 * Two attempts. The 19:50 smoke that day lost only a smoke to a start that never reached
 * whenReady; the same failure at 10:10 costs the flight day, and auto() runs this function.
 */
async function appStart() {
    fs.mkdirSync(RUNS_DIR, { recursive: true });
    const startLog = path.join(RUNS_DIR, 'app-start.log');
    fs.writeFileSync(startLog, '');
    for (let attempt = 1; attempt <= 2; attempt++) {
        const keeperPid = await appStartOnce(startLog);
        if (keeperPid === null) return;
        console.log(` + '`APP START  attempt ${attempt} of 2 failed — what the app printed is in ${startLog}`' + String.raw`);
        try { execFileSync('taskkill', ['/PID', String(keeperPid), '/T', '/F'], { stdio: 'pipe' }); } catch { /* already gone */ }
        if (attempt === 2) process.exit(1);
        // Vite runs --strictPort: a retry while the dead attempt's listener lingers exits at once.
        if (!(await waitForPortFree(5180, 30_000))) { console.log('APP START  port 5180 still held 30s after the kill — not retrying into it'); process.exit(1); }
    }
}

/** One attempt. Returns null once the app is listening in Auto, else the keeper pid to tree-kill. */
async function appStartOnce(startLog) {
    // main.ts unconditionally resets natively_debug.log to a fresh, near-empty
    // file at app.whenReady() (rotating whatever was there into .log.1), so a
    // byte offset captured against the OLD file is stale the instant the new
    // process reaches that point — the file's size drops well below it and
    // never catches back up. Wait for that reset (size drops below its
    // pre-spawn value) before reading from 0, sharing the start budget with it.
    const preSize = logSize(DEBUG_LOG);
    // 180s, not 90s: the s50k start needed 55s of the old budget and the 2026-09-20
    // 19:50 smoke still had not reached whenReady at 90s. Three times the known-good
    // time turns a slow start into a pass and leaves a genuine hang plainly over budget.
    const deadline = Date.now() + 180_000;
    // Append, never truncate: a second attempt must not erase what the first one printed.
    fs.appendFileSync(startLog, ` + '`=== app:start attempt ${new Date().toISOString()} ===\\n`' + String.raw`);
    const startFd = fs.openSync(startLog, 'a');
    const keeper = spawn(process.execPath, [fileURLToPath(import.meta.url), 'app:keep', startLog], {
        cwd: PROJ,
        // NATIVELY_CAPTURE_PROMPTS: record the exact system + user turn per answer, so the
        // focused arms can replay the app's own call. Measured hours only — a normal session
        // has no reason to write the résumé context and the transcript to disk.
        env: { ...process.env, NATIVELY_AUTOSTART_MEETING: '1', NATIVELY_LIVE_MODE: 'auto', NATIVELY_CAPTURE_PROMPTS: '1' },
        detached: true,
        stdio: ['ignore', startFd, startFd],
        windowsHide: false,
    });
    keeper.unref();
    fs.closeSync(startFd);
    fs.writeFileSync(PID_FILE, String(keeper.pid));
    console.log(` + '`APP START  keeper pid=${keeper.pid}  waiting for the app to come up listening in Auto…`' + String.raw`);
    while (preSize > 0 && logSize(DEBUG_LOG) >= preSize) {
        if (Date.now() >= deadline) {
            console.log('APP START  FAILED — natively_debug.log was never reset for this session (app never reached whenReady?)');
            return keeper.pid;
        }
        await sleep(1000);
    }
    const r = await waitForLogLines(DEBUG_LOG, 0, [/\[Main\] Starting Meeting/, /\[Main\] Live Mode (restored )?→ auto/], { timeoutMs: Math.max(0, deadline - Date.now()), pollMs: 1000 });
    if (!r.ok) {
        console.log(` + '`APP START  FAILED — never saw: ${r.missing.map(String).join(\', \')}`' + String.raw`);
        console.log('  if the mode line is missing, the app never reached setLiveMode/startMeeting — check the log');
        return keeper.pid;
    }
    console.log('APP START  listening in Auto');
    return null;
}

/**
 * The process that owns the app (app:keep). Detached from whoever ran app:start, it spawns
 * npm start NON-detached with both streams into startLog and lives exactly as long as the
 * app does; appStop tree-kills it to end the hour.
 */
async function appKeep(startLog) {
    const fd = fs.openSync(startLog, 'a');
    const child = spawn('cmd.exe', ['/c', 'npm', 'start'], {
        cwd: PROJ,
        env: process.env,
        detached: false,
        stdio: ['ignore', fd, fd],
        windowsHide: false,
    });
    fs.closeSync(fd);
    await new Promise((resolve) => child.on('exit', resolve));
}

/** True once nothing listens on 127.0.0.1:port, polling once a second to the deadline. */
async function waitForPortFree(port, timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
        const free = await new Promise((resolve) => {
            const probe = net.createServer();
            probe.once('error', () => resolve(false));
            probe.listen({ port, host: '127.0.0.1' }, () => probe.close(() => resolve(true)));
        });
        if (free) return true;
        if (Date.now() >= deadline) return false;
        await sleep(1000);
    }
}
`;
src = src.slice(0, a) + NEW_BLOCK + src.slice(b);

// 2. net import, beside the existing node imports.
const IMP = "import { fileURLToPath } from 'url';\n";
once(IMP, 'import anchor');
src = src.replace(IMP, IMP + "import net from 'net';\n");

// 3. appStop must recognise the keeper as ours.
const RX = String.raw`const looksLikeOurs = /electron(\.exe)?/i.test(cmdLine) || /npm(\.cmd)?["']?\s+start/i.test(cmdLine);`;
once(RX, 'looksLikeOurs');
src = src.replace(RX, String.raw`const looksLikeOurs = /interview60\.run\.mjs["']?\s+app:keep/i.test(cmdLine) || /electron(\.exe)?/i.test(cmdLine) || /npm(\.cmd)?["']?\s+start/i.test(cmdLine);`);
const RXC = '        // command line still looks like the electron/npm start we spawned.\n';
once(RXC, 'looksLikeOurs comment');
src = src.replace(RXC, '        // command line still looks like the keeper we spawned (or an electron/npm start).\n');

// 4. Dispatch and usage.
const DISP = "else if (cmd === 'app:start') await appStart();\n";
once(DISP, 'dispatch');
src = src.replace(DISP, DISP + "else if (cmd === 'app:keep') await appKeep(process.argv[3]);   // internal: spawned detached by appStart\n");
const USAGE = 'preflight|app|report|app:start|app:stop|probe';
once(USAGE, 'usage');
src = src.replace(USAGE, 'preflight|app|report|app:start|app:keep <log>|app:stop|probe');

writeFileSync(FILE, src, 'utf8');
console.log('patched: appStart/appStartOnce/appKeep/waitForPortFree, net import, appStop regex, dispatch, usage');
