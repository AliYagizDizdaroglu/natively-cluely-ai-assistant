/**
 * Unattended 60-minute interview run.
 *
 *   node electron/test/golden/interview60.run.mjs preflight
 *   node electron/test/golden/interview60.run.mjs app
 *   node electron/test/golden/interview60.run.mjs report
 *
 * Phases are separate commands on purpose: `app` occupies the machine for an
 * hour and cannot be repeated cheaply, so preflight must be able to refuse
 * BEFORE that hour is spent rather than discovering a dead chain at minute 59.
 *
 * PREFLIGHT is deliberately end-to-end: it plays a real clip out of the real
 * speakers and then waits for the app's own log to show it detected a question.
 * Checking a mute flag or a config value would only prove a proxy; this proves
 * the actual chain — speakers -> WASAPI loopback -> Live -> detection.
 *
 * Live mode IS persisted now (CredentialsManager.liveMode, restored at meeting
 * start) and NATIVELY_AUTOSTART_MEETING=1 starts a meeting on launch, so `auto`
 * can stop, rebuild and relaunch the app itself. Preflight still runs right
 * before the hour because the audio chain is what fails silently.
 * NATIVELY_STT_PROVIDER=<name> makes the app run its STT on that provider for
 * the launch (dev builds only) and makes preflight verify it.
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import net from 'net';
import { INTERVIEW, TTS_LOCAL_DIR, WAV_NAME, rosterLabel } from './roster.mjs';
import { logSize as libLogSize, logSince as libLogSince, waitForLogLines, snapshotRun, sleep as libSleep, playStartFromStdout, playEndFromStdout, resolveEnvKey } from './interview60.lib.mjs';
import { computeRun, computeRunFromFiles, evaluateGate } from './interview60.metrics.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(HERE, '../../..');
const TTS_DIR = path.join(HERE, TTS_LOCAL_DIR);
const DEBUG_LOG = path.join(PROJ, 'natively_debug.log');
const DIAG_LOG = path.join(PROJ, 'verbal-diag.log');
// The exact system + user turn per answer, when NATIVELY_CAPTURE_PROMPTS=1 (llm/promptCapture).
// It is what lets the focused arms replay the app's own call rather than the arm's framing.
const PROMPT_LOG = path.join(PROJ, 'verbal-prompts.log');
const TIMELINE = path.join(HERE, 'interview60.timeline.json');
const REPORT = path.join(HERE, 'interview60.report.md');
const RUNS_DIR = path.join(HERE, 'interview60.runs');
const PID_FILE = path.join(RUNS_DIR, 'app.pid');
const ANSWERS = path.join(HERE, 'interview60.answers.json');
const CHAINS = path.join(HERE, 'interview60.chains.json');
// Written by interview60.cues.mjs next to the timeline: the pages shown and whether each image loaded.
const CUES_LOG = path.join(HERE, 'interview60.cues.log');
const CUES_PID = path.join(HERE, 'interview60.cues.pid');
const HTML = path.join(HERE, 'interview60.report.html');

// Keys come from the environment first — a launcher can run `node --env-file=<path>` for a
// checkout that has no .env, which is how a worktree runs this harness against another
// checkout's key — then from .env beside package.json. Never printed. Same rule as
// interview60.answers.mjs.
const KEY = resolveEnvKey('GEMINI_API_KEY', process.env, PROJ);
if (!KEY) { console.error('GEMINI_API_KEY: not in the environment and no .env beside package.json'); process.exit(2); }
const sleep = libSleep;
const logSize = libLogSize;
const logSince = libLogSince;
const now = () => new Date().toISOString();

// ── helpers ────────────────────────────────────────────────────────────────
/**
 * Play a WAV to completion through the default output device.
 *
 * MUST be a single continuous file, never one clip at a time. System audio
 * capture only emits while the device is actively rendering (measured: 200
 * chunks per 86s of wall clock = ~5% duty when clips are played discretely),
 * so gaps between separate PlaySync calls are true silence — the capture goes
 * idle, Gemini Live never receives the trailing silence it needs to close a
 * turn, and it emits nothing and eventually aborts the session as idle.
 * Rendering the gaps as actual silence samples inside one file keeps the
 * capture hot. Verified: discrete clips -> 0 detections; same clips inside one
 * continuous file -> 3/3 detected.
 */
