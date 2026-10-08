// E\guard-eq-cal.mjs - calibration driver for E\guard-eq.mjs (A2.10 P6, b7: "calibrated by breaking each premise once";
// guard-h40d-cal.mjs's pattern). It builds a throwaway stub tree E\guard-eq-cal\ from REAL files of MAIN (read only), makes
// the stub a throwaway git repo (never MAIN), then runs the REAL guard file as a child with cwd = the stub, once per
// broken premise; then against MAIN's root; then through cmd.exe the way the launcher runs it; then a MUTATION suite (rule 8:
// copies of the guard with one check switched off, run over the cases that must notice - a case is not vacuous if its
// mutant turns it BAD). Never starts the app; no network; no model call; MAIN is only read; the only git WRITES are in
// the stub repo.
//   node guard-eq-cal.mjs        writes E\guard-eq-cal.txt, exit 0 only if every counted case reads as expected
// A case that does not read as expected is a finding, never edited to match (rule 8).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const E = path.dirname(fileURLToPath(import.meta.url));
const SP = path.resolve(E, '..');
const GUARD = path.join(E, 'guard-eq.mjs');
const STUB = path.join(E, 'guard-eq-cal');
const LAYOUT = path.join(E, 'guard-eq-cal-layout');      // E-shaped folders holding COPIES of the guard (mutants, faithful mirror)
const STUBS = path.join(E, 'guard-eq-cal-stubs');        // settings, smoke results, precheck stamps, night-gate and parity stubs
const OUT = path.join(E, 'guard-eq-cal.txt');
const REAL_NIGHT = path.join(E, 'night-gates.ps1');
const REAL_PARITY = path.join(SP, 'followup-turn', 'build', 'parity-dist.mjs');

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
const home = os.homedir().replace(/\\/g, '/');
const REAL_SETTINGS = `//localhost/${home[0]}$/${home.slice(3)}/AppData/Roaming/natively/settings.json`;   // the admin share: the real file, not the sandbox shadow

