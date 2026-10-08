// Reviewer's read-only re-run of a few guard-h40d.mjs cases in the builder's stub tree (no file is written).
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const VH = path.resolve(HERE, '..', '..');
const STUB = path.join(VH, 'instruments', 'guard-cal');
const K = path.join(VH, 'kmode-stubs');
const C = process.argv[2];
const base = { ...process.env };
for (const k of Object.keys(base)) if (k.startsWith('NATIVELY_')) delete base[k];
Object.assign(base, { NATIVELY_STT_PROVIDER: 'deepgram', NATIVELY_ROSTER: 'holdout40' });
const cases = [
  ['correct env', { NATIVELY_FLIGHT_COMMIT: C }, 'settings-on.json'],
  ['hedge=1', { NATIVELY_FLIGHT_COMMIT: C, NATIVELY_VERBAL_HEDGE: '1' }, 'settings-on.json'],
  ['commit wrong', { NATIVELY_FLIGHT_COMMIT: '0'.repeat(40) }, 'settings-on.json'],
  ['placeholder', { NATIVELY_FLIGHT_COMMIT: '@@REGISTERED_HEAD_FULL_HASH@@' }, 'settings-on.json'],
  ['settings off', { NATIVELY_FLIGHT_COMMIT: C }, 'settings-off.json'],
  ['settings absent', { NATIVELY_FLIGHT_COMMIT: C }, 'settings-absent.json'],
  ['unguarded overrides set (LIVE_MODEL, FIRST_TOKEN_TIMEOUT_MS, TURN_MAX_HOLD_MS, DETECTOR_CHAIN_TEST)', { NATIVELY_FLIGHT_COMMIT: C, NATIVELY_LIVE_MODEL: 'x-live', NATIVELY_FIRST_TOKEN_TIMEOUT_MS: '300', NATIVELY_TURN_MAX_HOLD_MS: '1', NATIVELY_DETECTOR_CHAIN_TEST: '1' }, 'settings-on.json'],
];
for (const [name, env, st] of cases) {
  const r = spawnSync(process.execPath, [path.join(VH, 'guard-h40d.mjs'), '--settings', path.join(K, st)], { cwd: STUB, env: { ...base, ...env }, encoding: 'utf8' });
  const line = (r.stdout + r.stderr).split(/\r?\n/).find((l) => /^GUARD/.test(l)) ?? '(no GUARD line)';
  console.log(`${name.padEnd(28)} exit ${r.status}  ${line.slice(0, 150)}`);
}