/**
 * Plays the WAV as ONE continuous file (see the note above) and resolves when
 * playback ends. `onStart(t0)` fires with the player's own clock at PlaySync():
 * that is the timeline's zero. Measured 2026-09-09: stamping Date.now() before
 * the spawn put every after9/s50a timeline ~1.15 s early (PowerShell start-up
 * 0.67–0.89 s + SoundPlayer onset ~0.3 s). The residual is now the waveOut
 * onset after Load(), tens of milliseconds.
 */
function playWav(wav, onStart) {
    if (!fs.existsSync(wav)) throw new Error(`missing wav ${wav}`);
    const script = `$p = New-Object Media.SoundPlayer ${JSON.stringify(wav)}; $p.Load(); Write-Output ('PLAYSTART ' + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()); $p.PlaySync(); Write-Output ('PLAYEND ' + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())`;
    return new Promise((resolve, reject) => {
        const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { stdio: ['ignore', 'pipe', 'pipe'] });
        let out = '', err = '', started = false;
        const timer = setTimeout(() => { child.kill(); reject(new Error('playback exceeded 120 min')); }, 120 * 60 * 1000); // the roster runs ~90 min since the long questions
        child.stdout.on('data', (b) => {
            out += b.toString();
            const t0 = playStartFromStdout(out);
            if (t0 !== null && !started) { started = true; onStart(t0); }
        });
        child.stderr.on('data', (b) => { err += b.toString(); });
        child.on('error', (e) => { clearTimeout(timer); reject(e); });
        child.on('close', (code) => {
            clearTimeout(timer);
            if (!started) return reject(new Error(`player printed no PLAYSTART line (exit ${code}): ${(err || out).slice(0, 200)}`));
            if (code !== 0) return reject(new Error(`player exited ${code}: ${err.slice(0, 200)}`));
            resolve(playEndFromStdout(out));
        });
    });
}

/** Byte offset of each item inside the roster WAV, so log events can be attributed. */
function computeOffsets() {
    const BYTES_PER_SEC = 24000 * 2;
    let t = 0;
    return INTERVIEW.map((item) => {
        const b = fs.readFileSync(path.join(TTS_DIR, `${item.id}.wav`));
        const i = b.indexOf(Buffer.from('data', 'ascii'), 12);
        const clipSecs = b.readUInt32LE(i + 4) / BYTES_PER_SEC;
        const startSec = t;
        t += clipSecs + item.gapMs / 1000;
        return { id: item.id, level: item.level, topic: item.topic, kind: item.kind ?? 'spoken', q: item.q, startSec, clipSecs, ...(item.problem ? { problem: item.problem } : {}), ...(item.chain ? { chain: item.chain } : {}), ...(item.long ? { long: true } : {}) };
    });
}

/**
 * Does the roster WAV hold the CURRENT selection? Its length must equal every clip plus
 * its gap, exactly as both builders concatenate them (build-audio-local.mjs, build-audio.mjs).
 * WAV_NAME does not vary with NATIVELY_SCENARIOS, so a full-roster build and a subset build
 * write the same file and only the length tells them apart — the wrong one would play for
 * hours against a timeline that ended long before, caught only by playWav's 120-minute cap.
 * Returns null when it matches, otherwise the reason.
 */
function wavMismatch() {
    const wav = path.join(HERE, WAV_NAME);
    if (!fs.existsSync(wav)) return `${WAV_NAME} missing — build the audio first`;
    const BYTES_PER_SEC = 24000 * 2;
    const head = Buffer.alloc(4096);
    const fd = fs.openSync(wav, 'r');
    const n = fs.readSync(fd, head, 0, head.length, 0);
    fs.closeSync(fd);
    const i = head.subarray(0, n).indexOf(Buffer.from('data', 'ascii'), 12);
    if (i < 0) return `${WAV_NAME} has no data chunk in its header`;
    const actual = head.readUInt32LE(i + 4) / BYTES_PER_SEC;
    const expected = computeOffsets().reduce((s, o, k) => s + o.clipSecs + INTERVIEW[k].gapMs / 1000, 0);
    if (Math.abs(actual - expected) <= 1) return null;
    return `${WAV_NAME} holds ${(actual / 60).toFixed(1)} min but ${rosterLabel()} needs ${(expected / 60).toFixed(1)} min — rebuild the audio with the same NATIVELY_ROSTER / NATIVELY_SCENARIOS`;
}

