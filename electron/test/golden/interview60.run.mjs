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
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { INTERVIEW } from './interview60.questions.mjs';
import { logSize as libLogSize, logSince as libLogSince, waitForLogLines, snapshotRun, sleep as libSleep } from './interview60.lib.mjs';
import { computeRun, evaluateGate } from './interview60.metrics.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(HERE, '../../..');
const TTS_DIR = path.join(HERE, 'interview60-tts-local');
const DEBUG_LOG = path.join(PROJ, 'natively_debug.log');
const DIAG_LOG = path.join(PROJ, 'verbal-diag.log');
const TIMELINE = path.join(HERE, 'interview60.timeline.json');
const REPORT = path.join(HERE, 'interview60.report.md');
const RUNS_DIR = path.join(HERE, 'interview60.runs');
const PID_FILE = path.join(RUNS_DIR, 'app.pid');
const ANSWERS = path.join(HERE, 'interview60.answers.json');
const CHAINS = path.join(HERE, 'interview60.chains.json');
const HTML = path.join(HERE, 'interview60.report.html');

const KEY = fs.readFileSync(path.join(PROJ, '.env'), 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)[1].trim();
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
function playWav(wav) {
    if (!fs.existsSync(wav)) throw new Error(`missing wav ${wav}`);
    execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
        `(New-Object Media.SoundPlayer ${JSON.stringify(wav)}).PlaySync()`],
        { stdio: 'pipe', timeout: 75 * 60 * 1000 });
}

/** Byte offset of each item inside interview60.wav, so log events can be attributed. */
function computeOffsets() {
    const BYTES_PER_SEC = 24000 * 2;
    let t = 0;
    return INTERVIEW.map((item) => {
        const b = fs.readFileSync(path.join(TTS_DIR, `${item.id}.wav`));
        const i = b.indexOf(Buffer.from('data', 'ascii'), 12);
        const clipSecs = b.readUInt32LE(i + 4) / BYTES_PER_SEC;
        const startSec = t;
        t += clipSecs + item.gapMs / 1000;
        return { id: item.id, level: item.level, topic: item.topic, kind: item.kind ?? 'spoken', q: item.q, startSec, clipSecs };
    });
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

/** Kill the app: the tree we spawned if we have its pid, else every electron process running THIS checkout. */
function appStop() {
    fs.mkdirSync(RUNS_DIR, { recursive: true });
    if (fs.existsSync(PID_FILE)) {
        const pid = Number(fs.readFileSync(PID_FILE, 'utf8').trim());
        console.log(`APP STOP  taskkill tree pid=${pid}`);
        try { execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'pipe' }); } catch { /* already gone */ }
        fs.unlinkSync(PID_FILE);
    }
    // Hand-started instance (or a leftover): match on the checkout path in the
    // command line. Exclude THIS process and its parent — the harness itself is
    // a node process whose command line contains the checkout path.
    const needle = PROJ.replace(/\\/g, '\\\\');
    const out = ps(`Get-CimInstance Win32_Process | Where-Object { $_.Name -match '^(electron|node)\\.exe$' -and $_.CommandLine -match '${needle.replace(/'/g, "''")}' -and $_.ProcessId -ne ${process.pid} -and $_.ProcessId -ne ${process.ppid} } | ForEach-Object { $_.ProcessId }`);
    const pids = out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    for (const pid of pids) {
        try { execFileSync('taskkill', ['/PID', pid, '/T', '/F'], { stdio: 'pipe' }); } catch { /* raced */ }
    }
    console.log(`APP STOP  killed ${pids.length} process(es) of this checkout`);
}

