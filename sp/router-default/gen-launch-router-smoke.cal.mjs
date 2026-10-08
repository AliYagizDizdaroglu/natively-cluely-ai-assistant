// Calibration: every required env name is set or cleared in the generated .cmd, and the check FAILS when one is removed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SET = { NATIVELY_LIVE_ROUTER: '1', NATIVELY_ROSTER: 'live40', NATIVELY_STT_PROVIDER: 'deepgram' };
// independent list: flight-eq's cleared names (except those it sets) plus the four named in the task
const CLEARED = ['NATIVELY_GEMINI_THINKING_LEVEL', 'NATIVELY_VERBAL_PRIMARY_MODEL', 'NATIVELY_VERBAL_HEDGE', 'NATIVELY_VERBAL_HEDGE_TRIGGER_MS', 'NATIVELY_FOLLOWUP_PARENT', 'NATIVELY_LIVE_MODEL', 'NATIVELY_LIVE_MODE', 'NATIVELY_AUTOSTART_MEETING', 'NATIVELY_CAPTURE_PROMPTS', 'NATIVELY_QUESTION_DETECTION_MODEL', 'NATIVELY_FIRST_TOKEN_TIMEOUT_MS', 'NATIVELY_TURN_GATE_MS', 'NATIVELY_TURN_SETTLE_MS', 'NATIVELY_TURN_UNFINISHED_HOLD_MS', 'NATIVELY_TURN_CONTINUATION_MS', 'NATIVELY_TURN_MAX_HOLD_MS', 'NATIVELY_TURN_WORDLESS_GRACE_MS', 'NATIVELY_DETECTOR_CALIBRATE', 'NATIVELY_DETECTOR_CHAIN_TEST', 'NATIVELY_DETECTOR_CHAIN_TEST_QUESTIONS', 'NATIVELY_GEMMA_TTFT_MS', 'NATIVELY_GEMMA_MAX_ATTEMPTS', 'NATIVELY_GEMMA_VISION_TTFT_MS', 'NATIVELY_GEMMA_VISION_TTFT_BASE_MS', 'NATIVELY_GEMMA_VISION_TTFT_PER_IMAGE_MS', 'NATIVELY_GEMMA_VISION_MAX_ATTEMPTS', 'NATIVELY_API_URL', 'NATIVELY_BUILD_ALL_MAC_ARCHES', 'I60_PROBE_DEADLINE_MIN', 'NATIVELY_EARLIER_QUESTION', 'NATIVELY_FLIGHT_ARMS', 'NATIVELY_SCENARIOS'];
function check(text) {
  const L = text.split('\r\n'); const miss = [];
  for (const [k, v] of Object.entries(SET)) if (!L.includes(`set ${k}=${v}`)) miss.push(`set ${k}=${v}`);
  for (const k of CLEARED) if (!L.includes(`set ${k}=`)) miss.push(`clear ${k}`);
  if (L.some((l) => l.startsWith('set NATIVELY_FLIGHT_FOCUSED'))) miss.push('FLIGHT_FOCUSED must not be set');
  for (const need of ['interview60.run.mjs wav:check', 'interview60.run.mjs auto router-smoke >>', 'interview60.run.mjs app:stop', 'router-smoke.launcher.log']) if (!text.includes(need)) miss.push(need);
  return miss;
}
const text = fs.readFileSync(path.join(HERE, 'launch-router-smoke.cmd'), 'latin1');
let fail = 0;
const real = check(text);
console.log(`real file: ${real.length === 0 ? 'PASS' : 'FAIL ' + real.join('; ')}`); if (real.length) fail++;
const lines = text.split('\r\n');
let caught = 0, total = 0;
for (let i = 0; i < lines.length; i++) {
  if (!/^set (NATIVELY_|I60_)/.test(lines[i])) continue;
  total++;
  const m = lines.filter((_, j) => j !== i).join('\r\n');
  if (check(m).length > 0) caught++; else { console.log(`NOT CAUGHT: removing ${lines[i]}`); fail++; }
}
const extra = [text.replace('set NATIVELY_ROSTER=live40', 'set NATIVELY_ROSTER=scenario50'), text.replace('@echo off\r\n', '@echo off\r\nset NATIVELY_FLIGHT_FOCUSED=off\r\n'), text.replace('auto router-smoke', 'auto smoke-router'), text.replace('app:stop', 'app:noop')];
extra.forEach((m, i) => { total++; if (check(m).length > 0) caught++; else { console.log(`NOT CAUGHT: extra mutant ${i}`); fail++; } });
console.log(`mutants caught ${caught}/${total}`);
console.log(fail ? 'CALIBRATION: FAIL' : 'CALIBRATION: PASS');
process.exit(fail ? 1 : 0);