async function modelAlive(model) {
    try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
            body: JSON.stringify({ contents: [{ parts: [{ text: 'hi' }] }], generationConfig: { maxOutputTokens: 1 } }),
        });
        return r.status;
    } catch (e) { return `ERR ${e.message}`; }
}

function electronRunning() {
    try {
        const out = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
            '(Get-Process electron -ErrorAction SilentlyContinue | Measure-Object).Count'], { encoding: 'utf8' });
        return Number(out.trim()) > 0;
    } catch { return false; }
}

// ── APP LIFECYCLE ──────────────────────────────────────────────────────────
function ps(cmd) {
    return execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', cmd], { encoding: 'utf8', stdio: 'pipe' });
}

/** Command line of a running process, or '' if it's already gone (or the query fails). */
function commandLineOf(pid) {
    try {
        return ps(`(Get-CimInstance Win32_Process -Filter "ProcessId=${pid}").CommandLine`).trim();
    } catch { return ''; }
}

/**
 * Kill the app: the tree we spawned if we have its pid, else every electron
 * process running THIS checkout (never node.exe — a vitest/vite/tsc process
 * of an unrelated session also has this checkout's path on its command line,
 * and killing node.exe by path prefix took those out too).
 */
function appStop() {
    fs.mkdirSync(RUNS_DIR, { recursive: true });
    if (fs.existsSync(PID_FILE)) {
        const pid = Number(fs.readFileSync(PID_FILE, 'utf8').trim());
        // Windows recycles pids — the tracked pid can belong to an unrelated
        // process by the time we get here (R35). Only tree-kill it if its
        // command line still looks like the keeper we spawned (or an electron/npm start).
        const cmdLine = commandLineOf(pid);
        const looksLikeOurs = /interview60\.run\.mjs["']?\s+app:keep/i.test(cmdLine) || /electron(\.exe)?/i.test(cmdLine) || /npm(\.cmd)?["']?\s+start/i.test(cmdLine);
        if (looksLikeOurs) {
            console.log(`APP STOP  taskkill tree pid=${pid}`);
            try { execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'pipe' }); } catch { /* already gone */ }
        } else {
            console.log(`APP STOP  skipped pid-file pid=${pid} — command line no longer names electron/npm start: ${cmdLine || '(process gone)'}`);
        }
        fs.unlinkSync(PID_FILE);
    }
    // Hand-started instance (or a leftover): electron.exe only, whose command
    // line contains the checkout path and is NOT under a git worktree of it
    // (a worktree session's own electron.exe also carries the checkout's path
    // as a prefix). Exclude THIS process and its parent — the harness itself
    // is a node process whose command line contains the checkout path, but it
    // is excluded anyway by matching electron.exe only, never node.exe.
    const needle = PROJ.replace(/\\/g, '\\\\');
    const notWorktree = '\\\\.claude\\\\worktrees\\\\';
    const out = ps(`Get-CimInstance Win32_Process | Where-Object { $_.Name -match '^electron\\.exe$' -and $_.CommandLine -match '${needle.replace(/'/g, "''")}' -and $_.CommandLine -notmatch '${notWorktree}' -and $_.ProcessId -ne ${process.pid} -and $_.ProcessId -ne ${process.ppid} } | ForEach-Object { $_.ProcessId }`);
    const pids = out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    for (const pid of pids) {
        try { execFileSync('taskkill', ['/PID', pid, '/T', '/F'], { stdio: 'pipe' }); } catch { /* raced */ }
    }
    console.log(`APP STOP  killed ${pids.length} process(es) of this checkout`);
    // The detached cue scheduler (interview60.cues.mjs schedule) outlives an
    // aborted flight and would later put its pages on screen; its display
    // windows are electron.exe of this checkout and died just above.
    if (fs.existsSync(CUES_PID)) {
        const pid = Number(fs.readFileSync(CUES_PID, 'utf8').trim());
        const cmdLine = commandLineOf(pid);
        if (/interview60\.cues\.mjs/.test(cmdLine)) {
            console.log(`APP STOP  taskkill cue scheduler pid=${pid}`);
            try { execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'pipe' }); } catch { /* already gone */ }
        }
        fs.unlinkSync(CUES_PID);
    }
}

