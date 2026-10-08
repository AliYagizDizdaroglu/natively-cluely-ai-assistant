// Pre-run guard for the bundle-1 smoke and the bundle-1 flight (AMENDMENT-A1 section 3 / section 4). Derived from
// SP\router-default\flight\guard-rd.mjs: its option parsing, +03:00 time maths, model/hedge/router/ledger/knowledge/night-gate/precheck/.env blocks are kept
// VERBATIM where they apply; the arms, cue-build (dist-proof), smoke-result and router-file checks are replaced by b1-proofs.mjs (the reduced bundle's shas
// and markers), and the checks the task adds are new: the drill environment, the host state (no app, no other Natively task, no orphaned tail) and the
// interactive session. Run from the repo root (MAIN) by the launchers AFTER they set the environment.
// `GUARD OK: ...` on stdout and exit 0, or `GUARD FAILED: (<check>) <what was violated>` on stderr (exactly one line) and exit 1; exit 10 = ONLY the
// clock check failed (flight launchers). Fail-fast: the first violated check is the one reported.
//
//   node guard-b1.mjs --kind smoke|flight [--dry] [--require-precheck]
//        calibration only: --settings <f> --night-gates-script <f> --ledger-script <f> --precheck-file <f> --now <iso> --root-run <dir>
//   --dry     the dry twin: every check of the real launcher EXCEPT the precheck stamp and the clock window (the pre-dry runs hours before T)
//   --kind    smoke: drill env exactly router-drop@600,ear-mute@750, label b1-smoke; flight: NATIVELY_FAULT_DRILL ABSENT (spec 7.1 final flight), arms as r1
// Environment the launcher sets: NATIVELY_B1_KIND, NATIVELY_B1_T ('yyyy-MM-dd HH:mm', local +03:00), NATIVELY_B1_EXTRA_REQUESTS (script calls the app logs cannot
// see; charged to both lites), NATIVELY_B1_TASK (the task's own name, so the other-tasks check does not count it), NATIVELY_FLIGHT_COMMIT (40 hex).
//
// The checks, in run order: k0 kind, r1 roster, 2-4 models and level, 6-8 hedge/trigger/follow-up, r2 router flag, r4 earlier-question, g4 T format, d1 drill env
// and the built parser, b1 the dist proofs (b1-proofs.mjs as a child) + dist newer than source, 10b HEAD pin + tree, [flight: 11 ANSWER_MODELS, r5 arms],
// h1 host state (no app, port 5180 free, no other Natively task running, no orphaned tail), s1 interactive session, r7 ledger, 13 knowledge, g2 night gates,
// g5 precheck, 10a .env names, g4-clock last. WHAT THIS PROVES: only the environment as THIS node child resolves it and the dist/source/HEAD; the app process
// is proven by the run's own log lines. Check 13 reads %APPDATA%\natively\settings.json: from a Claude session that path is an MSIX shadow, a task reads the real file.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { unexpectedDirtyPaths, allowlistedPaths, GIT_PATHSPEC } from './guard-b1-git.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));      // LAB\bundle-1\smoke
const BUNDLE = path.resolve(HERE, '..');                        // LAB\bundle-1
const LAB = path.resolve(BUNDLE, '..');                         // SP (the lab root)
const SP = LAB;
const PROJ = process.cwd();
const require = createRequire(`${PROJ}/package.json`);
const EXIT_WINDOW = 10;
const fail = (tag, msg, code = 1) => { console.error(`GUARD FAILED: (${tag}) ${String(msg).replace(/\s*\r?\n\s*/g, ' ')}`); process.exit(code); };
process.on('uncaughtException', (e) => fail('internal', `the guard itself crashed: ${String(e?.stack ?? e).split('\n').slice(0, 2).join(' ')}`));
const readText = (tag, file) => {
    try { return fs.readFileSync(file, 'utf8'); } catch (e) { return fail(tag, `cannot read ${path.relative(PROJ, file).replace(/\\/g, '/')}: ${e.code ?? e.message}`); }
};

