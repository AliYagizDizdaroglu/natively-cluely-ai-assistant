// Throwaway verifier for grader g2, packet B: re-reads the verdict file from disk and checks it against the packet.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, 'l20c', 'blind');
const packet = JSON.parse(readFileSync(join(dir, 'packet-B.json'), 'utf8'));
const raw = readFileSync(join(dir, 'verdicts-B-g2.json'), 'utf8');
const verdicts = JSON.parse(raw); // throws if not valid JSON

const pk = packet.items.map((i) => i.key);
const vk = Object.keys(verdicts);
const missing = pk.filter((k) => !(k in verdicts));
const extra = vk.filter((k) => !pk.includes(k));
console.log('parsed OK; packet items:', pk.length, 'verdict keys:', vk.length);
console.log('missing:', JSON.stringify(missing), 'extra:', JSON.stringify(extra));

const bad = [];
const words = (s) => s.split(/\s+/).filter(Boolean).length;
const ansWords = (s) => s.replace(/[—–]/g, ' ').split(/\s+/).filter(Boolean).length;
for (const k of vk) {
  const v = verdicts[k];
  const fields = Object.keys(v).sort().join(',');
  if (fields !== 'correctness,delivery,on_topic,reason') bad.push(`${k}: fields ${fields}`);
  for (const f of ['correctness', 'on_topic', 'delivery']) {
    if (![0, 1, 2].includes(v[f])) bad.push(`${k}: ${f}=${v[f]}`);
  }
  if (typeof v.reason !== 'string' || !v.reason.trim()) bad.push(`${k}: empty reason`);
  else if (words(v.reason) > 25) bad.push(`${k}: reason ${words(v.reason)} words`);
}
console.log('shape problems:', bad.length ? bad : 'none');

// Length rule cross-check: every answer over 85 words must not have delivery 2.
const lenMismatch = packet.items
  .filter((i) => ansWords(i.answer) > 85 && verdicts[i.key].delivery === 2)
  .map((i) => `${i.key}(${ansWords(i.answer)})`);
console.log('over 85 words but delivery 2:', lenMismatch.length ? lenMismatch : 'none');
const shortButOne = packet.items
  .filter((i) => ansWords(i.answer) <= 85 && verdicts[i.key].delivery < 2)
  .map((i) => `${i.key}(${ansWords(i.answer)})`);
console.log('85 words or fewer but delivery below 2 (register defects):', shortButOne);

const solid = vk.filter((k) => verdicts[k].correctness === 2 && verdicts[k].on_topic === 2).length;
const zero = vk.filter((k) => verdicts[k].correctness === 0 || verdicts[k].on_topic === 0).length;
console.log('correctness 2 AND on_topic 2:', solid);
console.log('correctness 0 OR on_topic 0:', zero);

const dist = (f) => [0, 1, 2].map((n) => `${n}:${vk.filter((k) => verdicts[k][f] === n).length}`).join(' ');
console.log('correctness', dist('correctness'), '| on_topic', dist('on_topic'), '| delivery', dist('delivery'));

const ranked = vk
  .map((k) => ({ k, sum: verdicts[k].correctness + verdicts[k].on_topic + verdicts[k].delivery, v: verdicts[k] }))
  .sort((a, b) => a.sum - b.sum || a.v.correctness - b.v.correctness || a.v.on_topic - b.v.on_topic);
console.log('lowest totals:');
for (const r of ranked.filter((r) => r.sum <= 4)) {
  console.log(`  ${r.k} c${r.v.correctness} o${r.v.on_topic} d${r.v.delivery} = ${r.sum} :: ${r.v.reason}`);
}
