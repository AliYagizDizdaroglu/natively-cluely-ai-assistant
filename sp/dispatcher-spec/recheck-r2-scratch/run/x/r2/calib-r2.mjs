// r2 THROWAWAY: the r2 spec's calibration rule (§6.2 / R1), read off proto-r2 in calib mode (= today's machine) on
// every fixture. Per fixture: R1a unmatched replay classifies; R1b recorded classifies the replay never asked, each
// categorised (pre-roll | race: a mark within 200 ms of the ask | not-quiet: the WAV says the voice was on or a final
// was unsettled at the ask | UNEXPLAINED); R1c not-a-question closes within 100 ms; R1d first-dispatch source; R1e
// first-dispatch time within 100 ms, with the items excluded by a named signal. usage: node calib-r2.mjs [--jitter MS] [--only a,b]
import fs from 'node:fs';
import { FX, run, iso } from './fx.mjs';
const rest = process.argv.slice(2);
const argv = (n, d) => (rest.includes(n) ? rest[rest.indexOf(n) + 1] : d);
const jitter = argv('--jitter', '0');
const only = argv('--only', '').split(',').filter(Boolean);
for (const [name, fx, log] of FX) {
  if (only.length && !only.includes(name)) continue;
  const f = JSON.parse(fs.readFileSync(fx, 'utf8'));
  const r = run(fx, log, 'calib', ['--jitter', jitter]);
  const spoken = r.rows.filter((x) => x.kind === 'spoken');
  const first = r.rows[0];
  const unusedRec = r.recorded.filter((x) => !x.used).map((x) => {
    const marks = r.outcomes.filter((o) => o.src !== 'verdict' && Math.abs(o.at - x.askedAt) <= 200);
    const speakingAtAsk = f.items.some((it) => it.voice.some(([on, off]) => on <= x.askedAt && off > x.askedAt - 1200));
    const unsettled = f.finals.some((fn) => fn.at <= x.askedAt && x.askedAt - fn.at < 400);
    const cat = x.askedAt < first.from ? 'pre-roll' : marks.length ? `race: a mark ${marks[0].at - x.askedAt >= 0 ? '+' : ''}${marks[0].at - x.askedAt} ms from the ask` : speakingAtAsk ? 'not-quiet: the WAV voice was on within the gate before the ask' : unsettled ? 'not-quiet: a final under settle at the ask' : 'UNEXPLAINED';
    return `${iso(x.askedAt)} f=${x.finals} ${x.verdict}/${x.raw} [${cat}]`;
  });
  const replayCloses = r.closes.filter((c) => c.reason === 'not-a-question').map((c) => c.at);
  const closeMiss = r.logCloses.filter((t) => !replayCloses.some((x) => Math.abs(x - t) <= 100));
  const srcMiss = [], timeMiss = [], excluded = [];
  for (const row of spoken) {
    if (row.logFirst === null && row.first === null) continue;
    if (row.logFirst === null || row.first === null) { srcMiss.push(`${row.id}(log ${row.logFirst ? iso(row.logFirst) : '-'} replay ${row.first ? iso(row.first) : '-'})`); continue; }
    if (row.logFromLive !== null && row.logFromLive !== row.fromLive) srcMiss.push(`${row.id}(log fromLive=${row.logFromLive} replay ${row.fromLive})`);
    const signals = [];
    if (row.vadDev !== null && Math.abs(row.vadDev) > 100) signals.push(`vad-offset ${row.vadDev > 0 ? '+' : ''}${row.vadDev}`);
    const logHeld = row.logGate !== null && row.logGate >= 3700, replayHeld = row.path !== 'gate' && row.path !== null;
    if (logHeld && !replayHeld) signals.push(`app-held gate=${row.logGate}`);
    if (!logHeld && replayHeld && row.logGate !== null) signals.push(`replay-held ${row.path}`);
    if (row.blips) signals.push(`blip x${row.blips}`);
    if (row.markTriggered && row.path === 'gate') signals.push(`app-timer-late: the log's dispatch rode on a mark (gate=${row.logGate})`);
    const dt = row.first - row.logFirst;
    if (signals.length) excluded.push(`${row.id}[${signals.join('; ')}]${Math.abs(dt) > 100 ? ` (would miss ${dt > 0 ? '+' : ''}${dt})` : ' (within 100 anyway)'}`);
    else if (Math.abs(dt) > 100) timeMiss.push(`${row.id}:${dt > 0 ? '+' : ''}${dt}`);
  }
  const once = spoken.filter((x) => x.n === 1).length;
  console.log(`${name.padEnd(13)} once ${once}/${spoken.length}; doubles [${r.rows.filter((x) => x.n > 1).map((x) => x.id).join(' ')}]; never [${spoken.filter((x) => x.n === 0).map((x) => x.id).join(' ')}]; reorders under the jitter rule ${r.reorders.length}`);
  console.log(`  R1a unmatched replay classifies: ${r.unmatched.length}${r.unmatched.length ? ' @' + r.unmatched.map((u) => `${iso(u.at)} f=${u.finals}`).join(',') : ''}`);
  console.log(`  R1b recorded classifies never matched: ${unusedRec.length}${unusedRec.length ? '\n      ' + unusedRec.join('\n      ') : ''}`);
  console.log(`  R1c log not-a-question closes ${r.logCloses.length}, not reproduced within 100 ms: ${closeMiss.length}${closeMiss.length ? ' @' + closeMiss.map(iso).join(',') : ''}`);
  console.log(`  R1d first-dispatch source mismatches: ${srcMiss.length} [${srcMiss.join(' ')}]`);
  console.log(`  R1e first-dispatch time > 100 ms with no signal: ${timeMiss.length} [${timeMiss.join(' ')}]; excluded by a signal: ${excluded.length}/${spoken.length} [${excluded.join(' ')}]`);
}
