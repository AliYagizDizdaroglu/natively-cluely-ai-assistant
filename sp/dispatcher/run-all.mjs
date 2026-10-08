// Runs every read-only analysis of this diagnosis and saves its output under DS (out-*.txt).
// Reads the run folders; writes nothing outside DS.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const DS = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const G = `${MAIN}/electron/test/golden`;
const R = `${G}/interview60.runs`;
const W = `${MAIN}/.claude/worktrees/whole-turn/electron/test/golden/interview60.runs`;
const HOURS = ['2026-09-11T08-22-32-s50b', '2026-09-12T08-22-49-s50c', '2026-09-13T08-22-36-s50d', '2026-09-14T08-22-28-s50e', '2026-09-15T08-22-29-s50f', '2026-09-16T08-42-43-s50g', '2026-09-16T11-41-44-s50h', '2026-09-18T08-22-57-s50i', '2026-09-19T08-22-41-s50j', '2026-09-20T11-22-43-s50k', '2026-09-21T08-22-34-s50l', '2026-09-22T08-22-50-s50m', '2026-09-24T08-20-12-h40a', '2026-09-26T11-39-51-h40b', '2026-09-29T11-42-00-h40c', '2026-09-30T11-45-30-br1'].map((d) => `${R}/${d}`)
  .concat(['2026-09-30T02-38-22-cuesmoke', '2026-09-30T13-46-52-cuesmoke'].map((d) => `${W}/${d}`));
const NON_HOLDOUT = HOURS.filter((h) => !/h40/.test(h));
const node = (args, strip = false) => execFileSync(process.execPath, [...(strip ? ['--experimental-strip-types', '--no-warnings'] : []), ...args], { cwd: DS, encoding: 'utf8', maxBuffer: 64 << 20 });
const save = (name, text) => { fs.writeFileSync(path.join(DS, name), text); console.log(`${name}: ${text.split('\n').length} lines`); };
save('out-count.txt', node(['count.mjs', R, W]));
save('out-closes-summary.txt', node(['summary.mjs', ...HOURS]));
save('out-classify-pairs.txt', node(['pairs.mjs', ...HOURS]));
save('out-liveonly.txt', node(['liveonly.mjs', ...HOURS]));
save('out-r21.txt', node(['r21.mjs', ...HOURS]));
save('out-item-paths.txt', ['S1Q08', 'S2Q05'].map((id) => `== ${id}\n` + node(['item-paths.mjs', id, ...NON_HOLDOUT])).join('\n'));
save('out-br1-S1Q08-window.txt', node(['window.mjs', `${R}/2026-09-30T11-45-30-br1/natively_debug.log`, '2026-09-30T11:00:30Z', '2026-09-30T11:03:10Z']));
save('out-cuesmoke-S1Q08-window.txt', node(['window.mjs', `${W}/2026-09-30T13-46-52-cuesmoke/natively_debug.log`, '2026-09-30T13:36:40Z', '2026-09-30T13:39:00Z']));
save('out-vadlag.txt', node(['vadlag.mjs', 'fx-br1-turns.json', `${R}/2026-09-30T11-45-30-br1/natively_debug.log`]) + node(['vadlag.mjs', 'fx-cuesmoke-turns.json', `${W}/2026-09-30T13-46-52-cuesmoke/natively_debug.log`]));
save('out-similarity.txt', node(['simil.mjs', `${R}/2026-09-30T11-45-30-br1/natively_debug.log`, `${W}/2026-09-30T13-46-52-cuesmoke/natively_debug.log`]));
let rep = '== calibration: committed fixtures, the committed test\'s own feed (--old --no-verdicts)\n';
rep += node(['replay.mjs', `${G}/fixtures/2026-09-09T15-00-55-s50a-turns.json`, `${R}/2026-09-09T15-00-55-s50a/natively_debug.log`, '--old', '--no-verdicts'], true);
rep += node(['replay.mjs', `${G}/fixtures/2026-09-08T08-44-56-after9-turns.json`, `${R}/2026-09-08T08-44-56-after9/natively_debug.log`, '--old', '--no-verdicts'], true);
rep += '\n== br1, offset 1419 ms, recorded classify verdicts fed (today\'s machine)\n' + node(['replay.mjs', 'fx-br1-off-turns.json', `${R}/2026-09-30T11-45-30-br1/natively_debug.log`, '--trace', 'S1Q08'], true);
rep += '\n== br1, offset 1419 ms, NO verdicts fed (what the committed replay does)\n' + node(['replay.mjs', 'fx-br1-off-turns.json', `${R}/2026-09-30T11-45-30-br1/natively_debug.log`, '--trace', 'S1Q08', '--no-verdicts'], true);
rep += '\n== cuesmoke v2, offset 776 ms, recorded classify verdicts fed\n' + node(['replay.mjs', 'fx-cuesmoke-off-turns.json', `${W}/2026-09-30T13-46-52-cuesmoke/natively_debug.log`, '--trace', 'S1Q08'], true);
for (const [n, d] of [['s50b', '2026-09-11T08-22-32-s50b'], ['s50c', '2026-09-12T08-22-49-s50c'], ['s50d', '2026-09-13T08-22-36-s50d'], ['s50f', '2026-09-15T08-22-29-s50f'], ['s50i', '2026-09-18T08-22-57-s50i'], ['s50j', '2026-09-19T08-22-41-s50j']]) {
  rep += `\n== ${n}, recorded classify verdicts fed\n` + node(['replay.mjs', `fx-${n}-off.json`, `${R}/${d}/natively_debug.log`], true);
}
save('out-replay.txt', rep);
