/**
 * Foreground probe for the startup-refusal segment (h40c task-7-review.md C3/C4/I1).
 *
 * Replaces a backgrounded `app:start`, which held the segment log's write handle for 180s+
 * (appStartOnce waits that long for lines a refusal never prints, then retries once more -
 * interview60.run.mjs:243-251, 266, 291) and silently dropped every later foreground append
 * to the same file - reproduced with no app involved at all in SP\rv7\ovw.cmd and ovw2.cmd
 * ("MARKER ABSENT - cmd skipped the foreground command"). And even when app:stop DID get to
 * run and print "killed 0 process(es)", that line alone does not show the app exited on its
 * own: appStop tree-kills whatever `app.pid` names FIRST, so a clean exit and a force-killed
 * hang both end with "killed 0" (C4). This probe watches the real child exit code instead.
 *
 * 1. Runs app:stop first, so no leftover instance holds the single-instance lock - a second
 *    instance just logs "[Main] Another instance is already running..." and exits 0
 *    (main.ts:3394-3403), which must never be mistaken for a refusal.
 * 2. Spawns the build+app directly: `npm run electron:dev` (package.json) runs
 *    `build:electron` (the incremental esbuild transpile) then `electron .` - no vite, no
 *    wait-on, no concurrently. The refusal happens before any window is created
 *    (main.ts's describeVerbalHedgeAtStartup call, right after app.whenReady), so the
 *    renderer dev server this segment never uses is skipped entirely.
 *    NATIVELY_VERBAL_HEDGE=yes is set in the CHILD's env only - this script's own env never
 *    carries it, so nothing else this script does (the app:stop calls) can be confused by it.
 *    The child's stdio goes to its OWN file (smoke-hedge-refuse.child.log), never to the
 *    segment log - that shared-handle contention is exactly what broke the old design.
 * 3. Waits for the child to exit, up to a deadline long enough for a cold build (180s - a
 *    2026-09-20 run took over 90s to reach "listening", interview60.run.mjs:263-265).
 * 4. Appends exactly one outcome line to the segment log via fs.appendFileSync (opened and
 *    closed per call, never held open) - never through an inherited stdout handle:
 *      "REFUSE exited code=<c> after <ms>ms", or, if the deadline passed first,
 *      "REFUSE STILL RUNNING after <ms>ms", followed by writing the child's pid to app.pid
 *      (interview60.run.mjs's appStop matches "electron" in "electron:dev" against that
 *      pid's command line) and running app:stop to clean it up - a build+app process must
 *      never outlive this probe.
 *
 * Calibration only, never set by the launcher: REFUSE_PROBE_CMD replaces the spawned command
 * with a stub (a real shell command string, run via `cmd.exe /c`), and REFUSE_PROBE_DEADLINE_MS
 * shortens the wait so a "still running" case does not take 3 minutes to calibrate.
 *
 * FIX ROUND 2 (task-7-rereview.md):
 *   NEW-M1  The deadline `setTimeout` used to keep running (and the event loop alive with it)
 *           even after the child exited early - measured: a child that exited in 110ms still
 *           held the probe for the full 12s deadline. Cleared via clearTimeout as soon as
 *           either side of the race resolves.
 *   NEW-M2  The probe used to always exit 0, so the launcher's WORST exit code never reflected
 *           a bad segment-4 outcome. `process.exitCode` is now 1 unless the child exited 1 (the
 *           one CORRECT outcome for a refusal).
 *   NEW-M3  If app:stop could not actually kill the STILL-RUNNING child (a CIM failure in its
 *           own command-line matching, for example), the probe used to block on the child
 *           handle with no log line at all - measured: 60.3s of silence before the stub's own
 *           safety exit saved it. Now waits up to 10s for the real 'exit' event after app:stop
 *           runs; if it still has not fired, logs `REFUSE cleanup FAILED: pid <n> still alive`
 *           and calls `child.unref()` so the probe (and therefore the launcher) can still end
 *           on schedule instead of hanging until the task's own outer time limit.
 *
 *   node refuse-probe.mjs <segment-log-path>
 */
import fs from 'fs';
import path from 'path';
import { execFileSync, spawn } from 'child_process';