const gitIn = (dir, ...a) => execFileSync('git', ['--no-optional-locks', '-C', dir, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const gitStub = (...a) => gitIn(STUB, ...a);
const gitStubCommit = (msg) => gitIn(STUB, '-c', 'user.name=cal', '-c', 'user.email=cal@example.invalid', 'commit', '-q', '-m', msg);
const headOf = (dir, rev = 'HEAD') => gitIn(dir, 'rev-parse', rev).trim();

// the stub tree --------------------------------------------------------------------------------------------------------
const SOURCES = [
    'electron/LLMHelper.ts', 'electron/llm/prompts.ts', 'electron/knowledge/IntentClassifier.ts',
    'electron/llm/earlierQuestion.ts', 'electron/IntelligenceEngine.ts', 'electron/main.ts', 'electron/llm/WhatToAnswerLLM.ts',
    'electron/test/golden/roster.mjs', 'electron/test/golden/holdout40.questions.mjs', 'electron/test/golden/interview60.questions.mjs',
    'electron/test/golden/scenario50.questions.mjs', 'electron/test/golden/interview60.flight.mjs',
];
const put = (rel, text) => { const f = path.join(STUB, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
const copyFromMain = (rel) => { const f = path.join(STUB, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.copyFileSync(path.join(MAIN, rel), f); };
// fs.cpSync exits silently on a non-ASCII path (memory node_cpsync_nonascii): readdir + copyFile
function copyTree(from, to) {
    fs.mkdirSync(to, { recursive: true });
    for (const ent of fs.readdirSync(from, { withFileTypes: true })) {
        const a = path.join(from, ent.name), b = path.join(to, ent.name);
        if (ent.isDirectory()) copyTree(a, b); else fs.copyFileSync(a, b);
    }
}
function buildStub() {
    fs.rmSync(STUB, { recursive: true, force: true, maxRetries: 5 });
    fs.mkdirSync(STUB, { recursive: true });
    put('package.json', '{"name":"guard-eq-cal","version":"0.0.0"}\n');
    put('.gitignore', 'dist-electron/\n.env\nnatively_debug.log\nelectron/test/golden/*.stale-*.json\n');
    for (const rel of SOURCES) copyFromMain(rel);
    put('electron/test/golden/interview60.chains.json', '{}\n');
    put('electron/test/golden/interview60.report.md', '# report\n');
    put('natively_debug.log.1', 'rotated log\n');
    put('src/App.tsx', 'export const App = 1;\n');
    put('scripts/build-electron.js', '// build script\n');
    put('README.md', '# stub\n');
    put('vite.config.mts', 'export default {};\n');
    gitStub('init', '-q');
    gitStub('add', '-A');
    gitStubCommit('stub base');
    put('README.md', '# stub, second commit\n');          // a second commit so HEAD~1 exists (A5 m7: the moved-HEAD case)
    gitStub('add', '-A');
    gitStubCommit('stub second');
    copyTree(path.join(MAIN, 'dist-electron'), path.join(STUB, 'dist-electron'));       // ignored, written AFTER the sources: newer
    put('.env', 'UNRELATED_DUMMY_NAME=dummy-value-not-a-key\n');
}
function buildLayout(name, { mutate } = {}) {
    const root = path.join(LAYOUT, name);
    const eDir = path.join(root, 'flight-eq');
    fs.mkdirSync(eDir, { recursive: true });
    fs.copyFileSync(path.join(E, 'guard-eq-git.mjs'), path.join(eDir, 'guard-eq-git.mjs'));
    fs.copyFileSync(path.join(SP, 'guard-r09.mjs'), path.join(root, 'guard-r09.mjs'));
    fs.copyFileSync(path.join(SP, 'dist-proof.mjs'), path.join(root, 'dist-proof.mjs'));
    const g = fs.readFileSync(GUARD, 'utf8');
    const m = mutate ? mutate(g) : g;
    if (mutate && m === g) throw new Error(`calibration bug: mutant ${name} changed nothing`);
    fs.writeFileSync(path.join(eDir, 'guard-eq.mjs'), m);
    return path.join(eDir, 'guard-eq.mjs');
}

// stub helpers ---------------------------------------------------------------------------------------------------------
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
const D = 'dist-electron/electron/';
// every dist file a guard check compares with its source by mtime is bumped, so an undo (which rewrites a SOURCE and moves its mtime) never makes the build look stale by accident
const FRESH = ['LLMHelper.js', 'llm/earlierQuestion.js', 'IntelligenceEngine.js', 'main.js', 'llm/WhatToAnswerLLM.js'];
const freshenDist = () => {
    const t = new Date(Date.now() + 5000);
    for (const r of FRESH) { const f = stubFile(`${D}${r}`); if (fs.existsSync(f)) fs.utimesSync(f, t, t); }
};

// the stub inputs ------------------------------------------------------------------------------------------------------
const T_OK = '2026-10-05 21:00';
const NOW_OK = '2026-10-05T21:01:00+03:00';                // T + 1 min
const settingsFile = (n) => path.join(STUBS, n);
const SETTINGS_ON = settingsFile('settings-on.json');
const RESULT = (over = {}) => {
    const o = { q04: 'S1Q04: gate=no-cue cue=none chars=0 turn=1 ms=1', q04f: 'S1Q04F: gate=block cue=constraint chars=332 turn=2 ms=2', q06: 'S1Q06: gate=no-cue cue=none chars=0 turn=3 ms=1',
        q06f: 'S1Q06F: gate=block cue=pronoun chars=401 turn=4 ms=2', why: 'WHY: gate=parent-in-prompt cue=short chars=0 turn=5 ms=1', tail: 'CHECK CLEAN: 5/5 exercised, 5 answers, mode on', ...over };
    return `# smoke result (stub)\n\n${Object.values(o).filter((x) => x !== null).map((l) => `  ${l}`).join('\n')}\n`;
};
const stamp = (hh, mm, ss = '00', day = '2026-10-05') => `${day}T${hh}:${mm}:${ss}+03`;
const PRE = (lines) => `${lines.join('\n')}\n`;
function writeStubs() {
    fs.rmSync(STUBS, { recursive: true, force: true });
    fs.mkdirSync(STUBS, { recursive: true });
    const w = (n, t) => fs.writeFileSync(path.join(STUBS, n), t);
    w('settings-on.json', '{"knowledgeMode":true}\n'); w('settings-off.json', '{"knowledgeMode":false}\n'); w('settings-absent.json', '{"other":1}\n');
    w('settings-broken.json', 'not json {\n'); w('settings-string-true.json', '{"knowledgeMode":"true"}\n'); w('settings-array.json', '[true]\n');
    for (const d of ['on', 'off']) { fs.mkdirSync(path.join(STUBS, 'appdata', d, 'natively'), { recursive: true }); fs.copyFileSync(path.join(STUBS, `settings-${d}.json`), path.join(STUBS, 'appdata', d, 'natively', 'settings.json')); }
    w('result-ok.md', RESULT());
    w('result-no-why.md', RESULT({ why: null }));
    w('result-why-chars.md', RESULT({ why: 'WHY: gate=parent-in-prompt cue=short chars=12 turn=5 ms=1' }));
    w('result-why-gate.md', RESULT({ why: 'WHY: gate=block cue=short chars=0 turn=5 ms=1' }));
    w('result-chars-199.md', RESULT({ q04f: 'S1Q04F: gate=block cue=constraint chars=199 turn=2 ms=2' }));
    w('result-chars-200.md', RESULT({ q04f: 'S1Q04F: gate=block cue=constraint chars=200 turn=2 ms=2' }));
    w('result-chars-578.md', RESULT({ q06f: 'S1Q06F: gate=block cue=pronoun chars=578 turn=4 ms=2' }));
    w('result-chars-579.md', RESULT({ q06f: 'S1Q06F: gate=block cue=pronoun chars=579 turn=4 ms=2' }));
    w('result-wrong-cue.md', RESULT({ q06f: 'S1Q06F: gate=block cue=constraint chars=401 turn=4 ms=2' }));
    w('result-no-q04f.md', RESULT({ q04f: null }));
    w('result-not-exercised.md', RESULT({ q06: 'S1Q06: NOT EXERCISED (no pinned question line in its play window)' }));
    w('parity-old-line.mjs', "console.log('EARLIER-QUESTION REF TESTS: 47/47 passed');\nconsole.log('PARITY DIST: 126 fixture entries (21 with a block) + 29 invented cases; mismatches 0');\nprocess.exit(0);\n");
    w('parity-good.mjs', `console.log('EARLIER-QUESTION REF TESTS: 47/47 passed');\nconsole.log('PARITY DIST: 126 fixture entries (21 with a block) + 29 invented cases + 117 captured prompt-line rows; mismatches 0');\nprocess.exit(0);\n`);
    w('parity-exit1.mjs', `console.log('EARLIER-QUESTION REF TESTS: 47/47 passed');\nconsole.log('PARITY DIST: 126 fixture entries (21 with a block) + 29 invented cases + 117 captured prompt-line rows; mismatches 0');\nprocess.exit(1);\n`);
    w('parity-silent.mjs', 'process.exit(0);\n');
    w('night-ok.ps1', "Write-Output 'NIGHT standby-ac: OK stub'\nWrite-Output 'NIGHT GATES OK'\nexit 0\n");
    w('night-fail.ps1', "Write-Output 'NIGHT power: FAIL stub'\nWrite-Output 'NIGHT GATES FAILED (1): power'\nexit 1\n");
    w('night-noline.ps1', "Write-Output 'NIGHT standby-ac: OK stub'\nexit 0\n");
    // the REAL night-gates.ps1 with its own -FakeJson (standby 900 s): the child plumbing carries a real FAIL
    // every key night-gates.ps1's -FakeJson requires (its header, fix round 1): a missing key is a refusal, exit 2
    w('fake-standby.json', JSON.stringify({ standbyAcSec: 900, hibernateAcSec: 0, battery: [2], batteryFlag: null, acLine: true, rebootPendingCbs: false, rebootRequiredWu: false, pendingFileRename: false, rebootParentMissing: null,
        activeHoursStart: 15, activeHoursEnd: 6, pauseUpdatesExpiry: null, pauseQualityUpdatesEnd: null, pauseFeatureUpdatesEnd: null, pausedQualityStatus: null, pausedFeatureStatus: null, policyNoAutoUpdate: null, policyAUOptions: null, policyOverrides: [] }));
    // (the paths hold a non-ASCII folder name: a .ps1 needs its UTF-8 BOM or Windows PowerShell 5.1 reads them as ANSI)
    fs.writeFileSync(path.join(STUBS, 'night-real-fake.ps1'), `﻿param([string]$AtText)\n& '${REAL_NIGHT}' -At $AtText -FakeJson '${path.join(STUBS, 'fake-standby.json')}'\nexit $LASTEXITCODE\n`, 'utf8');
    // precheck stamps (T = 21:00): the REAL file shape = gate lines, then the verdict line LAST
    const gl = ['PRECHECK flight-task: OK', 'PRECHECK port: OK'];
    w('pre-ok-t-7.txt', PRE([...gl, `PRECHECK OK ${stamp('20', '53')}`]));
    w('pre-ok-t-10.txt', PRE([...gl, `PRECHECK OK ${stamp('20', '50')}`]));
    w('pre-ok-t-10-1s.txt', PRE([...gl, `PRECHECK OK ${stamp('20', '49', '59')}`]));
    w('pre-ok-2h-old.txt', PRE([...gl, `PRECHECK OK ${stamp('18', '53')}`]));
    w('pre-failed.txt', PRE([...gl, 'PRECHECK port: FAIL held', 'PRECHECK FAILED (1): port']));
    w('pre-ok-then-failed.txt', PRE([`PRECHECK OK ${stamp('20', '53')}`, 'PRECHECK FAILED (1): port']));
    w('pre-ok-then-more.txt', PRE([`PRECHECK OK ${stamp('20', '53')}`, 'PRECHECK port: OK']));
    w('pre-ok-future.txt', PRE([...gl, `PRECHECK OK ${stamp('21', '30')}`]));
    w('pre-ok-badfmt.txt', PRE([...gl, 'PRECHECK OK 2026-10-05 20:53:00']));
    w('pre-ok-nostamp.txt', PRE([...gl, 'PRECHECK OK']));
    w('pre-empty.txt', '');
}

// the cases ------------------------------------------------------------------------------------------------------------
const ok = (...contains) => ({ exit: 0, line: /^GUARD OK: /, contains, notContains: [] });
const bad = (tag, contains = [], notContains = []) => ({ exit: 1, line: new RegExp(`^GUARD FAILED: \\(${tag}\\) `), contains, notContains });
const baseArgs = () => ({ '--settings': SETTINGS_ON, '--smoke-result': path.join(STUBS, 'result-ok.md') });
const pre = (n) => ({ '--require-precheck': true, '--precheck-file': path.join(STUBS, n), '--now': NOW_OK });
const withSettings = (n) => ({ args: { '--settings': path.join(STUBS, n) } });

function stubCases() {
    const C = [];
    const add = (id, name, expect, o = {}) => C.push({ where: 'stub', id, name, expect, ...o });
    const wantSha = crypto.createHash('sha256').update(fs.readFileSync(stubFile(`${D}llm/verbalStreamFilter.js`))).digest('hex').slice(0, 16);

    add('A1', 'the correct environment, the DRY form (every override cleared, the flag exactly 1, focused off, T set, the registered commit = the stub HEAD, a .env with an unrelated name, the REAL parity-dist and the REAL night-gates.ps1 as children, the settings and smoke-result stubs) -> GUARD OK',
        ok('roster scenario50 S1,S2 (40 items)', 'earlier question flag exactly 1 (built startup line "earlier question: on")', `T ${T_OK}`, 'focused Flash arms OFF (focusedFor null)', `filter sha256/16 ${wantSha}`,
            'four EQ markers in dist and source', 'parity-dist exit 0 with both exact lines', 'smoke result holds WHY and the blocks [S1Q04F 332, S1Q06F 401]', 'knowledge mode ON (knowledgeMode = true in ', 'night gates OK', 'precheck not required (dry twin)',
            'tree clean but for the allowlisted paths present [none]', 'ANSWER_MODELS = ["gemini-3.1-flash-lite","gemini-3.5-flash-lite"]'), { full: true });
    add('A2', 'the same through the layout mirror (a byte-identical COPY of the guard in an E-shaped folder, the copy the mutants use) -> GUARD OK', ok(), { layout: 'faithful' });
    add('A3', 'the REAL form (--require-precheck): a precheck stamp at T - 7 min, now = T + 1 min -> GUARD OK and PRECHECK ACCEPTED', ok('PRECHECK ACCEPTED 2026-10-05T20:53:00+03'), { args: pre('pre-ok-t-7.txt'), stdoutContains: ['PRECHECK ACCEPTED 2026-10-05T20:53:00+03', 'NIGHT GATES OK'] });

    // -- 10b: the commit pin and the tree
    add('B1', 'commit unset', bad('10b', ['NATIVELY_FLIGHT_COMMIT is not set']), { env: { NATIVELY_FLIGHT_COMMIT: undefined } });
    add('B2', 'commit wrong (forty zeros)', bad('10b', ['MAIN HEAD is ', 'not the registered commit 0000000000000000000000000000000000000000']), { commit: '0'.repeat(40) });
    add('B2b', 'A5 m7, HEAD MOVED: the commit = the PARENT of the stub HEAD (the registered HEAD is one commit behind; no commit is ever made on MAIN to test this) -> FAILED', bad('10b', ['MAIN HEAD is ', 'not the registered commit']), { commitFn: () => headOf(STUB, 'HEAD~1') });
    add('B3', 'commit abbreviated (7 characters)', bad('10b', ['not a full 40-hex commit hash']), { commitFn: (h) => h.slice(0, 7) });
    add('B4', 'commit = the launcher placeholder token', bad('10b', ['NATIVELY_FLIGHT_COMMIT is "@@REGISTERED_HEAD_FULL_HASH@@", not a full 40-hex commit hash']), { commit: '@@REGISTERED_HEAD_FULL_HASH@@' });
    add('B5', 'commit with a trailing space (a cmd `set X=value ` artifact): trimmed -> GUARD OK', ok('HEAD pinned at '), { commitFn: (h) => `${h} ` });
    add('B6', 'tree dirty: a tracked source file under electron/ edited (a peer edit)', bad('10b', ['not clean: electron/knowledge/IntentClassifier.ts']), { setup: () => ({ undo: edit('electron/knowledge/IntentClassifier.ts', (t) => `${t}\n// cal dirt\n`) }) });
    add('B7', 'tree dirty: an UNTRACKED file under electron/', bad('10b', ['not clean: electron/llm/newFile.ts']), { setup: () => ({ undo: addFile('electron/llm/newFile.ts') }) });
    add('B8', 'tree dirty: scripts/build-electron.js edited', bad('10b', ['not clean: scripts/build-electron.js']), { setup: () => ({ undo: edit('scripts/build-electron.js', (t) => `${t}// cal dirt\n`) }) });
    add('B9', 'tree dirty: an untracked file under src/', bad('10b', ['not clean: src/new.tsx']), { setup: () => ({ undo: addFile('src/new.tsx') }) });
    add('B10', 'tree dirty: package.json edited', bad('10b', ['not clean: package.json']), { setup: () => ({ undo: edit('package.json', (t) => t.replace('0.0.0', '0.0.1')) }) });
    add('B10b', 'tree dirty: a passes/ record edited under electron/ (the committed texts the launcher prints shas of)', bad('10b', ['not clean: electron/test/golden/passes/flight-eq-AMENDMENT-A1.md']),
        { setup: () => { put('electron/test/golden/passes/flight-eq-AMENDMENT-A1.md', 'a\n'); gitStub('add', '-A'); gitStubCommit('passes record'); const base = headOf(STUB); const f = stubFile('electron/test/golden/passes/flight-eq-AMENDMENT-A1.md'); fs.writeFileSync(f, 'b\n'); return { commit: base, undo: () => { gitStub('reset', '--hard', '-q', 'HEAD~1'); } }; } });
    add('B11', 'the MAIN-like allowlisted dirt only: the three tracked files modified, the four untracked scratch paths, two stray untracked root files, a tracked root doc edited -> GUARD OK, the seven allowlisted paths named',
        ok('tree clean but for the allowlisted paths present [electron/test/golden/interview60.chains.json, electron/test/golden/interview60.report.md, natively_debug.log.1, electron/test/golden/openrouter-probes/, electron/test/golden/openrouter.probe.mjs, electron/test/golden/zai-probes/, electron/test/golden/zai.probe.mjs]'),
        { full: true, setup: () => ({ undo: seq(
            edit('electron/test/golden/interview60.chains.json', (t) => `${t}{"x":1}\n`), edit('electron/test/golden/interview60.report.md', (t) => `${t}more\n`), edit('natively_debug.log.1', (t) => `${t}more\n`),
            addFile('electron/test/golden/openrouter-probes/a.json'), addFile('electron/test/golden/openrouter.probe.mjs'), addFile('electron/test/golden/zai-probes/b.json'), addFile('electron/test/golden/zai.probe.mjs'),
            addFile('resume_prompt.txt'), addFile('retry_claude_print.bat'), edit('README.md', (t) => `${t}docs edit\n`)) }) });
    add('B12', 'restored: after B6-B11 undid their edits the correct environment passes again', ok());
    add('B13', 'the scope boundary, by design: ONLY a tracked root doc edited and a stray untracked root file -> GUARD OK', ok('tree clean but for the allowlisted paths present [none]'), { setup: () => ({ undo: seq(edit('README.md', (t) => `${t}docs edit\n`), addFile('resume_prompt.txt')) }) });
    add('B14', 'a gitignored stale file under electron/test/golden/ -> GUARD OK', ok('tree clean but for the allowlisted paths present [none]'), { setup: () => ({ undo: addFile('electron/test/golden/interview60.chains.stale-1.json') }) });
    add('B15', 'git unusable: the stub\'s .git moved aside', bad('10b', ['git rev-parse HEAD failed']), { commit: '0'.repeat(40), setup: () => { fs.renameSync(stubFile('.git'), stubFile('.git-aside')); return { undo: () => fs.renameSync(stubFile('.git-aside'), stubFile('.git')) }; } });

    // -- 10a: .env names only (A3.7 m12 adds NATIVELY_FLIGHT_FOCUSED and NATIVELY_EQ_T)
    const withEnv = (text) => () => ({ undo: edit('.env', () => text) });
    add('E1', '.env declares NATIVELY_VERBAL_HEDGE (a dummy value): named, the value not leaked', bad('10a', ['.env declares NATIVELY_VERBAL_HEDGE ', 'remove it from .env'], ['dummy']), { setup: withEnv('UNRELATED_DUMMY_NAME=dummy-value-not-a-key\nNATIVELY_VERBAL_HEDGE=dummy\n') });
    add('E2', '.env declares NATIVELY_FOLLOWUP_PARENT in the `export NAME=` form', bad('10a', ['.env declares NATIVELY_FOLLOWUP_PARENT']), { setup: withEnv('export NATIVELY_FOLLOWUP_PARENT=dummy\n') });
    add('E3', '.env declares NATIVELY_QUESTION_DETECTION_MODEL in the `NAME: value` form', bad('10a', ['.env declares NATIVELY_QUESTION_DETECTION_MODEL']), { setup: withEnv('NATIVELY_QUESTION_DETECTION_MODEL: dummy\n') });
    add('E4', '.env declares two guarded names with CRLF line ends', bad('10a', ['.env declares NATIVELY_VERBAL_HEDGE_TRIGGER_MS, NATIVELY_GEMINI_THINKING_LEVEL'], ['dummy']), { setup: withEnv('NATIVELY_VERBAL_HEDGE_TRIGGER_MS=dummy\r\nNATIVELY_GEMINI_THINKING_LEVEL=dummy\r\n') });
    add('E5', '.env absent altogether -> still GUARD OK', ok(), { setup: () => ({ undo: removeFile('.env') }) });
    add('E6', 'NATIVELY_QUESTION_DETECTION_MODEL set in the process environment', bad('10a', ['NATIVELY_QUESTION_DETECTION_MODEL is set']), { env: { NATIVELY_QUESTION_DETECTION_MODEL: 'dummy' } });
    add('E7', 'A3.7 m12: .env names NATIVELY_EQ_T -> FAILED', bad('10a', ['.env declares NATIVELY_EQ_T'], ['dummy']), { setup: withEnv('NATIVELY_EQ_T=dummy\n') });
    add('E8', 'A3.7 m12: .env names NATIVELY_FLIGHT_FOCUSED -> FAILED', bad('10a', ['.env declares NATIVELY_FLIGHT_FOCUSED'], ['dummy']), { setup: withEnv('NATIVELY_FLIGHT_FOCUSED=dummy\n') });

    // -- 6, 7, 8, 3, 1: the environment
    add('H1', 'the hedge variable set to 1', bad('6', ['NATIVELY_VERBAL_HEDGE is set ("1")', 'even for the value 1']), { env: { NATIVELY_VERBAL_HEDGE: '1' } });
    add('H2', 'the hedge variable set to 0', bad('6', ['NATIVELY_VERBAL_HEDGE is set ("0")']), { env: { NATIVELY_VERBAL_HEDGE: '0' } });
    add('H4', 'the hedge variable set to the empty string', bad('6', ['NATIVELY_VERBAL_HEDGE is set ("")']), { env: { NATIVELY_VERBAL_HEDGE: '' } });
    add('H5', 'the 09-26 build: verbalHedge.js with the OLD default (unset = off)', bad('6', ['the built default is not the hedge: "[Main] verbal hedge: off"']),
        { setup: () => ({ undo: edit(`${D}llm/verbalHedge.js`, (t) => t.replace('if (!raw || raw === "1") return true;\n  if (raw === "0") return false;', 'if (!raw || raw === "0") return false;\n  if (raw === "1") return true;')) }) });
    add('H7', 'the hedge module missing from the dist', bad('6', ['dist-electron/electron/llm/verbalHedge.js does not load']), { setup: () => ({ undo: removeFile(`${D}llm/verbalHedge.js`) }) });
    add('T1', 'trigger override 1 ms', bad('7', ['the hedge trigger is 1ms, not the probed 5000ms']), { env: { NATIVELY_VERBAL_HEDGE_TRIGGER_MS: '1' } });
    add('T2', 'trigger override junk (abc)', bad('7', ['NATIVELY_VERBAL_HEDGE_TRIGGER_MS refuses this environment']), { env: { NATIVELY_VERBAL_HEDGE_TRIGGER_MS: 'abc' } });
    add('T3', 'trigger set to its own default (5000) -> GUARD OK', ok('at 5000ms'), { env: { NATIVELY_VERBAL_HEDGE_TRIGGER_MS: '5000' } });
    add('F1', 'follow-up parent flag on (b7: "the parent flag 1"): refused at check 8, before the earlier-question describer could', bad('8', ['the follow-up flag is set; flight-eq flies it OFF']), { env: { NATIVELY_FOLLOWUP_PARENT: '1' } });
    add('F2', 'follow-up parent flag junk (abc)', bad('8', ['NATIVELY_FOLLOWUP_PARENT refuses this environment']), { env: { NATIVELY_FOLLOWUP_PARENT: 'abc' } });
    add('F3', 'the follow-up module missing from the dist', bad('8', ['dist-electron/electron/llm/followUpParent.js does not load']), { setup: () => ({ undo: removeFile(`${D}llm/followUpParent.js`) }) });
    add('O1', 'answer-model override (gemini-3.5-flash-lite)', bad('3', ['an answer-model override is set: gemini-3.1-flash-lite resolves to gemini-3.5-flash-lite']), { env: { NATIVELY_VERBAL_PRIMARY_MODEL: 'gemini-3.5-flash-lite' } });
    add('O2', 'thinking-level override (HIGH)', bad('3', ['the app would think at HIGH, not the shipped LOW']), { env: { NATIVELY_GEMINI_THINKING_LEVEL: 'HIGH' } });
    add('R1', 'the wrong roster (holdout40, NATIVELY_SCENARIOS cleared)', bad('1', ['the harness would load roster holdout40, not scenario50']), { env: { NATIVELY_ROSTER: 'holdout40', NATIVELY_SCENARIOS: undefined } });
    add('R1b', 'the wrong roster (holdout40) with NATIVELY_SCENARIOS=S1,S2 left over: roster.mjs itself throws, and the guard names it', bad('1', ['roster.mjs does not load under this environment', 'which holdout40 does not have']), { env: { NATIVELY_ROSTER: 'holdout40' } });
    add('R2', 'no roster variable at all (the harness default interview60)', bad('1', ['roster interview60, not scenario50']), { env: { NATIVELY_ROSTER: undefined, NATIVELY_SCENARIOS: undefined } });
    add('R3', 'NATIVELY_SCENARIOS unset: scenario50 loads all five scenarios (100 items), not the 40 of S1+S2', bad('1', ['scenario50 loaded 100 items, expected 40 (S1+S2)']), { env: { NATIVELY_SCENARIOS: undefined } });
    add('R4', 'NATIVELY_SCENARIOS=S1 only: 20 items', bad('1', ['scenario50 loaded 20 items, expected 40']), { env: { NATIVELY_SCENARIOS: 'S1' } });
    add('R5', 'NATIVELY_SCENARIOS=S1,S3: ALSO 40 items, but the wrong pair - only the scenario read catches it', bad('1', ['the roster\'s scenarios are S1,S3, not S1,S2']), { env: { NATIVELY_SCENARIOS: 'S1,S3' } });
    add('R6', 'a roster name that does not exist (bogus)', bad('1', ['roster.mjs does not load under this environment', 'is not a roster']), { env: { NATIVELY_ROSTER: 'bogus' } });

    // -- e1: the flag under test
    add('Q-e1a', 'e1: NATIVELY_EARLIER_QUESTION unset', bad('e1', ['NATIVELY_EARLIER_QUESTION is unset, not exactly "1"']), { env: { NATIVELY_EARLIER_QUESTION: undefined } });
    add('Q-e1b', 'e1: NATIVELY_EARLIER_QUESTION=0 (the built code accepts it as off)', bad('e1', ['NATIVELY_EARLIER_QUESTION is "0", not exactly "1"']), { env: { NATIVELY_EARLIER_QUESTION: '0' } });
    add('Q-e1c', 'e1: NATIVELY_EARLIER_QUESTION=yes (the built code would throw at startup)', bad('e1', ['NATIVELY_EARLIER_QUESTION is "yes", not exactly "1"']), { env: { NATIVELY_EARLIER_QUESTION: 'yes' } });
    add('Q-e1d', 'e1: NATIVELY_EARLIER_QUESTION="1 " (a trailing space on a cmd `set` line; the built code TRIMS it and would accept it, the guard must not)', bad('e1', ['NATIVELY_EARLIER_QUESTION is "1 ", not exactly "1"']), { env: { NATIVELY_EARLIER_QUESTION: '1 ' } });
    add('Q-e1e', 'e1: the BUILT describer returns "off" (a dist whose line says off while the flag reads 1)', bad('e1', ['the built describeEarlierQuestionAtStartup returns "earlier question: off", not "earlier question: on"']),
        { setup: () => ({ undo: edit(`${D}llm/earlierQuestion.js`, (t) => t.replace(/return on \? ['"]earlier question: on['"] : ['"]earlier question: off['"];/, 'return "earlier question: off";')) }) });
    add('Q-e1f', 'e1: the BUILT earlierQuestion.js missing from the dist', bad('e1', ['dist-electron/electron/llm/earlierQuestion.js does not load']), { setup: () => ({ undo: removeFile(`${D}llm/earlierQuestion.js`) }) });

    // -- g4: NATIVELY_EQ_T (the night-gates child is a stub that passes, so only g4 is under test)
    const nightOk = path.join(STUBS, 'night-ok.ps1');
    const tCase = (id, name, tv, expect) => add(id, name, expect, { env: { NATIVELY_EQ_T: tv }, args: { '--night-gates-script': nightOk } });
    tCase('G4a', 'g4: NATIVELY_EQ_T unset', undefined, bad('g4', ['NATIVELY_EQ_T is unset']));
    tCase('G4b', 'g4: T 2026-10-05 18:00 (before the evening)', '2026-10-05 18:00', bad('g4', ['outside 2026-10-05 19:30 .. 2026-10-06 01:00']));
    tCase('G4c', 'g4: T 2026-10-05 19:29 -> FAILED (A3.7)', '2026-10-05 19:29', bad('g4', ['outside']));
    tCase('G4d', 'g4: T 2026-10-05 19:30 -> GUARD OK (the lower bound is inclusive)', '2026-10-05 19:30', ok('T 2026-10-05 19:30'));
    tCase('G4e', 'g4: T 2026-10-06 01:00 -> GUARD OK (the upper bound is inclusive)', '2026-10-06 01:00', ok('T 2026-10-06 01:00'));
    tCase('G4f', 'g4: T 2026-10-06 01:01 -> FAILED (A3.7)', '2026-10-06 01:01', bad('g4', ['outside']));
    tCase('G4g', 'g4: T 2026-10-05 21:00 with a trailing space (the cmd artifact)', '2026-10-05 21:00 ', bad('g4', ['not a yyyy-MM-dd HH:mm local time']));
    tCase('G4h', 'g4: T 2026-10-05T21:00 (ISO form)', '2026-10-05T21:00', bad('g4', ['not a yyyy-MM-dd HH:mm local time']));
    tCase('G4i', 'g4: T 2026-10-05 25:00 (impossible time)', '2026-10-05 25:00', bad('g4', ['not a yyyy-MM-dd HH:mm local time']));
    tCase('G4j', 'g4: T 2026-02-30 21:00 (impossible date)', '2026-02-30 21:00', bad('g4', ['not a yyyy-MM-dd HH:mm local time']));
    tCase('G4k', 'g4: T 2026-10-04 21:00 (yesterday)', '2026-10-04 21:00', bad('g4', ['outside']));
    tCase('G4l', 'g4: T the launcher placeholder token', '@@T@@', bad('g4', ['not a yyyy-MM-dd HH:mm local time']));

    // -- g3: focused arms off
    add('G3a', 'g3: NATIVELY_FLIGHT_FOCUSED unset (the four focused full-Flash arms would fly)', bad('g3', ['NATIVELY_FLIGHT_FOCUSED is unset, not exactly "off"']), { env: { NATIVELY_FLIGHT_FOCUSED: undefined } });
    add('G3b', 'g3: NATIVELY_FLIGHT_FOCUSED=on', bad('g3', ['NATIVELY_FLIGHT_FOCUSED is "on", not exactly "off"']), { env: { NATIVELY_FLIGHT_FOCUSED: 'on' } });
    add('G3c', 'g3: NATIVELY_FLIGHT_FOCUSED empty string', bad('g3', ['NATIVELY_FLIGHT_FOCUSED is "", not exactly "off"']), { env: { NATIVELY_FLIGHT_FOCUSED: '' } });
    add('G3d', 'g3: NATIVELY_FLIGHT_FOCUSED=yes', bad('g3', ['is "yes", not exactly "off"']), { env: { NATIVELY_FLIGHT_FOCUSED: 'yes' } });
    add('G3e', 'g3: a STALE harness (a clean tree at a commit whose focusedFor ignores the variable and returns the focused five)', bad('g3', ["focusedFor('scenario50') returned"]),
        { setup: () => commitVariant([['electron/test/golden/interview60.flight.mjs', (t) => { const i = t.indexOf('export const focusedFor = (roster, env) => {'); if (i < 0) throw new Error('focusedFor not found'); return t.replace('export const focusedFor = (roster, env) => {', 'export const focusedFor = (roster, env) => { if (env) return focusedOnlyFor(roster);'); }]]) });
    add('G3f', 'g3: a harness WITHOUT the focusedFor export (the P2 edit is not in the tree)', bad('g3', ['has no focusedFor export']),
        { setup: () => commitVariant([['electron/test/golden/interview60.flight.mjs', replaceAll('export const focusedFor =', 'const focusedForGone =')]]) });
    add('G3g', 'g3: P2\'s log-line marker gone from the harness source (focusedFor still returns null)', bad('g3', ['does not carry P2\'s log line']),
        { setup: () => commitVariant([['electron/test/golden/interview60.flight.mjs', replaceAll('off by NATIVELY_FLIGHT_FOCUSED=off - skipping the', 'off by NATIVELY_FLIGHT_FOCUSED=off - skipping thx')]]) });

    // -- 2, 4, 5, 6b, 9: h40c's own checks, each broken once
    add('M1', 'the build\'s default answer model changed (gemini-3.1-flash)', bad('2', ['the build\'s default answer model is gemini-3.1-flash, not gemini-3.1-flash-lite']),
        { setup: () => ({ undo: edit(`${D}LLMHelper.js`, (t) => t.replace('const GEMINI_FLASH_MODEL = "gemini-3.1-flash-lite"', 'const GEMINI_FLASH_MODEL = "gemini-3.1-flash"')) }) });
    add('M3', 'a model module the guard requires missing from the dist (verbalPrimaryModel.js)', bad('2', ['dist-electron does not load']), { setup: () => ({ undo: removeFile(`${D}llm/verbalPrimaryModel.js`) }) });
    add('L1', 'the 3.5-lite LOW->HIGH turn removed from the built thinking levels', bad('4', ['the gemini-3.5-flash-lite fallback would fly at a level it ignores']),
        { setup: () => ({ undo: edit(`${D}llm/geminiThinking.js`, (t) => t.replace('"gemini-3.5-flash-lite": { LOW: "HIGH" }', '"gemini-3.5-flash-lite": {}')) }) });
    add('K1', 'R09 in the dist: a bare "salary" negotiation term back in the build', bad('5', ['the build still lists bare "salary" as a negotiation term']),
        { setup: () => ({ undo: edit(`${D}knowledge/IntentClassifier.js`, (t) => `${t}\nconst bare = ["salary", "offer"];\n`) }) });
    add('K3', 'R09 in the SOURCE (a clean tree at a commit that reverts it)', bad('5', ['the source still lists bare "salary" as a negotiation term']),
        { setup: () => commitVariant([['electron/knowledge/IntentClassifier.ts', (t) => `${t}\nconst bare = ["salary", "offer"];\n`]]) });
    add('G1', 'the hedge log line gone from the built LLMHelper.js', bad('6b', ['the build does not carry the hedge log line']), { setup: () => ({ undo: edit(`${D}LLMHelper.js`, replaceAll('verbal hedge: front=', 'verbal hedge: NOTHERE=')) }) });
    add('G2', 'streamGeminiWithHedge gone from the SOURCE', bad('6b', ['the source does not carry streamGeminiWithHedge']), { setup: () => commitVariant([['electron/LLMHelper.ts', replaceAll('streamGeminiWithHedge', 'streamGeminiWithHedgx')]]) });
    add('S1', 'a stale build: electron/LLMHelper.ts newer than dist-electron/electron/LLMHelper.js', bad('9', ['is older than electron/LLMHelper.ts']),
        { noFreshen: true, setup: () => { const f = stubFile('electron/LLMHelper.ts'); const st = fs.statSync(f); const t = new Date(Date.now() + 60000); fs.utimesSync(f, t, t); return { undo: () => fs.utimesSync(f, st.atime, st.mtime) }; } });

    // -- 11: ANSWER_MODELS
    const AM = "export const ANSWER_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'];";
    const am = (rep) => [['electron/test/golden/interview60.flight.mjs', (t) => { if (!t.includes(AM)) throw new Error('ANSWER_MODELS line not found'); return t.replace(AM, rep); }]];
    add('N1', 'a Groq id added to ANSWER_MODELS', bad('11', ['ANSWER_MODELS is ["gemini-3.1-flash-lite","gemini-3.5-flash-lite","groq/llama-3.3-70b-versatile"]']), { setup: () => commitVariant(am("export const ANSWER_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'groq/llama-3.3-70b-versatile'];")) });
    add('N3', 'ANSWER_MODELS reordered', bad('11', ['not exactly']), { setup: () => commitVariant(am("export const ANSWER_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];")) });
    add('N4', 'ANSWER_MODELS export removed', bad('11', ['ANSWER_MODELS is undefined']), { setup: () => commitVariant(am("const ANSWER_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'];")) });
    add('N5', 'interview60.flight.mjs that does not load (a syntax error)', bad('11', ['interview60.flight.mjs does not load under this environment']), { setup: () => commitVariant([['electron/test/golden/interview60.flight.mjs', (t) => `${t}\n}}}\n`]]) });

    // -- 12: the cue build
    add('Q1', 'a dist WITHOUT CUE_LINE_PREFIX', bad('12', ['the dist is not the combined cue build', 'dist-proof.mjs exit 1', 'filter x0 "CUE_LINE_PREFIX"']), { setup: () => ({ undo: edit(`${D}llm/verbalStreamFilter.js`, replaceAll('CUE_LINE_PREFIX', 'CUE_LINE_PFX')) }) });
    add('Q2', 'the built filter without `function trimCues`', bad('12', ['has no "function trimCues"', 'filter x0 "function trimCues"']), { setup: () => ({ undo: edit(`${D}llm/verbalStreamFilter.js`, replaceAll('function trimCues', 'function trimCuez')) }) });
    add('Q3', 'the SOURCE prompts.ts without a CUE_RULE declaration', bad('12', ['the source electron/llm/prompts.ts does not declare CUE_RULE']),
        { setup: () => commitVariant([['electron/llm/prompts.ts', (t) => t.replace('export const CUE_RULE =', '// CUE_RULE was removed here\nconst CUE_RULE_GONE =')]]) });
    add('Q5', 'a dist with the CUE_RULE changed (the benched rule\'s hash no longer reads 8e15e4e7dd41)', bad('12', ['dist-proof.mjs exit 1', 'BAD CUE_RULE sha256/12']),
        { setup: () => ({ undo: edit(`${D}llm/prompts.js`, (t) => { const i = t.indexOf('const CUE_RULE = `'); if (i < 0) throw new Error('CUE_RULE not found'); return `${t.slice(0, i)}const CUE_RULE = \`CHANGED ${t.slice(i + 'const CUE_RULE = `'.length)}`; }) }) });
    add('Q6', 'the built filter missing altogether', bad('12', ['cannot read dist-electron/electron/llm/verbalStreamFilter.js: ENOENT']), { setup: () => ({ undo: removeFile(`${D}llm/verbalStreamFilter.js`) }) });

    // -- e2: the four EQ markers, dist and source, and freshness
    const EQM = [['llm/earlierQuestion', 'EARLIER QUESTION (asked earlier; context only'], ['IntelligenceEngine', 'earlier question: gate='], ['main', 'describeEarlierQuestionAtStartup'], ['llm/WhatToAnswerLLM', 'earlierQuestionBlock']];
    for (const [i, [rel, needle]] of EQM.entries()) {
        const broken = `${needle.slice(0, -1)}#`;
        const marker = i === 2 ? 'describeEarlierQuestionAtStartup' : needle;
        add(`D${i + 1}`, `e2: the BUILT ${rel}.js without the marker "${marker}"`, bad('e2', [`the built dist-electron/electron/${rel}.js does not carry the earlier-question marker`]),
            { setup: () => ({ undo: edit(`${D}${rel}.js`, replaceAll(needle, broken)) }) });
        add(`D${i + 1}s`, `e2: the SOURCE electron/${rel}.ts without the marker (a clean tree at a commit that drops it)`, bad('e2', [`the source electron/${rel}.ts does not carry the earlier-question marker`]),
            { setup: () => commitVariant([[`electron/${rel}.ts`, replaceAll(needle, broken)]]) });
    }
    add('D5', 'e2: a dist file MISSING (main.js): dist-proof (check 12) reads main.js first and refuses before e2 is reached, by name', bad('12', ['dist-proof.mjs exit 2', 'missing main']), { setup: () => ({ undo: removeFile(`${D}main.js`) }) });
    add('D6', 'e2: a stale EQ dist: electron/IntelligenceEngine.ts newer than dist-electron/electron/IntelligenceEngine.js (markers all present)', bad('e2', ['IntelligenceEngine.js', 'is older than electron/IntelligenceEngine.ts']),
        { noFreshen: true, setup: () => { freshenDist(); const f = stubFile('electron/IntelligenceEngine.ts'); const st = fs.statSync(f); const t = new Date(Date.now() + 60000); fs.utimesSync(f, t, t); return { undo: () => fs.utimesSync(f, st.atime, st.mtime) }; } });

    // -- g1: parity (A3.7) and the smoke result
    const par = (n) => ({ args: { '--parity-script': path.join(STUBS, n) } });
    add('P1', 'g1: a parity stub that prints the OLD line (without "+ 117 captured prompt-line rows") and exits 0 -> FAILED g1', bad('g1', ['did not print the expected line "PARITY DIST: 126 fixture entries (21 with a block) + 29 invented cases + 117 captured prompt-line rows; mismatches 0"']), par('parity-old-line.mjs'));
    add('P2', 'g1: a parity stub with both right lines but exit 1', bad('g1', ['parity-dist exited 1, not 0']), par('parity-exit1.mjs'));
    add('P3', 'g1: a parity stub that prints nothing and exits 0', bad('g1', ['did not print the expected line "EARLIER-QUESTION REF TESTS: 47/47 passed"']), par('parity-silent.mjs'));
    add('P4', 'g1: a parity script that does not exist', bad('g1', ['parity-dist exited 1, not 0']), par('no-such-parity.mjs'));
    add('P5', 'g1: the stub parity with both right lines and exit 0 -> GUARD OK', ok('parity-dist exit 0 with both exact lines'), par('parity-good.mjs'));
    add('P6', 'g1: the REAL parity-dist with EQ_DIST_BREAK=1 inherited (it corrupts the ledger texts: MISMATCH lines, exit 1)', bad('g1', ['parity-dist exited 1, not 0']), { env: { EQ_DIST_BREAK: '1' } });
    const res = (n) => ({ args: { '--smoke-result': path.join(STUBS, n) } });
    add('P7', 'g1: the smoke result is absent', bad('g1', ['does not exist - the smoke (b3) has not run']), res('result-none.md'));
    add('P8', 'g1: the smoke result has no WHY line', bad('g1', ['has no "WHY: gate=parent-in-prompt cue=short chars=0 turn=<n>" line']), res('result-no-why.md'));
    add('P8b', 'g1: the WHY line carries chars=12', bad('g1', ['has no "WHY: gate=parent-in-prompt']), res('result-why-chars.md'));
    add('P8c', 'g1: the WHY line carries gate=block', bad('g1', ['has no "WHY: gate=parent-in-prompt']), res('result-why-gate.md'));
    add('P9', 'g1: S1Q04F chars=199 (below 200)', bad('g1', ['S1Q04F block is 199 chars, outside 200..578']), res('result-chars-199.md'));
    add('P10', 'g1: S1Q04F chars=200 -> GUARD OK (the lower bound is inclusive)', ok('S1Q04F 200'), res('result-chars-200.md'));
    add('P11', 'g1: S1Q06F chars=578 -> GUARD OK (the upper bound is inclusive)', ok('S1Q06F 578'), res('result-chars-578.md'));
    add('P12', 'g1: S1Q06F chars=579', bad('g1', ['S1Q06F block is 579 chars, outside 200..578']), res('result-chars-579.md'));
    add('P13', 'g1: S1Q06F with cue=constraint (the pronoun cue is required)', bad('g1', ['has no "S1Q06F: gate=block cue=pronoun chars=<n> turn=<n>" line']), res('result-wrong-cue.md'));
    add('P14', 'g1: no S1Q04F line', bad('g1', ['has no "S1Q04F: gate=block cue=constraint']), res('result-no-q04f.md'));
    add('P15', 'g1: the result contains NOT EXERCISED', bad('g1', ['contains "NOT EXERCISED"']), res('result-not-exercised.md'));

    // -- 13: knowledge mode in the persisted settings
    add('W1', 'check 13: --settings the -off stub (knowledgeMode false)', bad('13', ['knowledge mode is not ON: knowledgeMode is false (the boolean true is required)', 'settings-off.json (mtime ']), withSettings('settings-off.json'));
    add('W2', 'check 13: no knowledgeMode key', bad('13', ['knowledgeMode is absent (main.ts restores nothing: knowledge mode OFF)']), withSettings('settings-absent.json'));
    add('W4', 'check 13: a settings file that is not JSON: FAILED, and the file\'s text is not quoted', bad('13', ['cannot read the persisted settings', 'not valid JSON'], ['not json']), withSettings('settings-broken.json'));
    add('W5', 'check 13: a missing settings file', bad('13', ['ENOENT']), withSettings('settings-missing.json'));
    add('W6', 'check 13: knowledgeMode the STRING "true" is not the boolean true', bad('13', ['knowledgeMode is "true" (the boolean true is required)']), withSettings('settings-string-true.json'));
    add('W7', 'check 13: a settings file that is a JSON array', bad('13', ['is not a JSON object']), withSettings('settings-array.json'));
    add('W8', 'check 13 default path: APPDATA = a folder whose natively\\settings.json is ON, no --settings -> GUARD OK', ok('knowledgeMode = true in ', 'appdata'), { args: { '--settings': undefined }, env: { APPDATA: path.join(STUBS, 'appdata', 'on') } });
    add('W9', 'check 13 default path: APPDATA = a folder whose settings are OFF -> FAILED', bad('13', ['knowledgeMode is false']), { args: { '--settings': undefined }, env: { APPDATA: path.join(STUBS, 'appdata', 'off') } });
    add('W10', 'check 13 default path: APPDATA unset and no --settings', bad('13', ['APPDATA is not set']), { args: { '--settings': undefined }, env: { APPDATA: undefined } });

    // -- g2: the night gates
    const night = (n, extra = {}) => ({ args: { '--night-gates-script': path.join(STUBS, n) }, ...extra });
    add('N-a', 'g2: a night-gates stub exiting 1 (power FAIL) -> GUARD FAILED naming it, its lines echoed to stdout', bad('g2', ['night-gates.ps1 exited 1: NIGHT GATES FAILED (1): power']), night('night-fail.ps1', { stdoutContains: ['NIGHT power: FAIL stub'] }));
    add('N-b', 'g2: a night-gates stub that exits 0 but whose last line is not NIGHT GATES OK', bad('g2', ['exited 0 but its last line is "NIGHT standby-ac: OK stub", not "NIGHT GATES OK"']), night('night-noline.ps1'));
    add('N-c', 'g2: a night-gates script that does not exist', bad('g2', ['no-such-night.ps1 does not exist - the night gates cannot be read']), night('no-such-night.ps1'));
    add('N-d', 'g2: the REAL night-gates.ps1 through its own -FakeJson (standby 900 s): the real FAIL lines carry through the child', bad('g2', ['night-gates.ps1 exited 1: NIGHT GATES FAILED (1): standby-ac']), night('night-real-fake.ps1', { stdoutContains: ['NIGHT standby-ac: FAIL'] }));
    add('N-e', 'g2: a night-gates stub that passes -> GUARD OK and the stub\'s path printed', ok('night gates OK'), night('night-ok.ps1', { stdoutContains: ['night gates script: ', 'night-ok.ps1', 'NIGHT GATES OK'] }));

    // -- g5: the precheck stamp (A2.6, A5): now = T + 1 min unless the case says otherwise
    const pcase = (id, name, file, expect, extra = {}) => { const { args: xa, ...rest } = extra; add(id, name, expect, { args: { ...pre(file), ...(xa ?? {}) }, ...rest }); };
    pcase('V1', 'g5: the precheck file missing', 'pre-none.txt', bad('g5', ['does not exist - the precheck task has not run']));
    pcase('V2', 'g5: a stamp 2 h before T', 'pre-ok-2h-old.txt', bad('g5', ['is older than T - 10 min']));
    pcase('V3', 'g5: the file ends with PRECHECK FAILED', 'pre-failed.txt', bad('g5', ['does not end with a PRECHECK OK line']));
    pcase('V4', 'g5: a fresh PRECHECK OK (T - 7 min) with now = T + 1 -> accepted', 'pre-ok-t-7.txt', ok('PRECHECK ACCEPTED'));
    pcase('V5', 'g5: the same stamp with now = T + 11 min -> FAILED (A3.7)', 'pre-ok-t-7.txt', bad('g5', ['is later than T + 10 min']), { args: { '--now': '2026-10-05T21:11:00+03:00' } });
    pcase('V6', 'g5: the same stamp with now = T + 10 min -> accepted (the bound is inclusive)', 'pre-ok-t-7.txt', ok('PRECHECK ACCEPTED'), { args: { '--now': '2026-10-05T21:10:00+03:00' } });
    pcase('V7', 'g5: a stamp at exactly T - 10 min -> accepted', 'pre-ok-t-10.txt', ok('PRECHECK ACCEPTED 2026-10-05T20:50:00+03'));
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
    add('Y3', 'the parity child that outlives its timeout (cut to 1 ms)', bad('g1', ['could not run the parity script', 'ETIMEDOUT']), { layout: 'mutant-timeout-parity' });
    add('Y4', 'the night-gates child that outlives its timeout (cut to 1 ms)', bad('g2', ['could not run', 'ETIMEDOUT']), { layout: 'mutant-timeout-night' });
    add('U1', 'usage: --settings with no file', bad('usage', ['--settings needs a value']), { rawArgs: ['--settings'] });
    add('U2', 'usage: an unknown argument is refused, not ignored', bad('usage', ['unknown argument(s): --setings']), { rawArgs: ['--setings', SETTINGS_ON] });
    add('U3', 'usage: --night-gates-script followed by another option (no value)', bad('usage', ['--night-gates-script needs a value']), { rawArgs: ['--night-gates-script', '--require-precheck'] });
    return C;
}

function mainCases(ctx) {
    const C = [];
    const add = (id, name, expect, o = {}) => C.push({ where: 'main', id, name, expect, args: { '--settings': REAL_SETTINGS }, ...o });
    add('X1', 'MAIN\'s root, NATIVELY_FLIGHT_COMMIT = the PARENT of MAIN\'s current HEAD (A5 m7, step 8: the moved-HEAD case; never a commit on MAIN) -> FAILED at 10b', bad('10b', [`MAIN HEAD is ${ctx.mainHead}, not the registered commit ${ctx.mainParent}`]), { commit: ctx.mainParent });
    add('X2', 'MAIN\'s root, NATIVELY_FLIGHT_COMMIT unset -> FAILED at 10b', bad('10b', ['NATIVELY_FLIGHT_COMMIT is not set']), { commit: undefined });
    add('X3', 'MAIN\'s root, commit = MAIN\'s HEAD, the REAL smoke-result path (the smoke has not written RESULT-smoke-eq.md yet): 1-13 up to g1 pass on MAIN\'s REAL tree, dist, parity-dist and harness, then g1 refuses on the absent smoke result. INFORMATION: the reading changes the day the smoke result exists',
        { exit: 1, line: /^GUARD (FAILED: \(g1\) |OK: )/, contains: [], notContains: [] }, { commit: ctx.mainHead, args: { '--settings': REAL_SETTINGS, '--smoke-result': undefined }, info: true, lenient: true });
    add('X4', 'MAIN\'s root, commit = MAIN\'s HEAD, T 2026-10-05 21:00, the smoke-result STUB and the REAL settings (admin share) and the REAL night-gates and parity: the TRUE environment on MAIN\'s real tree -> GUARD OK (dry form). The stub result is the one substitution',
        ok('roster scenario50 S1,S2 (40 items)', 'night gates OK', 'precheck not required (dry twin)', 'smoke result holds WHY and the blocks'), { commit: ctx.mainHead, args: { '--settings': REAL_SETTINGS, '--smoke-result': path.join(STUBS, 'result-ok.md') }, full: true, info: true });
    add('X5', 'MAIN\'s root, the true environment but the hedge variable set to 1 -> FAILED at 6 (read from MAIN\'s real dist)', bad('6', ['NATIVELY_VERBAL_HEDGE is set ("1")']), { commit: ctx.mainHead, env: { NATIVELY_VERBAL_HEDGE: '1' } });
    add('X6', 'MAIN\'s root, the flag unset -> FAILED at e1 (read from MAIN\'s real built describer)', bad('e1', ['NATIVELY_EARLIER_QUESTION is unset']), { commit: ctx.mainHead, env: { NATIVELY_EARLIER_QUESTION: undefined } });
    add('X7', 'MAIN\'s root, NATIVELY_FLIGHT_FOCUSED unset -> FAILED at g3 (MAIN\'s real harness has the P2 edit; without the variable the four Flash arms would fly)', bad('g3', ['NATIVELY_FLIGHT_FOCUSED is unset']), { commit: ctx.mainHead, env: { NATIVELY_FLIGHT_FOCUSED: undefined } });
    return C;
}

// running --------------------------------------------------------------------------------------------------------------
function childEnv(over, commit) {
    const env = { ...process.env };
    for (const k of Object.keys(env)) if (/^(NATIVELY_|EQ_)/i.test(k)) delete env[k];      // the launcher's clean slate
    Object.assign(env, { NATIVELY_STT_PROVIDER: 'deepgram', NATIVELY_ROSTER: 'scenario50', NATIVELY_SCENARIOS: 'S1,S2', NATIVELY_EARLIER_QUESTION: '1', NATIVELY_FLIGHT_FOCUSED: 'off', NATIVELY_EQ_T: T_OK });
    if (commit !== undefined) env.NATIVELY_FLIGHT_COMMIT = commit;
    Object.assign(env, over ?? {});
    for (const [k, v] of Object.entries(env)) if (v === undefined) delete env[k];
    return env;
}
function argvOf(c, layout) {
    if (c.rawArgs) return c.rawArgs;
    const a = { ...baseArgs(), ...(layout ? { '--parity-script': REAL_PARITY, '--night-gates-script': REAL_NIGHT } : {}), ...(c.args ?? {}) };
    const out = [];
    for (const [k, v] of Object.entries(a)) { if (v === undefined) continue; if (v === true) out.push(k); else out.push(k, v); }
    return out;
}
function runGuard(c, cwd, guardPath, layout) {
    const commit = 'commit' in c ? c.commit : (c.commitFn ? c.commitFn(headOf(cwd)) : headOf(cwd));
    return spawnSync(process.execPath, [guardPath, ...argvOf(c, layout)], { cwd, env: childEnv(c.env, commit), encoding: 'utf8', timeout: 180000 });
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
        try { r = runGuard(c, cwd, g, !!(c.layout || guardPath !== GUARD)); } finally { if (handle.undo) handle.undo(); }
        const { line, why } = judge(c, r);
        const good = why.length === 0;
        verdicts.push({ id: c.id, good, line });
        if (!quiet) {
            results.push({ id: c.id, good, info: !!c.info });
            log(`${good ? 'ok  ' : (c.info ? 'INFO' : 'BAD ')} ${c.id.padEnd(5)} ${c.name}`);
            log(`      exit ${r.status} :: ${clip(line ?? '(no line)', c.full ? 4000 : 700)}`);
            if (!good) log(`      NOT AS EXPECTED: ${why.join('; ')}`);
        }
    }
    if (title) log('');
    return verdicts;
}

// main -----------------------------------------------------------------------------------------------------------------
buildStub();
writeStubs();
const ctx = { mainHead: headOf(MAIN), mainParent: headOf(MAIN, 'HEAD~1') };
fs.rmSync(LAYOUT, { recursive: true, force: true });
const layouts = {
    faithful: buildLayout('faithful'),
    'mutant-timeout-dp': buildLayout('mutant-timeout-dp', { mutate: (g) => g.replace("cwd: PROJ, timeout: 120000 });\nconst VERDICT", 'cwd: PROJ, timeout: 1 });\nconst VERDICT') }),
    'mutant-timeout-revparse': buildLayout('mutant-timeout-revparse', { mutate: (g) => g.replace("stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 }).trim();", "stdio: ['ignore', 'pipe', 'pipe'], timeout: 1 }).trim();") }),
    'mutant-timeout-parity': buildLayout('mutant-timeout-parity', { mutate: (g) => g.replace('const pd = spawnSync(process.execPath, [PARITY], { encoding: \'utf8\', cwd: PROJ, timeout: 120000 });', 'const pd = spawnSync(process.execPath, [PARITY], { encoding: \'utf8\', cwd: PROJ, timeout: 1 });') }),
    'mutant-timeout-night': buildLayout('mutant-timeout-night', { mutate: (g) => g.replace("'-At', eqT], { encoding: 'utf8', cwd: PROJ, timeout: 120000 });", "'-At', eqT], { encoding: 'utf8', cwd: PROJ, timeout: 1 });") }),
};
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const faithfulOk = sha(layouts.faithful) === sha(GUARD);

log('guard-eq.mjs calibration (A2.10 P6, A3.7, A5; guard-h40d-cal.mjs\'s pattern)');
log('');
log('SETUP');
log(`  guard under test: ${GUARD} (the real file, run as a child; cwd = the stub tree or MAIN's root; node ${process.version}); sha256/12 ${sha(GUARD).slice(0, 12)}`);
log(`  stub tree: ${STUB} - a throwaway git repo (never MAIN) built from REAL files of MAIN (HEAD ${ctx.mainHead.slice(0, 7)}, read only): the LLMHelper, prompts, IntentClassifier, four EQ sources, the golden roster/flight files and the WHOLE dist-electron (946 files); stub base commit ${headOf(STUB, 'HEAD~1').slice(0, 7)}, second ${headOf(STUB).slice(0, 7)}`);
log(`  MAIN: ${MAIN} (HEAD ${ctx.mainHead}, its parent ${ctx.mainParent}); MAIN is only read`);
log(`  layout mirror ${LAYOUT}: E-shaped folders holding COPIES of the guard; the faithful copy is ${faithfulOk ? 'byte-identical to the guard (sha256 equal)' : 'NOT identical to the guard (BAD)'}`);
log('  every case: the child inherits this session\'s environment minus every NATIVELY_* and EQ_* name (the launcher\'s clean slate), plus NATIVELY_STT_PROVIDER=deepgram, NATIVELY_ROSTER=scenario50, NATIVELY_SCENARIOS=S1,S2, NATIVELY_EARLIER_QUESTION=1, NATIVELY_FLIGHT_FOCUSED=off, NATIVELY_EQ_T=2026-10-05 21:00, NATIVELY_FLIGHT_COMMIT=<the stub HEAD>, and the options --settings <the -on stub> --smoke-result <a stub in the check-smoke-eq note format> unless the case says otherwise; parity-dist and night-gates.ps1 are the REAL scripts unless a case names a stub');
log('  a case counts as ok only if the exit code, the named check tag, the wanted message fragments (and the unwanted ones: no value is leaked) all read as expected, and a failing guard printed exactly one stderr line and no GUARD OK');
log('');
results.push({ id: 'layout', good: faithfulOk });

{
    const p = spawnSync(process.execPath, [path.join(E, 'guard-eq-git-cal.mjs')], { encoding: 'utf8' });
    log('PURE PREDICATE CALIBRATION (guard-eq-git-cal.mjs: captured status strings incl. the real capture of MAIN, no git call)');
    for (const l of p.stdout.trim().split(/\r?\n/).slice(-2)) log(`  ${clip(l, 330)}`);
    results.push({ id: 'predicate', good: p.status === 0 });
    log('');
}

const stubList = stubCases();
runCases('STUB TREE CASES (each breaks one premise of the correct environment A1)', stubList, STUB, { layouts });
runCases('AGAINST MAIN\'S ROOT (MAIN\'s real tree, dist, harness; read only)', mainCases(ctx), MAIN);
runCases('WRONG FOLDER (the launcher\'s own folder guard exits 9 before the guard; if it were run anyway)', [
    { where: 'wrong', id: 'Z1', name: 'the guard run with cwd = E (not a checkout): the roster import fails, by name', expect: bad('1', ['roster.mjs does not load under this environment']), commit: '0'.repeat(40) },
], E);

// the launcher seam ----------------------------------------------------------------------------------------------------
// cmd.exe, a .cmd of `set NAME=` lines (a bare `set NAME=` UNSETS NAME in cmd), the guard by absolute path, cwd = the tree.
{
    const SEAM = path.join(LAYOUT, 'seam');
    fs.mkdirSync(SEAM, { recursive: true });
    const blockLines = ['set NATIVELY_STT_PROVIDER=deepgram', 'set NATIVELY_ROSTER=scenario50', 'set NATIVELY_SCENARIOS=S1,S2', 'set NATIVELY_GEMINI_THINKING_LEVEL=', 'set NATIVELY_VERBAL_PRIMARY_MODEL=', 'set NATIVELY_VERBAL_HEDGE=', 'set NATIVELY_VERBAL_HEDGE_TRIGGER_MS=', 'set NATIVELY_FOLLOWUP_PARENT='];
    const goodTail = ['set NATIVELY_EARLIER_QUESTION=1', 'set NATIVELY_FLIGHT_FOCUSED=off', `set NATIVELY_EQ_T=${T_OK}`];
    const seamHead = headOf(STUB);
    const seam = (id, name, expect, extraLines, parentEnv = {}, info = false) => {
        // the .cmd must stay ASCII (cmd reads it in the OEM code page) and E holds a non-ASCII folder name: every path is %~dp0-relative, as the real launchers' guard line is
        const rel = (p) => `%~dp0${path.relative(SEAM, p)}`;
        const lines = ['@echo off', ...blockLines, ...extraLines, `set APPDATA=${rel(path.join(STUBS, 'appdata', 'on'))}`, `"C:\\Program Files\\nodejs\\node.exe" "${rel(GUARD)}" --smoke-result "${rel(path.join(STUBS, 'result-ok.md'))}"`];
        const text = `${lines.join('\r\n')}\r\n`;
        if (!/^[\x00-\x7f]*$/.test(text)) throw new Error('calibration bug: the seam .cmd is not ASCII');
        const f = path.join(SEAM, `${id}.cmd`);
        fs.writeFileSync(f, text, 'latin1');
        const env = { ...process.env };
        for (const k of Object.keys(env)) if (/^(NATIVELY_|EQ_)/i.test(k)) delete env[k];
        Object.assign(env, parentEnv);
        freshenDist();
        const r = spawnSync('cmd.exe', ['/c', f], { cwd: STUB, env, encoding: 'utf8', timeout: 180000 });
        const c = { id, name, expect };
        const { line, why } = judge(c, r);
        results.push({ id, good: why.length === 0, info });
        log(`${why.length === 0 ? 'ok  ' : (info ? 'INFO' : 'BAD ')} ${id.padEnd(5)} ${name}`);
        log(`      exit ${r.status} :: ${clip(line ?? '(no line)', 500)}`);
        if (why.length) log(`      NOT AS EXPECTED: ${why.join('; ')}`);
    };
    const withCommit = (extra) => [...extra, `set NATIVELY_FLIGHT_COMMIT=${seamHead}`];
    log('LAUNCHER SEAM (cmd.exe running a .cmd of `set` lines, then the guard; the parent environment may carry a variable the .cmd must clear or set)');
    seam('K1', 'the launcher\'s block (flag 1, focused off, T set, the commit set) -> GUARD OK', ok('earlier question flag exactly 1', `T ${T_OK}`, 'focused Flash arms OFF'), withCommit(goodTail));
    seam('K2', 'the PARENT environment carries NATIVELY_EARLIER_QUESTION=0 and NATIVELY_FLIGHT_FOCUSED=on (persistent user variables); the .cmd\'s `set` lines override both for the node child -> GUARD OK', ok('earlier question flag exactly 1', 'focused Flash arms OFF'), withCommit(goodTail), { NATIVELY_EARLIER_QUESTION: '0', NATIVELY_FLIGHT_FOCUSED: 'on' });
    seam('K3', 'NO `set NATIVELY_EARLIER_QUESTION=1` line (the parent carries nothing) -> the guard refuses at e1', bad('e1', ['NATIVELY_EARLIER_QUESTION is unset']), withCommit(['set NATIVELY_FLIGHT_FOCUSED=off', `set NATIVELY_EQ_T=${T_OK}`]));
    seam('K4', 'a trailing space after the flag value (`set NATIVELY_EARLIER_QUESTION=1 `): cmd stores "1 ", so the guard refuses: the launcher generator must not leave one', bad('e1', ['NATIVELY_EARLIER_QUESTION is "1 ", not exactly "1"']), withCommit(['set NATIVELY_EARLIER_QUESTION=1 ', 'set NATIVELY_FLIGHT_FOCUSED=off', `set NATIVELY_EQ_T=${T_OK}`]));
    seam('K5', 'a trailing space after T (`set NATIVELY_EQ_T=2026-10-05 21:00 `) -> the guard refuses at g4', bad('g4', ['not a yyyy-MM-dd HH:mm local time']), withCommit(['set NATIVELY_EARLIER_QUESTION=1', 'set NATIVELY_FLIGHT_FOCUSED=off', `set NATIVELY_EQ_T=${T_OK} `]));
    seam('K6', 'the T value holds a SPACE, unquoted (`set NATIVELY_EQ_T=2026-10-05 21:00`): cmd keeps the whole text -> arrives intact (K1 passed on it); with the placeholder token instead -> the guard refuses at g4, naming it', bad('g4', ['NATIVELY_EQ_T is "@@T@@"']), withCommit(['set NATIVELY_EARLIER_QUESTION=1', 'set NATIVELY_FLIGHT_FOCUSED=off', 'set NATIVELY_EQ_T=@@T@@']));
    seam('K7', 'the PARENT carries NATIVELY_FLIGHT_FOCUSED=off and the .cmd does not set it (a persistent user variable would silently satisfy the guard): the guard sees "off" and passes. INFORMATION: the launcher sets the name itself, so this case documents what the guard cannot tell (variable origin)', ok('focused Flash arms OFF'), withCommit(['set NATIVELY_EARLIER_QUESTION=1', `set NATIVELY_EQ_T=${T_OK}`]), { NATIVELY_FLIGHT_FOCUSED: 'off' }, true);
    log('');
}

// the mutation suite (rule 8) -------------------------------------------------------------------------------------------
const MUTANTS = [
    ['e1-flag-not-exact', ["if (eqVar !== '1') fail(", 'if (false) fail('], ['Q-e1a', 'Q-e1b', 'Q-e1c', 'Q-e1d']],
    ['e1-describer-not-read', ["if (eqLine !== 'earlier question: on') fail(", 'if (false) fail('], ['Q-e1e']],
    ['g4-unparseable-allowed', ['if (!Number.isFinite(tMs)) fail(', 'if (false) fail('], ['G4a', 'G4g', 'G4h', 'G4i', 'G4j', 'G4l']],
    ['g4-range-not-checked', ['if (tMs < T_MIN || tMs > T_MAX) fail(', 'if (false) fail('], ['G4b', 'G4c', 'G4f', 'G4k']],
    ['g4-lower-bound-exclusive', ['if (tMs < T_MIN || tMs > T_MAX) fail(', 'if (tMs <= T_MIN || tMs > T_MAX) fail('], ['G4d']],
    ['g4-upper-bound-exclusive', ['if (tMs < T_MIN || tMs > T_MAX) fail(', 'if (tMs < T_MIN || tMs >= T_MAX) fail('], ['G4e']],
    ['g3-variable-not-checked', ["if (focusedVar !== 'off') fail(", 'if (false) fail('], ['G3a', 'G3b', 'G3c', 'G3d']],
    ['g3-focusedFor-not-called', ["if (typeof flightMjs.focusedFor !== 'function') fail(", 'if (false) fail('], ['G3f']],
    ['g3-focusedFor-null-not-required', ['if (focusedPick !== null) fail(', 'if (false) fail('], ['G3e']],
    ['g3-marker-not-checked', ["if (!readText('g3', ", "if (false && !readText('g3', "], ['G3g']],
    ['e2-dist-marker-not-checked', ['if (!readText(\'e2\', distFile).includes(needle)) fail(', 'if (false) fail('], ['D1', 'D2', 'D3', 'D4']],
    ['e2-source-marker-not-checked', ['if (!readText(\'e2\', srcFile).includes(needle)) fail(', 'if (false) fail('], ['D1s', 'D2s', 'D3s', 'D4s']],
    ['e2-staleness-not-checked', ['if (dm < sm) fail(', 'if (false) fail('], ['D6']],
    ['g1-parity-exit-ignored', ['if (pd.status !== 0) fail(', 'if (false) fail('], ['P2', 'P4', 'P6']],
    ['g1-parity-lines-ignored', ['for (const want of PARITY_LINES) if (!pdLines.has(want)) fail(', 'for (const want of PARITY_LINES) if (false) fail('], ['P1', 'P3']],
    ['g1-smoke-result-not-required', ['if (!fs.existsSync(SMOKE_RESULT)) fail(', 'if (false) fail('], ['P7']],
    ['g1-chars-range-not-checked', ['if (!(chars >= 200 && chars <= 578)) fail(', 'if (false) fail('], ['P9', 'P12']],
    ['g1-why-not-required', ["if (!why || why[1] !== '0') fail(", 'if (false) fail('], ['P8', 'P8b', 'P8c']],
    ['g1-not-exercised-allowed', ['if (/NOT EXERCISED/.test(smokeText)) fail(', 'if (false) fail('], ['P15']],
    ['g2-exit-ignored', ['if (ng.status !== 0) fail(', 'if (false) fail('], ['N-a', 'N-d']],
    ['g2-script-not-required', ['if (!fs.existsSync(NIGHT)) fail(', 'if (false) fail('], ['N-c']],
    ['g2-last-line-ignored', ["if (ngLines[ngLines.length - 1] !== 'NIGHT GATES OK') fail(", 'if (false) fail('], ['N-b']],
    ['g5-last-line-not-required', ['if (!sm) fail(', 'if (false) fail('], ['V3', 'V10', 'V11', 'V13', 'V14']],
    ['g5-stamp-age-not-checked', ['if (stampMs < tMs - 10 * 60000) fail(', 'if (false) fail('], ['V2', 'V8']],
    ['g5-stamp-future-not-checked', ['if (stampMs > nowMs) fail(', 'if (false) fail('], ['V9']],
    ['g5-now-late-not-checked', ['if (nowMs > tMs + 10 * 60000) fail(', 'if (false) fail('], ['V5']],
    ['g5-file-not-required', ['if (!fs.existsSync(pcFile)) fail(', 'if (false) fail('], ['V1']],
    ['g5-always-required-off (the --require-precheck gate removed: the precheck is never read)', ["if (opts['--require-precheck']) {", 'if (false) {'], ['V1', 'V2', 'V3']],
    ['hedge-variable-not-checked (check 6)', ['if (hedgeVar !== undefined) fail(', 'if (false) fail('], ['H1', 'H2', 'H4']],
    ['follow-up-not-checked (check 8)', ['if (followUpOn !== false) fail(', 'if (false) fail('], ['F1']],
    ['commit-not-compared (check 10b)', ['if (head !== registeredCommit) fail(', 'if (false) fail('], ['B2', 'B2b']],
    ['tree-not-checked (check 10b)', ['if (dirty.length) fail(', 'if (false) fail('], ['B6', 'B7', 'B8', 'B9', 'B10']],
    ['roster-count-not-checked (check 1)', ['if (R.INTERVIEW.length !== 40) fail(', 'if (false) fail('], ['R3', 'R4']],
    ['groq-test-only (check 11, the loose reading)', ['if (!answerModelsMatch) fail(', "if ((actualAnswerModels ?? []).some((id) => String(id).includes('/'))) fail("], ['N3', 'N4']],
    ['dist-proof-verdict-ignored (check 12)', ['const dpOk = !dp.error && dp.status === 0 && dp.stdout.includes(VERDICT);', 'const dpOk = true;'], ['Q1', 'Q2', 'Q5']],
    ['knowledge-mode-not-checked (check 13)', ['if (knowledgeMode !== true) {', 'if (false) {'], ['W1', 'W2', 'W6', 'W9']],
    ['env-scan-skipped (check 10a)', ['if (clash.length) fail(', 'if (false) fail('], ['E1', 'E2', 'E3', 'E4', 'E7', 'E8']],
    ['uncaught-handler-removed', ["process.on('uncaughtException', (e) =>", "process.on('uncaughtExceptionX', (e) =>"], ['I1']],
];
const byId = Object.fromEntries(stubList.map((c) => [c.id, c]));
log('MUTATION SUITE (rule 8): a copy of the guard with ONE check switched off, run over the cases that must notice it. "caught" = every listed case turned BAD and A1 stayed ok.');
let mutantsCaught = 0;
for (const [name, [find, repl], mustTurnBad] of MUTANTS) {
    const gp = buildLayout(`mutant-${mutantsCaught}-${name.split(' ')[0]}`, { mutate: (g) => { if (!g.includes(find)) throw new Error(`calibration bug: mutant "${name}": the text to switch off was not found in the guard: ${find}`); return g.replace(find, repl); } });
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
const final = runGuard({ args: {} }, STUB, GUARD, false);
const finalOk = final.status === 0 && /GUARD OK: /.test(final.stdout);
log('FINAL: the stub tree as left on disk, correct environment');
log(`${finalOk ? 'ok  ' : 'BAD '} exit ${final.status} :: ${clip((final.stdout.split(/\r?\n/).find((l) => l.startsWith('GUARD OK: ')) ?? final.stdout), 200)}`);
results.push({ id: 'final', good: finalOk });
log('');

const counted = results.filter((x) => !x.info);
const bads = counted.filter((x) => !x.good);
const caseCount = counted.filter((x) => !x.id.startsWith('mutant:') && !['layout', 'final', 'predicate'].includes(x.id)).length;
log(bads.length === 0
    ? `GUARD CALIBRATION OK ${counted.length}/${counted.length}: ${caseCount} cases (stub tree, MAIN's root, the cmd.exe launcher seam), ${mutantsCaught}/${MUTANTS.length} mutants caught, the pure predicate, the layout mirror and the final stub state ok; ${results.filter((x) => x.info).length} informational cases recorded and not counted`
    : `GUARD CALIBRATION FAILED: ${bads.map((b) => b.id).join(', ')} (${counted.length - bads.length}/${counted.length} ok)`);
for (const d of fs.readdirSync(LAYOUT)) if (d.startsWith('mutant-')) fs.rmSync(path.join(LAYOUT, d), { recursive: true, force: true });
fs.writeFileSync(OUT, `${out.join('\n')}\n`);
process.exit(bads.length === 0 ? 0 : 1);
