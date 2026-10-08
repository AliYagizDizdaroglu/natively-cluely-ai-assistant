// LAB\flight\guard-rd-cal.mjs - calibration driver for guard-rd.mjs (plan Task 18 step 3: "calibrate by breaking each premise once in a
// stub tree"; SP\flight-eq\guard-eq-cal.mjs's pattern). The router build has NOT landed in MAIN, so MAIN cannot pass r2, r3 or r5 today:
// every router-dependent case runs on a STUB tree built from REAL files of MAIN's dist and sources (read only), the roster and harness files
// of the live-router-d worktree (read only), and SYNTHETIC router dist and source files (marked as such below).
// The stub is a throwaway git repo inside LAB\flight\cal (never MAIN). The REAL guard file is run as a child with cwd = the stub, once per
// broken premise; then a MUTATION suite (rule 8: copies of the guard with ONE check switched off, run over the cases that must notice - a
// case is not vacuous if its mutant turns it BAD). Never starts the app; no network; no model call; no scheduled task is touched.
//   node guard-rd-cal.mjs        writes guard-rd-cal.txt beside it, exit 0 only if every counted case reads as expected.
// A case that does not read as expected is a finding, never edited to match (rule 8).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));      // LAB\flight
const LAB = path.resolve(HERE, '..');
const SP = path.resolve(LAB, '..');
const GUARD = path.join(HERE, 'guard-rd.mjs');
const CAL = path.join(HERE, 'cal');
const STUB = path.join(CAL, 'guard-stub');
const LAYOUT = path.join(CAL, 'guard-layout');           // SP-shaped folders holding COPIES of the guard (mutants, faithful mirror)
const STUBS = path.join(CAL, 'guard-stubs');             // settings, smoke results, precheck stamps, night-gate and ledger stubs
const OUT = path.join(HERE, 'guard-rd-cal.txt');

function findMain() {
    const od = path.join(os.homedir(), 'OneDrive');
    for (const d of fs.readdirSync(od)) {
        if (!d.startsWith('Masa')) continue;
        const cand = path.join(od, d, 'natively-cluely-ai-assistant');
        if (fs.existsSync(path.join(cand, '.git'))) return cand;
    }
    throw new Error('MAIN not found under OneDrive');
}
const MAIN = findMain();
const WTD = path.join(MAIN, '.claude', 'worktrees', 'live-router-d');   // roster.mjs, live40.questions.mjs, interview60.flight.mjs with selectArms (Task 12/13)
if (!fs.existsSync(path.join(WTD, 'electron', 'test', 'golden', 'live40.questions.mjs'))) throw new Error(`live-router-d worktree has no live40 roster: ${WTD}`);