// ---- options
const VALUE_OPTS = ['--kind', '--settings', '--night-gates-script', '--ledger-script', '--precheck-file', '--now'];
const FLAG_OPTS = ['--require-precheck', '--dry'];
const argv = process.argv.slice(2);
const opts = {}; const stray = [];
for (let i = 0; i < argv.length; i++) {
    if (VALUE_OPTS.includes(argv[i])) {
        if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) fail('usage', `${argv[i]} needs a value`);
        opts[argv[i]] = argv[++i];
    } else if (FLAG_OPTS.includes(argv[i])) opts[argv[i]] = true;
    else stray.push(argv[i]);
}
if (stray.length) fail('usage', `unknown argument(s): ${stray.join(' ')} (the options are ${[...FLAG_OPTS, ...VALUE_OPTS].join(', ')})`);
const KIND = opts['--kind'];
if (KIND !== 'smoke' && KIND !== 'flight') fail('usage', '--kind smoke|flight is required');
const DRY = !!opts['--dry'];
if (DRY && opts['--require-precheck']) fail('usage', '--dry and --require-precheck exclude each other (the dry twin runs before the precheck stamp exists)');
let nowMs = Date.now();
if (opts['--now']) { nowMs = Date.parse(opts['--now']); if (!Number.isFinite(nowMs)) fail('usage', `--now ${opts['--now']} is not an ISO instant`); }