/**
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
        console.log(`APP START  attempt ${attempt} of 2 failed — what the app printed is in ${startLog}`);
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
    fs.appendFileSync(startLog, `=== app:start attempt ${new Date().toISOString()} ===\n`);
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
    console.log(`APP START  keeper pid=${keeper.pid}  waiting for the app to come up listening in Auto…`);
    while (preSize > 0 && logSize(DEBUG_LOG) >= preSize) {
        if (Date.now() >= deadline) {
            console.log('APP START  FAILED — natively_debug.log was never reset for this session (app never reached whenReady?)');
            return keeper.pid;
        }
        await sleep(1000);
    }
    const r = await waitForLogLines(DEBUG_LOG, 0, [/\[Main\] Starting Meeting/, /\[Main\] Live Mode (restored )?→ auto/], { timeoutMs: Math.max(0, deadline - Date.now()), pollMs: 1000 });
    if (!r.ok) {
        console.log(`APP START  FAILED — never saw: ${r.missing.map(String).join(', ')}`);
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

/**
 * Five consecutive flash-lite 200s, 15s apart, then the Live preflight. Any
 * non-200 fails this attempt immediately (the caller's retry loop starts the
 * count over on the next attempt).
 *
 * Run 1's probe saw a single 200 at 04:09:40 UTC, then hit a 429 wall 15s
 * later: a key that is actually walled for the day can still return one or
 * two 200s on a leaky-bucket burst right after being idle, so a single 200 is
 * not proof of headroom. The free tier is 500 requests/model/day — five 200s
 * 15s apart is not a burst.
 */
async function probe() {
    for (let k = 1; k <= 5; k++) {
        const s = await modelAlive('gemini-3.1-flash-lite');
        console.log(`PROBE  gemini-3.1-flash-lite HTTP ${s} (${k}/5)`);
        if (s === 429) return { ready: false, reason: 'flash-lite quota (429)' };
        if (s !== 200) return { ready: false, reason: `flash-lite HTTP ${s}` };
        if (k < 5) await sleep(15000);
    }
    const out = runPreflight();
    console.log(out);
    return /READY — safe to start the hour/.test(out) ? { ready: true } : { ready: false, reason: 'preflight not green' };
}

