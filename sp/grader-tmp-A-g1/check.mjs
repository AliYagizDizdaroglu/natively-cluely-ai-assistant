// Throwaway: independent check of a verdicts file against packet-A.json.
// Usage: node check.mjs [path-to-verdicts]   (default: the real verdicts-A-g1.json)
// With "--selftest" it also runs the same check on two deliberately broken copies, which must FAIL.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const blind = join(here, '..', 'l20c', 'blind');
const packet = JSON.parse(readFileSync(join(blind, 'packet-A.json'), 'utf8'));
const real = join(blind, 'verdicts-A-g1.json');

function check(path) {
  let obj;
  try {
    obj = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    return 'FAIL: does not parse as JSON (' + e.message.slice(0, 60) + ')';
  }
  const keys = Object.keys(obj);
  if (keys.length !== packet.items.length) return 'FAIL: ' + keys.length + ' keys vs ' + packet.items.length + ' items';
  for (const item of packet.items) {
    const v = obj[item.key];
    if (!v) return 'FAIL: missing ' + item.key;
    for (const f of ['correctness', 'on_topic', 'delivery']) {
      if (!Number.isInteger(v[f]) || v[f] < 0 || v[f] > 2) return 'FAIL: ' + item.key + ' ' + f + ' = ' + v[f];
    }
    if (typeof v.reason !== 'string' || !v.reason.trim()) return 'FAIL: ' + item.key + ' has no reason';
  }
  return 'PASS: parses, ' + keys.length + ' keys = ' + packet.items.length + ' items, all scores integers 0-2, all reasons present';
}

console.log('real file      ->', check(real));

if (process.argv.includes('--selftest')) {
  const text = readFileSync(real, 'utf8');
  const truncated = join(here, 'broken-truncated.json');
  writeFileSync(truncated, text.slice(0, Math.floor(text.length / 2)), 'utf8');
  console.log('truncated copy ->', check(truncated));

  const obj = JSON.parse(text);
  delete obj[packet.items[0].key];
  const missing = join(here, 'broken-missing-key.json');
  writeFileSync(missing, JSON.stringify(obj), 'utf8');
  console.log('one key removed ->', check(missing));

  const obj2 = JSON.parse(text);
  obj2[packet.items[1].key].delivery = 3;
  const badScore = join(here, 'broken-bad-score.json');
  writeFileSync(badScore, JSON.stringify(obj2), 'utf8');
  console.log('score of 3     ->', check(badScore));
}
