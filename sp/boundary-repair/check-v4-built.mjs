// check-v4-built.mjs (2026-09-29): the controller's post-build equivalence step. Runs check-v4.mjs with the
// BUILT module as the candidate — dist-electron/electron/audio/deepgramBoundaryRepair.js (CommonJS, factory
// createBoundaryRepair, whose object has onTranscript(text, isFinal, atMs, speechFinal) and clear()) — and
// prints EQUIVALENT / NOT EQUIVALENT to rule-v4.mjs (every recorded event under the v4 feed, all 45 fixtures,
// every probe). Exit 0 only on EQUIVALENT.
//   node check-v4-built.mjs                 the default dist path under MAIN (build first)
//   node check-v4-built.mjs <module path>   any module with that export shape (.js CommonJS or .mjs)
//   node check-v4-built.mjs --calibrate     rule-v4.mjs itself must be EQUIVALENT; shim-v3.mjs (v3 behaviour behind
//                                           the built shape), mutant-clear-keeps-interim.mjs (clear() keeps the
//                                           latest interim), mutant-window-4000.mjs (a 4000 ms window) and
//                                           mutant-pletter-only.mjs (a guard without \p{M}: decomposed accents slip
//                                           through) must each be NOT EQUIVALENT; exit 0 only if all five hold
// The full check-v4 output of each run is kept next to this file as evidence/check-v4-built.<tag>.out.txt.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const DIST = path.join(MAIN, 'dist-electron/electron/audio/deepgramBoundaryRepair.js');
const arg = process.argv[2];

function runAgainst(modulePath, tag) {
    if (!fs.existsSync(modulePath)) return { verdict: 'MISSING', line: `${modulePath} does not exist (build MAIN first: cmd /c "npm run build:electron -- --force")` };
    const r = spawnSync(process.execPath, [path.join(HERE, 'check-v4.mjs'), '--module', modulePath], { encoding: 'utf8', timeout: 300000 });
    const out = `${r.stdout}${r.stderr}`;
    fs.mkdirSync(path.join(HERE, 'evidence'), { recursive: true });
    fs.writeFileSync(path.join(HERE, 'evidence', `check-v4-built.${tag}.out.txt`), out);
    const line = out.split('\n').find((l) => /^(EQUIVALENT|NOT EQUIVALENT)/.test(l)) ?? `(no verdict line; exit ${r.status})`;
    const stat = fs.statSync(modulePath);
    return { verdict: line.startsWith('EQUIVALENT') ? 'EQUIVALENT' : 'NOT EQUIVALENT', line: `${line} [${path.basename(modulePath)} ${stat.size} bytes, mtime ${stat.mtime.toISOString()}]` };
}

if (arg === '--calibrate') {
    const a = runAgainst(path.join(HERE, 'rule-v4.mjs'), 'calib-rule-v4');
    const b = runAgainst(path.join(HERE, 'shim-v3.mjs'), 'calib-shim-v3');
    const c = runAgainst(path.join(HERE, 'mutant-clear-keeps-interim.mjs'), 'calib-mutant-clear-keeps-interim');
    const d = runAgainst(path.join(HERE, 'mutant-window-4000.mjs'), 'calib-mutant-window-4000');
    const e = runAgainst(path.join(HERE, 'mutant-pletter-only.mjs'), 'calib-mutant-pletter-only');
    console.log(`calibration 1 (rule-v4.mjs as the candidate, must be EQUIVALENT):                       ${a.line}`);
    console.log(`calibration 2 (shim-v3.mjs, v3 behaviour, must be NOT EQUIVALENT):                     ${b.line}`);
    console.log(`calibration 3 (mutant-clear-keeps-interim.mjs, must be NOT EQUIVALENT):                ${c.line}`);
    console.log(`calibration 4 (mutant-window-4000.mjs, must be NOT EQUIVALENT):                        ${d.line}`);
    console.log(`calibration 5 (mutant-pletter-only.mjs, guard without \\p{M}, must be NOT EQUIVALENT): ${e.line}`);
    const ok = a.verdict === 'EQUIVALENT' && b.verdict === 'NOT EQUIVALENT' && c.verdict === 'NOT EQUIVALENT' && d.verdict === 'NOT EQUIVALENT' && e.verdict === 'NOT EQUIVALENT';
    console.log(ok ? 'CALIBRATION OK: the check tells the reference from a v3-behaving module, a clear() that keeps the interim, a 4000 ms window, and a guard that misses combining marks' : 'CALIBRATION FAILED');
    process.exit(ok ? 0 : 1);
}
const target = arg ? path.resolve(arg) : DIST;
const r = runAgainst(target, arg ? path.basename(target).replace(/\W+/g, '-') : 'dist');
console.log(r.line);
process.exit(r.verdict === 'EQUIVALENT' ? 0 : 1);