// ── PREFLIGHT ──────────────────────────────────────────────────────────────
async function preflight() {
    const fail = [];
    const ok = (label, good, detail = '') => {
        console.log(`  ${good ? 'PASS' : 'FAIL'}  ${label}${detail ? '   ' + detail : ''}`);
        if (!good) fail.push(label);
    };
    console.log(`PREFLIGHT  ${now()}\n`);

    const clips = INTERVIEW.filter((i) => fs.existsSync(path.join(TTS_DIR, `${i.id}.wav`))).length;
    ok('all clips present', clips === INTERVIEW.length, `${clips}/${INTERVIEW.length}`);

    const s1 = await modelAlive('gemini-3.1-flash-lite');
    ok('gemini-3.1-flash-lite answering', s1 === 200, `HTTP ${s1}`);
    const s2 = await modelAlive('gemini-3.5-flash-lite');
    ok('gemini-3.5-flash-lite fallback', s2 === 200, `HTTP ${s2}`);

    ok('Electron app running', electronRunning());

    const wavProblem = wavMismatch();
    ok(`${WAV_NAME} matches ${rosterLabel()}`, !wavProblem, wavProblem ?? '');

    // The real check: play a CONTINUOUS probe aloud and require the app's OWN
    // log to show it heard a question. A single clip is not enough — it proves
    // nothing about turn closure, and discrete clips are exactly the case that
    // silently detects nothing (see playWav).
    const probe = path.join(HERE, 'probe-continuous.wav');
    const before = logSize(DEBUG_LOG);
    console.log('\n  playing a 34s continuous probe to prove the audio chain...');
    let playErr = null;
    try { await playWav(probe, () => {}); } catch (e) { playErr = e.message; }
    ok('probe played through the output device', !playErr, playErr ?? '');
    let heard = null, mode = null;
    for (let t = 0; t < 20000 && !heard; t += 1000) {
        await sleep(1000);
        const m = logSince(DEBUG_LOG, before).match(/\[Main\] Live question \((\w+), mode=(\w+)\): "([^"]*)"/);
        if (m) { heard = m[3]; mode = m[2]; }
    }
    ok('app heard the clip via Live', !!heard, heard ? `"${heard.slice(0, 60)}"` : 'no [Main] Live question line appeared');
    ok('Live mode is AUTO (answers hands-free)', mode === 'auto',
        mode ? `mode=${mode}` : 'unknown — set Live to Auto, suggest mode will not answer unattended');

    // Which STT ear the hour runs on. NATIVELY_STT_PROVIDER (dev-only, see
    // electron/services/sttProviderOverride.ts) selects it for this launch and the
    // app logs "[Main] Using <Class> for interviewer" when a streaming provider
    // starts. Require the last such line to name the requested provider: a missing
    // Deepgram key falls back to GoogleSTT with only a warning, which would silently
    // run the hour on the wrong ear. Proved for deepgram (DeepgramStreamingSTT); groq logs
    // "RestSTT (groq)" and matches too; natively logs no Using line and cannot pass this row.
    const wantedStt = process.env.NATIVELY_STT_PROVIDER;
    if (wantedStt) {
        const using = [...logSince(DEBUG_LOG, 0).matchAll(/\[Main\] Using ([^\n]+?) for interviewer/g)].pop();
        ok('STT provider is the one requested', !!using && using[1].toLowerCase().includes(wantedStt.toLowerCase()),
            using ? `${using[1]} (NATIVELY_STT_PROVIDER=${wantedStt})` : `no [Main] Using <Class> for interviewer line for NATIVELY_STT_PROVIDER=${wantedStt}`);
    }

    console.log(`\n  ${fail.length ? 'NOT READY — ' + fail.join('; ') : 'READY — safe to start the hour'}`);
    process.exit(fail.length ? 1 : 0);
}

// ── APP PASS ───────────────────────────────────────────────────────────────
async function appPass() {
    const wavProblem = wavMismatch();
    if (wavProblem) throw new Error(wavProblem);
    const startDebug = logSize(DEBUG_LOG);
    const startDiag = logSize(DIAG_LOG);
    console.log(`APP PASS  ${now()}   ${rosterLabel()} as ONE continuous file`);
    console.log('  (single PlaySync — do not interrupt; the machine must stay audible)\n');
    let timeline = null;
    const endedMs = await playWav(path.join(HERE, WAV_NAME), (t0) => {
        // t0 is the player's clock at PlaySync(). The timeline is written here, not
        // before the spawn, so every item sits on the real audio; the cue scheduler
        // starts from the same stamp.
        const items = computeOffsets().map((o) => ({ ...o, playedAt: t0 + Math.round(o.startSec * 1000) }));
        timeline = { startedAt: new Date(t0).toISOString(), startedMs: t0, clock: 'playsync', startDebug, startDiag, items };
        fs.writeFileSync(TIMELINE, JSON.stringify(timeline, null, 1));
        // Screenshot cues: a detached scheduler shows each cue's problem page on the
        // primary display while the cue plays (interview60.cues.mjs).
        const cues = spawn(process.execPath, [path.join(HERE, 'interview60.cues.mjs'), 'schedule', TIMELINE], { detached: true, stdio: 'ignore' });
        cues.on('error', (e) => console.warn(`  cue scheduler failed to spawn: ${e.message} — the screenshot cues will have nothing on screen`));
        cues.unref();
        console.log(`  playback started ${timeline.startedAt} (player clock)`);
    });
    if (!timeline) throw new Error('playback ended without a start stamp');
    timeline.endedAt = now();
    timeline.endedMs = endedMs;
    timeline.endDebug = logSize(DEBUG_LOG);
    timeline.endDiag = logSize(DIAG_LOG);
    fs.writeFileSync(TIMELINE, JSON.stringify(timeline, null, 1));
    console.log(`\n  done ${timeline.endedAt}`);
    console.log(`  debug log grew ${timeline.endDebug - startDebug} bytes, diag ${timeline.endDiag - startDiag}`);
}

