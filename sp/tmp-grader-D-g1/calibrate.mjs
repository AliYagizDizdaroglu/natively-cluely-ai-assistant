// Throwaway: prove the verifier's checks fire on a known-bad copy (kept out of the blind dir).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const blind = join(here, '..', 'l20c', 'blind');
const packet = JSON.parse(readFileSync(join(blind, 'packet-D.json'), 'utf8'));
const good = JSON.parse(readFileSync(join(blind, 'verdicts-D-g1.json'), 'utf8'));

function check(verdicts) {
  const packetKeys = packet.items.map((i) => i.key);
  const words = Object.fromEntries(packet.items.map((i) => [i.key, i.answer.trim().split(/\s+/).filter(Boolean).length]));
  const problems = [];
  for (const k of packetKeys) if (!(k in verdicts)) problems.push('missing ' + k);
  for (const k of Object.keys(verdicts)) if (!packetKeys.includes(k)) problems.push('extra ' + k);
  for (const [k, v] of Object.entries(verdicts)) {
    for (const f of ['correctness', 'on_topic', 'delivery']) {
      if (!Number.isInteger(v[f]) || v[f] < 0 || v[f] > 2) problems.push(k + ' bad ' + f);
    }
    const rw = String(v.reason || '').trim().split(/\s+/).filter(Boolean).length;
    if (rw === 0 || rw > 25) problems.push(k + ' reason words ' + rw);
    if (words[k] > 85 && v.delivery === 2) problems.push(k + ' delivery 2 over 85');
    const m = /(\d+) words/.exec(v.reason || '');
    if (m && Number(m[1]) !== words[k]) problems.push(k + ' wrong quoted count');
  }
  return problems;
}

console.log('good file problems:', check(good).length);

const bad = structuredClone(good);
delete bad['S2Q03#1'];                       // missing key
bad['S2Q99#1'] = bad['S2Q03#2'];             // extra key
bad['S2Q10#1'].correctness = 3;              // out of range
bad['S2Q10#2'].on_topic = 1.5;               // non-integer
bad['S2Q05#8'].delivery = 2;                 // 144 words marked 2
bad['S2Q05#3'].reason = 'Correct, but 999 words is too long.'; // wrong quoted count
bad['S2Q06#2'].reason = Array(30).fill('word').join(' ');      // reason over 25 words
const found = check(bad);
console.log('bad file problems :', found.length);
for (const p of found) console.log('  -', p);