// ---- time (verbatim from guard-rd): T and the precheck stamp are local readings at UTC+3 (Turkey has no DST)
const TZ_H = 3;
const pad2 = (n) => String(n).padStart(2, '0');
function instantOf(y, mo, d, h, mi, s) {
    const ms = Date.UTC(y, mo - 1, d, h - TZ_H, mi, s);
    const back = new Date(ms + TZ_H * 3600000);
    return back.getUTCFullYear() === y && back.getUTCMonth() === mo - 1 && back.getUTCDate() === d && back.getUTCHours() === h && back.getUTCMinutes() === mi ? ms : NaN;
}
const parseT = (s) => { const m = /^(\d{4})-(\d\d)-(\d\d) (\d\d):(\d\d)$/.exec(s ?? ''); return m ? instantOf(+m[1], +m[2], +m[3], +m[4], +m[5], 0) : NaN; };
const parseStamp = (s) => { const m = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)\+03$/.exec(s ?? ''); return m ? instantOf(+m[1], +m[2], +m[3], +m[4], +m[5], +m[6]) : NaN; };
const local = (ms) => { const d = new Date(ms + TZ_H * 3600000); return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`; };
const START_EARLY_MIN = 6, START_LATE_MIN = 30;

// k0. The launcher's own kind agrees with the guard's (a flight launcher can never run the smoke's guard line or the reverse)
if (process.env.NATIVELY_B1_KIND !== KIND) fail('k0', `NATIVELY_B1_KIND is ${process.env.NATIVELY_B1_KIND === undefined ? 'unset' : JSON.stringify(process.env.NATIVELY_B1_KIND)}, the guard was started with --kind ${KIND}`);

// r1. The roster the harness loads: live40, 47 items
let R;
try { R = await import(pathToFileURL(`${PROJ}/electron/test/golden/roster.mjs`).href); } catch (e) { fail('r1', `roster.mjs does not load under this environment: ${e.message}`); }
if (R.ROSTER_NAME !== 'live40') fail('r1', `the harness would load roster ${R.ROSTER_NAME}, not live40 - NATIVELY_ROSTER did not arrive`);
if (R.INTERVIEW.length !== 47) fail('r1', `live40 loaded ${R.INTERVIEW.length} items, expected 47`);

let V, T;
try {
    V = require(`${PROJ}/dist-electron/electron/llm/verbalPrimaryModel.js`);
    T = require(`${PROJ}/dist-electron/electron/llm/geminiThinking.js`);
} catch (e) { fail('2', `dist-electron does not load: ${e.message}. Run npm run build:electron.`); }

// 2. built default and fallback (read as text: LLMHelper.js pulls in the whole app)
const helperPath = `${PROJ}/dist-electron/electron/LLMHelper.js`;
const helper = readText('2', helperPath);
const primary = helper.match(/const GEMINI_FLASH_MODEL = "([^"]+)"/)?.[1];
const fallback = helper.match(/const GEMINI_FLASH_FALLBACK_MODEL = "([^"]+)"/)?.[1];
if (primary !== 'gemini-3.1-flash-lite') fail('2', `the build's default answer model is ${primary}, not gemini-3.1-flash-lite`);
if (fallback !== 'gemini-3.5-flash-lite') fail('2', `the build's stall fallback is ${fallback}, not gemini-3.5-flash-lite`);
const ALLOWED = [primary, fallback];
// 3. no override reaches the app
for (const m of ALLOWED) {
    let got;
    try { got = V.verbalPrimaryModel(m, ALLOWED); } catch (e) { fail('3', `the answer-model override refuses this environment: ${e.message}`); }
    if (got !== m) fail('3', `an answer-model override is set: ${m} resolves to ${got}`);
}
let level;
try { level = T.geminiThinkingLevelFromEnv(); } catch (e) { fail('3', `the thinking-level override refuses this environment: ${e.message}`); }
if (level !== 'LOW') fail('3', `the app would think at ${level}, not the shipped LOW - NATIVELY_GEMINI_THINKING_LEVEL is set`);
// 4. the level each model flies at
if (T.thinkingLevelForModel(primary, level) !== 'LOW') fail('4', `${primary} would not fly at LOW`);
if (T.thinkingLevelForModel(fallback, level) !== 'HIGH') fail('4', `the ${fallback} fallback would fly at a level it ignores`);

// 6. the hedge is the shipped default (variable UNSET, built default ON)
const hedgeVar = process.env.NATIVELY_VERBAL_HEDGE;
if (hedgeVar !== undefined) fail('6', `NATIVELY_VERBAL_HEDGE is set (${JSON.stringify(hedgeVar)}) - the run flies the shipped default with the variable UNSET, so the launcher must unset it, even for the value 1`);
let V2;
try { V2 = require(`${PROJ}/dist-electron/electron/llm/verbalHedge.js`); } catch (e) { fail('6', `dist-electron/electron/llm/verbalHedge.js does not load: ${e.message}. Run npm run build:electron.`); }
const HEDGE_LINE = '[Main] verbal hedge: on trigger=5000ms';
let bare;
try { bare = V2.describeVerbalHedgeAtStartup({}); } catch (e) { fail('6', `the built verbalHedge.describeVerbalHedgeAtStartup threw on an empty environment: ${e.message}`); }
if (bare !== HEDGE_LINE) fail('6', `the built default is not the hedge: "${bare}", want "${HEDGE_LINE}"`);
// 7. trigger 5000 ms
let triggerMs;
try { triggerMs = V2.verbalHedgeTriggerMs(); } catch (e) { fail('7', `NATIVELY_VERBAL_HEDGE_TRIGGER_MS refuses this environment: ${e.message}`); }
if (triggerMs !== 5000) fail('7', `the hedge trigger is ${triggerMs}ms, not the probed 5000ms - NATIVELY_VERBAL_HEDGE_TRIGGER_MS is set`);
// 8. the follow-up parent flag is OFF
let F;
try { F = require(`${PROJ}/dist-electron/electron/llm/followUpParent.js`); } catch (e) { fail('8', `dist-electron/electron/llm/followUpParent.js does not load: ${e.message}. Run npm run build:electron.`); }
let followUpOn;
try { followUpOn = F.followUpParentEnabled(); } catch (e) { fail('8', `NATIVELY_FOLLOWUP_PARENT refuses this environment: ${e.message}`); }
if (followUpOn !== false) fail('8', 'the follow-up flag is set; the run flies it OFF');

// r2. the router flag exactly "1" and the built main.js carries the startup line; main.js not older than main.ts
const routerVar = process.env.NATIVELY_LIVE_ROUTER;
if (routerVar !== '1') fail('r2', `NATIVELY_LIVE_ROUTER is ${routerVar === undefined ? 'unset' : JSON.stringify(routerVar)}, not exactly "1" - the run flies the router ON`);
const mainJs = `${PROJ}/dist-electron/electron/main.js`;
if (!readText('r2', mainJs).includes('[Router] flag NATIVELY_LIVE_ROUTER=')) fail('r2', 'the built dist-electron/electron/main.js does not carry the startup line code "[Router] flag NATIVELY_LIVE_ROUTER=" - rebuild');
// r4. the earlier-question block is OFF
const eqVar = process.env.NATIVELY_EARLIER_QUESTION;
if (eqVar !== undefined) fail('r4', `NATIVELY_EARLIER_QUESTION is set (${JSON.stringify(eqVar)}) - the run flies with the earlier-question block OFF, so the launcher must unset it, even for the value 0`);

// g4 (format). NATIVELY_B1_T
const b1T = process.env.NATIVELY_B1_T;
const tMs = parseT(b1T);
if (!Number.isFinite(tMs)) fail('g4', `NATIVELY_B1_T is ${b1T === undefined ? 'unset' : JSON.stringify(b1T)}, not a yyyy-MM-dd HH:mm local time - the task passes T to the launcher as its first argument`);

// d1. The fault-drill environment, exactly as faultDrill.ts parses it (SPEC 7.1; REVIEW-CODE note 3: NO space after the comma, split(',') does not trim).
//     smoke: the drill spec is exactly DRILL_SPEC and NATIVELY_AUTOSTART_MEETING is "1" (what the harness sets for the app), and the BUILT parser accepts it with
//     the harness gate open and returns exactly those two faults. flight: the variable is ABSENT (spec 7.1 "Final flight: NATIVELY_FAULT_DRILL absent").
const DRILL_SPEC = 'router-drop@600,ear-mute@750';
const drillVar = process.env.NATIVELY_FAULT_DRILL;
let drillNote;
if (KIND === 'flight') {
    if (drillVar !== undefined) fail('d1', `NATIVELY_FAULT_DRILL is set (${JSON.stringify(drillVar)}) - the final flight runs NO drill, the launcher must unset it`);
    drillNote = 'fault drill ABSENT';
} else {
    if (drillVar !== DRILL_SPEC) fail('d1', `NATIVELY_FAULT_DRILL is ${drillVar === undefined ? 'unset' : JSON.stringify(drillVar)}, not exactly ${JSON.stringify(DRILL_SPEC)} (no space after the comma)`);
    if (process.env.NATIVELY_AUTOSTART_MEETING !== '1') fail('d1', `NATIVELY_AUTOSTART_MEETING is ${process.env.NATIVELY_AUTOSTART_MEETING === undefined ? 'unset' : JSON.stringify(process.env.NATIVELY_AUTOSTART_MEETING)}, not "1" - the drill is honoured only in the harness-only start`);
    let FD;
    try { FD = require(`${PROJ}/dist-electron/electron/services/faultDrill.js`); } catch (e) { fail('d1', `dist-electron/electron/services/faultDrill.js does not load: ${e.message}`); }
    const pr = FD.parseDrill(drillVar, { packaged: false, harness: true, routerOn: true });
    const got = pr.ok ? (pr.faults ?? []).map((f) => `${f.kind}@${f.atSec}`).join(',') : `refused reason=${pr.reason}${pr.token ? ' ' + pr.token : ''}`;
    if (got !== DRILL_SPEC) fail('d1', `the BUILT parseDrill reads ${JSON.stringify(drillVar)} as ${got}, not ${DRILL_SPEC}`);
    drillNote = `fault drill ${DRILL_SPEC} parsed by the built parseDrill, harness start 1`;
}

// b1. The dist proofs (b1-proofs.mjs as a child: markers, router/typed/cue shas, the absent short-answer phrase) and every proof source older than its dist file
const bp = spawnSync(process.execPath, [path.join(HERE, 'b1-proofs.mjs'), '--root', PROJ], { encoding: 'utf8', cwd: PROJ, timeout: 120000 });
if (bp.error) fail('b1', `could not run b1-proofs.mjs: ${bp.error.message}`);
if (bp.status !== 0 || !(bp.stdout ?? '').includes('B1 PROOFS: ALL PASSED')) {
    const bad = (bp.stdout ?? '').split(/\r?\n/).filter((l) => /^B1 PROOF BAD|^B1 PROOFS: FAILED|MISSING/.test(l)).join(' | ');
    fail('b1', `b1-proofs.mjs exit ${bp.status}: ${bad || String(bp.stderr).slice(0, 200)}`);
}
for (const rel of ['main', 'LLMHelper', 'audio/LiveRouterSession', 'services/routerArbiter', 'services/routeReader', 'services/earSilence', 'services/faultDrill', 'llm/prompts', 'llm/WhatToAnswerLLM', 'llm/verbalStreamFilter']) {
    const distFile = `${PROJ}/dist-electron/electron/${rel}.js`, srcFile = `${PROJ}/electron/${rel}.ts`;
    let dm, sm;
    try { dm = fs.statSync(distFile).mtimeMs; } catch (e) { fail('b1', `the built dist-electron/electron/${rel}.js is missing: ${e.code ?? e.message}`); }
    try { sm = fs.statSync(srcFile).mtimeMs; } catch (e) { fail('b1', `the source electron/${rel}.ts is missing: ${e.code ?? e.message}`); }
    if (dm < sm) fail('b1', `dist-electron/electron/${rel}.js (${new Date(dm).toISOString()}) is older than electron/${rel}.ts (${new Date(sm).toISOString()}) - the build is stale, rebuild`);
}

// 10b. HEAD pin + clean tree (the harness's own rebuild compiles whatever the tree holds)
const registeredCommit = process.env.NATIVELY_FLIGHT_COMMIT?.trim();
if (!registeredCommit) fail('10b', 'NATIVELY_FLIGHT_COMMIT is not set');
if (!/^[0-9a-f]{40}$/.test(registeredCommit)) fail('10b', `NATIVELY_FLIGHT_COMMIT is ${JSON.stringify(registeredCommit)}, not a full 40-hex commit hash`);
let head;
try { head = execFileSync('git', ['-C', PROJ, 'rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 }).trim(); } catch (e) { fail('10b', `git rev-parse HEAD failed: ${e.message}`); }
if (head !== registeredCommit) fail('10b', `MAIN HEAD is ${head}, not the registered commit ${registeredCommit} (NATIVELY_FLIGHT_COMMIT) - a peer or a later commit moved the tree since registration`);
let statusOut;
try { statusOut = execFileSync('git', ['--no-optional-locks', '-C', PROJ, 'status', '--porcelain', '--', ...GIT_PATHSPEC], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 }); } catch (e) { fail('10b', `git status failed: ${e.message}`); }
const dirty = unexpectedDirtyPaths(statusOut);
if (dirty.length) fail('10b', `the tree the run's rebuild will compile is not clean: ${dirty.join('; ')}`);
const allowlisted = allowlistedPaths(statusOut);

// flight only: 11 ANSWER_MODELS and r5 the arms (as r1's flight: spec 10.1's order)
let armsNote = 'app-only smoke (no flight.mjs, no arms)';
if (KIND === 'flight') {
    let flightMjs;
    try { flightMjs = await import(pathToFileURL(`${PROJ}/electron/test/golden/interview60.flight.mjs`).href); } catch (e) { fail('11', `interview60.flight.mjs does not load under this environment: ${e.message}`); }
    const WANT_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'];
    if (!(Array.isArray(flightMjs.ANSWER_MODELS) && flightMjs.ANSWER_MODELS.length === 2 && flightMjs.ANSWER_MODELS.every((id, i) => id === WANT_MODELS[i]))) fail('11', `ANSWER_MODELS is ${JSON.stringify(flightMjs.ANSWER_MODELS)}, not exactly ${JSON.stringify(WANT_MODELS)}`);
    const ARMS_WANT = 'high,low,captured-high';
    if (process.env.NATIVELY_FLIGHT_ARMS !== ARMS_WANT) fail('r5', `NATIVELY_FLIGHT_ARMS is ${process.env.NATIVELY_FLIGHT_ARMS === undefined ? 'unset' : JSON.stringify(process.env.NATIVELY_FLIGHT_ARMS)}, not exactly "${ARMS_WANT}"`);
    if (typeof flightMjs.selectArms !== 'function' || !Array.isArray(flightMjs.PAIRED_ARMS)) fail('r5', 'interview60.flight.mjs has no selectArms / PAIRED_ARMS export');
    let sel;
    try { sel = flightMjs.selectArms(flightMjs.PAIRED_ARMS, process.env).map((a) => a.tag); } catch (e) { fail('r5', `the harness's selectArms refuses this environment: ${e.message}`); }
    if (sel.join(',') !== ARMS_WANT) fail('r5', `the harness's selectArms returns [${sel.join(',')}], not [${ARMS_WANT}]`);
    if (process.env.NATIVELY_FLIGHT_FOCUSED !== 'off') fail('r5', `NATIVELY_FLIGHT_FOCUSED is ${process.env.NATIVELY_FLIGHT_FOCUSED === undefined ? 'unset' : JSON.stringify(process.env.NATIVELY_FLIGHT_FOCUSED)}, not exactly "off"`);
    armsNote = `arms exactly ${ARMS_WANT}, focused arms OFF`;
}

// h1 + s1. Host state and the interactive session, read by ONE read-only PowerShell child (electron.exe, tail.exe with parent liveness, running Natively-* tasks, port 5180,
//      this guard's own SessionId and the console session). No window title, no file content.
const ownTask = process.env.NATIVELY_B1_TASK ?? '';
if (!/^[A-Za-z0-9._-]*$/.test(ownTask)) fail('h1', `NATIVELY_B1_TASK ${JSON.stringify(ownTask)} is not a task name`);
const ps = `
$ErrorActionPreference = 'Stop'
Add-Type -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint WTSGetActiveConsoleSessionId();' -Name K -Namespace GuardW
$el = @(Get-CimInstance Win32_Process -Filter "Name='electron.exe'")
$tails = @(Get-CimInstance Win32_Process -Filter "Name='tail.exe'")
$orph = @(); $watch = @()
foreach ($t in $tails) { $par = Get-CimInstance Win32_Process -Filter ("ProcessId=" + $t.ParentProcessId) -ErrorAction SilentlyContinue; if (-not $par) { $orph += [string]$t.ProcessId }; if ([string]$t.CommandLine -match 'natively_debug') { $watch += [string]$t.ProcessId } }
$run = @(Get-ScheduledTask -TaskName 'Natively-*' -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Running' } | ForEach-Object { $_.TaskName })
$port = [bool](Get-NetTCPConnection -LocalPort 5180 -State Listen -ErrorAction SilentlyContinue)
$o = [ordered]@{ electron = $el.Count; tails = $tails.Count; orphanTails = $orph; logTails = $watch; running = $run; port5180 = $port; self = (Get-Process -Id ${process.pid}).SessionId; console = [GuardW.K]::WTSGetActiveConsoleSessionId() }
$o | ConvertTo-Json -Compress`;
const hs = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', ps], { encoding: 'utf8', timeout: 120000 });
if (hs.error || hs.status !== 0) fail('h1', `the host-state read failed: ${hs.error ? hs.error.message : String(hs.stderr).split(/\r?\n/)[0]}`);
let host;
try { host = JSON.parse((hs.stdout ?? '').trim().split(/\r?\n/).pop()); } catch { fail('h1', 'the host-state read printed no JSON'); }
if (host.electron !== 0) fail('h1', `electron.exe processes running: ${host.electron} - an app is already up (the harness would stop it, the guard refuses to guess whose it is)`);
if (host.port5180) fail('h1', 'port 5180 is held (a vite dev server is up)');
const others = (Array.isArray(host.running) ? host.running : [host.running].filter(Boolean)).filter((n) => n !== ownTask && n !== `${ownTask}-precheck` && n !== `${ownTask}-dry`);
if (others.length) fail('h1', `other Natively tasks are Running: ${others.join(', ')}`);
const orphan = [host.orphanTails].flat().filter(Boolean);
if (orphan.length) fail('h1', `orphaned tail.exe watchers (parent gone): pid ${orphan.join(', ')} - stop them, the app renames natively_debug.log at every start (tooling_orphaned_monitor_tails)`);
const logTails = [host.logTails].flat().filter(Boolean);
if (logTails.length) fail('h1', `tail.exe watchers holding natively_debug.log: pid ${logTails.join(', ')}`);
if (!(host.self > 0)) fail('s1', `this guard runs in session ${host.self} (0 is the services session): the task is not interactive, the overlay would not appear on the user's desktop`);
if (host.self !== host.console) fail('s1', `this guard runs in session ${host.self} but the console session is ${host.console}: the app would not appear on the desktop the user is looking at`);
const hostNote = `no app, port 5180 free, no other Natively task running, no orphaned tail (${host.tails} tail.exe seen), session ${host.self} = console ${host.console}`;

// r7. A FRESH ledger read, one count per request the app sent plus the script requests; headroom >= 1.5 x need on each lite.
//     smoke: need 80 on 3.5-lite (49 hedge fronts + warm-ups) and 40 on 3.1-lite (hedge backs + warm-ups) -> 120 and 60.
//     flight: r1's flight numbers (149 and 60 -> 224 and 90). Both are a measured shape, not a tight bound; the ledger caps at 500 per model.
const NEED_35 = KIND === 'flight' ? 149 : 80, NEED_31 = KIND === 'flight' ? 60 : 40, MARGIN = 1.5;
const MIN_35 = Math.ceil(MARGIN * NEED_35), MIN_31 = Math.ceil(MARGIN * NEED_31);
const LEDGER = opts['--ledger-script'] ?? path.join(SP, 'quota-ledger-today.mjs');
if (!fs.existsSync(LEDGER)) fail('r7', `the quota ledger ${LEDGER} does not exist`);
const extraVar = process.env.NATIVELY_B1_EXTRA_REQUESTS;
if (!/^\d{1,4}$/.test(extraVar ?? '')) fail('r7', `NATIVELY_B1_EXTRA_REQUESTS is ${extraVar === undefined ? 'unset' : JSON.stringify(extraVar)}, not a whole number - the requests made by scripts (bench, probes, bare arms) are in no app log`);
const lg = spawnSync(process.execPath, [LEDGER, '--extra-requests', extraVar, ...(opts['--now'] ? ['--now', opts['--now']] : [])], { encoding: 'utf8', timeout: 120000 });
if (lg.error) fail('r7', `could not run ${LEDGER}: ${lg.error.message}`);
if (lg.status !== 0) fail('r7', `the quota ledger exited ${lg.status}, not 0`);
const summary = /^LEDGER-SUMMARY reset=(\S+) now=(\S+) cap=(\d+) used35=(\d+) used31=(\d+) extra=(\d+|unset) headroom35=(-?\d+) headroom31=(-?\d+) complete=(yes|no) oldest=(\S+)$/m.exec(lg.stdout ?? '');
if (!summary) fail('r7', 'the quota ledger printed no LEDGER-SUMMARY line in its known shape');
if (summary[6] !== extraVar) fail('r7', `the quota ledger read extra=${summary[6]}, not the ${extraVar} it was given`);
if (summary[9] !== 'yes') fail('r7', `the quota ledger says complete=no (oldest log stamp ${summary[10]} is after the reset ${summary[1]}): the start of the quota day was rotated out of the app logs`);
if (summary[10] === 'none') fail('r7', 'the quota ledger found no app log at all');
{
    const DAY = 86400000;
    const midnight = Math.floor(nowMs / DAY) * DAY;
    const expectReset = new Date(midnight + 7 * 3600000 <= nowMs ? midnight + 7 * 3600000 : midnight - DAY + 7 * 3600000).toISOString();
    if (summary[1] !== expectReset) fail('r7', `the quota ledger reads the quota day starting ${summary[1]}, but the latest 07:00Z at or before now is ${expectReset} - the ledger is stale`);
}
const [headroom35, headroom31] = [+summary[7], +summary[8]];
if (headroom35 < MIN_35) fail('r7', `quota headroom on gemini-3.5-flash-lite is ${headroom35} (${summary[4]} app requests + ${extraVar} by scripts, of ${summary[3]}), below ${MIN_35} = ${MARGIN} x ${NEED_35}`);
if (headroom31 < MIN_31) fail('r7', `quota headroom on gemini-3.1-flash-lite is ${headroom31} (${summary[5]} app requests + ${extraVar} by scripts, of ${summary[3]}), below ${MIN_31} = ${MARGIN} x ${NEED_31}`);

// 13. Knowledge mode ON in the persisted settings (only the mtime and that one key are printed)
let settingsFile;
if (opts['--settings']) settingsFile = opts['--settings'];
else {
    if (!process.env.APPDATA) fail('13', 'APPDATA is not set, so the persisted settings (%APPDATA%\\natively\\settings.json) cannot be found');
    settingsFile = path.join(process.env.APPDATA, 'natively', 'settings.json');
}
let settingsStat, settings;
try { settingsStat = fs.statSync(settingsFile); settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8')); } catch (e) { fail('13', `cannot read the persisted settings ${settingsFile}: ${e instanceof SyntaxError ? 'not valid JSON' : (e.code ?? e.name)}`); }
if (typeof settings !== 'object' || settings === null || Array.isArray(settings)) fail('13', `${settingsFile} is not a JSON object`);
if (settings.knowledgeMode !== true) fail('13', `knowledge mode is not ON: knowledgeMode is ${settings.knowledgeMode === undefined ? 'absent' : JSON.stringify(settings.knowledgeMode)} in ${settingsFile} (mtime ${settingsStat.mtime.toISOString()}) - turn Context ON in the user's own app`);

// g2. The night gates (flight-eq's script, unchanged, read-only): any FAIL is a refusal
const NIGHT = opts['--night-gates-script'] ?? path.join(SP, 'flight-eq', 'night-gates.ps1');
if (!fs.existsSync(NIGHT)) fail('g2', `the night-gates script ${NIGHT} does not exist`);
const ng = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', NIGHT, '-At', b1T], { encoding: 'utf8', cwd: PROJ, timeout: 120000 });
console.log(`night gates script: ${NIGHT}`);
if (ng.error) fail('g2', `could not run ${NIGHT}: ${ng.error.message}`);
const ngLines = (ng.stdout ?? '').split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean);
for (const l of ngLines) console.log(l);
if (ng.status !== 0) fail('g2', `night-gates.ps1 exited ${ng.status}: ${ngLines[ngLines.length - 1] ?? '(no output)'}`);
if (ngLines[ngLines.length - 1] !== 'NIGHT GATES OK') fail('g2', `night-gates.ps1 exited 0 but its last line is "${(ngLines[ngLines.length - 1] ?? '').slice(0, 120)}", not "NIGHT GATES OK"`);

// g5. The precheck stamp: the REAL launcher only
let precheckNote = 'precheck not required (dry twin)';
if (opts['--require-precheck']) {
    const pcFile = opts['--precheck-file'] ?? path.join(HERE, `b1-${KIND}-precheck.out.txt`);
    if (!fs.existsSync(pcFile)) fail('g5', `${pcFile} does not exist - the precheck task has not run (it is the only thing that writes it)`);
    const pcLines = readText('g5', pcFile).split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean);
    const last = pcLines[pcLines.length - 1] ?? '';
    const sm = /^PRECHECK OK (.+)$/.exec(last);
    if (!sm) fail('g5', `${pcFile} does not end with a PRECHECK OK line (its last line starts "${last.slice(0, 40)}")`);
    const stampMs = parseStamp(sm[1]);
    if (!Number.isFinite(stampMs)) fail('g5', `the PRECHECK OK stamp "${sm[1].slice(0, 40)}" is not yyyy-MM-ddTHH:mm:ss+03`);
    if (stampMs < tMs - 10 * 60000) fail('g5', `the precheck stamp ${sm[1]} is older than T - 10 min (T ${b1T}): it is not this run's precheck`);
    if (stampMs > nowMs) fail('g5', `the precheck stamp ${sm[1]} lies after now (${local(nowMs)})`);
    if (nowMs > tMs + 10 * 60000) fail('g5', `now (${local(nowMs)}) is later than T + 10 min (T ${b1T}): the task started too late`);
    precheckNote = `PRECHECK ACCEPTED ${sm[1]}`;
    console.log(precheckNote);
}

// 10a. NAMES ONLY, never values: a `.env` line for a name the launcher unsets would reach the app and never this guard
const ENV_NAMES_GUARDED = ['NATIVELY_VERBAL_HEDGE', 'NATIVELY_VERBAL_HEDGE_TRIGGER_MS', 'NATIVELY_FOLLOWUP_PARENT', 'NATIVELY_VERBAL_PRIMARY_MODEL', 'NATIVELY_GEMINI_THINKING_LEVEL', 'NATIVELY_QUESTION_DETECTION_MODEL', 'NATIVELY_LIVE_MODEL', 'NATIVELY_FIRST_TOKEN_TIMEOUT_MS', 'NATIVELY_TURN_GATE_MS', 'NATIVELY_TURN_SETTLE_MS', 'NATIVELY_TURN_UNFINISHED_HOLD_MS', 'NATIVELY_TURN_CONTINUATION_MS', 'NATIVELY_TURN_MAX_HOLD_MS', 'NATIVELY_TURN_WORDLESS_GRACE_MS', 'NATIVELY_DETECTOR_CALIBRATE', 'NATIVELY_DETECTOR_CHAIN_TEST', 'NATIVELY_DETECTOR_CHAIN_TEST_QUESTIONS', 'NATIVELY_GEMMA_TTFT_MS', 'NATIVELY_GEMMA_MAX_ATTEMPTS', 'NATIVELY_GEMMA_VISION_TTFT_MS', 'NATIVELY_GEMMA_VISION_TTFT_BASE_MS', 'NATIVELY_GEMMA_VISION_TTFT_PER_IMAGE_MS', 'NATIVELY_GEMMA_VISION_MAX_ATTEMPTS', 'NATIVELY_STT_PROVIDER', 'NATIVELY_ROSTER', 'NATIVELY_SCENARIOS', 'NATIVELY_FLIGHT_FOCUSED', 'NATIVELY_EARLIER_QUESTION', 'NATIVELY_B1_T', 'NATIVELY_FAULT_DRILL', 'NATIVELY_LIVE_ROUTER'];
const DOTENV_NAME = /^\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)/;
const envPath = `${PROJ}/.env`;
if (fs.existsSync(envPath)) {
    const envNames = readText('10a', envPath).split(/\r?\n/).map((line) => line.match(DOTENV_NAME)?.[1]).filter(Boolean);
    const clash = ENV_NAMES_GUARDED.filter((n) => envNames.includes(n));
    if (clash.length) fail('10a', `.env declares ${clash.join(', ')} - this would reach the app and never reach this guard; remove it from .env`);
}

// g4-clock: the LAST check, real launcher only (the dry twin and the pre-dry run hours before T)
let clockNote = 'clock window not checked (dry twin)';
if (!DRY) {
    if (nowMs < tMs - START_EARLY_MIN * 60000 || nowMs > tMs + START_LATE_MIN * 60000) fail('g4-clock', `now (${local(nowMs)}) is outside [T - ${START_EARLY_MIN} min, T + ${START_LATE_MIN} min] for NATIVELY_B1_T ${b1T}: every other check passed; only the start time is wrong`, EXIT_WINDOW);
    clockNote = `clock within [T - ${START_EARLY_MIN}, T + ${START_LATE_MIN}] min`;
}

console.log(`GUARD OK: ${KIND}${DRY ? ' (dry twin)' : ''}, roster live40 (${R.INTERVIEW.length} items), no model or thinking override, ${primary} LOW with the ${fallback} fallback at HIGH, hedge ON by default (trigger ${triggerMs}ms), follow-up parent OFF, router flag exactly 1, earlier question unset, ${drillNote}, dist proofs b1-proofs ALL PASSED (router instruction e29bf3810128, typed 4495445db0c2, cue rule 8e15e4e7dd41, markers, dist newer than source), T ${b1T} (${clockNote}), HEAD pinned at ${head}, tree clean but for the allowlisted paths present [${allowlisted.join(', ') || 'none'}], ${armsNote}, host: ${hostNote}, quota headroom ${headroom35} on 3.5-lite (>= ${MIN_35}) and ${headroom31} on 3.1-lite (>= ${MIN_31}) from the ledger reset ${summary[1]} with ${extraVar} script requests, knowledge mode ON (mtime ${settingsStat.mtime.toISOString()}), night gates OK, ${precheckNote}, .env carries none of the guarded names`);