// ── REPORT ─────────────────────────────────────────────────────────────────
/**
 * Derived from computeRunFromFiles/evaluateGate — the same functions `gate`
 * uses — instead of re-deriving detection/dedup/routing numbers from the raw
 * logs a second, independent way. Before this, report() parsed log lines that
 * had since been retired (`forwarding detected-question`, `suppressed
 * duplicate live question`) so its counts silently went to zero while the
 * gate (reading the current dispatch-line format) kept working; deriving both
 * from one source means the folder's .md and its gate can never disagree.
 *
 * Uses computeRunFromFiles rather than computeRun(dir): report() runs BEFORE
 * the snapshot, against the live checkout's files, which don't follow the
 * run-dir naming convention (debug/diag logs at the project root, timeline
 * beside this script) — see computeRunFromFiles' own docstring.
 */
function report() {
    const m = computeRunFromFiles({ debugLog: DEBUG_LOG, diagLog: DIAG_LOG, timelinePath: TIMELINE, answersPath: ANSWERS });
    const g = evaluateGate(m);
    const routeCount = m.routes.reduce((a, r) => ({ ...a, [r.route]: (a[r.route] || 0) + 1 }), {});

    const md = `# 60-minute interview run

- started ${m.startedAt}
- ended   ${m.endedAt ?? '(incomplete)'}
- items played: ${m.items.length} spoken questions + ${m.cues.length} screenshot cues

## Gate
${g.rows.map((r) => `- ${r.pass ? 'PASS' : 'FAIL'}  ${r.label}: ${r.value}   (before: ${r.before})`).join('\n')}

**${g.pass ? 'GATE PASSED' : 'GATE FAILED — ' + g.rows.filter((r) => !r.pass).map((r) => r.label).join('; ')}**

## Answer routing
- routes taken: ${JSON.stringify(routeCount)}
- fallback redirects: ${m.redirects.length}
- hard failures: ${m.hardFails.length}

## Heard by neither detector
${m.items.filter((i) => i.heardBy === null).map((i) => `- ${i.id}: ${i.q}`).join('\n') || '(none — every spoken question was heard by at least one detector)'}
`;
    fs.writeFileSync(REPORT, md);
    console.log(md);
    console.log(`\nwrote ${REPORT}`);
}

// ── GATE ───────────────────────────────────────────────────────────────────
/** Judge a run folder against the spec §6 pass table (interview60.metrics.mjs). Exits 0/1. */
function gate(dir) {
    const m = computeRun(dir);
    const g = evaluateGate(m);
    console.log(`GATE  ${path.basename(dir)}  ${m.startedAt} → ${m.endedAt}\n`);
    for (const r of g.rows) console.log(`  ${r.pass ? 'PASS' : 'FAIL'}  ${r.label.padEnd(56)} ${r.value}   (before: ${r.before})`);
    console.log(`\n  ${g.pass ? 'GATE PASSED' : 'GATE FAILED — ' + g.rows.filter((r) => !r.pass).map((r) => r.label).join('; ')}`);
    process.exit(g.pass ? 0 : 1);
}

/**
 * Wait for quota reset, re-verify, then run — one command, no babysitting.
 *
 * Preflight is re-run at the LAST moment rather than trusted from hours earlier,
 * because the two things most likely to break overnight both fail silently:
 * live mode is not persisted (an app restart reverts it to 'off'), and quota
 * state can differ from what it was when the run was scheduled. Aborting here
 * costs seconds; discovering it at minute 59 costs the hour.
 */
function runPreflight() {
    // preflight exits 1 when not ready, which makes execFileSync throw — the
    // output still matters, so read it off the error rather than crashing.
    try {
        return execFileSync(process.execPath, [fileURLToPath(import.meta.url), 'preflight'],
            { encoding: 'utf8', stdio: 'pipe', env: process.env });
    } catch (e) {
        return `${e.stdout ?? ''}${e.stderr ?? ''}`;
    }
}

