// Runbook RUNBOOK-resmoke2.md: prepares the cue-smoke launcher, its guard check and its registration script for the
// re-smoke on the COMBINED build (the early close + the offers fix). A node script because the .cmd files are CRLF
// and ASCII (never edit them with Git Bash sed). Each replacement must match exactly once; the originals are kept
// as *.bak-<stamp>. Idempotent: refuses when the launcher already carries the dist proof.
//   node edit-launcher-resmoke3.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const SP = path.dirname(fileURLToPath(import.meta.url));
const DRY = process.argv.includes('--dry');
const PREFIX_COUNT = 3, OFFERS_MARKER = 'offers block before the spoken answer';
const stamp = new Date(Date.now() + 3 * 3600e3).toISOString().slice(11, 16).replace(':', '');
const read = (f) => fs.readFileSync(path.join(SP, f), 'latin1');
const lf = (s) => s.replace(/\r\n/g, '\n');
const swap = (s, from, to, what) => { const n = s.split(from).length - 1; if (n !== 1) throw new Error(`${what}: expected exactly one match, found ${n}`); return s.replace(from, to); };
const asciiOnly = (s, f) => { const bad = [...s].find((c) => c.charCodeAt(0) > 126 || (c.charCodeAt(0) < 32 && c !== '\n' && c !== '\r' && c !== '\t')); if (bad) throw new Error(`${f}: a non-ASCII character (code ${bad.charCodeAt(0)})`); };
const PROOF = `%NODE% "%~dp0dist-proof.mjs" --expect combined --prefix-count ${PREFIX_COUNT} --offers-marker "${OFFERS_MARKER}" >> %LOG% 2>&1`;

// ---- the launcher ---------------------------------------------------------------------------------------------
let L = lf(read('launch-smoke-cues.cmd'));
if (L.includes('dist-proof.mjs')) { console.log('REFUSED: the launcher already carries the dist proof'); process.exit(3); }
L = swap(L, "rem task's start. 2026-09-30: 18:30 for the afternoon re-smoke, the 05:00 run used 09:00.",
    "rem task's start. 2026-10-01: 09:00 for the 05:00 re-smoke. The task is killed at 10:00, so a gate that opened\nrem later would start an hour it cannot finish, and a killed task does not stop the app.", 'the deadline comment');
const TRIM_GUARD = 'findstr /C:"function trimCues" "dist-electron\\electron\\llm\\verbalStreamFilter.js" >nul 2>&1\nif errorlevel 1 (\n  echo dist-electron carries cue mode v1 without the trimCues cap - rebuild the worktree >> "%TEMP%\\natively-smoke-cues-launcher-error.log"\n  exit /b 7\n)\n';
const NEW_GUARDS = 'rem combined build 2026-10-01: the early close and the offers fix must both be in the dist\n'
    + 'findstr /C:"CUE_LINE_PREFIX" "dist-electron\\electron\\llm\\verbalStreamFilter.js" >nul 2>&1\nif errorlevel 1 (\n  echo dist-electron lacks the early close - rebuild the worktree >> "%TEMP%\\natively-smoke-cues-launcher-error.log"\n  exit /b 7\n)\n'
    + `findstr /C:"${OFFERS_MARKER}" "dist-electron\\electron\\llm\\verbalStreamFilter.js" >nul 2>&1\nif errorlevel 1 (\n  echo dist-electron lacks the offers fix - rebuild the worktree >> "%TEMP%\\natively-smoke-cues-launcher-error.log"\n  exit /b 7\n)\n`;
L = swap(L, TRIM_GUARD, TRIM_GUARD + NEW_GUARDS, 'the trimCues guard');
const MTIME_LINE = L.split('\n').find((l) => l.startsWith('for %%F in (dist-electron\\electron\\main.js)'));
if (!MTIME_LINE) throw new Error('the mtime line was not found');
L = swap(L, MTIME_LINE + '\n', MTIME_LINE + '\n'
    + 'rem the dist proof, before the run: every marker of the combined build, the cue rule hash, each file write time\n'
    + PROOF + '\nif errorlevel 1 (\n  echo the dist is not the combined build - smoke not run >> %LOG%\n  exit /b 7\n)\n', 'the mtime line');
L = swap(L, '--deadline 18:30 --every 15', '--deadline 09:00 --every 15', 'the gate deadline');
const STOP_LINE = '%NODE% "%~dp0run-with-main-env.mjs" electron\\test\\golden\\interview60.run.mjs app:stop >> %LOG% 2>&1\n';
L = swap(L, STOP_LINE, STOP_LINE
    + 'rem the dist proof again, after the run: auto builds the dist itself when a source is newer, so THIS is the dist that flew\n'
    + 'echo === DIST AFTER THE RUN === >> %LOG%\n' + PROOF + '\n', 'the app:stop line');
asciiOnly(L, 'launch-smoke-cues.cmd');

// ---- the guard check = the launcher's guard chain, then one line ---------------------------------------------
const cutAt = L.indexOf('set NODE=');
if (cutAt < 0) throw new Error('set NODE= not found');
const G = L.slice(0, cutAt) + 'echo GUARDS_ALL_PASSED\n';

// ---- the registration script ---------------------------------------------------------------------------------
let R = lf(read('register-cue-smoke.ps1'));
const REG_GUARD = "if (-not (Select-String -Path (Join-Path $wt 'dist-electron\\electron\\llm\\verbalStreamFilter.js') -Pattern 'function trimCues' -SimpleMatch -Quiet)) { throw 'worktree dist-electron carries cue mode v1 without the trimCues cap: rebuild' }\n";
R = swap(R, REG_GUARD, REG_GUARD
    + "if (-not (Select-String -Path (Join-Path $wt 'dist-electron\\electron\\llm\\verbalStreamFilter.js') -Pattern 'CUE_LINE_PREFIX' -SimpleMatch -Quiet)) { throw 'worktree dist-electron lacks the early close: rebuild' }\n"
    + `if (-not (Select-String -Path (Join-Path $wt 'dist-electron\\electron\\llm\\verbalStreamFilter.js') -Pattern '${OFFERS_MARKER}' -SimpleMatch -Quiet)) { throw 'worktree dist-electron lacks the offers fix: rebuild' }\n`, 'the registration guard');
asciiOnly(R, 'register-cue-smoke.ps1');

const crlf = (s) => s.replace(/\n/g, '\r\n');
const plan = [['launch-smoke-cues.cmd', crlf(L)], ['guardcheck-smoke-cues.cmd', crlf(G)], ['register-cue-smoke.ps1', crlf(R)]];
for (const [f, text] of plan) {
    const before = read(f);
    console.log(`${f}: ${before.split('\n').length} -> ${text.split('\n').length} lines; CRLF only: ${!/[^\r]\n/.test(text)}`);
    if (DRY) continue;
    fs.writeFileSync(path.join(SP, `${f}.bak-${stamp}`), before, 'latin1');
    fs.writeFileSync(path.join(SP, f), text, 'latin1');
}
console.log(DRY ? 'dry run: nothing written' : `written; originals kept as *.bak-${stamp}`);
