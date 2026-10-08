// Throwaway: merge verdict rows, validate against packet-A.json, write verdicts-A-g1.json, then re-read and verify.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import p1 from './part1.mjs';
import p2 from './part2.mjs';
import p3 from './part3.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const blind = join(here, '..', 'l20c', 'blind');
const packet = JSON.parse(readFileSync(join(blind, 'packet-A.json'), 'utf8'));
const outPath = join(blind, 'verdicts-A-g1.json');

const rows = [...p1, ...p2, ...p3];
const problems = [];
const verdicts = {};
for (const [key, correctness, on_topic, delivery, reason] of rows) {
  if (key in verdicts) problems.push('duplicate row: ' + key);
  for (const [name, v] of [['correctness', correctness], ['on_topic', on_topic], ['delivery', delivery]]) {
    if (!Number.isInteger(v) || v < 0 || v > 2) problems.push(key + ': bad ' + name + ' ' + v);
  }
  if (typeof reason !== 'string' || !reason.trim()) problems.push(key + ': empty reason');
  const words = reason.trim().split(/\s+/).length;
  if (words > 25) problems.push(key + ': reason is ' + words + ' words');
  verdicts[key] = { correctness, on_topic, delivery, reason };
}

const packetKeys = packet.items.map((i) => i.key);
for (const k of packetKeys) if (!(k in verdicts)) problems.push('missing verdict: ' + k);
for (const k of Object.keys(verdicts)) if (!packetKeys.includes(k)) problems.push('unknown key: ' + k);

if (problems.length) {
  console.log('REFUSING TO WRITE:');
  for (const p of problems) console.log('  ' + p);
  process.exit(1);
}

// Write in packet order so the file reads in the same order as the items.
const ordered = {};
for (const k of packetKeys) ordered[k] = verdicts[k];
writeFileSync(outPath, JSON.stringify(ordered, null, 1) + '\n', 'utf8');

// Verify from disk, independently of the in-memory object.
const back = JSON.parse(readFileSync(outPath, 'utf8'));
const backKeys = Object.keys(back);
console.log('packet items     :', packet.items.length);
console.log('verdict keys     :', backKeys.length);
console.log('key sets equal   :', backKeys.length === packetKeys.length && packetKeys.every((k) => k in back));
const both2 = backKeys.filter((k) => back[k].correctness === 2 && back[k].on_topic === 2);
const any0 = backKeys.filter((k) => back[k].correctness === 0 || back[k].on_topic === 0);
console.log('correctness 2 AND on_topic 2:', both2.length);
console.log('correctness 0 OR on_topic 0 :', any0.length, any0.join(' '));
console.log('delivery 0       :', backKeys.filter((k) => back[k].delivery === 0).join(' '));
const dist = (f) => [0, 1, 2].map((n) => n + ':' + backKeys.filter((k) => back[k][f] === n).length).join('  ');
console.log('correctness dist :', dist('correctness'));
console.log('on_topic dist    :', dist('on_topic'));
console.log('delivery dist    :', dist('delivery'));
const lowest = backKeys
  .map((k) => ({ k, sum: back[k].correctness + back[k].on_topic + back[k].delivery, v: back[k] }))
  .sort((a, b) => a.sum - b.sum || a.v.correctness - b.v.correctness || a.v.on_topic - b.v.on_topic);
console.log('lowest totals:');
for (const r of lowest.slice(0, 12)) console.log('  ' + r.k.padEnd(10), r.sum, JSON.stringify([r.v.correctness, r.v.on_topic, r.v.delivery]));