const PROJ = process.cwd();
const RUNS = path.join(PROJ, 'electron', 'test', 'golden', 'interview60.runs');
const RUN_MJS = path.join(PROJ, 'electron', 'test', 'golden', 'interview60.run.mjs');
const PID_FILE = path.join(RUNS, 'app.pid');
const CHILD_LOG = path.join(RUNS, 'smoke-hedge-refuse.child.log');

const logPath = process.argv[2];
if (!logPath) {
    console.error('usage: node refuse-probe.mjs <segment-log-path>');
    process.exit(2);
}
const log = (line) => fs.appendFileSync(logPath, `${line}\n`);

const DEADLINE_MS = Number(process.env.REFUSE_PROBE_DEADLINE_MS || 180_000);
const CMD_STRING = process.env.REFUSE_PROBE_CMD || 'npm run electron:dev';

async function main() {
    fs.mkdirSync(RUNS, { recursive: true });

    // 1. No leftover instance of this checkout's app holding the single-instance lock.
    try { execFileSync(process.execPath, [RUN_MJS, 'app:stop'], { cwd: PROJ, stdio: 'ignore' }); }
    catch { /* best effort - a run.mjs bug here must not block the probe itself */ }

    // 2. Spawn the build+app (or, for calibration, a stub), the bad value in ITS env only.
    const childFd = fs.openSync(CHILD_LOG, 'w');
    const t0 = Date.now();
    const child = spawn('cmd.exe', ['/c', CMD_STRING], {
        cwd: PROJ,
        env: { ...process.env, NATIVELY_VERBAL_HEDGE: 'yes' },
        stdio: ['ignore', childFd, childFd],
    });
    fs.closeSync(childFd);

    // 3. Race the child's exit against the deadline. The 'exit' listener stays attached (and
    // `exited` stays usable) regardless of which side wins - NEW-M3 reuses it after the
    // deadline branch to confirm a late kill actually landed.
    const exited = new Promise((resolve) => {
        child.on('exit', (code) => resolve({ kind: 'exited', code }));
        child.on('error', (err) => resolve({ kind: 'error', err }));
    });
    let deadlineTimer;
    const timedOut = new Promise((resolve) => {
        deadlineTimer = setTimeout(() => resolve({ kind: 'timeout' }), DEADLINE_MS);
    });
    const result = await Promise.race([exited, timedOut]);
    // NEW-M1: an early exit must not leave the deadline timer running - it used to keep the
    // event loop (and so this whole probe) alive until the full deadline regardless.
    clearTimeout(deadlineTimer);
    const elapsed = Date.now() - t0;

    // 4. One outcome line, written directly - never through inherited stdout. NEW-M2: the
    // probe's own exit code reflects the outcome, so the launcher's WORST calculation (M5)
    // sees a bad segment 4. Only "exited code=1" is the correct refusal.
    if (result.kind === 'exited') {
        log(`REFUSE exited code=${result.code} after ${elapsed}ms`);
        if (result.code !== 1) process.exitCode = 1;
    } else if (result.kind === 'error') {
        log(`REFUSE spawn error after ${elapsed}ms: ${result.err?.message ?? result.err}`);
        process.exitCode = 1;
    } else {
        log(`REFUSE STILL RUNNING after ${elapsed}ms`);
        process.exitCode = 1;
        // Never leave a hung build+app process running for the rest of the task's window.
        try {
            fs.writeFileSync(PID_FILE, String(child.pid));
            execFileSync(process.execPath, [RUN_MJS, 'app:stop'], { cwd: PROJ, stdio: 'ignore' });
        } catch (e) {
            log(`REFUSE cleanup app:stop failed: ${e?.message ?? e}`);
        }
        // NEW-M3: app:stop reporting success is not proof the child actually died (its own
        // command-line match can fail - a CIM error, an unexpected command line shape). Wait
        // up to 10s for the real 'exit' event; if it still has not fired, say so and let the
        // probe end anyway rather than hang on the child handle for the rest of the task.
        const cleanedUp = await Promise.race([
            exited.then(() => true),
            new Promise((resolve) => setTimeout(() => resolve(false), 10_000)),
        ]);
        if (!cleanedUp) {
            log(`REFUSE cleanup FAILED: pid ${child.pid} still alive`);
            child.unref();
        }
    }
}

main().catch((e) => {
    try { log(`REFUSE probe FATAL: ${e?.stack ?? e}`); } catch { /* the log itself is unwritable */ }
    process.exit(1);
});