/** Spawn `npm start` with the autostart flag; wait for the two log lines that prove it is listening in Auto. */
async function appStart() {
    fs.mkdirSync(RUNS_DIR, { recursive: true });
    // main.ts unconditionally resets natively_debug.log to a fresh, near-empty
    // file at app.whenReady() (rotating whatever was there into .log.1), so a
    // byte offset captured against the OLD file is stale the instant the new
    // process reaches that point — the file's size drops well below it and
    // never catches back up. Wait for that reset (size drops below its
    // pre-spawn value) before reading from 0, sharing the 90s budget with it.
    const preSize = logSize(DEBUG_LOG);
    const deadline = Date.now() + 90_000;
    const child = spawn('cmd.exe', ['/c', 'npm', 'start'], {
        cwd: PROJ,
        env: { ...process.env, NATIVELY_AUTOSTART_MEETING: '1', NATIVELY_LIVE_MODE: 'auto' },
        detached: true,
        stdio: 'ignore',
        windowsHide: false,
    });
    child.unref();
    fs.writeFileSync(PID_FILE, String(child.pid));
    console.log(`APP START  pid=${child.pid}  waiting for the app to come up listening in Auto…`);
    while (preSize > 0 && logSize(DEBUG_LOG) >= preSize) {
        if (Date.now() >= deadline) {
            console.log('APP START  FAILED — natively_debug.log was never reset for this session (app never reached whenReady?)');
            process.exit(1);
        }
        await sleep(1000);
    }
    const r = await waitForLogLines(DEBUG_LOG, 0, [/\[Main\] Starting Meeting/, /\[Main\] Live Mode (restored )?→ auto/], { timeoutMs: Math.max(0, deadline - Date.now()), pollMs: 1000 });
    if (!r.ok) {
        console.log(`APP START  FAILED — never saw: ${r.missing.map(String).join(', ')}`);
        console.log('  if the mode line is missing, the app never reached setLiveMode/startMeeting — check the log');
        process.exit(1);
    }
    console.log('APP START  listening in Auto');
}

/** One flash-lite call + the Live preflight. Any 429 postpones the hour. */
async function probe() {
    const s = await modelAlive('gemini-3.1-flash-lite');
    console.log(`PROBE  gemini-3.1-flash-lite HTTP ${s}`);
    if (s === 429) return { ready: false, reason: 'flash-lite quota (429)' };
    if (s !== 200) return { ready: false, reason: `flash-lite HTTP ${s}` };
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
    ok('all 55 clips present', clips === INTERVIEW.length, `${clips}/${INTERVIEW.length}`);

    const s1 = await modelAlive('gemini-3.1-flash-lite');
    ok('gemini-3.1-flash-lite answering', s1 === 200, `HTTP ${s1}`);
    const s2 = await modelAlive('gemini-3.5-flash-lite');
    ok('gemini-3.5-flash-lite fallback', s2 === 200, `HTTP ${s2}`);

    ok('Electron app running', electronRunning());

    ok('interview60.wav built', fs.existsSync(path.join(HERE, 'interview60.wav')));

    // The real check: play a CONTINUOUS probe aloud and require the app's OWN
    // log to show it heard a question. A single clip is not enough — it proves
    // nothing about turn closure, and discrete clips are exactly the case that
    // silently detects nothing (see playWav).
    const probe = path.join(HERE, 'probe-continuous.wav');
    const before = logSize(DEBUG_LOG);
    console.log('\n  playing a 34s continuous probe to prove the audio chain...');
    let playErr = null;
    try { playWav(probe); } catch (e) { playErr = e.message; }
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

    console.log(`\n  ${fail.length ? 'NOT READY — ' + fail.join('; ') : 'READY — safe to start the hour'}`);
    process.exit(fail.length ? 1 : 0);
}

