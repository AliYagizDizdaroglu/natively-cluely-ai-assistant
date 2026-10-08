// Calibration runner for VH\guard-h40d.mjs (instrument builder A; r4 7.4: "breaking each premise once, h40c's
// guard-h40c-cal.txt pattern, in a stub tree and against MAIN's root"). It (re)builds the stub tree
// VH\instruments\guard-cal\ from REAL files of the cue worktree WT (the code MAIN becomes equal to after the merge:
// its combined-build dist-electron, LLMHelper.ts / prompts.ts / IntentClassifier.ts, the golden harness files), makes
// the stub a throwaway git repo (never MAIN), then runs the REAL guard file as a child with cwd = the stub, once per
// broken premise, and again with cwd = MAIN's root. Then a MUTATION suite (rule 8): copies of the guard with one
// check switched off, run over the cases that must notice - the cases are not vacuous if each one turns BAD.
// Never starts the app; no network; no model call; MAIN and WT are only read. The only git WRITES are in the stub repo.
//   node guard-h40d-cal.mjs          writes VH\guard-h40d-cal.txt, exit 0 only if every counted case reads as expected
// A case that does not read as expected is a finding, never edited to match (COMMON.md, rule 8).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));      // VH\instruments
const VH = path.resolve(HERE, '..');
const SPDIR = path.resolve(VH, '..');
const GUARD = path.join(VH, 'guard-h40d.mjs');
const STUB = path.join(HERE, 'guard-cal');
const LAYOUT = path.join(HERE, 'guard-cal-layout');             // mirrors SP\ (guard in SP\validation-hour\), for copies of the guard
const APPDATA_STUBS = path.join(HERE, 'guard-cal-appdata');
const KM = path.join(VH, 'kmode-stubs');
const OUT = path.join(VH, 'guard-h40d-cal.txt');

// MAIN, found at run time (no non-ASCII literal): the OneDrive folder that starts with "Masa" AND holds the checkout's
// .git (a mis-encoded twin folder exists beside it and does not).
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
const WT = path.join(MAIN, '.claude', 'worktrees', 'whole-turn');
const home = os.homedir().replace(/\\/g, '/');
const REAL_SETTINGS = `//localhost/${home[0]}$/${home.slice(3)}/AppData/Roaming/natively/settings.json`;   // the admin share: the real file

const gitIn = (dir, ...a) => execFileSync('git', ['--no-optional-locks', '-C', dir, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });   // reads of MAIN and WT must not take their index lock
const gitStub = (...a) => gitIn(STUB, ...a);
const gitStubCommit = (msg) => gitIn(STUB, '-c', 'user.name=cal', '-c', 'user.email=cal@example.invalid', 'commit', '-q', '-m', msg);
const headOf = (dir) => gitIn(dir, 'rev-parse', 'HEAD').trim();