const gitIn = (dir, ...a) => execFileSync('git', ['--no-optional-locks', '-C', dir, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const gitStub = (...a) => gitIn(STUB, ...a);
const gitStubCommit = (msg) => gitIn(STUB, '-c', 'user.name=cal', '-c', 'user.email=cal@example.invalid', 'commit', '-q', '-m', msg);
const headOf = (dir, rev = 'HEAD') => gitIn(dir, 'rev-parse', rev).trim();

// ---- the stub tree -----------------------------------------------------------------------------------------------------------
const MAIN_SOURCES = ['electron/LLMHelper.ts', 'electron/llm/prompts.ts', 'electron/main.ts'];
const WTD_SOURCES = ['electron/test/golden/roster.mjs', 'electron/test/golden/holdout40.questions.mjs', 'electron/test/golden/interview60.questions.mjs',
    'electron/test/golden/scenario50.questions.mjs', 'electron/test/golden/live40.questions.mjs', 'electron/test/golden/interview60.flight.mjs'];
const put = (rel, text) => { const f = path.join(STUB, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
const copyFrom = (base, rel) => { const f = path.join(STUB, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.copyFileSync(path.join(base, rel), f); };
// fs.cpSync exits silently on a non-ASCII path (memory node_cpsync_nonascii): readdir + copyFile
function copyTree(from, to) {
    fs.mkdirSync(to, { recursive: true });
    for (const ent of fs.readdirSync(from, { withFileTypes: true })) {
        const a = path.join(from, ent.name), b = path.join(to, ent.name);
        if (ent.isDirectory()) copyTree(a, b); else fs.copyFileSync(a, b);
    }
}
const INSTRUCTION_SHA = 'e29bf3810128854c115214a50205ac7aa992e84bfcf35dd13147340a8cd41f3f';
const BLOCK_B_SHA = 'e11c240063eae0f258a1424fe49224aff5e6ffda0aafd2d6be6b553379379ad8';
const D = 'dist-electron/electron/';
// SYNTHETIC router files: MAIN has none yet. They carry exactly the text the guard looks for (the shapes come from plan Task 2 and Task 7).
const SYNTH = {
    'electron/audio/LiveRouterSession.ts': `// synthetic stand-in\nexport const ROUTER_MODEL = 'gemini-3.8-live';\nexport const INSTRUCTION_SHA256 = '${INSTRUCTION_SHA}';\nexport const BLOCK_B_SHA256 = '${BLOCK_B_SHA}';\nexport const ROUTER_SHAS_OK = true;\n`,
    'electron/services/routerArbiter.ts': '// synthetic stand-in\nexport const arbiter = 1;\n',
    'electron/services/routeReader.ts': '// synthetic stand-in\nexport const reader = 1;\n',
    [`${D}audio/LiveRouterSession.js`]: `// synthetic stand-in\nexports.ROUTER_MODEL = "gemini-3.8-live";\nexports.INSTRUCTION_SHA256 = "${INSTRUCTION_SHA}";\nexports.BLOCK_B_SHA256 = "${BLOCK_B_SHA}";\nexports.ROUTER_SHAS_OK = true;\n`,
    [`${D}services/routerArbiter.js`]: '// synthetic stand-in\nexports.arbiter = 1;\n',
    [`${D}services/routeReader.js`]: '// synthetic stand-in\nexports.reader = 1;\n',
};
function buildStub() {
    fs.rmSync(STUB, { recursive: true, force: true, maxRetries: 5 });
    fs.mkdirSync(STUB, { recursive: true });
    put('package.json', '{"name":"guard-rd-cal","version":"0.0.0"}\n');
    put('.gitignore', 'dist-electron/\n.env\nnatively_debug.log\n');
    for (const rel of MAIN_SOURCES) copyFrom(MAIN, rel);
    for (const rel of WTD_SOURCES) copyFrom(WTD, rel);
    for (const [rel, text] of Object.entries(SYNTH)) if (!rel.startsWith(D)) put(rel, text);
    put('electron/test/golden/interview60.chains.json', '{}\n');
    put('electron/test/golden/interview60.report.md', '# report\n');
    put('natively_debug.log.1', 'rotated log\n');
    put('src/App.tsx', 'export const App = 1;\n');
    put('scripts/build-electron.js', '// build script\n');
    put('README.md', '# stub\n');
    gitStub('init', '-q');
    gitStub('config', 'core.autocrlf', 'false');   // a reset --hard must not rewrite line ends: the cases edit by text
    gitStub('add', '-A');
    gitStubCommit('stub base');
    put('README.md', '# stub, second commit\n');          // a second commit so HEAD~1 exists (the moved-HEAD case)
    gitStub('add', '-A');
    gitStubCommit('stub second');
    copyTree(path.join(MAIN, 'dist-electron'), path.join(STUB, 'dist-electron'));       // ignored, written AFTER the sources: newer
    for (const [rel, text] of Object.entries(SYNTH)) if (rel.startsWith(D)) put(rel, text);
    // MAIN's main.js has no router flag line yet: append the one the plan's Task 7 wires (console.log of `[Router] flag NATIVELY_LIVE_ROUTER=...`)
    fs.appendFileSync(path.join(STUB, `${D}main.js`), '\n// synthetic: console.log(`[Router] flag NATIVELY_LIVE_ROUTER=${on ? "on" : "off"}`);\n');
    put('.env', 'UNRELATED_DUMMY_NAME=dummy-value-not-a-key\n');
}
function buildLayout(name, { mutate } = {}) {
    const root = path.join(LAYOUT, name);
    const fDir = path.join(root, 'router-default', 'flight');
    fs.mkdirSync(fDir, { recursive: true });
    fs.copyFileSync(path.join(HERE, 'guard-rd-g' + 'it.mjs'), path.join(fDir, 'guard-rd-g' + 'it.mjs'));
    fs.copyFileSync(path.join(SP, 'dist-proof.mjs'), path.join(root, 'dist-proof.mjs'));
    const g = fs.readFileSync(GUARD, 'utf8');
    const m = mutate ? mutate(g) : g;
    if (mutate && m === g) throw new Error(`calibration bug: mutant ${name} changed nothing`);
    fs.writeFileSync(path.join(fDir, 'guard-rd.mjs'), m);
    return path.join(fDir, 'guard-rd.mjs');
}

// ---- stub helpers ------------------------------------------------------------------------------------------------------------
const stubFile = (rel) => path.join(STUB, rel);
function edit(rel, fn) {
    const f = stubFile(rel);
    const before = fs.readFileSync(f, 'utf8');
    const after = fn(before);
    if (after === before) throw new Error(`calibration bug: the edit of ${rel} changed nothing`);
    fs.writeFileSync(f, after);
    return () => fs.writeFileSync(f, before);
}
const replaceAll = (from, to) => (t) => t.split(from).join(to);
function addFile(rel, text = 'x\n') { put(rel, text); return () => fs.rmSync(stubFile(rel), { recursive: true, force: true }); }
const seq = (...undos) => () => { for (const u of [...undos].reverse()) u(); };
function commitVariant(edits) {
    const base = headOf(STUB);
    for (const [rel, fn] of edits) edit(rel, fn);
    gitStub('add', '-A');
    gitStubCommit('cal variant');
    return { commit: headOf(STUB), undo: () => { gitStub('reset', '--hard', '-q', base); } };
}
const removeFile = (rel) => { const f = stubFile(rel); const before = fs.readFileSync(f); fs.rmSync(f); return () => fs.writeFileSync(f, before); };
// every dist file a guard check compares with its source by mtime is bumped, so an undo (which rewrites a SOURCE and moves its mtime) never makes the build look stale by accident
const FRESH = ['LLMHelper.js', 'main.js', 'audio/LiveRouterSession.js', 'services/routerArbiter.js', 'services/routeReader.js'];
const freshenDist = () => {
    const t = new Date(Date.now() + 5000);
    for (const r of FRESH) { const f = stubFile(`${D}${r}`); if (fs.existsSync(f)) fs.utimesSync(f, t, t); }
};
// make a SOURCE newer than its dist (a stale build), returning the undo
const makeStale = (rel) => { const f = stubFile(rel); const st = fs.statSync(f); const t = new Date(Date.now() + 60000); fs.utimesSync(f, t, t); return () => fs.utimesSync(f, st.atime, st.mtime); };

// ---- the stub inputs ---------------------------------------------------------------------------------------------------------
const T_OK = '2026-10-07 23:00';                          // the fallback T
const NOW_OK = '2026-10-07T23:01:00+03:00';               // T + 1 min
const CTX = 'a1b2c3d4e5f6';
const settingsFile = (n) => path.join(STUBS, n);
const SETTINGS_ON = settingsFile('settings-on.json');
const stamp = (hh, mm, ss = '00', day = '2026-10-07') => `${day}T${hh}:${mm}:${ss}+03`;
const PRE = (lines) => `${lines.join('\n')}\n`;
function ledgerSource({ used35 = 100, used31 = 50, reset = null, exit = 0, line = true, shape = 'good', complete = 'yes', oldest = '2026-10-06T01:00:00.000Z', ignoreExtra = false }) {
    return `// ledger stub (calibration): the reset is derived from --now exactly as the real ledger does, unless fixed
const i = process.argv.indexOf('--now');
const NOW = i < 0 ? Date.now() : Date.parse(process.argv[i + 1]);
const DAY = 86400000, midnight = Math.floor(NOW / DAY) * DAY;
const start = midnight + 7 * 3600000 <= NOW ? midnight + 7 * 3600000 : midnight - DAY + 7 * 3600000;
const reset = ${reset ? JSON.stringify(reset) : 'new Date(start).toISOString()'};
const e = process.argv.indexOf('--extra-requests');
const extra = ${ignoreExtra ? "'unset'" : "e < 0 ? 'unset' : process.argv[e + 1]"};
console.log('reset ' + reset + ' (10:00 local)');
${line ? (shape === 'good'
        ? `console.log('LEDGER-SUMMARY reset=' + reset + ' now=' + new Date(NOW).toISOString() + ' cap=500 used35=${used35} used31=${used31} extra=' + extra + ' headroom35=${500 - used35} headroom31=${500 - used31} complete=${complete} oldest=${oldest}');`
        : `console.log('LEDGER-SUMMARY reset=' + reset + ' now=x cap=500 used35=many used31=few extra=' + extra + ' headroom35=lots headroom31=lots complete=yes oldest=x');`) : "console.log('no summary here');"}
process.exit(${exit});
`;
}
function writeStubs() {
    fs.rmSync(STUBS, { recursive: true, force: true });
    fs.mkdirSync(STUBS, { recursive: true });
    const w = (n, t) => fs.writeFileSync(path.join(STUBS, n), t);
    w('settings-on.json', '{"knowledgeMode":true}\n'); w('settings-off.json', '{"knowledgeMode":false}\n'); w('settings-absent.json', '{"other":1}\n');
    w('settings-broken.json', 'not json {\n'); w('settings-string-true.json', '{"knowledgeMode":"true"}\n'); w('settings-array.json', '[true]\n');
    for (const d of ['on', 'off']) { fs.mkdirSync(path.join(STUBS, 'appdata', d, 'natively'), { recursive: true }); fs.copyFileSync(path.join(STUBS, `settings-${d}.json`), path.join(STUBS, 'appdata', d, 'natively', 'settings.json')); }
    const R = (extra) => `# RESULT-smoke (stub)\n\n- 8. context_sha12=${CTX} context_chars=812 on every connect line\n${extra ?? ''}`;
    w('result-ok.md', R());
    w('result-other-sha.md', `# RESULT-smoke (stub)\n\n- 8. context_sha12=ffffffffffff context_chars=812\n`);
    w('result-no-label.md', `# RESULT-smoke (stub)\n\n- 8. the sha was ${CTX} but unlabelled\n`);
    w('result-longer-sha.md', `# RESULT-smoke (stub)\n\n- 8. context_sha12=${CTX}ff context_chars=812\n`);
    w('result-empty.md', '');
    w('night-ok.ps1', "Write-Output 'NIGHT standby-ac: OK stub'\nWrite-Output 'NIGHT GATES OK'\nexit 0\n");
    w('night-fail.ps1', "Write-Output 'NIGHT power: FAIL stub'\nWrite-Output 'NIGHT GATES FAILED (1): power'\nexit 1\n");
    w('night-noline.ps1', "Write-Output 'NIGHT standby-ac: OK stub'\nexit 0\n");
    // the REAL night-gates.ps1 with its own -FakeJson (standby 900 s): the child plumbing carries a real FAIL
    w('fake-standby.json', JSON.stringify({ standbyAcSec: 900, hibernateAcSec: 0, battery: [2], batteryFlag: null, acLine: true, rebootPendingCbs: false, rebootRequiredWu: false, pendingFileRename: false, rebootParentMissing: null,
        activeHoursStart: 15, activeHoursEnd: 6, pauseUpdatesExpiry: null, pauseQualityUpdatesEnd: null, pauseFeatureUpdatesEnd: null, pausedQualityStatus: null, pausedFeatureStatus: null, policyNoAutoUpdate: null, policyAUOptions: null, policyOverrides: [] }));
    // (the paths hold a non-ASCII folder name: a .ps1 needs its UTF-8 BOM or Windows PowerShell 5.1 reads them as ANSI)
    const REAL_NIGHT = path.join(SP, 'flight-eq', 'night-gates.ps1');
    fs.writeFileSync(path.join(STUBS, 'night-real-fake.ps1'), `﻿param([string]$AtText)\n& '${REAL_NIGHT}' -At $AtText -FakeJson '${path.join(STUBS, 'fake-standby.json')}'\nexit $LASTEXITCODE\n`, 'utf8');
    // quota ledgers: need 149 / 60, margin 1.5 -> 224 / 90 (500 - used)
    w('ledger-ok.mjs', ledgerSource({}));
    w('ledger-h35-223.mjs', ledgerSource({ used35: 277 }));
    w('ledger-h35-224.mjs', ledgerSource({ used35: 276 }));
    w('ledger-h31-89.mjs', ledgerSource({ used31: 411 }));
    w('ledger-h31-90.mjs', ledgerSource({ used31: 410 }));
    w('ledger-h35-neg.mjs', ledgerSource({ used35: 612 }));
    w('ledger-stale.mjs', ledgerSource({ reset: '2026-10-06T07:00:00.000Z' }));
    w('ledger-noline.mjs', ledgerSource({ line: false }));
    w('ledger-badshape.mjs', ledgerSource({ shape: 'bad' }));
    w('ledger-exit1.mjs', ledgerSource({ exit: 1 }));
    w('ledger-incomplete.mjs', ledgerSource({ complete: 'no', oldest: '2026-10-07T08:00:00.000Z' }));
    w('ledger-nolog.mjs', ledgerSource({ oldest: 'none' }));
    w('ledger-ignores-extra.mjs', ledgerSource({ ignoreExtra: true }));
    // precheck stamps (T = 23:00): the REAL file shape = gate lines, then the verdict line LAST
    const gl = ['PRECHECK flight-task: OK', 'PRECHECK port: OK'];
    w('pre-ok-t-7.txt', PRE([...gl, `PRECHECK OK ${stamp('22', '53')}`]));
    w('pre-ok-t-10.txt', PRE([...gl, `PRECHECK OK ${stamp('22', '50')}`]));
    w('pre-ok-t-10-1s.txt', PRE([...gl, `PRECHECK OK ${stamp('22', '49', '59')}`]));
    w('pre-ok-2h-old.txt', PRE([...gl, `PRECHECK OK ${stamp('20', '53')}`]));
    w('pre-failed.txt', PRE([...gl, 'PRECHECK port: FAIL held', 'PRECHECK FAILED (1): port']));
    w('pre-ok-then-failed.txt', PRE([`PRECHECK OK ${stamp('22', '53')}`, 'PRECHECK FAILED (1): port']));
    w('pre-ok-then-more.txt', PRE([`PRECHECK OK ${stamp('22', '53')}`, 'PRECHECK port: OK']));
    w('pre-ok-future.txt', PRE([...gl, `PRECHECK OK ${stamp('23', '30')}`]));
    w('pre-ok-badfmt.txt', PRE([...gl, 'PRECHECK OK 2026-10-07 22:53:00']));
    w('pre-ok-nostamp.txt', PRE([...gl, 'PRECHECK OK']));
    w('pre-empty.txt', '');
}

// ---- the cases ---------------------------------------------------------------------------------------------------------------
const ok = (...contains) => ({ exit: 0, line: /^GUARD OK: /, contains, notContains: [] });
// fix4 H1/H2: the clock check alone has its own tag and its own exit code (10)
const badClock = (contains = [], notContains = []) => ({ exit: 10, line: /^GUARD FAILED: \(g4-clock\) /, contains, notContains });
const bad = (tag, contains = [], notContains = []) => ({ exit: 1, line: new RegExp(`^GUARD FAILED: \\(${tag}\\) `), contains, notContains });
const baseArgs = () => ({ '--settings': SETTINGS_ON, '--smoke-result': path.join(STUBS, 'result-ok.md'), '--night-gates-script': path.join(STUBS, 'night-ok.ps1'), '--ledger-script': path.join(STUBS, 'ledger-ok.mjs'), '--now': NOW_OK });
const pre = (n) => ({ '--require-precheck': true, '--precheck-file': path.join(STUBS, n) });
const withSettings = (n) => ({ args: { '--settings': path.join(STUBS, n) } });

function stubCases() {
    const C = [];
    const add = (id, name, expect, o = {}) => C.push({ where: 'stub', id, name, expect, ...o });
    const wantSha = crypto.createHash('sha256').update(fs.readFileSync(stubFile(`${D}llm/verbalStreamFilter.js`))).digest('hex').slice(0, 16);

    add('A1', 'the correct environment, the DRY form (every override cleared, the router flag exactly 1, the arms exactly high,low,captured-high, focused off, T set, the registered commit = the stub HEAD, a .env with an unrelated name, the smoke result, the ledger and night-gates stubs, the REAL dist-proof as a child) -> GUARD OK',
        ok('roster live40 (47 items)', 'router flag exactly 1 (built startup line code present)', 'earlier question unset', `T ${T_OK}`, 'arms exactly high,low,captured-high (selectArms returns high,low,captured-high)', 'focused Flash arms OFF',
            `filter sha256/16 ${wantSha}`, 'router build in dist and source', `smoke result holds context_sha12=${CTX}`, 'quota headroom 400 on 3.5-lite (>= 224) and 450 on 3.1-lite (>= 90)', 'knowledge mode ON (knowledgeMode = true in ',
            'night gates OK', 'precheck not required (dry twin)', 'tree clean but for the allowlisted paths present [none]', 'ANSWER_MODELS = ["gemini-3.1-flash-lite","gemini-3.5-flash-lite"]'), { full: true });
    add('A2', 'the same through the layout mirror (a byte-identical COPY of the guard in an SP-shaped folder, the copy the mutants use) -> GUARD OK', ok(), { layout: 'faithful' });
    add('A3', 'the REAL form (--require-precheck): a precheck stamp at T - 7 min, now = T + 1 min -> GUARD OK and PRECHECK ACCEPTED', ok('PRECHECK ACCEPTED 2026-10-07T22:53:00+03'), { args: pre('pre-ok-t-7.txt'), stdoutContains: ['PRECHECK ACCEPTED 2026-10-07T22:53:00+03'] });

    // -- r1: the roster
    add('R1a', 'r1: the wrong roster (holdout40, NATIVELY_SCENARIOS cleared)', bad('r1', ['the harness would load roster holdout40, not live40']), { env: { NATIVELY_ROSTER: 'holdout40' } });
    add('R1b', 'r1: no roster variable (the harness default interview60)', bad('r1', ['roster interview60, not live40']), { env: { NATIVELY_ROSTER: undefined } });
    add('R1c', 'r1: a roster name that does not exist (bogus)', bad('r1', ['roster.mjs does not load under this environment', 'is not a roster']), { env: { NATIVELY_ROSTER: 'bogus' } });
    add('R1d', 'r1: scenario50 (the eq hour\'s roster) with S1,S2 left over', bad('r1', []), { env: { NATIVELY_ROSTER: 'scenario50', NATIVELY_SCENARIOS: 'S1,S2' } });
    add('R1e', 'r1: a live40 roster that holds 46 items (a committed variant of live40.questions.mjs without its first item)', bad('r1', ['live40 loaded 46 items, expected 47']),
        { setup: () => commitVariant([['electron/test/golden/live40.questions.mjs', (t) => { const i = t.search(/    \{\r?\n\s+"id": "RE01"/); const j = t.indexOf('    {', i + 5); if (i < 0 || j < 0) throw new Error('first live40 item not found'); return t.slice(0, i) + t.slice(j); }]]) });

    // -- r2: the router flag
    add('Q-r2a', 'r2: NATIVELY_LIVE_ROUTER unset', bad('r2', ['NATIVELY_LIVE_ROUTER is unset, not exactly "1"']), { env: { NATIVELY_LIVE_ROUTER: undefined } });
    add('Q-r2b', 'r2: NATIVELY_LIVE_ROUTER=0', bad('r2', ['NATIVELY_LIVE_ROUTER is "0", not exactly "1"']), { env: { NATIVELY_LIVE_ROUTER: '0' } });
    add('Q-r2c', 'r2: NATIVELY_LIVE_ROUTER=yes', bad('r2', ['NATIVELY_LIVE_ROUTER is "yes", not exactly "1"']), { env: { NATIVELY_LIVE_ROUTER: 'yes' } });
    add('Q-r2d', 'r2: NATIVELY_LIVE_ROUTER="1 " (a trailing space on a cmd `set` line)', bad('r2', ['NATIVELY_LIVE_ROUTER is "1 ", not exactly "1"']), { env: { NATIVELY_LIVE_ROUTER: '1 ' } });
    add('Q-r2e', 'r2: the BUILT main.js without the `[Router] flag` startup line code', bad('r2', ['does not carry the startup line code "[Router] flag NATIVELY_LIVE_ROUTER="']), { setup: () => ({ undo: edit(`${D}main.js`, replaceAll('[Router] flag NATIVELY_LIVE_ROUTER=', '[Router] flag NATIVELY_LIVE_ROUTOR=')) }) });
    add('Q-r2f', 'r2: a stale main.js: electron/main.ts newer than dist-electron/electron/main.js (the marker is present)', bad('r2', ['main.js', 'is older than electron/main.ts']), { noFreshen: true, setup: () => { freshenDist(); return { undo: makeStale('electron/main.ts') }; } });
    add('Q-r2g', 'r2: the BUILT main.js missing altogether', bad('r2', ['cannot read dist-electron/electron/main.js: ENOENT']), { setup: () => ({ undo: removeFile(`${D}main.js`) }) });

    // -- r4: the earlier-question variable
    add('Q-r4a', 'r4: NATIVELY_EARLIER_QUESTION=1', bad('r4', ['NATIVELY_EARLIER_QUESTION is set ("1")', 'even for the value 0']), { env: { NATIVELY_EARLIER_QUESTION: '1' } });
    add('Q-r4b', 'r4: NATIVELY_EARLIER_QUESTION=0', bad('r4', ['NATIVELY_EARLIER_QUESTION is set ("0")']), { env: { NATIVELY_EARLIER_QUESTION: '0' } });
    add('Q-r4c', 'r4: NATIVELY_EARLIER_QUESTION set to the empty string', bad('r4', ['NATIVELY_EARLIER_QUESTION is set ("")']), { env: { NATIVELY_EARLIER_QUESTION: '' } });

    // -- g4 (fix2): NATIVELY_RD_T and the start clock: now within [T - 6 min, T + 30 min], both ends inclusive (to the second). No fixed windows.
    const tCase = (id, name, tv, expect, now) => add(id, name, expect, { env: { NATIVELY_RD_T: tv }, ...(now ? { args: { '--now': now } } : {}) });
    const CLOCK = 'is outside [T - 6 min, T + 30 min] for NATIVELY_RD_T 2026-10-07 23:00';
    tCase('G4a', 'g4: NATIVELY_RD_T unset', undefined, bad('g4', ['NATIVELY_RD_T is unset']));
    tCase('G4b', 'g4: now = T - 6 min - 1 s (22:53:59)', T_OK, badClock([CLOCK]), '2026-10-07T22:53:59+03:00');
    tCase('G4c', 'g4: now = T - 6 min exactly (22:54:00) -> GUARD OK (the lower bound is inclusive)', T_OK, ok('T 2026-10-07 23:00'), '2026-10-07T22:54:00+03:00');
    tCase('G4d', 'g4: now = T (23:00:00) -> GUARD OK', T_OK, ok('T 2026-10-07 23:00'), '2026-10-07T23:00:00+03:00');
    tCase('G4e', 'g4: now = T + 30 min exactly (23:30:00) -> GUARD OK (the upper bound is inclusive)', T_OK, ok('T 2026-10-07 23:00'), '2026-10-07T23:30:00+03:00');
    tCase('G4f', 'g4: now = T + 30 min + 1 s (23:30:01)', T_OK, badClock([CLOCK]), '2026-10-07T23:30:01+03:00');
    tCase('G4g', 'g4: now = T + 31 min (23:31)', T_OK, badClock([CLOCK]), '2026-10-07T23:31:00+03:00');
    tCase('G4h', 'g4: now = T - 7 min (22:53)', T_OK, badClock([CLOCK]), '2026-10-07T22:53:00+03:00');
    tCase('G4i', 'g4: the old window edge means nothing now: T 2026-10-08 03:00 with now 03:00 -> GUARD OK', '2026-10-08 03:00', ok('T 2026-10-08 03:00'), '2026-10-08T03:00:00+03:00');
    tCase('G4j', 'g4: a T at an hour no old window held (2026-10-07 12:00), now 12:03 -> GUARD OK', '2026-10-07 12:00', ok('T 2026-10-07 12:00'), '2026-10-07T12:03:00+03:00');
    tCase('G4k', 'g4: T 2026-10-08 03:00 with the default clock (23:01 the evening before): hours early', '2026-10-08 03:00', badClock(['is outside [T - 6 min, T + 30 min] for NATIVELY_RD_T 2026-10-08 03:00']));
    tCase('G4l', 'g4: T tomorrow evening (2026-10-08 23:00) with the default clock: a day early', '2026-10-08 23:00', badClock([CLOCK.replace('2026-10-07 23:00', '2026-10-08 23:00')]));
    tCase('G4m', 'g4: T 2026-10-06 23:00 (last night) with the default clock: a day late', '2026-10-06 23:00', badClock([CLOCK.replace('2026-10-07 23:00', '2026-10-06 23:00')]));
    tCase('G4n', 'g4: T 2026-10-05 21:00 (the eq hour T)', '2026-10-05 21:00', badClock([CLOCK.replace('2026-10-07 23:00', '2026-10-05 21:00')]));
    // fix3 F1: g4's CLOCK half runs LAST (just before 10a). A dry run outside [T - 6, T + 30] still reaches every other check, reports them first and fails only at g4;
    // any other violated check is named in its place; 10a (the .env names) is not run. now 23:31 = T + 31 min for T_OK.
    add('G4t', 'g4-clock (H1, H2, H3): the dry form outside the window with EVERYTHING else right (10a included): exit 10 (the window-only code), tag g4-clock, the night gates ran and passed, the LAST stderr line is the clock refusal', badClock([CLOCK, 'every other check passed, 10a included', 'only the start time is wrong']), { args: { '--now': '2026-10-07T23:31:00+03:00' }, stdoutContains: ['night gates script: ', 'NIGHT GATES OK'] });
    add('G4u', 'g4 last (F1): outside the window AND the commit unset -> the 10b refusal is reported, not g4', bad('10b', ['NATIVELY_FLIGHT_COMMIT is not set']), { env: { NATIVELY_FLIGHT_COMMIT: undefined }, args: { '--now': '2026-10-07T23:31:00+03:00' } });
    add('G4v', 'g4 last (F1): outside the window AND a failing night-gates stub (g2, one of the last checks) -> the g2 refusal is reported, not g4', bad('g2', ['night-gates.ps1 exited 1']), { args: { '--night-gates-script': path.join(STUBS, 'night-fail.ps1'), '--now': '2026-10-07T23:31:00+03:00' }, stdoutContains: ['NIGHT power: FAIL stub'] });
    add('G4x', 'g4 (format) stays early: an unparseable T with every later check right -> g4 format, never reaching the night gates', bad('g4', ['not a yyyy-MM-dd HH:mm local time']), { env: { NATIVELY_RD_T: '2026-10-07 23:00 ' } });
    tCase('G4o', 'g4: T 2026-10-07 23:00 with a trailing space (the cmd artifact)', '2026-10-07 23:00 ', bad('g4', ['not a yyyy-MM-dd HH:mm local time']));
    tCase('G4p', 'g4: T 2026-10-07T23:00 (ISO form)', '2026-10-07T23:00', bad('g4', ['not a yyyy-MM-dd HH:mm local time']));
    tCase('G4q', 'g4: T 2026-10-07 25:00 (impossible time)', '2026-10-07 25:00', bad('g4', ['not a yyyy-MM-dd HH:mm local time']));
    tCase('G4r', 'g4: T 2026-02-30 23:00 (impossible date)', '2026-02-30 23:00', bad('g4', ['not a yyyy-MM-dd HH:mm local time']));
    tCase('G4s', 'g4: T the launcher placeholder token', '@@T@@', bad('g4', ['not a yyyy-MM-dd HH:mm local time']));

    // -- 10b: the commit pin and the tree
    add('B1', '10b: commit unset', bad('10b', ['NATIVELY_FLIGHT_COMMIT is not set']), { env: { NATIVELY_FLIGHT_COMMIT: undefined } });
    add('B2', '10b: commit wrong (forty zeros)', bad('10b', ['MAIN HEAD is ', 'not the registered commit 0000000000000000000000000000000000000000']), { commit: '0'.repeat(40) });
    add('B2b', '10b: HEAD MOVED: the commit = the PARENT of the stub HEAD (no commit is ever made on MAIN to test this)', bad('10b', ['MAIN HEAD is ', 'not the registered commit']), { commitFn: () => headOf(STUB, 'HEAD~1') });
    add('B3', '10b: commit abbreviated (7 characters)', bad('10b', ['not a full 40-hex commit hash']), { commitFn: (h) => h.slice(0, 7) });
    add('B4', '10b: commit = the launcher placeholder token', bad('10b', ['NATIVELY_FLIGHT_COMMIT is "@@REGISTERED_HEAD_FULL_HASH@@", not a full 40-hex commit hash']), { commit: '@@REGISTERED_HEAD_FULL_HASH@@' });
    add('B5', '10b: commit with a trailing space (a cmd `set X=value ` artifact): trimmed -> GUARD OK', ok('HEAD pinned at '), { commitFn: (h) => `${h} ` });
    add('B6', '10b: tree dirty: a tracked source file under electron/ edited (a peer edit)', bad('10b', ['not clean: electron/llm/prompts.ts']), { setup: () => ({ undo: edit('electron/llm/prompts.ts', (t) => `${t}\n// cal dirt\n`) }) });
    add('B7', '10b: tree dirty: an UNTRACKED file under electron/', bad('10b', ['not clean: electron/llm/newFile.ts']), { setup: () => ({ undo: addFile('electron/llm/newFile.ts') }) });
    add('B8', '10b: tree dirty: scripts/build-electron.js edited', bad('10b', ['not clean: scripts/build-electron.js']), { setup: () => ({ undo: edit('scripts/build-electron.js', (t) => `${t}// cal dirt\n`) }) });
    add('B9', '10b: tree dirty: an untracked file under src/', bad('10b', ['not clean: src/new.tsx']), { setup: () => ({ undo: addFile('src/new.tsx') }) });
    add('B10', '10b: tree dirty: package.json edited', bad('10b', ['not clean: package.json']), { setup: () => ({ undo: edit('package.json', (t) => t.replace('0.0.0', '0.0.1')) }) });
    add('B11', '10b: the MAIN-like allowlisted dirt only (the two tracked harness files and the rotated log modified, the four untracked scratch paths, a stray root file, a tracked root doc edited) -> GUARD OK, the seven allowlisted paths named',
        ok('tree clean but for the allowlisted paths present [electron/test/golden/interview60.chains.json, electron/test/golden/interview60.report.md, natively_debug.log.1, electron/test/golden/openrouter-probes/, electron/test/golden/openrouter.probe.mjs, electron/test/golden/zai-probes/, electron/test/golden/zai.probe.mjs]'),
        { full: true, setup: () => ({ undo: seq(
            edit('electron/test/golden/interview60.chains.json', (t) => `${t}{"x":1}\n`), edit('electron/test/golden/interview60.report.md', (t) => `${t}more\n`), edit('natively_debug.log.1', (t) => `${t}more\n`),
            addFile('electron/test/golden/openrouter-probes/a.json'), addFile('electron/test/golden/openrouter.probe.mjs'), addFile('electron/test/golden/zai-probes/b.json'), addFile('electron/test/golden/zai.probe.mjs'),
            addFile('resume_prompt.txt'), edit('README.md', (t) => `${t}docs edit\n`)) }) });
    add('B12', '10b: git unusable: the stub\'s repo folder moved aside', bad('10b', ['git rev-parse HEAD failed']), { commit: '0'.repeat(40), setup: () => { fs.renameSync(stubFile('.git'), stubFile('.git-aside')); return { undo: () => fs.renameSync(stubFile('.git-aside'), stubFile('.git')) }; } });

    // -- 10a: .env names only
    const withEnv = (text) => () => ({ undo: edit('.env', () => text) });
    add('E1', '10a: .env declares NATIVELY_VERBAL_HEDGE (a dummy value): named, the value not leaked', bad('10a', ['.env declares NATIVELY_VERBAL_HEDGE ', 'remove it from .env'], ['dummy']), { setup: withEnv('UNRELATED_DUMMY_NAME=dummy-value-not-a-key\nNATIVELY_VERBAL_HEDGE=dummy-secret-value\n') });
    add('G4w', 'g4-clock after 10a (H3): outside the window AND the .env names a guarded variable -> 10a is reported (it RAN in the out-of-window dry twin), exit 1, the value not leaked', bad('10a', ['.env declares NATIVELY_VERBAL_HEDGE '], ['dummy']), { setup: withEnv('UNRELATED_DUMMY_NAME=dummy-value-not-a-key\nNATIVELY_VERBAL_HEDGE=dummy-secret-value\n'), args: { '--now': '2026-10-07T23:31:00+03:00' } });
    add('E2', '10a: .env declares NATIVELY_EARLIER_QUESTION in the `export NAME=` form (the name the launcher CLEARS in this hour)', bad('10a', ['.env declares NATIVELY_EARLIER_QUESTION'], ['dummy']), { setup: withEnv('export NATIVELY_EARLIER_QUESTION=dummy\n') });
    add('E3', '10a: .env declares NATIVELY_QUESTION_DETECTION_MODEL in the `NAME: value` form', bad('10a', ['.env declares NATIVELY_QUESTION_DETECTION_MODEL']), { setup: withEnv('NATIVELY_QUESTION_DETECTION_MODEL: dummy\n') });
    add('E4', '10a: .env declares two guarded names with CRLF line ends', bad('10a', ['.env declares NATIVELY_VERBAL_HEDGE_TRIGGER_MS, NATIVELY_GEMINI_THINKING_LEVEL'], ['dummy']), { setup: withEnv('NATIVELY_VERBAL_HEDGE_TRIGGER_MS=dummy\r\nNATIVELY_GEMINI_THINKING_LEVEL=dummy\r\n') });
    add('E5', '10a: .env absent altogether -> still GUARD OK', ok(), { setup: () => ({ undo: removeFile('.env') }) });
    add('E6', '10a: NATIVELY_QUESTION_DETECTION_MODEL set in the process environment', bad('10a', ['NATIVELY_QUESTION_DETECTION_MODEL is set']), { env: { NATIVELY_QUESTION_DETECTION_MODEL: 'dummy' } });
    add('E7', '10a: .env names NATIVELY_RD_T -> FAILED', bad('10a', ['.env declares NATIVELY_RD_T'], ['dummy']), { setup: withEnv('NATIVELY_RD_T=dummy\n') });
    add('E8', '10a: .env names NATIVELY_FLIGHT_FOCUSED -> FAILED', bad('10a', ['.env declares NATIVELY_FLIGHT_FOCUSED'], ['dummy']), { setup: withEnv('NATIVELY_FLIGHT_FOCUSED=dummy\n') });

    // -- 6, 7, 8, 3, 2, 4, 6b, 9: flight-eq's own checks, each broken once
    add('H1', '6: the hedge variable set to 1', bad('6', ['NATIVELY_VERBAL_HEDGE is set ("1")', 'even for the value 1']), { env: { NATIVELY_VERBAL_HEDGE: '1' } });
    add('H2', '6: the hedge variable set to 0', bad('6', ['NATIVELY_VERBAL_HEDGE is set ("0")']), { env: { NATIVELY_VERBAL_HEDGE: '0' } });
    add('H4', '6: the hedge variable set to the empty string', bad('6', ['NATIVELY_VERBAL_HEDGE is set ("")']), { env: { NATIVELY_VERBAL_HEDGE: '' } });
    add('H5', '6: the 09-26 build: verbalHedge.js with the OLD default (unset = off)', bad('6', ['the built default is not the hedge: "[Main] verbal hedge: off"']),
        { setup: () => ({ undo: edit(`${D}llm/verbalHedge.js`, (t) => t.replace('if (!raw || raw === "1") return true;\n  if (raw === "0") return false;', 'if (!raw || raw === "0") return false;\n  if (raw === "1") return true;')) }) });
    add('T1', '7: trigger override 1 ms', bad('7', ['the hedge trigger is 1ms, not the probed 5000ms']), { env: { NATIVELY_VERBAL_HEDGE_TRIGGER_MS: '1' } });
    add('T2', '7: trigger override junk (abc)', bad('7', ['NATIVELY_VERBAL_HEDGE_TRIGGER_MS refuses this environment']), { env: { NATIVELY_VERBAL_HEDGE_TRIGGER_MS: 'abc' } });
    add('F1', '8: follow-up parent flag on', bad('8', ['the follow-up flag is set; flight-rd flies it OFF']), { env: { NATIVELY_FOLLOWUP_PARENT: '1' } });
    add('F3', '8: the follow-up module missing from the dist', bad('8', ['dist-electron/electron/llm/followUpParent.js does not load']), { setup: () => ({ undo: removeFile(`${D}llm/followUpParent.js`) }) });
    add('O1', '3: answer-model override (gemini-3.5-flash-lite)', bad('3', ['an answer-model override is set: gemini-3.1-flash-lite resolves to gemini-3.5-flash-lite']), { env: { NATIVELY_VERBAL_PRIMARY_MODEL: 'gemini-3.5-flash-lite' } });
    add('O2', '3: thinking-level override (HIGH)', bad('3', ['the app would think at HIGH, not the shipped LOW']), { env: { NATIVELY_GEMINI_THINKING_LEVEL: 'HIGH' } });
    add('M1', '2: the build\'s default answer model changed (gemini-3.1-flash)', bad('2', ['the build\'s default answer model is gemini-3.1-flash, not gemini-3.1-flash-lite']),
        { setup: () => ({ undo: edit(`${D}LLMHelper.js`, (t) => t.replace('const GEMINI_FLASH_MODEL = "gemini-3.1-flash-lite"', 'const GEMINI_FLASH_MODEL = "gemini-3.1-flash"')) }) });
    add('M3', '2: a model module the guard requires missing from the dist (verbalPrimaryModel.js)', bad('2', ['dist-electron does not load']), { setup: () => ({ undo: removeFile(`${D}llm/verbalPrimaryModel.js`) }) });
    add('L1', '4: the 3.5-lite LOW->HIGH turn removed from the built thinking levels', bad('4', ['the gemini-3.5-flash-lite fallback would fly at a level it ignores']),
        { setup: () => ({ undo: edit(`${D}llm/geminiThinking.js`, (t) => t.replace('"gemini-3.5-flash-lite": { LOW: "HIGH" }', '"gemini-3.5-flash-lite": {}')) }) });
    add('G1', '6b: the hedge log line gone from the built LLMHelper.js', bad('6b', ['the build does not carry the hedge log line']), { setup: () => ({ undo: edit(`${D}LLMHelper.js`, replaceAll('verbal hedge: front=', 'verbal hedge: NOTHERE=')) }) });
    add('G2', '6b: streamGeminiWithHedge gone from the SOURCE', bad('6b', ['the source does not carry streamGeminiWithHedge']), { setup: () => commitVariant([['electron/LLMHelper.ts', replaceAll('streamGeminiWithHedge', 'streamGeminiWithHedgx')]]) });
    add('S9', '9: a stale build: electron/LLMHelper.ts newer than dist-electron/electron/LLMHelper.js', bad('9', ['is older than electron/LLMHelper.ts']), { noFreshen: true, setup: () => ({ undo: makeStale('electron/LLMHelper.ts') }) });

    // -- 11: ANSWER_MODELS
    const AM = "export const ANSWER_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'];";
    const am = (rep) => [['electron/test/golden/interview60.flight.mjs', (t) => { if (!t.includes(AM)) throw new Error('ANSWER_MODELS line not found'); return t.replace(AM, rep); }]];
    add('N1', '11: a Groq id added to ANSWER_MODELS', bad('11', ['ANSWER_MODELS is ["gemini-3.1-flash-lite","gemini-3.5-flash-lite","groq/llama-3.3-70b-versatile"]']), { setup: () => commitVariant(am("export const ANSWER_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'groq/llama-3.3-70b-versatile'];")) });
    add('N3', '11: ANSWER_MODELS reordered', bad('11', ['not exactly']), { setup: () => commitVariant(am("export const ANSWER_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];")) });
    add('N5', '11: interview60.flight.mjs that does not load (a syntax error)', bad('11', ['interview60.flight.mjs does not load under this environment']), { setup: () => commitVariant([['electron/test/golden/interview60.flight.mjs', (t) => `${t}\n}}}\n`]]) });

    // -- r5: the arms
    const armsCase = (id, name, v, expect) => add(id, name, expect, { env: { NATIVELY_FLIGHT_ARMS: v } });
    armsCase('Q-r5a', 'r5: NATIVELY_FLIGHT_ARMS unset (the flight would run every arm and the chains)', undefined, bad('r5', ['NATIVELY_FLIGHT_ARMS is unset, not exactly "high,low,captured-high"']));
    armsCase('Q-r5b', 'r5: arms `high,low` (the captured arm dropped)', 'high,low', bad('r5', ['NATIVELY_FLIGHT_ARMS is "high,low", not exactly']));
    armsCase('Q-r5c', 'r5: arms in the wrong order `low,high,captured-high`', 'low,high,captured-high', bad('r5', ['NATIVELY_FLIGHT_ARMS is "low,high,captured-high", not exactly']));
    armsCase('Q-r5d', 'r5: arms with a trailing space (the harness trims tags and would accept it, the guard must not)', 'high,low,captured-high ', bad('r5', ['not exactly "high,low,captured-high"']));
    armsCase('Q-r5e', 'r5: a fourth arm added', 'high,low,captured-high,captured-low', bad('r5', ['not exactly']));
    armsCase('Q-r5f', 'r5: an unknown arm tag (the harness would throw)', 'high,bogus,captured-high', bad('r5', ['not exactly']));
    armsCase('Q-r5g', 'r5: arms with a leading space', ' high,low,captured-high', bad('r5', ['not exactly']));
    add('Q-r5h', 'r5: a harness WITHOUT selectArms (the plan Task 13 edit is not in the tree)', bad('r5', ['has no selectArms / PAIRED_ARMS export']),
        { setup: () => commitVariant([['electron/test/golden/interview60.flight.mjs', replaceAll('export function selectArms(', 'function selectArmsGone(')]]) });
    add('Q-r5i', 'r5: a harness whose selectArms returns the arms in REVERSE (the variable is exactly right, the harness disagrees)', bad('r5', ['the harness\'s selectArms returns [captured-high,low,high]']),
        { setup: () => commitVariant([['electron/test/golden/interview60.flight.mjs', (t) => { const k = 'export function selectArms(arms, env) {'; if (!t.includes(k)) throw new Error('selectArms head not found'); return t.replace(k, `${k} if (env.NATIVELY_FLIGHT_ARMS) return (function reverse() { const out = []; const known = new Map(arms.map((a) => [a.tag, a])); for (const t of env.NATIVELY_FLIGHT_ARMS.split(',').reverse()) out.push(known.get(t.trim())); return out; })();\n`); }]]) });
    add('Q-r5j', 'r5: NATIVELY_FLIGHT_FOCUSED unset', bad('r5', ['NATIVELY_FLIGHT_FOCUSED is unset, not exactly "off"']), { env: { NATIVELY_FLIGHT_FOCUSED: undefined } });
    add('Q-r5k', 'r5: NATIVELY_FLIGHT_FOCUSED=on', bad('r5', ['NATIVELY_FLIGHT_FOCUSED is "on", not exactly "off"']), { env: { NATIVELY_FLIGHT_FOCUSED: 'on' } });
    add('Q-r5l', 'r5: NATIVELY_FLIGHT_FOCUSED empty string', bad('r5', ['NATIVELY_FLIGHT_FOCUSED is "", not exactly "off"']), { env: { NATIVELY_FLIGHT_FOCUSED: '' } });

    // -- 12: the cue build
    add('Q1', '12: a dist WITHOUT CUE_LINE_PREFIX', bad('12', ['the dist is not the combined cue build', 'dist-proof.mjs exit 1']), { setup: () => ({ undo: edit(`${D}llm/verbalStreamFilter.js`, replaceAll('CUE_LINE_PREFIX', 'CUE_LINE_PFX')) }) });
    add('Q2', '12: the built filter without `function trimCues`', bad('12', ['has no "function trimCues"']), { setup: () => ({ undo: edit(`${D}llm/verbalStreamFilter.js`, replaceAll('function trimCues', 'function trimCuez')) }) });
    add('Q3', '12: the SOURCE prompts.ts without a CUE_RULE declaration', bad('12', ['the source electron/llm/prompts.ts does not declare CUE_RULE']),
        { setup: () => commitVariant([['electron/llm/prompts.ts', (t) => t.replace('export const CUE_RULE =', '// CUE_RULE was removed here\nconst CUE_RULE_GONE =')]]) });
    add('Q5', '12: a dist with the CUE_RULE changed', bad('12', ['dist-proof.mjs exit 1']),
        { setup: () => ({ undo: edit(`${D}llm/prompts.js`, (t) => { const i = t.indexOf('const CUE_RULE = `'); if (i < 0) throw new Error('CUE_RULE not found'); return `${t.slice(0, i)}const CUE_RULE = \`CHANGED ${t.slice(i + 'const CUE_RULE = `'.length)}`; }) }) });

    // -- r3: the router build
    const noNeedle = (needle) => ({ setup: () => ({ undo: edit(`${D}audio/LiveRouterSession.js`, replaceAll(needle, needle.slice(0, -1) + '#')) }) });
    add('D1', 'r3: LiveRouterSession.js without ROUTER_SHAS_OK', bad('r3', ['does not carry ROUTER_SHAS_OK']), noNeedle('ROUTER_SHAS_OK'));
    add('D2', 'r3: LiveRouterSession.js without the model id gemini-3.8-live', bad('r3', ['does not carry the router model id']), noNeedle('gemini-3.8-live'));
    add('D3', 'r3: LiveRouterSession.js without the INSTRUCTION sha256 constant', bad('r3', ['does not carry the INSTRUCTION sha256 constant']), noNeedle(INSTRUCTION_SHA));
    add('D4', 'r3: LiveRouterSession.js without the BLOCK_B sha256 constant', bad('r3', ['does not carry the BLOCK_B sha256 constant']), noNeedle(BLOCK_B_SHA));
    add('D5', 'r3: routerArbiter.js missing from the dist', bad('r3', ['the built dist-electron/electron/services/routerArbiter.js is missing']), { setup: () => ({ undo: removeFile(`${D}services/routerArbiter.js`) }) });
    add('D6', 'r3: routeReader.js missing from the dist', bad('r3', ['the built dist-electron/electron/services/routeReader.js is missing']), { setup: () => ({ undo: removeFile(`${D}services/routeReader.js`) }) });
    add('D7', 'r3: the source routeReader.ts missing (deleted in a COMMIT: a deleted tracked file would be caught by the tree check first)', bad('r3', ['the source electron/services/routeReader.ts is missing']),
        { setup: () => { const base = headOf(STUB); fs.rmSync(stubFile('electron/services/routeReader.ts')); gitStub('add', '-A'); gitStubCommit('cal: delete routeReader.ts'); return { commit: headOf(STUB), undo: () => { gitStub('reset', '--hard', '-q', base); } }; } });
    add('D8', 'r3: a stale router dist: routerArbiter.ts newer than routerArbiter.js (all text present)', bad('r3', ['routerArbiter.js', 'is older than electron/services/routerArbiter.ts']), { noFreshen: true, setup: () => { freshenDist(); return { undo: makeStale('electron/services/routerArbiter.ts') }; } });
    add('D9', 'r3: a stale router dist: LiveRouterSession.ts newer than its dist', bad('r3', ['LiveRouterSession.js', 'is older than electron/audio/LiveRouterSession.ts']), { noFreshen: true, setup: () => { freshenDist(); return { undo: makeStale('electron/audio/LiveRouterSession.ts') }; } });
    add('D10', 'r3: a stale router dist: routeReader.ts newer than its dist', bad('r3', ['routeReader.js', 'is older than electron/services/routeReader.ts']), { noFreshen: true, setup: () => { freshenDist(); return { undo: makeStale('electron/services/routeReader.ts') }; } });
    add('D11', 'r3: a one-character change inside the INSTRUCTION sha constant', bad('r3', ['does not carry the INSTRUCTION sha256 constant']), { setup: () => ({ undo: edit(`${D}audio/LiveRouterSession.js`, replaceAll(INSTRUCTION_SHA, `0${INSTRUCTION_SHA.slice(1)}`)) }) });

    // -- r6: the smoke result and the context sha
    const res = (n) => ({ args: { '--smoke-result': path.join(STUBS, n) } });
    add('P1', 'r6: NATIVELY_ROUTER_CONTEXT_SHA12 unset', bad('r6', ['NATIVELY_ROUTER_CONTEXT_SHA12 is unset, not 12 lowercase hex characters']), { env: { NATIVELY_ROUTER_CONTEXT_SHA12: undefined } });
    add('P2', 'r6: the launcher placeholder token', bad('r6', ['NATIVELY_ROUTER_CONTEXT_SHA12 is "@@CONTEXT_SHA12@@"']), { env: { NATIVELY_ROUTER_CONTEXT_SHA12: '@@CONTEXT_SHA12@@' } });
    add('P3', 'r6: 11 characters', bad('r6', ['not 12 lowercase hex characters']), { env: { NATIVELY_ROUTER_CONTEXT_SHA12: CTX.slice(0, 11) } });
    add('P4', 'r6: uppercase hex', bad('r6', ['not 12 lowercase hex characters']), { env: { NATIVELY_ROUTER_CONTEXT_SHA12: CTX.toUpperCase() } });
    add('P5', 'r6: the smoke result is absent', bad('r6', ['does not exist - the smoke has not run']), res('result-none.md'));
    add('P6', 'r6: the smoke result holds a DIFFERENT context_sha12', bad('r6', [`does not hold "context_sha12=${CTX}"`]), res('result-other-sha.md'));
    add('P7', 'r6: the smoke result holds the sha but not labelled context_sha12=', bad('r6', [`does not hold "context_sha12=${CTX}"`]), res('result-no-label.md'));
    add('P8', 'r6: the smoke result holds the sha as the PREFIX of a longer hex string', bad('r6', [`does not hold "context_sha12=${CTX}"`]), res('result-longer-sha.md'));
    add('P9', 'r6: an empty smoke result', bad('r6', [`does not hold "context_sha12=${CTX}"`]), res('result-empty.md'));

    // -- r7: the ledger (need 149 / 60 x 1.5 = 224 / 90)
    const led = (n, now) => ({ args: { '--ledger-script': path.join(STUBS, n), ...(now ? { '--now': now } : {}) } });
    add('L-a', 'r7: headroom 223 on 3.5-lite (one below 224)', bad('r7', ['headroom on gemini-3.5-flash-lite is 223', 'below 224 = 1.5 x the 149', 'the run moves to the 23:00 fallback']), led('ledger-h35-223.mjs'));
    add('L-b', 'r7: headroom 224 on 3.5-lite -> GUARD OK (the bound is inclusive)', ok('quota headroom 224 on 3.5-lite (>= 224)'), led('ledger-h35-224.mjs'));
    add('L-c', 'r7: headroom 89 on 3.1-lite (one below 90)', bad('r7', ['headroom on gemini-3.1-flash-lite is 89', 'below 90 = 1.5 x the 60']), led('ledger-h31-89.mjs'));
    add('L-d', 'r7: headroom 90 on 3.1-lite -> GUARD OK (the bound is inclusive)', ok('and 90 on 3.1-lite (>= 90)'), led('ledger-h31-90.mjs'));
    add('L-e', 'r7: negative headroom on 3.5-lite (a day already over its quota)', bad('r7', ['headroom on gemini-3.5-flash-lite is -112']), led('ledger-h35-neg.mjs'));
    add('L-f', 'r7: a STALE ledger (its reset reads 2026-10-06T07:00Z while now is 2026-10-07 23:01 TST, whose quota day began 2026-10-07T07:00Z; the numbers would otherwise pass)', bad('r7', ['reads the quota day starting 2026-10-06T07:00:00.000Z', 'is 2026-10-07T07:00:00.000Z', 'the ledger is stale']), led('ledger-stale.mjs'));
    add('L-g', 'r7: a ledger that prints no LEDGER-SUMMARY line', bad('r7', ['printed no LEDGER-SUMMARY line in its known shape']), led('ledger-noline.mjs'));
    add('L-h', 'r7: a LEDGER-SUMMARY line with non-numeric fields', bad('r7', ['printed no LEDGER-SUMMARY line in its known shape']), led('ledger-badshape.mjs'));
    add('L-i', 'r7: a ledger that prints a good line but exits 1', bad('r7', ['the quota ledger exited 1, not 0']), led('ledger-exit1.mjs'));
    add('L-j', 'r7: a ledger script that does not exist', bad('r7', ['no-such-ledger.mjs does not exist - the headroom cannot be read']), led('no-such-ledger.mjs'));
    add('L-k', 'r7: the same ledger on the MORNING fallback clock (now 2026-10-07 07:55 TST = 04:55Z, T 08:00): the reset is the day before, and the stub derives it the same way -> GUARD OK', ok('quota headroom 400'), { env: { NATIVELY_RD_T: '2026-10-07 08:00' }, ...led('ledger-ok.mjs', '2026-10-07T07:55:00+03:00') });

    // -- r7, fix1: the script-call count and the coverage of the app logs
    const ex = (id, name, v, expect) => add(id, name, expect, { env: { NATIVELY_RD_EXTRA_REQUESTS: v } });
    ex('L-m', 'r7 (I1): NATIVELY_RD_EXTRA_REQUESTS unset: the requests made by scripts are in no app log, so the arming step must supply the count', undefined, bad('r7', ['NATIVELY_RD_EXTRA_REQUESTS is unset, not a whole number', 'in no app log']));
    ex('L-n', 'r7 (I1): the launcher placeholder token', '@@EXTRA_REQUESTS@@', bad('r7', ['NATIVELY_RD_EXTRA_REQUESTS is "@@EXTRA_REQUESTS@@"']));
    ex('L-o', 'r7 (I1): not a whole number (abc)', 'abc', bad('r7', ['NATIVELY_RD_EXTRA_REQUESTS is "abc"']));
    ex('L-p', 'r7 (I1): a trailing space (a cmd set artifact)', '12 ', bad('r7', ['NATIVELY_RD_EXTRA_REQUESTS is "12 "']));
    ex('L-q', 'r7 (I1): a negative number', '-1', bad('r7', ['NATIVELY_RD_EXTRA_REQUESTS is "-1"']));
    ex('L-r', 'r7 (I1): 0 is a valid count (no script requests): GUARD OK', '0', ok('quota headroom 400 on 3.5-lite'));
    add('L-s', 'r7 (I1): a ledger that says complete=no (the oldest log stamp is after the reset: the start of the quota day was rotated away)', bad('r7', ['says complete=no', 'rotated out of the app logs']), led('ledger-incomplete.mjs'));
    add('L-t', 'r7 (I1): a ledger that found no app log at all (oldest=none)', bad('r7', ['found no app log at all']), led('ledger-nolog.mjs'));
    add('L-u', 'r7 (I1): a ledger that does not add the script requests (prints extra=unset although it was given 12)', bad('r7', ['read extra=unset, not the 12 it was given']), led('ledger-ignores-extra.mjs'));

    // -- 13: knowledge mode in the persisted settings
    add('W1', '13: --settings the -off stub (knowledgeMode false)', bad('13', ['knowledge mode is not ON: knowledgeMode is false (the boolean true is required)', 'settings-off.json (mtime ']), withSettings('settings-off.json'));
    add('W2', '13: no knowledgeMode key', bad('13', ['knowledgeMode is absent (main.ts restores nothing: knowledge mode OFF)']), withSettings('settings-absent.json'));
    add('W4', '13: a settings file that is not JSON: FAILED, and the file\'s text is not quoted', bad('13', ['cannot read the persisted settings', 'not valid JSON'], ['not json']), withSettings('settings-broken.json'));
    add('W5', '13: a missing settings file', bad('13', ['ENOENT']), withSettings('settings-missing.json'));
    add('W6', '13: knowledgeMode the STRING "true" is not the boolean true', bad('13', ['knowledgeMode is "true" (the boolean true is required)']), withSettings('settings-string-true.json'));
    add('W7', '13: a settings file that is a JSON array', bad('13', ['is not a JSON object']), withSettings('settings-array.json'));
    add('W8', '13 default path: APPDATA = a folder whose natively\\settings.json is ON, no --settings -> GUARD OK', ok('knowledgeMode = true in ', 'appdata'), { args: { '--settings': undefined }, env: { APPDATA: path.join(STUBS, 'appdata', 'on') } });
    add('W9', '13 default path: APPDATA = a folder whose settings are OFF -> FAILED', bad('13', ['knowledgeMode is false']), { args: { '--settings': undefined }, env: { APPDATA: path.join(STUBS, 'appdata', 'off') } });
    add('W10', '13 default path: APPDATA unset and no --settings', bad('13', ['APPDATA is not set']), { args: { '--settings': undefined }, env: { APPDATA: undefined } });

    // -- g2: the night gates
    const night = (n, extra = {}) => ({ args: { '--night-gates-script': path.join(STUBS, n) }, ...extra });
    add('N-a', 'g2: a night-gates stub exiting 1 (power FAIL) -> GUARD FAILED naming it, its lines echoed to stdout', bad('g2', ['night-gates.ps1 exited 1: NIGHT GATES FAILED (1): power']), night('night-fail.ps1', { stdoutContains: ['NIGHT power: FAIL stub'] }));
    add('N-b', 'g2: a night-gates stub that exits 0 but whose last line is not NIGHT GATES OK', bad('g2', ['exited 0 but its last line is "NIGHT standby-ac: OK stub", not "NIGHT GATES OK"']), night('night-noline.ps1'));
    add('N-c', 'g2: a night-gates script that does not exist', bad('g2', ['no-such-night.ps1 does not exist - the night gates cannot be read']), night('no-such-night.ps1'));
    add('N-d', 'g2: the REAL night-gates.ps1 through its own -FakeJson (standby 900 s): the real FAIL lines carry through the child', bad('g2', ['night-gates.ps1 exited 1: NIGHT GATES FAILED (1): standby-ac']), night('night-real-fake.ps1', { stdoutContains: ['NIGHT standby-ac: FAIL'] }));
    add('N-e', 'g2: a night-gates stub that passes -> GUARD OK and the stub\'s path printed', ok('night gates OK'), night('night-ok.ps1', { stdoutContains: ['night gates script: ', 'night-ok.ps1', 'NIGHT GATES OK'] }));

    // -- g5: the precheck stamp: now = T + 1 min unless the case says otherwise
    const pcase = (id, name, file, expect, extra = {}) => { const { args: xa, ...rest } = extra; add(id, name, expect, { args: { ...pre(file), ...(xa ?? {}) }, ...rest }); };
    pcase('V1', 'g5: the precheck file missing', 'pre-none.txt', bad('g5', ['does not exist - the precheck task has not run']));
    pcase('V2', 'g5: a stamp 2 h before T', 'pre-ok-2h-old.txt', bad('g5', ['is older than T - 10 min']));
    pcase('V3', 'g5: the file ends with PRECHECK FAILED', 'pre-failed.txt', bad('g5', ['does not end with a PRECHECK OK line']));
    pcase('V5', 'g5: the stamp T - 7 with now = T + 11 min', 'pre-ok-t-7.txt', bad('g5', ['is later than T + 10 min']), { args: { '--now': '2026-10-07T23:11:00+03:00' } });
    pcase('V6', 'g5: the same stamp with now = T + 10 min -> accepted (the bound is inclusive)', 'pre-ok-t-7.txt', ok('PRECHECK ACCEPTED'), { args: { '--now': '2026-10-07T23:10:00+03:00' } });
    pcase('V7', 'g5: a stamp at exactly T - 10 min -> accepted', 'pre-ok-t-10.txt', ok('PRECHECK ACCEPTED 2026-10-07T22:50:00+03'));
    pcase('V8', 'g5: a stamp at T - 10 min - 1 s -> FAILED', 'pre-ok-t-10-1s.txt', bad('g5', ['is older than T - 10 min']));
    pcase('V9', 'g5: a stamp AFTER now (a stamp from the future)', 'pre-ok-future.txt', bad('g5', ['lies after now']));
    pcase('V10', 'g5: a PRECHECK OK that is NOT the last line (a PRECHECK FAILED follows)', 'pre-ok-then-failed.txt', bad('g5', ['does not end with a PRECHECK OK line']));
    pcase('V11', 'g5: a PRECHECK OK followed by a later gate line (the verdict must be last)', 'pre-ok-then-more.txt', bad('g5', ['does not end with a PRECHECK OK line']));
    pcase('V12', 'g5: a stamp in the wrong format', 'pre-ok-badfmt.txt', bad('g5', ['is not yyyy-MM-ddTHH:mm:ss+03']));
    pcase('V13', 'g5: PRECHECK OK with no stamp', 'pre-ok-nostamp.txt', bad('g5', ['does not end with a PRECHECK OK line']));
    pcase('V14', 'g5: an empty precheck file', 'pre-empty.txt', bad('g5', ['does not end with a PRECHECK OK line']));
    pcase('V15', 'g5: --now junk', 'pre-ok-t-7.txt', bad('usage', ['--now junk is not an ISO instant']), { args: { '--now': 'junk' } });
    add('V16', 'g5: the DRY form (no --require-precheck) with NO precheck file at all -> GUARD OK (the dry twin must run before any precheck exists)', ok('precheck not required (dry twin)'), { args: { '--precheck-file': path.join(STUBS, 'pre-none.txt') } });

    // -- the guard's own failure modes
    add('I1', 'a built module whose shape changed (geminiThinking.js no longer exports thinkingLevelForModel): the guard\'s own crash ends as ONE named line', bad('internal', ['the guard itself crashed', 'thinkingLevelForModel is not a function']),
        { setup: () => ({ undo: edit(`${D}llm/geminiThinking.js`, (t) => t.replace(/,\s*thinkingLevelForModel: \(\) => thinkingLevelForModel\s*\}\);/, '\n});')) }) });
    add('Y1', 'dist-proof child that outlives its timeout (a copy of the guard with the 120 s timeout cut to 1 ms): a named failure', bad('12', ['could not run', 'ETIMEDOUT']), { layout: 'mutant-timeout-dp' });
    add('Y2', 'git rev-parse that outlives its timeout (cut to 1 ms)', bad('10b', ['git rev-parse HEAD failed', 'ETIMEDOUT']), { layout: 'mutant-timeout-revparse' });
    add('Y3', 'the ledger child that outlives its timeout (cut to 1 ms)', bad('r7', ['could not run', 'ETIMEDOUT']), { layout: 'mutant-timeout-ledger' });
    add('Y4', 'the night-gates child that outlives its timeout (cut to 1 ms)', bad('g2', ['could not run', 'ETIMEDOUT']), { layout: 'mutant-timeout-night' });
    add('Z1', 'usage: an unknown argument', { exit: 1, line: /^GUARD FAILED: \(usage\) unknown argument\(s\): --bogus/, contains: [], notContains: [] }, { rawArgs: ['--bogus'] });
    return C;
}

function mainCases(ctx) {
    const C = [];
    const add = (id, name, expect, o = {}) => C.push({ where: 'main', id, name, expect, args: { '--settings': settingsFile('settings-on.json') }, ...o });
    add('X1', 'INFORMATION, not a gate: MAIN\'s root with the true environment today. MAIN has neither the live40 roster nor the router build, so the FIRST violated check is r1 (the roster file does not know live40); the reading changes the day the build lands',
        { exit: 1, line: /^GUARD FAILED: \(r1\) roster\.mjs does not load under this environment/, contains: [], notContains: [] }, { commit: ctx.mainHead, info: true });
    add('X2', 'INFORMATION, not a gate: MAIN\'s root with the true environment. The router build has not landed in MAIN, so r2 (the built main.js has no `[Router] flag` line) or an earlier check reads FAILED today; the reading changes the day the build lands',
        { exit: 1, line: /^GUARD (FAILED: \((r1|r2|r3|r5|r6|g4|10b|9|11|12)\) |OK: )/, contains: [], notContains: [] }, { commit: ctx.mainHead, info: true, lenient: true });
    return C;
}

// ---- running -----------------------------------------------------------------------------------------------------------------
function childEnv(over, commit) {
    const env = { ...process.env };
    for (const k of Object.keys(env)) if (/^(NATIVELY_|I60_|RD_)/i.test(k)) delete env[k];      // the launcher's clean slate
    Object.assign(env, { NATIVELY_STT_PROVIDER: 'deepgram', NATIVELY_LIVE_ROUTER: '1', NATIVELY_ROSTER: 'live40', NATIVELY_FLIGHT_ARMS: 'high,low,captured-high', NATIVELY_FLIGHT_FOCUSED: 'off', NATIVELY_ROUTER_CONTEXT_SHA12: CTX, NATIVELY_RD_EXTRA_REQUESTS: '12', NATIVELY_RD_T: T_OK });
    if (commit !== undefined) env.NATIVELY_FLIGHT_COMMIT = commit;
    Object.assign(env, over ?? {});
    for (const [k, v] of Object.entries(env)) if (v === undefined) delete env[k];
    return env;
}
function argvOf(c) {
    if (c.rawArgs) return c.rawArgs;
    const a = { ...baseArgs(), ...(c.args ?? {}) };
    const out = [];
    for (const [k, v] of Object.entries(a)) { if (v === undefined) continue; if (v === true) out.push(k); else out.push(k, v); }
    return out;
}
function runGuard(c, cwd, guardPath) {
    const commit = 'commit' in c ? c.commit : (c.commitFn ? c.commitFn(headOf(cwd)) : headOf(cwd));
    return spawnSync(process.execPath, [guardPath, ...argvOf(c)], { cwd, env: childEnv(c.env, commit), encoding: 'utf8', timeout: 180000 });
}
const clip = (s, n) => (s.length > n ? `${s.slice(0, n)} ...[${s.length - n} more chars]` : s);

function judge(c, r) {
    const stdout = (r.stdout ?? '').trim();
    const errLines = (r.stderr ?? '').trim().split(/\r?\n/);
    let line;
    if (c.expect.exit === 0) line = stdout.split(/\r?\n/).find((l) => l.startsWith('GUARD OK: '));
    else line = errLines[errLines.length - 1];
    if (c.expect.exit === 1 && c.lenient && r.status === 0) line = stdout.split(/\r?\n/).find((l) => l.startsWith('GUARD OK: '));
    const why = [];
    const lenientOk = c.lenient && r.status === 0;
    if (r.status !== c.expect.exit && !lenientOk) why.push(`exit ${r.status}, wanted ${c.expect.exit}`);
    if (!c.expect.line.test(line ?? '')) why.push(`line does not match ${c.expect.line}`);
    for (const s of c.expect.contains) if (!(line ?? '').includes(s)) why.push(`missing ${JSON.stringify(s)}`);
    for (const s of c.expect.notContains) if ((line ?? '').includes(s)) why.push(`leaks ${JSON.stringify(s)}`);
    for (const s of c.stdoutContains ?? []) if (!stdout.includes(s)) why.push(`stdout lacks ${JSON.stringify(s)}`);
    if (c.expect.exit !== 0 && !lenientOk && /GUARD OK/.test(stdout)) why.push('printed GUARD OK although it failed');
    if (c.expect.exit !== 0 && !lenientOk && errLines.length !== 1) why.push(`stderr has ${errLines.length} lines (a named failure is exactly one line)`);
    return { line, why };
}

const out = [];
const log = (s = '') => { out.push(s); console.log(s); };
const results = [];

function runCases(title, cases, cwd, { guardPath = GUARD, layouts = {}, quiet = false } = {}) {
    if (title) log(title);
    const verdicts = [];
    for (const c0 of cases) {
        let c = c0;
        let handle = {};
        if (cwd === STUB && !c.noFreshen) freshenDist();
        if (c.setup) handle = c.setup() ?? {};
        if (handle.commit) c = { ...c, commit: handle.commit };
        if (cwd === STUB && c.noFreshen !== true) freshenDist();
        const g = c.layout ? layouts[c.layout] : guardPath;
        if (!g) throw new Error(`calibration bug: case ${c.id} names layout ${c.layout}, which was not built`);
        let r;
        try { r = runGuard(c, cwd, g); } finally { if (handle.undo) handle.undo(); }
        const { line, why } = judge(c, r);
        const good = why.length === 0;
        verdicts.push({ id: c.id, good, line });
        if (!quiet) {
            results.push({ id: c.id, good, info: !!c.info });
            log(`${good ? 'ok  ' : (c.info ? 'INFO' : 'BAD ')} ${c.id.padEnd(6)} ${c.name}`);
            log(`      exit ${r.status} :: ${clip(line ?? '(no line)', c.full ? 4000 : 600)}`);
            if (!good) log(`      NOT AS EXPECTED: ${why.join('; ')}`);
        }
    }
    if (title) log('');
    return verdicts;
}

// ---- main --------------------------------------------------------------------------------------------------------------------
fs.mkdirSync(CAL, { recursive: true });
buildStub();
writeStubs();
const ctx = { mainHead: headOf(MAIN), mainParent: headOf(MAIN, 'HEAD~1') };
fs.rmSync(LAYOUT, { recursive: true, force: true });
const layouts = {
    faithful: buildLayout('faithful'),
    'mutant-timeout-dp': buildLayout('mutant-timeout-dp', { mutate: (g) => g.replace("cwd: PROJ, timeout: 120000 });\nconst VERDICT", 'cwd: PROJ, timeout: 1 });\nconst VERDICT') }),
    'mutant-timeout-revparse': buildLayout('mutant-timeout-revparse', { mutate: (g) => g.replace("stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 }).trim();", "stdio: ['ignore', 'pipe', 'pipe'], timeout: 1 }).trim();") }),
    'mutant-timeout-ledger': buildLayout('mutant-timeout-ledger', { mutate: (g) => g.replace("{ encoding: 'utf8', timeout: 120000 });\nif (lg.error)", "{ encoding: 'utf8', timeout: 1 });\nif (lg.error)") }),
    'mutant-timeout-night': buildLayout('mutant-timeout-night', { mutate: (g) => g.replace("'-At', rdT], { encoding: 'utf8', cwd: PROJ, timeout: 120000 });", "'-At', rdT], { encoding: 'utf8', cwd: PROJ, timeout: 1 });") }),
};
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const faithfulOk = sha(layouts.faithful) === sha(GUARD);

log('guard-rd.mjs calibration (plan Task 18 step 3; guard-eq-cal.mjs\'s pattern)');
log('');
log('SETUP');
log(`  guard under test: ${GUARD} (the real file, run as a child; cwd = the stub tree or MAIN's root; node ${process.version}); sha256/12 ${sha(GUARD).slice(0, 12)}`);
log(`  stub tree: ${STUB} - a throwaway git repo (never MAIN) built from REAL files: MAIN's LLMHelper, prompts and main sources and the WHOLE dist-electron (HEAD ${ctx.mainHead.slice(0, 7)}, read only); the live-router-d worktree's roster, live40 questions and interview60.flight.mjs (selectArms), read only; and SYNTHETIC router files (LiveRouterSession, routerArbiter, routeReader as .ts and .js, plus a [Router] flag line appended to the stub's main.js), because the router build has not landed in MAIN. Stub base commit ${headOf(STUB, 'HEAD~1').slice(0, 7)}, second ${headOf(STUB).slice(0, 7)}`);
log(`  MAIN: ${MAIN} (HEAD ${ctx.mainHead}, its parent ${ctx.mainParent}); MAIN is only read`);
log(`  layout mirror ${LAYOUT}: SP-shaped folders holding COPIES of the guard; the faithful copy is ${faithfulOk ? 'byte-identical to the guard (sha256 equal)' : 'NOT identical to the guard (BAD)'}`);
log(`  every case: the child inherits this session's environment minus every NATIVELY_*, I60_* and RD_* name (the launcher's clean slate), plus NATIVELY_STT_PROVIDER=deepgram, NATIVELY_LIVE_ROUTER=1, NATIVELY_ROSTER=live40, NATIVELY_FLIGHT_ARMS=high,low,captured-high, NATIVELY_FLIGHT_FOCUSED=off, NATIVELY_ROUTER_CONTEXT_SHA12=${CTX}, NATIVELY_RD_T=${T_OK}, NATIVELY_FLIGHT_COMMIT=<the stub HEAD>, and the options --settings <the -on stub> --smoke-result <a stub holding context_sha12=${CTX}> --night-gates-script <a passing stub> --ledger-script <a stub: headroom 400 / 450> --now ${NOW_OK} unless the case says otherwise; dist-proof.mjs is the REAL script run as the guard's child`);
log('  a case counts as ok only if the exit code, the named check tag, the wanted message fragments (and the unwanted ones: no value is leaked) all read as expected, and a failing guard printed exactly one stderr line and no GUARD OK');
log('  NOT covered here: the real night-gates.ps1 reading this machine (the dry run does), the real ledger over the real logs on the day (informational case X3), the app process and the router connection (the smoke and the run\'s preflight)');
log('');
results.push({ id: 'layout', good: faithfulOk });

const stubList = stubCases();
// `--only A1,B2` (development aid): run just those stub cases, no files written, no mutants
if (process.argv.includes('--only')) {
    const ids = process.argv[process.argv.indexOf('--only') + 1].split(',');
    runCases('ONLY', stubList.filter((c) => ids.includes(c.id)), STUB, { layouts });
    process.exit(results.some((x) => !x.good) ? 1 : 0);
}
runCases('STUB TREE CASES (each breaks one premise of the correct environment A1)', stubList, STUB, { layouts });
runCases('AGAINST MAIN\'S ROOT (MAIN\'s real tree and dist; read only)', mainCases(ctx), MAIN);
// X3: the REAL ledger as the guard's child: on the real logs it must parse (informational: the numbers depend on the day)
runCases('THE REAL LEDGER (informational: the shape the guard parses, over the real logs, with --now in the stub\'s future so the reading is deterministic)', [
    { where: 'stub', id: 'X3', name: 'the stub tree with the REAL SP\\quota-ledger-today.mjs and --now 2026-10-07T20:00:00Z (23:00 TST): the guard parses its LEDGER-SUMMARY and the headroom reads full (no log line is that new)', expect: ok('quota headroom 488 on 3.5-lite (>= 224) and 488 on 3.1-lite (>= 90) from the ledger reset 2026-10-07T07:00:00.000Z'), args: { '--ledger-script': path.join(SP, 'quota-ledger-today.mjs'), '--now': '2026-10-07T20:00:00Z' }, info: true },
], STUB);
runCases('WRONG FOLDER (the launcher\'s own folder guard exits 9 before the guard; if it were run anyway)', [
    { where: 'wrong', id: 'Z2', name: 'the guard run with cwd = LAB\\flight (not a checkout): the roster import fails, by name', expect: bad('r1', ['roster.mjs does not load under this environment']), commit: '0'.repeat(40) },
], HERE);

// the mutation suite (rule 8) -------------------------------------------------------------------------------------------
const MUTANTS = [
    ['r1-roster-name-not-checked', ["if (R.ROSTER_NAME !== 'live40') fail(", 'if (false) fail('], ['R1a', 'R1b']],
    ['r1-count-not-checked', ['if (R.INTERVIEW.length !== 47) fail(', 'if (false) fail('], ['R1e']],
    ['r2-flag-not-exact', ["if (routerVar !== '1') fail(", 'if (false) fail('], ['Q-r2a', 'Q-r2b', 'Q-r2c', 'Q-r2d']],
    ['r2-startup-line-not-checked', ["if (!readText('r2', mainJs).includes(ROUTER_FLAG_LINE)) fail(", 'if (false) fail('], ['Q-r2e']],
    ['r2-staleness-not-checked', ["if (dm < sm) fail('r2',", "if (false) fail('r2',"], ['Q-r2f']],
    ['r4-variable-not-checked', ['if (eqVar !== undefined) fail(', 'if (false) fail('], ['Q-r4a', 'Q-r4b', 'Q-r4c']],
    ['g4-unparseable-allowed', ['if (!Number.isFinite(tMs)) fail(', 'if (false) fail('], ['G4a', 'G4o', 'G4p', 'G4q', 'G4r', 'G4s']],
    ['g4-window-exit-code-1 (H1: the window-only code lost)', ['const EXIT_WINDOW = 10;', 'const EXIT_WINDOW = 1;'], ['G4b', 'G4f', 'G4g', 'G4h', 'G4t']],
    ['g4-clock-tag-reverted-to-g4 (H2)', ["fail('g4-clock'", "fail('g4'"], ['G4b', 'G4f', 'G4t']],
    ['g4-clock-before-10a (H3)', ['// 10a. NAMES ONLY, never values', "if (nowMs < tMs - START_EARLY_MIN * 60000 || nowMs > tMs + START_LATE_MIN * 60000) fail('g4-clock', 'early', EXIT_WINDOW);\n// 10a. NAMES ONLY, never values"], ['G4w']],
    ['g4-clock-not-checked', ['if (nowMs < tMs - START_EARLY_MIN * 60000 || nowMs > tMs + START_LATE_MIN * 60000) fail(', 'if (false) fail('], ['G4b', 'G4f', 'G4g', 'G4h', 'G4k', 'G4l', 'G4m', 'G4n']],
    ['g4-clock-also-run-early (right after the format check, before 6b)', ['const tMs = parseT(rdT);', 'const tMs = parseT(rdT);\nif (Number.isFinite(tMs) && (nowMs < tMs - START_EARLY_MIN * 60000 || nowMs > tMs + START_LATE_MIN * 60000)) fail(\'g4\', \'early\');'], ['G4u', 'G4v', 'G4w']],
    ['g4-early-edge-6-to-7', ['START_EARLY_MIN = 6,', 'START_EARLY_MIN = 7,'], ['G4b', 'G4h']],
    ['g4-early-edge-6-to-5', ['START_EARLY_MIN = 6,', 'START_EARLY_MIN = 5,'], ['G4c']],
    ['g4-late-edge-30-to-31', ['START_LATE_MIN = 30;', 'START_LATE_MIN = 31;'], ['G4f']],
    ['g4-late-edge-30-to-29', ['START_LATE_MIN = 30;', 'START_LATE_MIN = 29;'], ['G4e']],
    ['g4-early-bound-exclusive', ['nowMs < tMs - START_EARLY_MIN * 60000', 'nowMs <= tMs - START_EARLY_MIN * 60000'], ['G4c']],
    ['g4-late-bound-exclusive', ['nowMs > tMs + START_LATE_MIN * 60000', 'nowMs >= tMs + START_LATE_MIN * 60000'], ['G4e']],
    ['g4-only-early-side-checked', ['|| nowMs > tMs + START_LATE_MIN * 60000) fail(', ') fail('], ['G4f', 'G4g', 'G4m']],
    ['g4-only-late-side-checked', ['if (nowMs < tMs - START_EARLY_MIN * 60000 ||', 'if ('], ['G4b', 'G4h', 'G4k', 'G4l']],
    ['r5-variable-not-exact (the harness trims, so only the spaced values can tell)', ['if (armsVar !== ARMS_WANT) fail(', 'if (false) fail('], ['Q-r5d', 'Q-r5g']],
    ['r5-selectArms-export-not-required', ["if (typeof flightMjs.selectArms !== 'function' ||", 'if (false &&'], ['Q-r5h']],
    ['r5-selectArms-order-not-checked', ["if (selectedArms.join(',') !== ARMS_WANT) fail(", 'if (false) fail('], ['Q-r5i']],
    ['r5-focused-not-checked', ["if (focusedVar !== 'off') fail(", 'if (false) fail('], ['Q-r5j', 'Q-r5k', 'Q-r5l']],
    ['r3-text-not-checked', ['if (!sessionJs.includes(needle)) fail(', 'if (false) fail('], ['D1', 'D2', 'D3', 'D4', 'D11']],
    ['r3-staleness-not-checked', ["if (dm < sm) fail('r3',", "if (false) fail('r3',"], ['D8', 'D9', 'D10']],
    ['r3-dist-missing-ignored', ["catch (e) { fail('r3', `the built dist-electron/electron/${rel}.js is missing: ${e.code ?? e.message}`); }", 'catch (e) { dm = Infinity; }'], ['D5', 'D6']],
    ['r3-source-missing-ignored', ["catch (e) { fail('r3', `the source electron/${rel}.ts is missing: ${e.code ?? e.message}`); }", 'catch (e) { sm = 0; }'], ['D7']],
    ['r6-variable-not-checked', ["if (!/^[0-9a-f]{12}$/.test(ctxVar ?? '')) fail(", 'if (false) fail('], ['P1', 'P2', 'P3', 'P4']],
    ['r6-result-not-required', ['if (!fs.existsSync(SMOKE_RESULT)) fail(', 'if (false) fail('], ['P5']],
    ['r6-content-not-checked', ['if (!new RegExp(`context_sha12=', 'if (false && !new RegExp(`context_sha12='], ['P6', 'P7', 'P8', 'P9']],
    ['r6-longer-hex-allowed', ['(?![0-9a-f])`', '`'], ['P8']],
    ['r7-ledger-not-required', ['if (!fs.existsSync(LEDGER)) fail(', 'if (false) fail('], ['L-j']],
    ['r7-exit-ignored', ['if (lg.status !== 0) fail(', 'if (false) fail('], ['L-i']],
    ['r7-shape-not-required', ['if (!summary) fail(', 'if (false) fail('], ['L-g', 'L-h']],
    ['r7-extra-not-required (I1)', ["if (!/^\\d{1,4}$/.test(extraVar ?? '')) fail(", 'if (false) fail('], ['L-m', 'L-n', 'L-o', 'L-p', 'L-q']],
    ['r7-extra-echo-not-checked (I1)', ['if (summary[6] !== extraVar) fail(', 'if (false) fail('], ['L-u']],
    ['r7-incomplete-logs-allowed (I1)', ["if (summary[9] !== 'yes') fail(", 'if (false) fail('], ['L-s']],
    ['r7-no-log-allowed (I1)', ["if (summary[10] === 'none') fail(", 'if (false) fail('], ['L-t']],
    ['r7-stale-reset-not-checked', ['if (summary[1] !== expectReset) fail(', 'if (false) fail('], ['L-f']],
    ['r7-3.5-headroom-not-checked', ['if (headroom35 < MIN_35) fail(', 'if (false) fail('], ['L-a', 'L-e']],
    ['r7-3.1-headroom-not-checked', ['if (headroom31 < MIN_31) fail(', 'if (false) fail('], ['L-c']],
    ['r7-3.5-margin-dropped (the 224 bound becomes the bare need 149)', ['if (headroom35 < MIN_35) fail(', 'if (headroom35 < NEED_35) fail('], ['L-a']],
    ['r7-3.1-margin-dropped (the 90 bound becomes the bare need 60)', ['if (headroom31 < MIN_31) fail(', 'if (headroom31 < NEED_31) fail('], ['L-c']],
    ['r7-3.5-bound-exclusive', ['if (headroom35 < MIN_35) fail(', 'if (headroom35 <= MIN_35) fail('], ['L-b']],
    ['r7-3.1-bound-exclusive', ['if (headroom31 < MIN_31) fail(', 'if (headroom31 <= MIN_31) fail('], ['L-d']],
    ['g2-exit-ignored', ['if (ng.status !== 0) fail(', 'if (false) fail('], ['N-a', 'N-d']],
    ['g2-last-line-ignored', ["if (ngLines[ngLines.length - 1] !== 'NIGHT GATES OK') fail(", 'if (false) fail('], ['N-b']],
    ['g2-script-not-required', ['if (!fs.existsSync(NIGHT)) fail(', 'if (false) fail('], ['N-c']],
    ['g5-last-line-not-required', ['if (!sm) fail(', 'if (false) fail('], ['V3', 'V10', 'V11', 'V13', 'V14']],
    ['g5-stamp-age-not-checked', ['if (stampMs < tMs - 10 * 60000) fail(', 'if (false) fail('], ['V2', 'V8']],
    ['g5-stamp-future-not-checked', ['if (stampMs > nowMs) fail(', 'if (false) fail('], ['V9']],
    ['g5-now-late-not-checked', ['if (nowMs > tMs + 10 * 60000) fail(', 'if (false) fail('], ['V5']],
    ['g5-file-not-required', ['if (!fs.existsSync(pcFile)) fail(', 'if (false) fail('], ['V1']],
    ['g5-gate-removed (the precheck is never read)', ["if (opts['--require-precheck']) {", 'if (false) {'], ['V1', 'V2', 'V3']],
    ['hedge-variable-not-checked (check 6)', ['if (hedgeVar !== undefined) fail(', 'if (false) fail('], ['H1', 'H2', 'H4']],
    ['follow-up-not-checked (check 8)', ['if (followUpOn !== false) fail(', 'if (false) fail('], ['F1']],
    ['commit-not-compared (check 10b)', ['if (head !== registeredCommit) fail(', 'if (false) fail('], ['B2', 'B2b']],
    ['tree-not-checked (check 10b)', ['if (dirty.length) fail(', 'if (false) fail('], ['B6', 'B7', 'B8', 'B9', 'B10']],
    ['answer-models-not-matched (check 11)', ['if (!answerModelsMatch) fail(', 'if (false) fail('], ['N1', 'N3']],
    ['dist-proof-verdict-ignored (check 12)', ['const dpOk = !dp.error && dp.status === 0 && dp.stdout.includes(VERDICT);', 'const dpOk = true;'], ['Q1', 'Q5']],
    ['knowledge-mode-not-checked (check 13)', ['if (knowledgeMode !== true) {', 'if (false) {'], ['W1', 'W2', 'W6', 'W9']],
    ['env-scan-skipped (check 10a)', ['if (clash.length) fail(', 'if (false) fail('], ['E1', 'E2', 'E3', 'E4', 'E7', 'E8']],
    ['uncaught-handler-removed', ["process.on('uncaughtException', (e) =>", "process.on('uncaughtExceptionX', (e) =>"], ['I1']],
];
const byId = Object.fromEntries(stubList.map((c) => [c.id, c]));
log('MUTATION SUITE (rule 8): a copy of the guard with ONE check switched off, run over the cases that must notice it. "caught" = every listed case turned BAD and A1 stayed ok.');
let mutantsCaught = 0;
for (const [name, [find, repl], mustTurnBad] of MUTANTS) {
    const gp = buildLayout(`mutant-${mutantsCaught}-${results.length}`, { mutate: (g) => { if (!g.includes(find)) throw new Error(`calibration bug: mutant "${name}": the text to switch off was not found in the guard: ${find}`); return g.replace(find, repl); } });
    const ids = ['A1', ...mustTurnBad];
    const v = runCases('', ids.map((id) => { if (!byId[id]) throw new Error(`calibration bug: mutant ${name} names unknown case ${id}`); return byId[id]; }), STUB, { guardPath: gp, quiet: true, layouts });
    const a1 = v.find((x) => x.id === 'A1').good;
    const turned = v.filter((x) => x.id !== 'A1' && !x.good).map((x) => x.id);
    const missed = mustTurnBad.filter((id) => !turned.includes(id));
    const caught = a1 && missed.length === 0;
    if (caught) mutantsCaught++;
    results.push({ id: `mutant:${name.split(' ')[0]}`, good: caught });
    log(`${caught ? 'ok  ' : 'BAD '} ${name}`);
    log(`      cases that turned BAD: [${turned.join(', ')}] (must be [${mustTurnBad.join(', ')}]); A1 ${a1 ? 'stayed ok' : 'turned BAD (the mutant is broken, not a mutant of one check)'}${missed.length ? `; NOT NOTICED: ${missed.join(', ')}` : ''}`);
}
log('');

freshenDist();
const final = runGuard({ args: {} }, STUB, GUARD);
const finalOk = final.status === 0 && /GUARD OK: /.test(final.stdout);
log('FINAL: the stub tree as left on disk, correct environment');
log(`${finalOk ? 'ok  ' : 'BAD '} exit ${final.status} :: ${clip((final.stdout.split(/\r?\n/).find((l) => l.startsWith('GUARD OK: ')) ?? final.stdout), 200)}`);
results.push({ id: 'final', good: finalOk });
log('');

const counted = results.filter((x) => !x.info);
const bads = counted.filter((x) => !x.good);
const caseCount = counted.filter((x) => !x.id.startsWith('mutant:') && !['layout', 'final'].includes(x.id)).length;
log(`SUMMARY: ${caseCount} cases, ${MUTANTS.length} mutants (${mutantsCaught} caught), ${results.filter((x) => x.info).length} informational (not counted)`);
log(bads.length ? `GUARD CALIBRATION: FAILED (${bads.map((b) => b.id).join(', ')})` : `GUARD CALIBRATION OK ${counted.length}/${counted.length}`);
fs.writeFileSync(OUT, `${out.join('\n')}\n`);
process.exit(bads.length ? 1 : 0);