// ── APP PASS ───────────────────────────────────────────────────────────────
async function appPass() {
    const startDebug = logSize(DEBUG_LOG);
    const startDiag = logSize(DIAG_LOG);
    const t0 = Date.now();
    const items = computeOffsets().map((o) => ({ ...o, playedAt: t0 + Math.round(o.startSec * 1000) }));
    const timeline = { startedAt: now(), startedMs: t0, startDebug, startDiag, items };
    fs.writeFileSync(TIMELINE, JSON.stringify(timeline, null, 1));

    console.log(`APP PASS  ${now()}   ${INTERVIEW.length} items as ONE continuous file, ~60 min`);
    console.log('  (single PlaySync — do not interrupt; the machine must stay audible)\n');
    playWav(path.join(HERE, 'interview60.wav'));

    timeline.endedAt = now();
    timeline.endDebug = logSize(DEBUG_LOG);
    timeline.endDiag = logSize(DIAG_LOG);
    fs.writeFileSync(TIMELINE, JSON.stringify(timeline, null, 1));
    console.log(`\n  done ${timeline.endedAt}`);
    console.log(`  debug log grew ${timeline.endDebug - startDebug} bytes, diag ${timeline.endDiag - startDiag}`);
}

// ── REPORT ─────────────────────────────────────────────────────────────────
/**
 * Heard text is never the canonical text: Live drops lead-ins ("To start, …"),
 * paraphrases ("Walk me through how…" → "How…") and mis-hears plurals. A prefix
 * comparison marked the very first detected question as undetected. report()
 * attributes by play window first and uses overlap only as a 0.15 sanity floor,
 * the same rule as interview60.report-html.mjs.
 */
function overlap(a, b) {
    const norm = (s) => new Set((s.toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => w.length > 3));
    const A = norm(a), B = norm(b);
    if (!A.size) return 0;
    let hit = 0; for (const w of A) if (B.has(w)) hit++;
    return hit / A.size;
}