// ---- the stub tree -------------------------------------------------------------------------------------------------
const SOURCES = [
    'electron/LLMHelper.ts', 'electron/llm/prompts.ts', 'electron/knowledge/IntentClassifier.ts',
    'electron/test/golden/roster.mjs', 'electron/test/golden/holdout40.questions.mjs', 'electron/test/golden/interview60.questions.mjs',
    'electron/test/golden/scenario50.questions.mjs', 'electron/test/golden/interview60.flight.mjs',
];
const DIST = [
    'LLMHelper.js', 'IntelligenceEngine.js', 'ipcHandlers.js', 'main.js',
    'llm/prompts.js', 'llm/verbalStreamFilter.js', 'llm/verbalPrimaryModel.js', 'llm/geminiThinking.js', 'llm/verbalHedge.js',
    'llm/followUpParent.js', 'llm/WhatToAnswerLLM.js', 'knowledge/IntentClassifier.js',
];
const put = (rel, text) => { const f = path.join(STUB, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
const copyFromWt = (srcRel, dstRel) => { const f = path.join(STUB, dstRel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.copyFileSync(path.join(WT, srcRel), f); };

function buildStub() {
    fs.rmSync(STUB, { recursive: true, force: true, maxRetries: 5 });
    fs.mkdirSync(STUB, { recursive: true });
    put('package.json', '{"name":"guard-h40d-cal","version":"0.0.0"}\n');
    put('.gitignore', 'dist-electron/\n.env\nnatively_debug.log\nelectron/test/golden/*.stale-*.json\n');   // MAIN's own rules for these
    for (const rel of SOURCES) copyFromWt(rel, rel);
    // the tracked files MAIN's status shows as modified (allowlisted), and a few tracked files at each scope boundary
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
    // dist-electron is ignored and written AFTER the sources, so it is newer than them (check 9)
    for (const rel of DIST) copyFromWt(`dist-electron/electron/${rel}`, `dist-electron/electron/${rel}`);
    // a .env that declares no guarded name (a dummy name and a dummy value): the correct environment must pass with it present
    put('.env', 'UNRELATED_DUMMY_NAME=dummy-value-not-a-key\n');
}

// A mirror of SP\ with a COPY of the guard in SP\validation-hour\ (the guard resolves ../guard-r09.mjs and ../dist-proof.mjs
// from its own location): for a copy with one check switched off (mutants) and for a fake dist-proof. distProof:
// undefined = SP's real one, a string = that text instead, null = no dist-proof at all.
function buildLayout(name, { mutate, distProof } = {}) {
    const root = path.join(LAYOUT, name);
    const vh = path.join(root, 'validation-hour');
    fs.mkdirSync(vh, { recursive: true });
    fs.copyFileSync(path.join(VH, 'guard-h40d-git.mjs'), path.join(vh, 'guard-h40d-git.mjs'));
    fs.copyFileSync(path.join(SPDIR, 'guard-r09.mjs'), path.join(root, 'guard-r09.mjs'));
    if (distProof === undefined) fs.copyFileSync(path.join(SPDIR, 'dist-proof.mjs'), path.join(root, 'dist-proof.mjs'));
    else if (distProof !== null) fs.writeFileSync(path.join(root, 'dist-proof.mjs'), distProof);
    const g = fs.readFileSync(GUARD, 'utf8');
    const m = mutate ? mutate(g) : g;
    if (mutate && m === g) throw new Error(`calibration bug: mutant ${name} changed nothing`);
    fs.writeFileSync(path.join(vh, 'guard-h40d.mjs'), m);
    return path.join(vh, 'guard-h40d.mjs');
}

// ---- helpers for breaking one premise at a time --------------------------------------------------------------------
const stubFile = (rel) => path.join(STUB, rel);
// Edit a stub file in place; throws if the edit changed nothing (a vacuous case proves nothing). Returns the undo.
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
// Commit a variant of tracked files, so the tree is CLEAN at the new HEAD and the broken premise is the only difference
// (check 10b runs before 11-13: an uncommitted edit of a tracked file would be refused there first).
function commitVariant(edits) {
    const base = headOf(STUB);
    for (const [rel, fn] of edits) edit(rel, fn);
    gitStub('add', '-A');
    gitStubCommit('cal variant');
    return { commit: headOf(STUB), undo: () => { gitStub('reset', '--hard', '-q', base); } };
}
const removeFile = (rel) => { const f = stubFile(rel); const before = fs.readFileSync(f); fs.rmSync(f); return () => fs.writeFileSync(f, before); };
const freshenDist = () => {
    const f = stubFile('dist-electron/electron/LLMHelper.js');
    if (!fs.existsSync(f)) return;      // a case that removed it on purpose (M4)
    const t = new Date(Date.now() + 5000);
    fs.utimesSync(f, t, t);
};

const SETTINGS_ON = path.join(KM, 'settings-on.json');
const D = 'dist-electron/electron/';
// The 09-26 behaviour of the built hedge module (before f745d7e: unset = OFF), made by swapping the two lines of the real build.
const oldHedgeDefault = (t) => t.replace('if (!raw || raw === "1") return true;\n  if (raw === "0") return false;', 'if (!raw || raw === "0") return false;\n  if (raw === "1") return true;');
// ... and the hand-written 09-26 stand-in h40c's calibration used (no describeVerbalHedgeAtStartup at all). Returns the undo.
function swapInOldStandIn() {
    const f = stubFile(`${D}llm/verbalHedge.js`);
    const before = fs.readFileSync(f);
    fs.copyFileSync(path.join(SPDIR, 'guard-h40c-cal', 'dist-electron', 'electron', 'llm', 'verbalHedge.js'), f);
    return () => fs.writeFileSync(f, before);
}

// ---- the cases -----------------------------------------------------------------------------------------------------
const ok = (...contains) => ({ exit: 0, line: /^GUARD OK: /, contains, notContains: [] });
const bad = (tag, contains = [], notContains = []) => ({ exit: 1, line: new RegExp(`^GUARD FAILED: \\(${tag}\\) `), contains, notContains });

function stubCases(ctx) {
    const C = [];
    const add = (id, name, expect, o = {}) => C.push({ where: 'stub', id, name, expect, ...o });
    const wantSha = crypto.createHash('sha256').update(fs.readFileSync(stubFile(`${D}llm/verbalStreamFilter.js`))).digest('hex').slice(0, 16);

    add('A1', 'the correct environment (the hedge variable UNSET, every override cleared, the registered commit = the stub HEAD, a .env with an unrelated name, --settings the -on stub) -> GUARD OK',
        ok('roster holdout40 (45 items)', 'hedge ON by default (NATIVELY_VERBAL_HEDGE unset', 'follow-up parent OFF', `filter sha256/16 ${wantSha}`, 'knowledge mode ON (knowledgeMode = true in ', 'tree clean but for the allowlisted paths present [none]', 'ANSWER_MODELS = ["gemini-3.1-flash-lite","gemini-3.5-flash-lite"]'), { full: true });
    add('A2', 'the same, run through the layout mirror (a byte-identical COPY of the guard in SP\\validation-hour\\-shaped folders, the copy the mutants and the fake dist-proofs use) -> GUARD OK', ok(), { layout: 'faithful' });

    // -- 10b: the commit pin and the tree
    add('B1', 'commit unset', bad('10b', ['NATIVELY_FLIGHT_COMMIT is not set']), { env: { NATIVELY_FLIGHT_COMMIT: undefined } });
    add('B2', 'commit wrong (forty zeros: a full hash that is not HEAD)', bad('10b', ['MAIN HEAD is ', 'not the registered commit 0000000000000000000000000000000000000000']), { commit: '0'.repeat(40) });
    add('B3', 'commit abbreviated (the first 7 characters of the right hash)', bad('10b', ['not a full 40-hex commit hash']), { commitFn: (h) => h.slice(0, 7) });
    add('B4', 'commit = the launcher placeholder token (brief D: "make the placeholder impossible to run by accident")', bad('10b', ['NATIVELY_FLIGHT_COMMIT is "<REGISTERED_HEAD>", not a full 40-hex commit hash']), { commit: '<REGISTERED_HEAD>' });
    add('B5', 'commit with a trailing space (a cmd `set X=value ` artifact): trimmed, so the right commit still passes -> GUARD OK', ok('HEAD pinned at '), { commitFn: (h) => `${h} ` });
    add('B6', 'tree dirty: a tracked source file under electron/ edited (a peer edit)', bad('10b', ['the tree the flight\'s rebuild will compile is not clean: electron/knowledge/IntentClassifier.ts']),
        { setup: () => ({ undo: edit('electron/knowledge/IntentClassifier.ts', (t) => `${t}\n// cal dirt\n`) }) });
    add('B7', 'tree dirty: an UNTRACKED file under electron/ that is not on the list', bad('10b', ['not clean: electron/llm/newFile.ts']), { setup: () => ({ undo: addFile('electron/llm/newFile.ts') }) });
    add('B8', 'tree dirty: the build script scripts/build-electron.js edited (in scope since h40d)', bad('10b', ['not clean: scripts/build-electron.js']),
        { setup: () => ({ undo: edit('scripts/build-electron.js', (t) => `${t}// cal dirt\n`) }) });
    add('B9', 'tree dirty: an untracked file under src/', bad('10b', ['not clean: src/new.tsx']), { setup: () => ({ undo: addFile('src/new.tsx') }) });
    add('B10', 'tree dirty: package.json edited', bad('10b', ['not clean: package.json']), { setup: () => ({ undo: edit('package.json', (t) => t.replace('0.0.0', '0.0.1')) }) });
    add('B11', 'the MAIN-like allowlisted dirt only: the three tracked files r4 names modified, the four untracked scratch paths, two stray untracked root files and a tracked root doc edited (outside the scope) -> GUARD OK, the allowlisted paths named',
        ok('tree clean but for the allowlisted paths present [electron/test/golden/interview60.chains.json, electron/test/golden/interview60.report.md, natively_debug.log.1, electron/test/golden/openrouter-probes/, electron/test/golden/openrouter.probe.mjs, electron/test/golden/zai-probes/, electron/test/golden/zai.probe.mjs]'),
        { full: true, setup: () => ({ undo: seq(
            edit('electron/test/golden/interview60.chains.json', (t) => `${t}{"x":1}\n`), edit('electron/test/golden/interview60.report.md', (t) => `${t}more\n`), edit('natively_debug.log.1', (t) => `${t}more\n`),
            addFile('electron/test/golden/openrouter-probes/a.json'), addFile('electron/test/golden/openrouter.probe.mjs'), addFile('electron/test/golden/zai-probes/b.json'), addFile('electron/test/golden/zai.probe.mjs'),
            addFile('resume_prompt.txt'), addFile('retry_claude_print.bat'), edit('README.md', (t) => `${t}docs edit\n`)) }) });
    add('B12', 'restored: after B6-B11 undid their edits the correct environment passes again (nothing is stuck)', ok());
    add('B13', 'the scope boundary, by design: ONLY a tracked root doc (README.md) edited and a stray untracked root file -> GUARD OK (neither can change the app; a spurious refusal at 13:30 would lose the flight)', ok('tree clean but for the allowlisted paths present [none]'),
        { setup: () => ({ undo: seq(edit('README.md', (t) => `${t}docs edit\n`), addFile('resume_prompt.txt')) }) });
    add('B14', 'r4 7.5: a chains run leaves an untracked electron/test/golden/interview60.chains.stale-1.json (gitignored by MAIN\'s own rule `electron/test/golden/*.stale-*.json`) -> GUARD OK', ok('tree clean but for the allowlisted paths present [none]'),
        { setup: () => ({ undo: addFile('electron/test/golden/interview60.chains.stale-1.json') }) });
    add('B15', 'git unusable: the stub\'s .git moved aside, so `git rev-parse HEAD` fails', bad('10b', ['git rev-parse HEAD failed']), { commit: '0'.repeat(40),
        setup: () => { fs.renameSync(stubFile('.git'), stubFile('.git-aside')); return { undo: () => fs.renameSync(stubFile('.git-aside'), stubFile('.git')) }; } });

    // -- 10a: .env names only
    const withEnv = (text) => () => ({ undo: edit('.env', () => text) });
    add('E1', '.env declares NATIVELY_VERBAL_HEDGE (a dummy value)', bad('10a', ['.env declares NATIVELY_VERBAL_HEDGE ', 'remove it from .env'], ['dummy']), { setup: withEnv('UNRELATED_DUMMY_NAME=dummy-value-not-a-key\nNATIVELY_VERBAL_HEDGE=dummy\n') });
    add('E2', '.env declares NATIVELY_FOLLOWUP_PARENT in the `export NAME=` form', bad('10a', ['.env declares NATIVELY_FOLLOWUP_PARENT']), { setup: withEnv('export NATIVELY_FOLLOWUP_PARENT=dummy\n') });
    add('E3', '.env declares NATIVELY_QUESTION_DETECTION_MODEL in the `NAME: value` form', bad('10a', ['.env declares NATIVELY_QUESTION_DETECTION_MODEL']), { setup: withEnv('NATIVELY_QUESTION_DETECTION_MODEL: dummy\n') });
    add('E4', '.env declares two guarded names with CRLF line ends: both named, no value printed', bad('10a', ['.env declares NATIVELY_VERBAL_HEDGE_TRIGGER_MS, NATIVELY_GEMINI_THINKING_LEVEL'], ['dummy']), { setup: withEnv('NATIVELY_VERBAL_HEDGE_TRIGGER_MS=dummy\r\nNATIVELY_GEMINI_THINKING_LEVEL=dummy\r\n') });
    add('E5', '.env absent altogether -> still GUARD OK (the scan is not a requirement that a .env exist)', ok(), { setup: () => ({ undo: removeFile('.env') }) });
    add('E6', 'NATIVELY_QUESTION_DETECTION_MODEL set in the process environment', bad('10a', ['NATIVELY_QUESTION_DETECTION_MODEL is set']), { env: { NATIVELY_QUESTION_DETECTION_MODEL: 'dummy' } });

    // -- 6, 7, 8, 3, 1: the environment
    add('H1', 'the hedge variable set to 1', bad('6', ['NATIVELY_VERBAL_HEDGE is set ("1")', 'even for the value 1']), { env: { NATIVELY_VERBAL_HEDGE: '1' } });
    add('H2', 'the hedge variable set to 0', bad('6', ['NATIVELY_VERBAL_HEDGE is set ("0")']), { env: { NATIVELY_VERBAL_HEDGE: '0' } });
    add('H3', 'the hedge variable set to a typo (abc)', bad('6', ['NATIVELY_VERBAL_HEDGE is set ("abc")']), { env: { NATIVELY_VERBAL_HEDGE: 'abc' } });
    add('H4', 'the hedge variable set to the empty string (what a spawn can leave; cmd\'s `set X=` unsets instead)', bad('6', ['NATIVELY_VERBAL_HEDGE is set ("")']), { env: { NATIVELY_VERBAL_HEDGE: '' } });
    add('H5', 'the 09-26 build: verbalHedge.js with the OLD default (unset = off) -> the guard-br1 `hedge` check FAILS', bad('6', ['the built default is not the hedge: "[Main] verbal hedge: off"']),
        { setup: () => ({ undo: edit(`${D}llm/verbalHedge.js`, oldHedgeDefault) }) });
    add('H6', 'the 09-26 stand-in itself (SP\\guard-h40c-cal\\...\\verbalHedge.js, hand-copied then) as the built module -> FAILS', bad('6', ['the built verbalHedge.describeVerbalHedgeAtStartup threw on an empty environment']),
        { setup: () => ({ undo: swapInOldStandIn() }) });
    add('H7', 'the hedge module missing from the dist', bad('6', ['dist-electron/electron/llm/verbalHedge.js does not load']), { setup: () => ({ undo: removeFile(`${D}llm/verbalHedge.js`) }) });
    add('T1', 'trigger override 1 ms', bad('7', ['the hedge trigger is 1ms, not the probed 5000ms']), { env: { NATIVELY_VERBAL_HEDGE_TRIGGER_MS: '1' } });
    add('T2', 'trigger override junk (abc): the built code refuses it', bad('7', ['NATIVELY_VERBAL_HEDGE_TRIGGER_MS refuses this environment']), { env: { NATIVELY_VERBAL_HEDGE_TRIGGER_MS: 'abc' } });
    add('T3', 'trigger set to its own default (5000): the same behaviour the hour tests -> GUARD OK (only a different value refuses)', ok('at 5000ms'), { env: { NATIVELY_VERBAL_HEDGE_TRIGGER_MS: '5000' } });
    add('F1', 'follow-up parent flag on', bad('8', ['the follow-up flag is set; h40d flies it OFF']), { env: { NATIVELY_FOLLOWUP_PARENT: '1' } });
    add('F2', 'follow-up parent flag junk (abc): the built code refuses it', bad('8', ['NATIVELY_FOLLOWUP_PARENT refuses this environment']), { env: { NATIVELY_FOLLOWUP_PARENT: 'abc' } });
    add('F3', 'the follow-up module missing from the dist', bad('8', ['dist-electron/electron/llm/followUpParent.js does not load']), { setup: () => ({ undo: removeFile(`${D}llm/followUpParent.js`) }) });
    add('O1', 'answer-model override (gemini-3.5-flash-lite)', bad('3', ['an answer-model override is set: gemini-3.1-flash-lite resolves to gemini-3.5-flash-lite']), { env: { NATIVELY_VERBAL_PRIMARY_MODEL: 'gemini-3.5-flash-lite' } });
    add('O2', 'thinking-level override (HIGH)', bad('3', ['the app would think at HIGH, not the shipped LOW']), { env: { NATIVELY_GEMINI_THINKING_LEVEL: 'HIGH' } });
    add('O3', 'answer-model override junk (bogus): the built code refuses it', bad('3', ['the answer-model override refuses this environment']), { env: { NATIVELY_VERBAL_PRIMARY_MODEL: 'bogus' } });
    add('O4', 'thinking-level override junk (bogus): the built code refuses it', bad('3', ['the thinking-level override refuses this environment']), { env: { NATIVELY_GEMINI_THINKING_LEVEL: 'bogus' } });
    add('R1', 'the wrong roster (scenario50)', bad('1', ['the harness would load roster scenario50, not holdout40']), { env: { NATIVELY_ROSTER: 'scenario50' } });
    add('R2', 'no roster variable at all (the harness default interview60)', bad('1', ['roster interview60, not holdout40']), { env: { NATIVELY_ROSTER: undefined } });
    add('R3', 'a leftover NATIVELY_SCENARIOS=S1 (holdout40 has no scenarios: roster.mjs throws instead of running a shorter hour)', bad('1', ['roster.mjs does not load under this environment', 'NATIVELY_SCENARIOS names S1, which holdout40 does not have']), { env: { NATIVELY_SCENARIOS: 'S1' } });
    add('R4', 'a roster name that does not exist (bogus)', bad('1', ['roster.mjs does not load under this environment', 'is not a roster']), { env: { NATIVELY_ROSTER: 'bogus' } });
    add('R5', 'holdout40 with 44 items (a clean tree at a commit that drops one)', bad('1', ['holdout40 loaded 44 items, expected 45']),
        { setup: () => commitVariant([['electron/test/golden/holdout40.questions.mjs', (t) => t.replace('export const HOLDOUT40 = RAW.map(', 'export const HOLDOUT40 = RAW.slice(1).map(')]]) });

    // -- 2, 4, 5, 6b, 9: h40c's own checks, each broken once
    add('M1', 'the build\'s default answer model changed (gemini-3.1-flash)', bad('2', ['the build\'s default answer model is gemini-3.1-flash, not gemini-3.1-flash-lite']),
        { setup: () => ({ undo: edit(`${D}LLMHelper.js`, (t) => t.replace('const GEMINI_FLASH_MODEL = "gemini-3.1-flash-lite"', 'const GEMINI_FLASH_MODEL = "gemini-3.1-flash"')) }) });
    add('M2', 'the build\'s stall fallback changed (gemini-3.5-flash)', bad('2', ['the build\'s stall fallback is gemini-3.5-flash, not gemini-3.5-flash-lite']),
        { setup: () => ({ undo: edit(`${D}LLMHelper.js`, (t) => t.replace('const GEMINI_FLASH_FALLBACK_MODEL = "gemini-3.5-flash-lite"', 'const GEMINI_FLASH_FALLBACK_MODEL = "gemini-3.5-flash"')) }) });
    add('M3', 'the model modules the guard requires missing from the dist (verbalPrimaryModel.js)', bad('2', ['dist-electron does not load']), { setup: () => ({ undo: removeFile(`${D}llm/verbalPrimaryModel.js`) }) });
    add('M4', 'the built LLMHelper.js missing', bad('2', ['cannot read dist-electron/electron/LLMHelper.js: ENOENT']), { setup: () => ({ undo: removeFile(`${D}LLMHelper.js`) }) });
    add('L1', 'the 3.5-lite LOW->HIGH turn removed from the built thinking levels', bad('4', ['the gemini-3.5-flash-lite fallback would fly at a level it ignores']),
        { setup: () => ({ undo: edit(`${D}llm/geminiThinking.js`, (t) => t.replace('"gemini-3.5-flash-lite": { LOW: "HIGH" }', '"gemini-3.5-flash-lite": {}')) }) });
    add('L2', 'the 3.1-lite primary turned off LOW in the built thinking levels', bad('4', ['gemini-3.1-flash-lite would not fly at LOW']),
        { setup: () => ({ undo: edit(`${D}llm/geminiThinking.js`, (t) => t.replace('"gemini-3.5-flash-lite": { LOW: "HIGH" }', '"gemini-3.5-flash-lite": { LOW: "HIGH" },\n  "gemini-3.1-flash-lite": { LOW: "MINIMAL" }')) }) });
    add('K1', 'R09 in the dist: a bare "salary" negotiation term back in the build', bad('5', ['the build still lists bare "salary" as a negotiation term']),
        { setup: () => ({ undo: edit(`${D}knowledge/IntentClassifier.js`, (t) => `${t}\nconst bare = ["salary", "offer"];\n`) }) });
    add('K2', 'R09 in the dist: the phrase terms gone', bad('5', ['the build lacks the R09 phrase terms']),
        { setup: () => ({ undo: edit(`${D}knowledge/IntentClassifier.js`, replaceAll('salary expectations', 'salary expectatioms')) }) });
    add('K3', 'R09 in the SOURCE (a clean tree at a commit that reverts it)', bad('5', ['the source still lists bare "salary" as a negotiation term']),
        { setup: () => commitVariant([['electron/knowledge/IntentClassifier.ts', (t) => `${t}\nconst bare = ["salary", "offer"];\n`]]) });
    add('G1', 'the hedge log line gone from the built LLMHelper.js', bad('6b', ['the build does not carry the hedge log line']),
        { setup: () => ({ undo: edit(`${D}LLMHelper.js`, replaceAll('verbal hedge: front=', 'verbal hedge: NOTHERE=')) }) });
    add('G2', 'streamGeminiWithHedge gone from the SOURCE (a clean tree at a commit that drops it)', bad('6b', ['the source does not carry streamGeminiWithHedge']),
        { setup: () => commitVariant([['electron/LLMHelper.ts', replaceAll('streamGeminiWithHedge', 'streamGeminiWithHedgx')]]) });
    add('G3', 'the hedge winner regex gone from the built WhatToAnswerLLM.js', bad('6b', ['the build does not carry the hedge winner regex']),
        { setup: () => ({ undo: edit(`${D}llm/WhatToAnswerLLM.js`, (t) => t.split('HEDGE_WINNER').join('HEDGE_WINNEX').split('\\(hedge\\)__').join('\\(hedgx\\)__')) }) });
    add('S1', 'a stale build: electron/LLMHelper.ts newer than dist-electron/electron/LLMHelper.js', bad('9', ['is older than electron/LLMHelper.ts']),
        { noFreshen: true, setup: () => { const f = stubFile('electron/LLMHelper.ts'); const st = fs.statSync(f); const t = new Date(Date.now() + 60000); fs.utimesSync(f, t, t); return { undo: () => fs.utimesSync(f, st.atime, st.mtime) }; } });

    // -- 11: ANSWER_MODELS
    const AM = "export const ANSWER_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'];";
    const am = (rep) => [['electron/test/golden/interview60.flight.mjs', (t) => { if (!t.includes(AM)) throw new Error('ANSWER_MODELS line not found'); return t.replace(AM, rep); }]];
    add('N1', 'a Groq id added to ANSWER_MODELS (a clean tree at a commit that adds it)', bad('11', ['ANSWER_MODELS is ["gemini-3.1-flash-lite","gemini-3.5-flash-lite","groq/llama-3.3-70b-versatile"]']),
        { setup: () => commitVariant(am("export const ANSWER_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'groq/llama-3.3-70b-versatile'];")) });
    add('N2', 'ANSWER_MODELS: a Groq id in place of the fallback', bad('11', ['not exactly ["gemini-3.1-flash-lite","gemini-3.5-flash-lite"]']),
        { setup: () => commitVariant(am("export const ANSWER_MODELS = ['gemini-3.1-flash-lite', 'groq/llama-3.3-70b-versatile'];")) });
    add('N3', 'ANSWER_MODELS reordered', bad('11', ['not exactly']), { setup: () => commitVariant(am("export const ANSWER_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];")) });
    add('N4', 'ANSWER_MODELS export removed (the "no Groq id" reading would have passed this)', bad('11', ['ANSWER_MODELS is undefined']), { setup: () => commitVariant(am("const ANSWER_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'];")) });
    add('N5', 'interview60.flight.mjs that does not load (a syntax error)', bad('11', ['interview60.flight.mjs does not load under this environment']),
        { setup: () => commitVariant([['electron/test/golden/interview60.flight.mjs', (t) => `${t}\n}}}\n`]]) });

    // -- 12: the cue build
    add('Q1', 'a dist WITHOUT CUE_LINE_PREFIX (the early close absent; every other cue marker present)', bad('12', ['the dist is not the combined cue build', 'dist-proof.mjs exit 1', 'filter x0 "CUE_LINE_PREFIX"']),
        { setup: () => ({ undo: edit(`${D}llm/verbalStreamFilter.js`, replaceAll('CUE_LINE_PREFIX', 'CUE_LINE_PFX')) }) });
    add('Q2', 'the built filter without `function trimCues` (named by the guard\'s own sub-check, the dist-proof lines appended)', bad('12', ['has no "function trimCues"', 'filter x0 "function trimCues"']),
        { setup: () => ({ undo: edit(`${D}llm/verbalStreamFilter.js`, replaceAll('function trimCues', 'function trimCuez')) }) });
    add('Q3', 'the SOURCE prompts.ts without a CUE_RULE declaration (a clean tree at a commit; the name survives in a comment, which must not count)', bad('12', ['the source electron/llm/prompts.ts does not declare CUE_RULE']),
        { setup: () => commitVariant([['electron/llm/prompts.ts', (t) => t.replace('export const CUE_RULE =', '// CUE_RULE was removed here\nconst CUE_RULE_GONE =')]]) });
    add('Q4', 'the SOURCE prompts.ts without a VERBAL_TYPED_PROMPT declaration', bad('12', ['does not declare VERBAL_TYPED_PROMPT']),
        { setup: () => commitVariant([['electron/llm/prompts.ts', (t) => t.replace('export const VERBAL_TYPED_PROMPT =', '// VERBAL_TYPED_PROMPT was removed here\nconst VERBAL_TYPED_PROMPT_GONE =')]]) });
    add('Q5', 'a dist with the CUE_RULE changed (the benched rule\'s hash no longer reads 8e15e4e7dd41)', bad('12', ['dist-proof.mjs exit 1', 'BAD CUE_RULE sha256/12']),
        { setup: () => ({ undo: edit(`${D}llm/prompts.js`, (t) => { const i = t.indexOf('const CUE_RULE = `'); if (i < 0) throw new Error('CUE_RULE not found in the built prompts.js'); return `${t.slice(0, i)}const CUE_RULE = \`CHANGED ${t.slice(i + 'const CUE_RULE = `'.length)}`; }) }) });
    add('Q6', 'the built filter missing altogether', bad('12', ['cannot read dist-electron/electron/llm/verbalStreamFilter.js: ENOENT']), { setup: () => ({ undo: removeFile(`${D}llm/verbalStreamFilter.js`) }) });
    add('Q7', 'a dist-proof that exits 0 and prints nothing (a replaced, no-op dist-proof: an exit code alone would pass it)', bad('12', ['the dist is not the combined cue build', 'dist-proof.mjs exited 0 but did not print its verdict line']), { layout: 'dp-noop' });
    add('Q8', 'a dist-proof that prints the verdict but no filter sha', bad('12', ['printed its verdict but no "filter sha256/16" line']), { layout: 'dp-nosha' });
    add('Q9', 'no dist-proof.mjs at all', bad('12', ['the dist is not the combined cue build', 'Cannot find module']), { layout: 'dp-missing' });

    // -- 13: knowledge mode in the persisted settings
    const withSettings = (file) => ({ args: ['--settings', file] });
    add('W1', 'check 13: --settings the -off stub (knowledgeMode false)', bad('13', ['knowledge mode is not ON: knowledgeMode is false (the boolean true is required)', 'settings-off.json (mtime ']), withSettings(path.join(KM, 'settings-off.json')));
    add('W2', 'check 13: --settings the -absent stub (no knowledgeMode key: main.ts restores nothing)', bad('13', ['knowledgeMode is absent (main.ts restores nothing: knowledge mode OFF)']), withSettings(path.join(KM, 'settings-absent.json')));
    add('W3', 'check 13: --settings the -on stub -> passes (GUARD OK, the mtime and the key printed)', ok('knowledge mode ON (knowledgeMode = true in ', 'settings-on.json, mtime '), withSettings(SETTINGS_ON));
    add('W4', 'check 13: --settings the -broken stub (not JSON): FAILED, and the file\'s text is not quoted', bad('13', ['cannot read the persisted settings', 'not valid JSON'], ['not json']), withSettings(path.join(KM, 'settings-broken.json')));
    add('W5', 'check 13: --settings a missing file', bad('13', ['ENOENT']), withSettings(path.join(KM, 'settings-missing.json')));
    add('W6', 'check 13: knowledgeMode the STRING "true" is not the boolean true (r4: `=== true`; main.ts:687 would take any truthy value, the toggle only writes a boolean)', bad('13', ['knowledgeMode is "true" (the boolean true is required)']), withSettings(path.join(APPDATA_STUBS, 'string-true.json')));
    add('W7', 'check 13: a settings file that is a JSON array', bad('13', ['is not a JSON object']), withSettings(path.join(APPDATA_STUBS, 'array.json')));
    add('W8', 'check 13 default path: APPDATA = a folder whose natively\\settings.json is ON, no --settings -> GUARD OK from %APPDATA%\\natively\\settings.json', ok('knowledgeMode = true in ', 'guard-cal-appdata'), { args: [], env: { APPDATA: path.join(APPDATA_STUBS, 'on') } });
    add('W9', 'check 13 default path: APPDATA = a folder whose natively\\settings.json is OFF -> FAILED', bad('13', ['knowledgeMode is false']), { args: [], env: { APPDATA: path.join(APPDATA_STUBS, 'off') } });
    add('W10', 'check 13 default path: APPDATA unset and no --settings', bad('13', ['APPDATA is not set']), { args: [], env: { APPDATA: undefined } });
    add('W11', 'the real %APPDATA%\\natively\\settings.json via the admin share (INFORMATION: the reading depends on the user\'s own toggle, so it is recorded, not counted)', ok('knowledgeMode = true in '), { ...withSettings(REAL_SETTINGS), info: true, full: true });
    // -- the guard's own failure modes
    add('I1', 'a built module whose shape changed (geminiThinking.js no longer exports thinkingLevelForModel): the guard\'s own crash ends as ONE named line, not a stack trace', bad('internal', ['the guard itself crashed', 'thinkingLevelForModel is not a function']),
        { setup: () => ({ undo: edit(`${D}llm/geminiThinking.js`, (t) => t.replace(/,\s*thinkingLevelForModel: \(\) => thinkingLevelForModel\s*\}\);/, '\n});')) }) });
    add('Y1', 'a dist-proof child that outlives its timeout (a copy of the guard with the 120 s timeout cut to 1 ms): a named failure, not a hang', bad('12', ['could not run', 'ETIMEDOUT']), { layout: 'mutant-timeout-dp' });
    add('Y2', 'git rev-parse that outlives its timeout (cut to 1 ms)', bad('10b', ['git rev-parse HEAD failed', 'ETIMEDOUT']), { layout: 'mutant-timeout-revparse' });
    add('Y3', 'git status that outlives its timeout (cut to 1 ms)', bad('10b', ['git status failed', 'ETIMEDOUT']), { layout: 'mutant-timeout-status' });
    add('U1', 'usage: --settings with no file', bad('usage', ['--settings needs a file']), { args: ['--settings'] });
    add('U2', 'usage: an unknown argument is refused, not ignored', bad('usage', ['unknown argument(s): --setings']), { args: ['--setings', SETTINGS_ON] });
    return C;
}

function mainCases(ctx) {
    const C = [];
    const add = (id, name, expect, o = {}) => C.push({ where: 'main', id, name, expect, args: ['--settings', REAL_SETTINGS], ...o });
    add('X1', 'MAIN\'s root, the plausible environment, NATIVELY_FLIGHT_COMMIT = the cue code head d83fdfe (a registered commit MAIN has not reached) -> FAILS at 10b: not merged yet',
        bad('10b', [`MAIN HEAD is ${ctx.mainHead}, not the registered commit ${ctx.cueHead}`]), { commit: ctx.cueHead });
    add('X2', 'MAIN\'s root, NATIVELY_FLIGHT_COMMIT unset -> FAILS at 10b', bad('10b', ['NATIVELY_FLIGHT_COMMIT is not set']), { commit: undefined });
    add('X3', 'MAIN\'s root, NATIVELY_FLIGHT_COMMIT = MAIN\'s own HEAD (10b passes: HEAD pinned, the tree clean but for the allowlisted paths) -> FAILS at 12: MAIN\'s pre-merge dist is not the cue build',
        bad('12', ['the built filter (dist-electron/electron/llm/verbalStreamFilter.js) has no "function trimCues"', 'dist-proof.mjs exit 1', 'filter x0 "CUE_LINE_PREFIX"', 'it crashed before its verdict']), { commit: ctx.mainHead, full: true });
    // the h40c realcal pattern: the environment breaks, on MAIN's REAL dist (checks 1-8 are read from it before 10b/12 are reached)
    add('X4', 'MAIN\'s real dist: the hedge variable set to 1', bad('6', ['NATIVELY_VERBAL_HEDGE is set ("1")']), { commit: ctx.mainHead, env: { NATIVELY_VERBAL_HEDGE: '1' } });
    add('X5', 'MAIN\'s real dist: the hedge variable set to 0', bad('6', ['NATIVELY_VERBAL_HEDGE is set ("0")']), { commit: ctx.mainHead, env: { NATIVELY_VERBAL_HEDGE: '0' } });
    add('X6', 'MAIN\'s real dist: trigger override 1 ms', bad('7', ['the hedge trigger is 1ms']), { commit: ctx.mainHead, env: { NATIVELY_VERBAL_HEDGE_TRIGGER_MS: '1' } });
    add('X7', 'MAIN\'s real dist: follow-up flag on', bad('8', ['the follow-up flag is set']), { commit: ctx.mainHead, env: { NATIVELY_FOLLOWUP_PARENT: '1' } });
    add('X8', 'MAIN\'s real dist: answer-model override', bad('3', ['an answer-model override is set']), { commit: ctx.mainHead, env: { NATIVELY_VERBAL_PRIMARY_MODEL: 'gemini-3.5-flash-lite' } });
    add('X9', 'MAIN\'s real dist: thinking-level override', bad('3', ['the app would think at HIGH']), { commit: ctx.mainHead, env: { NATIVELY_GEMINI_THINKING_LEVEL: 'HIGH' } });
    add('X10', 'MAIN\'s real dist: the wrong roster', bad('1', ['not holdout40']), { commit: ctx.mainHead, env: { NATIVELY_ROSTER: 'scenario50' } });
    return C;
}

// ---- running -------------------------------------------------------------------------------------------------------
function childEnv(over, commit) {
    const env = { ...process.env };
    for (const k of Object.keys(env)) if (/^NATIVELY_/i.test(k)) delete env[k];      // the launcher's clean slate
    Object.assign(env, { NATIVELY_STT_PROVIDER: 'deepgram', NATIVELY_ROSTER: 'holdout40' });
    if (commit !== undefined) env.NATIVELY_FLIGHT_COMMIT = commit;
    Object.assign(env, over ?? {});
    for (const [k, v] of Object.entries(env)) if (v === undefined) delete env[k];
    return env;
}
function runGuard(c, cwd, guardPath) {
    const defaultCommit = () => headOf(cwd);
    const commit = 'commit' in c ? c.commit : (c.commitFn ? c.commitFn(defaultCommit()) : defaultCommit());
    return spawnSync(process.execPath, [guardPath, ...(c.args ?? ['--settings', SETTINGS_ON])], { cwd, env: childEnv(c.env, commit), encoding: 'utf8', timeout: 120000 });
}
const clip = (s, n) => (s.length > n ? `${s.slice(0, n)} ...[${s.length - n} more chars]` : s);

function judge(c, r) {
    const stdout = (r.stdout ?? '').trim();
    const errLines = (r.stderr ?? '').trim().split(/\r?\n/);
    const line = c.expect.exit === 0 ? stdout.split(/\r?\n/)[0] : errLines[errLines.length - 1];   // a failing guard prints exactly one line on stderr
    const why = [];
    if (r.status !== c.expect.exit) why.push(`exit ${r.status}, wanted ${c.expect.exit}`);
    if (!c.expect.line.test(line ?? '')) why.push(`line does not match ${c.expect.line}`);
    for (const s of c.expect.contains) if (!(line ?? '').includes(s)) why.push(`missing ${JSON.stringify(s)}`);
    for (const s of c.expect.notContains) if ((line ?? '').includes(s)) why.push(`leaks ${JSON.stringify(s)}`);
    if (c.expect.exit !== 0 && /GUARD OK/.test(stdout)) why.push('printed GUARD OK although it failed');
    if (c.expect.exit !== 0 && errLines.length !== 1 && !c.lenient) why.push(`stderr has ${errLines.length} lines (a named failure is exactly one line)`);
    return { line, why };
}

const out = [];
const log = (s = '') => { out.push(s); console.log(s); };
const results = [];

// Run `cases` with cwd and the guard each case names (default: guardPath). Returns the per-case verdicts.
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
        let r;
        const g = c.layout ? layouts[c.layout] : guardPath;
        if (!g) throw new Error(`calibration bug: case ${c.id} names layout ${c.layout}, which was not built`);
        try { r = runGuard(c, cwd, g); } finally { if (handle.undo) handle.undo(); }
        const { line, why } = judge(c, r);
        const good = why.length === 0;
        verdicts.push({ id: c.id, good, line });
        if (!quiet) {
            results.push({ id: c.id, good, info: !!c.info });
            log(`${good ? 'ok  ' : (c.info ? 'INFO' : 'BAD ')} ${c.id.padEnd(3)} ${c.name}`);
            log(`      exit ${r.status} :: ${clip(line ?? '(no line)', c.full ? 4000 : 700)}`);
            if (!good) log(`      NOT AS EXPECTED: ${why.join('; ')}`);
        }
    }
    if (title) log('');
    return verdicts;
}

// ---- main ----------------------------------------------------------------------------------------------------------
buildStub();
const ctx = { mainHead: headOf(MAIN), cueHead: gitIn(WT, 'rev-parse', 'd83fdfe').trim() };
// the settings stubs the W6/W7 cases need, and the %APPDATA% folders for the default-path cases (copies of kmode-stubs\)
fs.rmSync(APPDATA_STUBS, { recursive: true, force: true });
for (const [d, src] of [['on', 'settings-on.json'], ['off', 'settings-off.json']]) {
    fs.mkdirSync(path.join(APPDATA_STUBS, d, 'natively'), { recursive: true });
    fs.copyFileSync(path.join(KM, src), path.join(APPDATA_STUBS, d, 'natively', 'settings.json'));
}
fs.writeFileSync(path.join(APPDATA_STUBS, 'string-true.json'), '{"knowledgeMode":"true"}\n');
fs.writeFileSync(path.join(APPDATA_STUBS, 'array.json'), '[true]\n');
// the guard copies: a faithful mirror, three fake dist-proofs
fs.rmSync(LAYOUT, { recursive: true, force: true });
const layouts = {
    faithful: buildLayout('faithful'),
    'dp-noop': buildLayout('dp-noop', { distProof: 'process.exit(0);\n' }),
    'dp-nosha': buildLayout('dp-nosha', { distProof: "console.log('DIST PROOF: THE COMBINED BUILD, every marker as expected');\nprocess.exit(0);\n" }),
    'dp-missing': buildLayout('dp-missing', { distProof: null }),
    // copies of the guard with ONE timeout cut to 1 ms, to watch the guard end a slow child as a named failure
    'mutant-timeout-dp': buildLayout('mutant-timeout-dp', { mutate: (g) => g.replace("cwd: PROJ, timeout: 120000 });", 'cwd: PROJ, timeout: 1 });') }),
    'mutant-timeout-revparse': buildLayout('mutant-timeout-revparse', { mutate: (g) => g.replace("stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 }).trim();", "stdio: ['ignore', 'pipe', 'pipe'], timeout: 1 }).trim();") }),
    'mutant-timeout-status': buildLayout('mutant-timeout-status', { mutate: (g) => g.replace("stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 });", "stdio: ['ignore', 'pipe', 'pipe'], timeout: 1 });") }),
};
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const faithfulOk = sha(layouts.faithful) === sha(GUARD);

log('guard-h40d.mjs calibration - 2026-10-01 (instrument builder A; r4 section 7.4)');
log('');
log('SETUP');
log(`  guard under test: ${GUARD} (the real file, run as a child; cwd = the stub tree or MAIN's root; node ${process.version}); sha256/16 ${sha(GUARD).slice(0, 16)}`);
log(`  stub tree: ${STUB} - a throwaway git repo (never MAIN) built from REAL files of the cue worktree WT (tip ${headOf(WT).slice(0, 7)}, whose dist-electron is the combined cue build): its LLMHelper.ts, prompts.ts, IntentClassifier.ts, the golden roster/flight files and the dist-electron files the guard reads or requires; stub base commit ${headOf(STUB).slice(0, 7)}`);
log(`  MAIN: ${MAIN} (HEAD ${ctx.mainHead}; the cue code head d83fdfe is ${ctx.cueHead}); MAIN and WT are only read`);
log(`  layout mirror ${LAYOUT}: copies of the guard + its helpers in SP\\validation-hour\\-shaped folders; the faithful copy is ${faithfulOk ? 'byte-identical to the guard (sha256 equal)' : 'NOT identical to the guard (BAD)'}`);
log('  every case: the child inherits this session\'s environment minus every NATIVELY_* name (the launcher\'s clean slate), plus NATIVELY_STT_PROVIDER=deepgram, NATIVELY_ROSTER=holdout40, NATIVELY_FLIGHT_COMMIT=<the stub HEAD> and --settings <the -on stub> unless the case says otherwise');
log('  a case counts as ok only if the exit code, the named check tag, the wanted message fragments (and the unwanted ones: no value is leaked) all read as expected, and a failing guard printed exactly one stderr line and no GUARD OK');
log('');
results.push({ id: 'layout', good: faithfulOk });

{
    const p = spawnSync(process.execPath, [path.join(HERE, 'guard-h40d-git-cal.mjs')], { encoding: 'utf8' });
    log('PURE PREDICATE CALIBRATION (guard-h40d-git-cal.mjs: captured status strings incl. the real capture of MAIN, no git call)');
    for (const l of p.stdout.trim().split(/\r?\n/)) log(`  ${clip(l, 330)}`);
    results.push({ id: 'predicate', good: p.status === 0 });
    log('');
}

const stubList = stubCases(ctx);
runCases('STUB TREE CASES (each breaks one premise of the correct environment A1)', stubList, STUB, { layouts });
const mainList = mainCases(ctx);
runCases('AGAINST MAIN\'S ROOT (MAIN is pre-merge until later today: its dist is the 09-30 br1 build, not the cue build)', mainList, MAIN);

runCases('WRONG FOLDER (the launcher\'s own folder guard exits 9 before the guard; if it were run anyway)', [
    { where: 'wrong', id: 'Z1', name: 'the guard run with cwd = VH\\instruments (not a checkout): the roster import fails, by name', expect: bad('1', ['roster.mjs does not load under this environment']), commit: '0'.repeat(40) },
], HERE);

// ---- the launcher seam: the guard run the way launch-h40d.cmd runs it --------------------------------------------------
// cmd.exe, a .cmd of `set NAME=` lines (a bare `set NAME=` UNSETS NAME in cmd), the guard by absolute path, cwd = the tree.
// The tests above hand the guard an environment through spawn; this is the one seam they could not cross: does the variable
// the launcher clears actually arrive unset in the node child, and what do the launcher's own typos do.
{
    const SEAM = path.join(LAYOUT, 'seam');
    fs.mkdirSync(SEAM, { recursive: true });
    const blockLines = ['set NATIVELY_STT_PROVIDER=deepgram', 'set NATIVELY_ROSTER=holdout40', 'set NATIVELY_SCENARIOS=', 'set NATIVELY_GEMINI_THINKING_LEVEL=', 'set NATIVELY_VERBAL_PRIMARY_MODEL=', 'set NATIVELY_VERBAL_HEDGE_TRIGGER_MS=', 'set NATIVELY_FOLLOWUP_PARENT='];
    const seamHead = headOf(STUB);
    const seam = (id, name, expect, extraLines, parentEnv = {}, info = false) => {
        const lines = ['@echo off', ...blockLines, ...extraLines, `set APPDATA=${path.join(APPDATA_STUBS, 'on')}`, `"${process.execPath}" "${GUARD}"`];
        const text = `${lines.join('\r\n')}\r\n`;
        if (!/^[\x00-\x7f]*$/.test(text)) throw new Error('calibration bug: the seam .cmd is not ASCII');
        const f = path.join(SEAM, `${id}.cmd`);
        fs.writeFileSync(f, text, 'latin1');
        const env = { ...process.env };
        for (const k of Object.keys(env)) if (/^NATIVELY_/i.test(k)) delete env[k];
        Object.assign(env, parentEnv);
        freshenDist();
        const r = spawnSync('cmd.exe', ['/c', f], { cwd: STUB, env, encoding: 'utf8', timeout: 120000 });
        const c = { id, name, expect, lenient: info };
        const { line, why } = judge(c, r);
        results.push({ id, good: why.length === 0, info });
        log(`${why.length === 0 ? 'ok  ' : (info ? 'INFO' : 'BAD ')} ${id.padEnd(3)} ${name}`);
        log(`      exit ${r.status} :: ${clip(line ?? '(no line)', 700)}${(r.stderr ?? '').trim().split(/\r?\n/).length > 1 ? `   [stderr lines: ${(r.stderr ?? '').trim().split(/\r?\n/).length}; the first: ${clip((r.stderr ?? '').trim().split(/\r?\n/)[0], 200)}]` : ''}`);
        if (why.length) log(`      NOT AS EXPECTED: ${why.join('; ')}`);
    };
    log('LAUNCHER SEAM (cmd.exe running a .cmd of `set` lines, then the guard; the parent environment may carry a variable the .cmd must clear)');
    seam('K1', 'the launcher\'s block with the hedge variable cleared (`set NATIVELY_VERBAL_HEDGE=`) and the commit set -> GUARD OK', ok(), ['set NATIVELY_VERBAL_HEDGE=', `set NATIVELY_FLIGHT_COMMIT=${seamHead}`]);
    seam('K2', 'the PARENT environment carries NATIVELY_VERBAL_HEDGE=1 (a persistent user/machine variable); the .cmd\'s `set NATIVELY_VERBAL_HEDGE=` unsets it for the node child -> GUARD OK', ok(), ['set NATIVELY_VERBAL_HEDGE=', `set NATIVELY_FLIGHT_COMMIT=${seamHead}`], { NATIVELY_VERBAL_HEDGE: '1' });
    seam('K3', 'the same parent variable and NO clearing line -> the guard refuses (the variable arrives)', bad('6', ['NATIVELY_VERBAL_HEDGE is set ("1")']), [`set NATIVELY_FLIGHT_COMMIT=${seamHead}`], { NATIVELY_VERBAL_HEDGE: '1' });
    seam('K4', 'the h40c launcher\'s own line, `set NATIVELY_VERBAL_HEDGE=1`, left in -> the guard refuses', bad('6', ['NATIVELY_VERBAL_HEDGE is set ("1")']), ['set NATIVELY_VERBAL_HEDGE=1', `set NATIVELY_FLIGHT_COMMIT=${seamHead}`]);
    seam('K5', 'a trailing space after the clearing `=` (`set NATIVELY_VERBAL_HEDGE= `): cmd stores a one-space value, so it is SET, and the guard refuses: the launcher generator must not leave one', bad('6', ['NATIVELY_VERBAL_HEDGE is set (" ")']), ['set NATIVELY_VERBAL_HEDGE= ', `set NATIVELY_FLIGHT_COMMIT=${seamHead}`]);
    seam('K6', 'a plain-token placeholder for the commit (`set NATIVELY_FLIGHT_COMMIT=REGISTERED_HEAD_PLACEHOLDER`) -> the guard refuses, naming it', bad('10b', ['NATIVELY_FLIGHT_COMMIT is "REGISTERED_HEAD_PLACEHOLDER", not a full 40-hex commit hash']), ['set NATIVELY_VERBAL_HEDGE=', 'set NATIVELY_FLIGHT_COMMIT=REGISTERED_HEAD_PLACEHOLDER']);
    // K7 observes cmd, not the guard. My first prediction was that cmd would print an error for the `set` line, carry on, and
    // the guard would then refuse "not set"; the first run read exit 255 with only cmd's message: cmd ABORTS the whole batch on
    // that syntax error, so the guard never runs (and nothing is written to the launcher's error log). Recorded as observed.
    seam('K7', 'OBSERVATION about cmd (not a guard case): an ANGLE-BRACKET placeholder (`set NATIVELY_FLIGHT_COMMIT=<REGISTERED_HEAD>`) is an input redirection: cmd aborts the whole batch with "The syntax of the command is incorrect." (exit 255) before the guard runs, so the launcher\'s placeholder must be a plain token (K6) to get the guard\'s named refusal',
        { exit: 255, line: /^The syntax of the command is incorrect\.$/, contains: [], notContains: [] }, ['set NATIVELY_VERBAL_HEDGE=', 'set NATIVELY_FLIGHT_COMMIT=<REGISTERED_HEAD>'], {}, true);
    log('');
}

// ---- the port check: check 6's bare-default read against the ORIGINAL it was ported from ------------------------------------
// r4: "(6) ... the guard-br1.mjs `hedge` check, calibrated to FAIL on the 09-26 build". The original is run as a child on the
// SAME stub dist, beside this guard: both must say OK on the good dist and both must refuse the two 09-26 shapes of the module.
{
    const BR1 = path.join(SPDIR, 'boundary-repair', 'guard-br1.mjs');
    log('PORT CHECK against the original (guard-br1.mjs `hedge`, run as a child on the same stub dist as this guard)');
    const states = [
        ['P1', 'the good dist (the cue worktree\'s build: the hedge is the default)', () => () => {}, true],
        ['P2', 'the 09-26 behaviour (the real build\'s verbalHedge.js with the OLD default: unset = off)', () => edit(`${D}llm/verbalHedge.js`, oldHedgeDefault), false],
        ['P3', 'the 09-26 stand-in file (no describeVerbalHedgeAtStartup)', () => swapInOldStandIn(), false],
    ];
    for (const [id, name, setup, wantOk] of states) {
        freshenDist();
        const undo = setup();
        let b; let m;
        try {
            b = spawnSync(process.execPath, [BR1, 'hedge'], { cwd: STUB, env: childEnv({}, undefined), encoding: 'utf8', timeout: 120000 });
            m = runGuard({ args: ['--settings', SETTINGS_ON] }, STUB, GUARD);
        } finally { undo(); }
        const brLine = (b.stdout ?? '').trim().split(/\r?\n/)[0];
        const mineLine = wantOk ? (m.stdout ?? '').trim().split(/\r?\n/)[0] : (m.stderr ?? '').trim().split(/\r?\n/).pop();
        const agree = (b.status === 0) === wantOk && (m.status === 0) === wantOk && (wantOk ? /^GUARD OK: /.test(mineLine) : /^GUARD FAILED: \(6\) /.test(mineLine)) && /^hedge check says (OK|FAIL)/.test(brLine);
        results.push({ id, good: agree });
        log(`${agree ? 'ok  ' : 'BAD '} ${id}  ${name}: guard-br1 hedge -> exit ${b.status} "${clip(brLine, 160)}"; this guard -> exit ${m.status} ${clip(mineLine, 150)}`);
    }
    log('');
}

// MAIN's live status, read through the guard's own predicate (what check 10b sees on MAIN's real tree)
{
    const { unexpectedDirtyPaths, allowlistedPaths, GIT_PATHSPEC } = await import(pathToFileURL(path.join(VH, 'guard-h40d-git.mjs')).href);
    const st = gitIn(MAIN, 'status', '--porcelain', '--', ...GIT_PATHSPEC);
    const whole = gitIn(MAIN, 'status', '--porcelain');
    log('MAIN\'S LIVE TREE THROUGH THE GUARD\'S OWN PREDICATE (information)');
    log(`  git status --porcelain -- ${GIT_PATHSPEC.join(' ')}: ${st.split(/\r?\n/).filter(Boolean).length} line(s); unexpected: ${JSON.stringify(unexpectedDirtyPaths(st))}; allowlisted paths present: ${JSON.stringify(allowlistedPaths(st))}`);
    log(`  git status --porcelain (whole tree): ${whole.split(/\r?\n/).filter(Boolean).length} line(s); the paths outside the guard's scope that a strict whole-tree reading would object to: ${JSON.stringify(unexpectedDirtyPaths(whole).filter((p) => !GIT_PATHSPEC.some((s) => p === s || p.startsWith(`${s}/`))))}`);
    log('');
}

// ---- the mutation suite (rule 8): copy the guard, switch ONE check off, run the cases that must notice -------------
// Each mutant is [name, [find, replace], the cases that must turn BAD]. A case turns BAD when the mutant no longer
// reads as the real guard did (the real guard read it ok). A1 must stay ok under every mutant (the mutant is still a
// working guard; only that one check is gone).
const MUTANTS = [
    ['hedge-variable-not-checked (check 6, the "set to anything refuses" rule)', ['if (hedgeVar !== undefined) fail(', 'if (false) fail('], ['H1', 'H2', 'H3', 'H4']],
    ['hedge-default-not-read (check 6, the guard-br1 `hedge` read)', ['if (bare !== HEDGE_LINE) fail(', 'if (false) fail('], ['H5']],
    ['trigger-not-checked (check 7)', ['if (triggerMs !== 5000) fail(', 'if (false) fail('], ['T1']],
    ['follow-up-not-checked (check 8)', ['if (followUpOn !== false) fail(', 'if (false) fail('], ['F1']],
    ['commit-not-compared (check 10b)', ['if (head !== registeredCommit) fail(', 'if (false) fail('], ['B2']],
    ['tree-not-checked (check 10b)', ['if (dirty.length) fail(', 'if (false) fail('], ['B6', 'B7', 'B8', 'B9', 'B10']],
    ['staleness-not-checked (check 9)', ['if (distMtime < srcMtime) fail(', 'if (false) fail('], ['S1']],
    ['roster-count-not-checked (check 1)', ['if (R.INTERVIEW.length !== 45) fail(', 'if (false) fail('], ['R5']],
    ['override-not-checked (check 3)', ['if (got !== m) fail(', 'if (false) fail('], ['O1']],
    ['groq-test-only (check 11 as the loose "no id contains a slash" reading: h40c\'s R1 finding)', ["if (!answerModelsMatch) fail(", "if ((actualAnswerModels ?? []).some((id) => String(id).includes('/'))) fail("], ['N3', 'N4']],
    ['dist-proof-verdict-ignored (check 12)', ['const dpOk = !dp.error && dp.status === 0 && dp.stdout.includes(VERDICT);', 'const dpOk = true;'], ['Q1', 'Q2', 'Q5']],
    ['cue-source-not-checked (check 12)', ["if (!new RegExp(`^export const ${name}\\\\b`, 'm').test(promptsSrc)) fail(", 'if (false) fail('], ['Q3', 'Q4']],
    ['trimCues-not-checked (check 12, the guard\'s own sub-check)', ["if (!filterBuilt.includes('function trimCues')) fail(", 'if (false) fail('], ['Q2']],
    ['knowledge-mode-not-checked (check 13)', ['if (knowledgeMode !== true) {', 'if (false) {'], ['W1', 'W2', 'W6', 'W9']],
    ['settings-default-path-wrong (check 13: %APPDATA%\\settings.json instead of %APPDATA%\\natively\\settings.json)', ["path.join(process.env.APPDATA, 'natively', 'settings.json')", "path.join(process.env.APPDATA, 'settings.json')"], ['W8', 'W9']],
    ['env-scan-skipped (check 10a)', ['if (clash.length) fail(', 'if (false) fail('], ['E1', 'E2', 'E3', 'E4']],
    ['uncaught-handler-removed (the guard\'s own crash must end as one named line)', ["process.on('uncaughtException', (e) =>", "process.on('uncaughtExceptionX', (e) =>"], ['I1']],
    ['one-line-fold-removed (every failure is exactly one stderr line)', ['${String(msg).replace(/\\s*\\r?\\n\\s*/g, \' \')}', '${String(msg)}'], ['H7']],
];
const byId = Object.fromEntries(stubList.map((c) => [c.id, c]));
log('MUTATION SUITE (rule 8): a copy of the guard with ONE check switched off, run over the cases that must notice it. "caught" = every listed case turned BAD and A1 stayed ok.');
let mutantsCaught = 0;
for (const [name, [find, repl], mustTurnBad] of MUTANTS) {
    const gp = buildLayout(`mutant-${mutantsCaught}-${name.split(' ')[0]}`, { mutate: (g) => { if (!g.includes(find)) throw new Error(`calibration bug: mutant "${name}": the text to switch off was not found in the guard: ${find}`); return g.replace(find, repl); } });
    const ids = ['A1', ...mustTurnBad];
    const v = runCases('', ids.map((id) => byId[id]), STUB, { guardPath: gp, quiet: true, layouts });
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

// leave the stub in the correct state on disk and prove it once more
freshenDist();
const final = runGuard({ args: ['--settings', SETTINGS_ON] }, STUB, GUARD);
const finalOk = final.status === 0 && /^GUARD OK: /.test(final.stdout);
log('FINAL: the stub tree as left on disk, correct environment');
log(`${finalOk ? 'ok  ' : 'BAD '} exit ${final.status} :: ${clip(final.stdout.split(/\r?\n/)[0], 200)}`);
results.push({ id: 'final', good: finalOk });
log('');

const counted = results.filter((x) => !x.info);
const bads = counted.filter((x) => !x.good);
const caseCount = counted.filter((x) => !x.id.startsWith('mutant:') && !['layout', 'final', 'predicate'].includes(x.id)).length;
log(bads.length === 0
    ? `GUARD CALIBRATION OK ${counted.length}/${counted.length}: ${caseCount} cases (stub tree, MAIN's root, the cmd.exe launcher seam), ${mutantsCaught}/${MUTANTS.length} mutants caught, the pure predicate, the layout mirror and the final stub state ok; ${results.filter((x) => x.info).length} informational case recorded and not counted`
    : `GUARD CALIBRATION FAILED: ${bads.map((b) => b.id).join(', ')} (${counted.length - bads.length}/${counted.length} ok)`);
// the mutant copies of the guard are scratch: remove them so nobody mistakes one for the guard (the faithful mirror, the fake dist-proofs and the seam .cmd files stay)
for (const d of fs.readdirSync(LAYOUT)) if (d.startsWith('mutant-')) fs.rmSync(path.join(LAYOUT, d), { recursive: true, force: true });
fs.writeFileSync(OUT, `${out.join('\n')}\n`);
process.exit(bads.length === 0 ? 0 : 1);
