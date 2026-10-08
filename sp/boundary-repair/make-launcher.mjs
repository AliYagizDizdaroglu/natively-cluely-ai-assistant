// Throwaway (2026-09-29): write launch-br1.cmd (ASCII, CRLF) for the boundary-repair app probe, with the
// registered commit filled in. Refuses a non-sha argument and any non-ASCII byte in the result.
//   node make-launcher.mjs <full sha of the repair commit on MAIN>
import fs from 'node:fs';
const sha = process.argv[2];
if (!/^[0-9a-f]{40}$/.test(sha ?? '')) { console.log(`REFUSED: not a full sha: ${sha}`); process.exit(2); }
const L = 'electron\\test\\golden\\interview60.runs\\probe-br1.launcher.log';
const ERR = '"%TEMP%\\natively-br1-launcher-error.log"';
const NODE = '"C:\\Program Files\\nodejs\\node.exe"';
const lines = [
    '@echo off',
    'rem Boundary-repair app probe br1 (task Natively-probe-br1): the scenario50 S1+S2 hour on MAIN at the',
    'rem boundary-repair commit. The hour only - no answer arms, no grading: the probe reads every',
    'rem "boundary repair: restored" line against the scripted question and the dispatched question.',
    'rem Shipped defaults otherwise: the verbal hedge ON - the shipped default since the h40c pass; the flag',
    'rem is cleared on purpose so the hour exercises the default, and guard post checks the built default -',
    'rem follow-up parent off, no model or thinking override.',
    'rem NOTE ON STYLE: no parentheses inside any echo in an if-block - they close the block early.',
    'if not exist "electron\\test\\golden\\interview60.run.mjs" (',
    `  echo wrong working directory: %CD% >> ${ERR}`,
    '  exit /b 9',
    ')',
    'if not exist "electron\\test\\golden\\scenario50.wav" (',
    `  echo scenario50.wav missing - build the audio first >> ${ERR}`,
    '  exit /b 8',
    ')',
    'findstr /C:"process.on(\'exit\', appStop)" "electron\\test\\golden\\interview60.run.mjs" >nul 2>&1',
    'if errorlevel 1 (',
    `  echo the harness does not stop the app when a run ends >> ${ERR}`,
    '  exit /b 7',
    ')',
    'set NATIVELY_STT_PROVIDER=deepgram',
    'set NATIVELY_ROSTER=scenario50',
    'set NATIVELY_SCENARIOS=S1,S2',
    'set NATIVELY_GEMINI_THINKING_LEVEL=',
    'set NATIVELY_VERBAL_PRIMARY_MODEL=',
    'set NATIVELY_VERBAL_HEDGE=',
    'set NATIVELY_VERBAL_HEDGE_TRIGGER_MS=',
    'set NATIVELY_FOLLOWUP_PARENT=',
    'set NATIVELY_LIVE_MODEL=',
    `set NATIVELY_FLIGHT_COMMIT=${sha}`,
    `${NODE} "%~dp0guard-br1.mjs" pre >> ${L} 2>&1`,
    'if errorlevel 1 (',
    `  echo pre guard failed - see probe-br1.launcher.log >> ${ERR}`,
    '  exit /b 6',
    ')',
    `${NODE} electron\\test\\golden\\interview60.run.mjs wav:check >> ${L} 2>&1`,
    'if errorlevel 1 (',
    `  echo scenario50.wav does not match the roster - see probe-br1.launcher.log >> ${ERR}`,
    '  exit /b 5',
    ')',
    `${NODE} scripts\\build-electron.js >> ${L} 2>&1`,
    'if errorlevel 1 (',
    `  echo build failed - see probe-br1.launcher.log >> ${ERR}`,
    '  exit /b 4',
    ')',
    `${NODE} "%~dp0guard-br1.mjs" post >> ${L} 2>&1`,
    'if errorlevel 1 (',
    `  echo post guard failed - see probe-br1.launcher.log >> ${ERR}`,
    '  exit /b 3',
    ')',
    'rem Which Live ear, as interview60.flight.mjs step 1 decides it: exit 0 = the default model,',
    'rem exit 2 = no Gemini key reached the probe, anything else = the 2.5 native-audio fallback.',
    `${NODE} --env-file=.env electron\\test\\golden\\interview60.live-probe.cjs >> ${L} 2>&1`,
    'set PROBE_EXIT=%errorlevel%',
    'if "%PROBE_EXIT%"=="2" (',
    `  echo live probe found no Gemini key - nothing spent >> ${ERR}`,
    '  exit /b 2',
    ')',
    'if not "%PROBE_EXIT%"=="0" set NATIVELY_LIVE_MODEL=gemini-2.5-flash-native-audio-latest',
    `echo LIVE probe exit %PROBE_EXIT% model override %NATIVELY_LIVE_MODEL% >> ${L}`,
    `${NODE} electron\\test\\golden\\interview60.run.mjs auto br1 >> ${L} 2>&1`,
];
const out = lines.join('\r\n') + '\r\n';
if (/[^\x00-\x7F]/.test(out)) { console.log('REFUSED: non-ASCII in the launcher'); process.exit(3); }
fs.writeFileSync(new URL('./launch-br1.cmd', import.meta.url), out);
console.log(`wrote launch-br1.cmd (${out.length} bytes, CRLF, ASCII) for ${sha.slice(0, 7)}`);