function report() {
    const t = JSON.parse(fs.readFileSync(TIMELINE, 'utf8'));
    const dbg = logSince(DEBUG_LOG, t.startDebug);
    // Same exclusion as interview60.report-html.mjs: a unit-test run at 16:21:50
    // on 2026-09-02 wrote synthetic failure lines into the live diag file.
    const CONTAMINATED = ['[2026-09-02T16:21:50'];
    const diag = logSince(DIAG_LOG, t.startDiag).split('\n').filter((l) => !CONTAMINATED.some((p) => l.startsWith(p))).join('\n');

    const detections = [...dbg.matchAll(/^(\S+) \[LOG\] \[Main\] Live question \((\w+), mode=(\w+)\): "([^"]*)"/gm)]
        .map((m) => ({ at: Date.parse(m[1]), intent: m[2], mode: m[3], q: m[4] }));
    const whisperFwd = [...dbg.matchAll(/^(\S+) \[LOG\] \[Main\] forwarding detected-question → renderer \(win=\w+\) intent=(\w+) q="([^"]*)"/gm)]
        .map((m) => ({ at: Date.parse(m[1]), intent: m[2], q: m[3] }));
    // Per-item attribution, same rule as interview60.report-html.mjs: a detection
    // belongs to the item whose play window it falls in (gaps are 45–70 s), with
    // overlap only as a sanity floor because Live paraphrases.
    const inWindow = (i, d) => {
        const end = i.playedAt + (i.clipSecs ?? 0) * 1000;
        return d.at >= i.playedAt - 2000 && d.at <= end + 60000 && overlap(d.q, i.q) >= 0.15;
    };
    const spokenItems = t.items.filter((i) => i.kind === 'spoken');
    const byLive = spokenItems.filter((i) => detections.some((d) => inWindow(i, d)));
    const bySTT = spokenItems.filter((i) => whisperFwd.some((d) => inWindow(i, d)));
    const byEither = spokenItems.filter((i) => byLive.includes(i) || bySTT.includes(i));
    // Live lines that belong to no played item (cues included — the cue sentences
    // were spoken aloud too): invented questions, or paraphrases too far from the
    // source to attribute. Listed, never counted as hits.
    const orphans = detections.filter((d) => !t.items.some((i) => inWindow(i, d)));
    const dupes = (dbg.match(/suppressed duplicate live question/g) || []).length;
    const reconnects = (dbg.match(/Live Mode status: reconnecting/g) || []).length;
    const disconnects = (dbg.match(/Live Mode status: (disconnected|error)/g) || []).length;
    const routes = [...diag.matchAll(/route: ([A-Z-]+(?: \([^)]*\))?)/g)].map((m) => m[1]);
    const redirects = [...diag.matchAll(/verbal primary FAILED pre-token: ([^\n]*)/g)].map((m) => m[1]);
    const hardFails = [...diag.matchAll(/generateStream FAILED[^\n]*/g)].map((m) => m[0]);

    const spoken = t.items.filter((i) => i.kind === 'spoken').length;
    const routeCount = routes.reduce((a, r) => ({ ...a, [r]: (a[r] || 0) + 1 }), {});
    const intentCount = detections.reduce((a, d) => ({ ...a, [d.intent]: (a[d.intent] || 0) + 1 }), {});

    const md = `# 60-minute interview run

- started ${t.startedAt}
- ended   ${t.endedAt ?? '(incomplete)'}
- items played: ${t.items.length} (${spoken} spoken questions, ${t.items.length - spoken} screenshot cues)

## Detection
- Live question lines: ${detections.length} (raw — includes re-detections and lines that match no played question)
- spoken questions heard by Live: **${byLive.length}** / ${spoken}
- spoken questions heard by the STT/Groq detector: ${bySTT.length} / ${spoken}
- heard by either detector: **${byEither.length}** / ${spoken}
- Live lines matching no played question: ${orphans.length}${orphans.length ? '\n' + orphans.map((d) => `  - ${new Date(d.at).toISOString().slice(11, 19)} (${d.intent}) "${d.q}"`).join('\n') : ''}
- duplicates suppressed: ${dupes}
- intents: ${JSON.stringify(intentCount)}
- live modes seen: ${JSON.stringify([...new Set(detections.map((d) => d.mode))])}

## Live session stability
- reconnects: ${reconnects}
- disconnects/errors: ${disconnects}

## Answer routing
- routes taken: ${JSON.stringify(routeCount)}
- **fallback redirects: ${redirects.length}**${redirects.length ? '\n' + redirects.map((r) => `  - ${r}`).join('\n') : ''}
- **hard failures: ${hardFails.length}**${hardFails.length ? '\n' + hardFails.map((r) => `  - ${r}`).join('\n') : ''}

## Heard only by the STT detector (never auto-answered in Auto mode)
${bySTT.filter((i) => !byLive.includes(i)).map((i) => `- ${i.id}: ${i.q}`).join('\n') || '(none)'}

## Heard by neither detector
${spokenItems.filter((i) => !byEither.includes(i)).map((i) => `- ${i.id}: ${i.q}`).join('\n') || '(none — every spoken question was heard by at least one detector)'}
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
 * stop → build → start → probe → hour → report → snapshot. One command.
 * Polls the probe every 2 min up to the deadline so a quota wall postpones
 * rather than wastes the hour.
 */
async function auto(label = 'after') {
    appStop();
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
    const copied = snapshotRun(dest, [DEBUG_LOG, DIAG_LOG, TIMELINE, REPORT, ANSWERS, CHAINS, HTML]);
    console.log(`AUTO  snapshot ${dest}: ${copied.join(', ')}`);
    gate(dest);
}

const cmd = process.argv[2];
if (cmd === 'preflight') await preflight();
else if (cmd === 'app') await appPass();
else if (cmd === 'report') report();
else if (cmd === 'app:start') await appStart();
else if (cmd === 'app:stop') appStop();
else if (cmd === 'probe') { const p = await probe(); console.log(p.ready ? 'PROBE READY' : `PROBE NOT READY — ${p.reason}`); process.exit(p.ready ? 0 : 1); }
else if (cmd === 'gate') gate(path.resolve(process.argv[3]));
else if (cmd === 'auto') await auto(process.argv[3]);   // label defaults to "after"
else { console.log('usage: interview60.run.mjs preflight|app|report|app:start|app:stop|probe|gate <dir>|auto [label]'); process.exit(2); }
