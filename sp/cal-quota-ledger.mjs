// Calibration for quota-ledger-today.mjs: the reset on its first line must be the most recent
// 07:00:00.000Z at or before now. Run: node cal-quota-ledger.mjs  (exit 1 on any failure).
// A mutant (the tool with the old hard-coded constant) must FAIL this same cal, or the cal is blind.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const tool = path.join(dir, 'quota-ledger-today.mjs');
const firstLine = (file, args) => spawnSync('node', [file, ...args], { encoding: 'utf8' }).stdout.split('\n')[0];
const resetOf = (file, args) => firstLine(file, args).match(/^reset (\S+)/)?.[1] ?? `<bad first line: ${firstLine(file, args)}>`;

const CASES = [
    ['2026-10-06T06:59:59Z', '2026-10-05T07:00:00.000Z'],
    ['2026-10-06T07:00:00Z', '2026-10-06T07:00:00.000Z'],
    ['2026-10-06T17:21:00Z', '2026-10-06T07:00:00.000Z'],
];
const run = (file) => {
    let ok = true;
    for (const [now, want] of CASES) {
        const got = resetOf(file, ['--now', now]);
        const pass = got === want; ok &&= pass;
        console.log(`  ${pass ? 'PASS' : 'FAIL'} now ${now} -> ${got} (want ${want})`);
    }
    // real run, no --now: today's 07:00Z (or yesterday's if it is before 07:00Z now)
    const n = Date.now(); const m = n - (n % 86400000) + 7 * 3600000;
    const want = new Date(m <= n ? m : m - 86400000).toISOString();
    const got = resetOf(file, []);
    const pass = got === want; ok &&= pass;
    console.log(`  ${pass ? 'PASS' : 'FAIL'} real run -> ${got} (want ${want})`);
    return ok;
};

console.log('tool:'); const toolOk = run(tool);
// mutant: swap the derivation for the old stale constant
const src = fs.readFileSync(tool, 'utf8');
const mutated = src.replace(/const DAY_START = .*\n/, "const DAY_START = Date.parse('2026-10-05T07:00:00.000Z');\n");
if (mutated === src) { console.log('mutant could not be built: DAY_START line not found'); process.exit(1); }
const mpath = path.join(dir, 'quota-ledger-today.mutant.tmp.mjs');
fs.writeFileSync(mpath, mutated);
console.log('mutant (old constant), expected to FAIL:');
const mutantOk = run(mpath);
fs.unlinkSync(mpath);
const verdict = toolOk && !mutantOk;
console.log(verdict ? 'CAL PASS (tool passes, mutant fails)' : `CAL FAIL (tool ok=${toolOk}, mutant ok=${mutantOk})`);
process.exit(verdict ? 0 : 1);
