// r2 THROWAWAY: the fixture list and the runner shared by calib-r2.mjs, rows-r2.mjs and the readers.
// The eight DS fixtures (built by DS/build-all.mjs on the committed builder) plus r2's own: s50c per item
// (peritem-s50c.mjs), the 05:00 re-smoke "cuesmoke2", s50e and s50g (build-fx.mjs).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DS = path.resolve(HERE, '../../dispatcher');
export const R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
export const W = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn/electron/test/golden/interview60.runs';
export const FX = [
  ['br1', `${DS}/fx-br1-off-turns.json`, `${R}/2026-09-30T11-45-30-br1/natively_debug.log`],
  ['cuesmoke', `${DS}/fx-cuesmoke-off-turns.json`, `${W}/2026-09-30T13-46-52-cuesmoke/natively_debug.log`],
  ['cuesmoke2', `${HERE}/fx-cuesmoke2-off.json`, `${W}/2026-10-01T02-37-41-cuesmoke/natively_debug.log`],
  ['s50b', `${DS}/fx-s50b-off.json`, `${R}/2026-09-11T08-22-32-s50b/natively_debug.log`],
  ['s50c', `${DS}/fx-s50c-off.json`, `${R}/2026-09-12T08-22-49-s50c/natively_debug.log`],
  ['s50c-peritem', `${HERE}/fx-s50c-peritem.json`, `${R}/2026-09-12T08-22-49-s50c/natively_debug.log`],
  ['s50d', `${DS}/fx-s50d-off.json`, `${R}/2026-09-13T08-22-36-s50d/natively_debug.log`],
  ['s50e', `${HERE}/fx-s50e-off.json`, `${R}/2026-09-14T08-22-28-s50e/natively_debug.log`],
  ['s50f', `${DS}/fx-s50f-off.json`, `${R}/2026-09-15T08-22-29-s50f/natively_debug.log`],
  ['s50g', `${HERE}/fx-s50g-off.json`, `${R}/2026-09-16T08-42-43-s50g/natively_debug.log`],
  ['s50i', `${DS}/fx-s50i-off.json`, `${R}/2026-09-18T08-22-57-s50i/natively_debug.log`],
  ['s50j', `${DS}/fx-s50j-off.json`, `${R}/2026-09-19T08-22-41-s50j/natively_debug.log`],
].filter(([, fx]) => fs.existsSync(fx));
export function run(fx, log, mode, extra = []) {
  const s = execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', path.join(HERE, 'replay-r2.mjs'), fx, log, mode, '--json', ...extra], { encoding: 'utf8', maxBuffer: 64 << 20 });
  return JSON.parse(s);
}
export const iso = (t) => new Date(t).toISOString().slice(11, 23);
