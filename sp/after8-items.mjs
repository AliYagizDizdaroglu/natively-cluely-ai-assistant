// Throwaway: per-item view of a run's metrics (doubles, extends, unclaimed answers, caught).
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const [root, dir] = process.argv.slice(2);
const metrics = await import(pathToFileURL(path.join(root, 'electron/test/golden/interview60.metrics.mjs')).href);
const m = metrics.computeRun(dir);
console.log('keys:', Object.keys(m).join(' '));
const items = m.items;
console.log('items:', items.length, 'answered', items.filter((i) => i.answered).length, 'notAnswered', items.filter((i) => !i.answered).map((i) => i.key || i.id).join(','));
for (const i of items) {
  if (i.dispatches > 1) console.log('DOUBLE', i.key || i.id, 'dispatches=' + i.dispatches, 'verdict=' + i.verdict, JSON.stringify(i.q).slice(0, 90));
  if (i.extended > 0) console.log('EXTEND', i.key || i.id, 'x' + i.extended, JSON.stringify(i.q).slice(0, 90));
  if (i.raceLoss) console.log('RACELOSS', i.key || i.id, JSON.stringify(i.q).slice(0, 90));
}
if (Array.isArray(m.dispatches)) {
  const un = m.dispatches.filter((d) => d.action === 'answer' && !d.claimed);
  console.log('dispatch entries:', m.dispatches.length, 'sample keys:', Object.keys(m.dispatches[0] || {}).join(' '));
  for (const d of m.dispatches) if (d.verdict === 'replaced') console.log('CAUGHT', new Date(d.at).toISOString(), JSON.stringify(d.question || d.heard || '').slice(0, 100));
}
if (m.unclaimed) console.log('unclaimed:', JSON.stringify(m.unclaimed).slice(0, 600));
if (m.answersToNobodyDetail) console.log('toNobody:', JSON.stringify(m.answersToNobodyDetail).slice(0, 600));
console.log('answersToNobody', m.answersToNobody, 'caught', m.caught, 'surfacedMulti', m.surfacedMulti, 'extendsTotal', m.extendsTotal, 'delivered', m.delivered, 'answered', m.answered, 'answerFailures', m.answerFailures);
const first = items.slice().sort((a, b) => a.playedAt - b.playedAt)[0];
console.log('first item', first.key || first.id, new Date(first.playedAt).toISOString(), 'answeredAt', first.answeredAt ? new Date(first.answeredAt).toISOString() : null);
