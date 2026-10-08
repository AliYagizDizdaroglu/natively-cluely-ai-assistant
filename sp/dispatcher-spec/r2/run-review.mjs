// r2 THROWAWAY (read-only on repos and logs): re-runs the reviewer's scripts (RS) unchanged, one at a time, and
// saves each output under r2/ as out-review-<name>.txt, so revision 2 starts from reproduced numbers (rule 8).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const RS = path.resolve(HERE, '../review-scratch');
const R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const only = process.argv.slice(2);
const jobs = [
  ['calib-anchor', ['calib-check.mjs', '--anchor']],
  ['calib-noanchor', ['calib-check.mjs']],
  ['rows-anchor', ['rows-check.mjs', '--anchor']],
  ['rows-anchor-rearm', ['rows-check.mjs', '--anchor', '--rearm']],
  ['rows-noanchor', ['rows-check.mjs']],
  ['crafted', ['crafted.mjs']],
  ['crafted-e', ['crafted-e.mjs']],
  ['followup-echo', ['followup-echo.mjs']],
  ['ontime-echo', ['ontime-echo.mjs']],
  ['s50e-followup', ['s50e-followup.mjs', `${R}/2026-09-14T08-22-28-s50e/natively_debug.log`]],
  ['claim-timing', ['claim-timing.mjs']],
  ['pairing', ['pairing.mjs']],
  ['legacy-r2', ['legacy-r2.mjs']],
  ['margins-anchor', ['margins.mjs', '--anchor']],
  ['ignored-anchor', ['ignored.mjs', '--anchor']],
  ['regex-check', ['regex-check.mjs']],
];
for (const [name, args] of jobs) {
  if (only.length && !only.includes(name)) continue;
  const t0 = Date.now();
  let out;
  try {
    out = execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', ...args], { cwd: RS, encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    out = `EXIT ${e.status}\n${e.stdout ?? ''}\n${e.stderr ?? ''}`;
  }
  fs.writeFileSync(path.join(HERE, `out-review-${name}.txt`), out);
  console.log(`${name.padEnd(20)} ${String(out.split('\n').length).padStart(5)} lines  ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
