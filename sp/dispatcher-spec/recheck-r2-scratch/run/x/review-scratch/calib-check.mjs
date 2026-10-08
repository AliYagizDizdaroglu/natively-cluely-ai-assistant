// REVIEW THROWAWAY: the spec's §6.2 calibration bullets, read off the prototype's calib mode (= today's machine) for all
// eight fixtures. Compares the replay with the log: unmatched classifies, not-a-question closes within 100 ms, first
// admitted dispatch's source and time within 100 ms. Prints only ids, times and counts.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DS = path.resolve(HERE, '../../dispatcher');
const R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const W = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn/electron/test/golden/interview60.runs';
export const FX = [
  ['br1', `${DS}/fx-br1-off-turns.json`, `${R}/2026-09-30T11-45-30-br1/natively_debug.log`],
  ['cuesmoke', `${DS}/fx-cuesmoke-off-turns.json`, `${W}/2026-09-30T13-46-52-cuesmoke/natively_debug.log`],
  ['s50b', `${DS}/fx-s50b-off.json`, `${R}/2026-09-11T08-22-32-s50b/natively_debug.log`],
  ['s50c', `${DS}/fx-s50c-off.json`, `${R}/2026-09-12T08-22-49-s50c/natively_debug.log`],
  ['s50d', `${DS}/fx-s50d-off.json`, `${R}/2026-09-13T08-22-36-s50d/natively_debug.log`],
  ['s50f', `${DS}/fx-s50f-off.json`, `${R}/2026-09-15T08-22-29-s50f/natively_debug.log`],
  ['s50i', `${DS}/fx-s50i-off.json`, `${R}/2026-09-18T08-22-57-s50i/natively_debug.log`],
  ['s50j', `${DS}/fx-s50j-off.json`, `${R}/2026-09-19T08-22-41-s50j/natively_debug.log`],
];
export function run(fx, log, mode, extra = []) {
  const s = execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', path.join(HERE, 'replay-proto.mjs'), fx, log, mode, '--json', ...extra], { encoding: 'utf8', maxBuffer: 64 << 20 });
  return JSON.parse(s);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const extra = process.argv.slice(2);
  const iso = (t) => new Date(t).toISOString().slice(11, 23);
  for (const [name, fx, log] of FX) {
    const r = run(fx, log, 'calib', extra);
    const unusedRec = r.recorded.filter((x) => !x.used);
    const spoken = r.rows.filter((x) => x.kind === 'spoken');
    const replayCloses = r.closes.filter((c) => c.reason === 'not-a-question').map((c) => c.at);
    const closeMiss = r.logCloses.filter((t) => !replayCloses.some((x) => Math.abs(x - t) <= 100));
    const srcMiss = [], timeMiss = [];
    for (const row of spoken) {
      if (row.logFirst === null && row.first === null) continue;
      if (row.logFirst === null || row.first === null) { srcMiss.push(`${row.id}(log ${row.logFirst ? iso(row.logFirst) : '-'} replay ${row.first ? iso(row.first) : '-'})`); continue; }
      if (row.logFromLive !== null && row.logFromLive !== row.fromLive) srcMiss.push(`${row.id}(log fromLive=${row.logFromLive} replay ${row.fromLive})`);
      const dt = row.first - row.logFirst; if (Math.abs(dt) > 100) timeMiss.push(`${row.id}:${dt > 0 ? '+' : ''}${dt}`);
    }
    console.log(`${name.padEnd(9)} once ${spoken.filter((x) => x.n === 1).length}/${spoken.length}; unmatched replay classifies ${r.unmatched.length}${r.unmatched.length ? ' @' + r.unmatched.map((u) => `${iso(u.at)} f=${u.finals}`).join(',') : ''}; recorded classifies never matched ${unusedRec.length}${unusedRec.length ? ' @' + unusedRec.map((u) => `${iso(u.askedAt)} f=${u.finals} ${u.verdict}/${u.raw}`).join(',') : ''}; log not-a-question closes ${r.logCloses.length}, not reproduced within 100 ms ${closeMiss.length}${closeMiss.length ? ' @' + closeMiss.map(iso).join(',') : ''}`);
    console.log(`          first-dispatch source mismatch ${srcMiss.length} [${srcMiss.join(' ')}]; first-dispatch time > 100 ms ${timeMiss.length} [${timeMiss.join(' ')}]`);
  }
}