/**
 * stop → build → start → probe → hour → report → snapshot → gate → stop. One command.
 * Polls the probe every 2 min up to the deadline so a quota wall postpones
 * rather than wastes the hour.
 */
async function auto(label = 'after') {
    appStop();
    // ...and every exit of this process stops it again: the gate's process.exit, a probe that
    // gave up, a failed start, a crash. Left running, the app stays in its auto-started
    // meeting with the mic, Live and warm-ups on (after s50m, 2026-09-22: eleven hours).
    // appStop is synchronous, as an 'exit' listener must be. Ceiling: Ctrl+C or a killed
    // task emits no 'exit' — after one of those, run app:stop by hand.
    process.on('exit', appStop);
    console.log('AUTO  building electron…');
    execFileSync('cmd.exe', ['/c', 'npm', 'run', 'build:electron'], { cwd: PROJ, stdio: 'inherit' });
    await appStart();

    const DEADLINE_MS = Number(process.env.I60_PROBE_DEADLINE_MIN ?? 45) * 60 * 1000;
    const startedWaiting = Date.now();
    for (let attempt = 1; ; attempt++) {
        console.log(`\nAUTO  probe attempt ${attempt}  ${now()}`);
        const p = await probe();
        if (p.ready) break;
        if (Date.now() - startedWaiting > DEADLINE_MS) {
            console.log(`AUTO  GAVE UP after ${Math.round(DEADLINE_MS / 60000)} min — ${p.reason}. The hour was NOT spent.`);
            process.exit(1);
        }
        console.log(`AUTO  not ready (${p.reason}) — retrying in 2 min.`);
        await sleep(120000);
    }
    await appPass();
    report();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const dest = path.join(RUNS_DIR, `${stamp}-${label}`);
    // interview60.answers.json/.chains.json/.report.html/.report.md can be
    // leftovers from an earlier run — answers/chains are a separate manual
    // pass, not written by auto() itself — so copying them unconditionally
    // would silently mislabel stale data as belonging to THIS run. Skip any
    // of them older than this run's own start.
    const startedMs = JSON.parse(fs.readFileSync(TIMELINE, 'utf8')).startedMs;
    const STALE_CHECKED = new Set([ANSWERS, CHAINS, HTML, REPORT, CUES_LOG]);
    const skipped = [];
    const files = [DEBUG_LOG, DIAG_LOG, PROMPT_LOG, TIMELINE, REPORT, ANSWERS, CHAINS, HTML, CUES_LOG].filter((f) => {
        if (!STALE_CHECKED.has(f) || !fs.existsSync(f)) return true;
        if (fs.statSync(f).mtimeMs < startedMs) { skipped.push(path.basename(f)); return false; }
        return true;
    });
    if (skipped.length) console.log(`AUTO  snapshot skipping stale (older than this run): ${skipped.join(', ')}`);
    const copied = snapshotRun(dest, files);
    console.log(`AUTO  snapshot ${dest}: ${copied.join(', ')}`);
    gate(dest);
}

const cmd = process.argv[2];
if (cmd === 'preflight') await preflight();
else if (cmd === 'app') await appPass();
else if (cmd === 'report') report();
else if (cmd === 'app:start') await appStart();
else if (cmd === 'app:keep') await appKeep(process.argv[3]);   // internal: spawned detached by appStart
else if (cmd === 'app:stop') appStop();
else if (cmd === 'probe') { const p = await probe(); console.log(p.ready ? 'PROBE READY' : `PROBE NOT READY — ${p.reason}`); process.exit(p.ready ? 0 : 1); }
else if (cmd === 'gate') gate(path.resolve(process.argv[3]));
else if (cmd === 'wav:check') { const p = wavMismatch(); console.log(p ?? `${WAV_NAME} matches ${rosterLabel()}`); process.exit(p ? 1 : 0); }
else if (cmd === 'auto') await auto(process.argv[3]);   // label defaults to "after"
else { console.log('usage: interview60.run.mjs preflight|app|report|app:start|app:keep <log>|app:stop|probe|gate <dir>|wav:check|auto [label]'); process.exit(2); }
