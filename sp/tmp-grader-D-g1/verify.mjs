// Throwaway: verify verdicts-D-g1.json against packet-D.json (grader D-g1).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const blind = join(here, '..', 'l20c', 'blind');
const packet = JSON.parse(readFileSync(join(blind, 'packet-D.json'), 'utf8'));
const raw = readFileSync(join(blind, 'verdicts-D-g1.json'), 'utf8');
const verdicts = JSON.parse(raw); // throws if not valid JSON

const packetKeys = packet.items.map((i) => i.key);
const verdictKeys = Object.keys(verdicts);
const problems = [];

const missing = packetKeys.filter((k) => !(k in verdicts));
const extra = verdictKeys.filter((k) => !packetKeys.includes(k));
if (missing.length) problems.push('missing: ' + missing.join(', '));
if (extra.length) problems.push('extra: ' + extra.join(', '));

const wordsByKey = Object.fromEntries(
  packet.items.map((i) => [i.key, i.answer.trim().split(/\s+/).filter(Boolean).length]),
);

for (const [k, v] of Object.entries(verdicts)) {
  const fields = Object.keys(v).sort().join(',');
  if (fields !== 'correctness,delivery,on_topic,reason') problems.push(k + ' fields: ' + fields);
  for (const f of ['correctness', 'on_topic', 'delivery']) {
    if (!Number.isInteger(v[f]) || v[f] < 0 || v[f] > 2) problems.push(k + ' bad ' + f + ': ' + v[f]);
  }
  const rw = String(v.reason || '').trim().split(/\s+/).filter(Boolean).length;
  if (rw === 0 || rw > 25) problems.push(k + ' reason words: ' + rw);
  // Length rule applied by this grader: over 85 words is never delivery 2.
  if (wordsByKey[k] > 85 && v.delivery === 2) problems.push(k + ' delivery 2 at ' + wordsByKey[k] + ' words');
  if (wordsByKey[k] <= 85 && v.delivery === 1) problems.push(k + ' delivery 1 at ' + wordsByKey[k] + ' words (check register reason)');
  // A reason that quotes a word count must quote the real one.
  const m = /(\d+) words/.exec(v.reason);
  if (m && Number(m[1]) !== wordsByKey[k]) problems.push(k + ' reason says ' + m[1] + ' words, actual ' + wordsByKey[k]);
}

const vals = Object.entries(verdicts);
const solid = vals.filter(([, v]) => v.correctness === 2 && v.on_topic === 2).length;
const wrong = vals.filter(([, v]) => v.correctness === 0 || v.on_topic === 0).length;
const d0 = vals.filter(([, v]) => v.delivery === 0).length;

console.log('packet items :', packetKeys.length);
console.log('verdict keys :', verdictKeys.length);
console.log('same order   :', JSON.stringify(packetKeys) === JSON.stringify(verdictKeys));
console.log('c2 & t2      :', solid);
console.log('c0 or t0     :', wrong);
console.log('delivery 0   :', d0);

const perId = {};
for (const it of packet.items) {
  const v = verdicts[it.key];
  const p = (perId[it.id] ||= { n: 0, solid: 0 });
  p.n += 1;
  if (v.correctness === 2 && v.on_topic === 2) p.solid += 1;
}
console.log('solid per id :', JSON.stringify(perId));

const totals = vals
  .map(([k, v]) => [k, v.correctness + v.on_topic + v.delivery, v.correctness, v.on_topic, v.delivery])
  .sort((a, b) => a[1] - b[1]);
const min = totals[0][1];
console.log('min total    :', min, '| keys at min:', totals.filter((t) => t[1] === min).map((t) => `${t[0]}(${t[2]}${t[3]}${t[4]})`).join(' '));
console.log('problems     :', problems.length ? '\n  ' + problems.join('\n  ') : 'none');
