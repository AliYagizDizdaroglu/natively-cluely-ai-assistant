/**
 * Prove the detection prompt returns two-clause questions whole, on the REAL Groq
 * model, using the app's own stored key: relaunch the app with
 * NATIVELY_DETECTOR_CALIBRATE=1 and read its [DetectorCalibration] lines.
 *
 *   node electron/test/golden/interview60.calibrate-detector.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sleep } from './interview60.lib.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(HERE, '../../..');
const RUN = path.join(HERE, 'interview60.run.mjs');
const DEBUG_LOG = path.join(PROJ, 'natively_debug.log');

execFileSync(process.execPath, [RUN, 'app:stop'], { stdio: 'inherit' });
execFileSync(process.execPath, [RUN, 'app:start'], { stdio: 'inherit', env: { ...process.env, NATIVELY_DETECTOR_CALIBRATE: '1' } });
// app:start returns after the app has rotated natively_debug.log, so the fresh file is
// the whole record of this launch — read it from 0.
let lines = [];
for (let t = 0; t < 60_000; t += 1000) {
    lines = fs.readFileSync(DEBUG_LOG, 'utf8').split('\n').filter((l) => l.includes('[DetectorCalibration]'));
    if (lines.some((l) => /\[DetectorCalibration\] \d+\/\d+ pass/.test(l))) break;
    await sleep(1000);
}
for (const l of lines) console.log(l.replace(/^\S+T([0-9:.]{12})Z /, '$1  '));
const m = lines.map((l) => l.match(/\[DetectorCalibration\] (\d+)\/(\d+) pass/)).find(Boolean);
if (!m) { console.log('\nno summary line within 60 s — the app never ran the calibration'); process.exit(2); }
const ok = m[1] === m[2];
console.log(ok ? '\nall cases pass' : `\n${m[2] - m[1]} case(s) failed — the prompt does not return the complete question`);
process.exit(ok ? 0 : 1);
