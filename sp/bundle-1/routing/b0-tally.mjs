// Throwaway: B0's full tally (the OLD instruction under the substitute context), to compare with B1's R1 misroutes. Ids and counts only.
import fs from 'node:fs';
import { loadRoster, routeReader, runFile } from './common.mjs';
import { classifyRun } from './classify.mjs';
import { tally } from './score-routing.mjs';
const R = await routeReader();
for (const [roster, runs] of [['live40', [['B0', 1], ['B1', 1], ['B1', 2]]], ['scenario50', [['V', 1]]]]) {
  const items = await loadRoster(roster);
  const keys = Object.fromEntries(items.map((i) => [i.id, i.key]));
  for (const [a, r] of runs) {
    const c = classifyRun(JSON.parse(fs.readFileSync(runFile(a, r), 'utf8')), R);
    const t = tally(c, keys);
    console.log(`${a}r${r}`, 'HARD-key', JSON.stringify(t.HARD), 'EASY-key', JSON.stringify(t.EASY), 'HARD->EASY', Object.keys(keys).filter((id) => keys[id] === 'HARD' && c[id]?.cls === 'EASY').join(','));
  }
}
