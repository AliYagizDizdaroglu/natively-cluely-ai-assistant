// Throwaway: verify verdicts-C-g1.json against packet-C.json and print the summary counts.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const blind = join(here, 'l20c', 'blind');
const packet = JSON.parse(readFileSync(join(blind, 'packet-C.json'), 'utf8'));
const raw = readFileSync(join(blind, 'verdicts-C-g1.json'), 'utf8');
const verdicts = JSON.parse(raw); // throws if the file is not valid JSON

const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;
const AXES = ['correctness', 'on_topic', 'delivery'];

function problems(items, v) {
  const out = [];
  const itemKeys = items.map((i) => i.key);
  const vKeys = Object.keys(v);
  if (vKeys.length !== itemKeys.length) out.push(`key count ${vKeys.length} != items ${itemKeys.length}`);
  for (const k of itemKeys) if (!(k in v)) out.push(`missing verdict for ${k}`);
  for (const k of vKeys) if (!itemKeys.includes(k)) out.push(`verdict for unknown key ${k}`);
  for (const [k, e] of Object.entries(v)) {
    for (const a of AXES) {
      if (!Number.isInteger(e[a]) || e[a] < 0 || e[a] > 2) out.push(`${k}.${a} is not an integer 0-2: ${e[a]}`);
    }
    const extra = Object.keys(e).filter((f) => ![...AXES, 'reason'].includes(f));
    if (extra.length) out.push(`${k} has extra fields: ${extra.join(',')}`);
    if (typeof e.reason !== 'string' || !e.reason.trim()) out.push(`${k} has no reason`);
    else if (words(e.reason) > 25) out.push(`${k} reason is ${words(e.reason)} words (> 25)`);
  }
  return out;
}

// Calibration: the checker must fail on inputs known to be bad.
const broken = structuredClone(verdicts);
delete broken['S2Q04#1'];
broken['S2Q04#2'].correctness = 3;
broken['S2Q04#4'].reason = Array(30).fill('word').join(' ');
broken['NOT_A_KEY'] = { correctness: 1, on_topic: 1, delivery: 1, reason: 'x' };
const calib = problems(packet.items, broken);
// One key deleted and one added keeps the count at 79, so 4 problems are expected here.
console.log('calibration (expect 4 problems on the broken copy):', calib.length);
for (const p of calib) console.log('  calib:', p);
// The count check on its own: delete one key and add nothing.
const short = structuredClone(verdicts);
delete short['S1Q07F#8'];
const calib2 = problems(packet.items, short);
console.log('calibration 2 (expect a key-count problem and a missing-verdict problem):', calib2.length);
for (const p of calib2) console.log('  calib2:', p);

const real = problems(packet.items, verdicts);
console.log('items in packet:', packet.items.length);
console.log('keys in verdicts:', Object.keys(verdicts).length);
console.log('problems in the real file:', real.length);
for (const p of real) console.log('  PROBLEM:', p);

// Length policy cross-check: report delivery against answer word count.
const lenMismatch = [];
for (const it of packet.items) {
  const w = words(it.answer);
  const d = verdicts[it.key].delivery;
  if (w >= 90 && d === 2) lenMismatch.push(`${it.key} ${w}w delivery 2`);
}
console.log('answers of 90+ words scored delivery 2 (expect 0):', lenMismatch.length, lenMismatch.join('; '));
const shortOnes = packet.items
  .filter((it) => words(it.answer) < 90 && verdicts[it.key].delivery < 2)
  .map((it) => `${it.key} ${words(it.answer)}w d=${verdicts[it.key].delivery}`);
console.log('answers under 90 words scored delivery < 2:', shortOnes.join('; ') || 'none');

const entries = Object.entries(verdicts);
const solid = entries.filter(([, e]) => e.correctness === 2 && e.on_topic === 2);
const zero = entries.filter(([, e]) => e.correctness === 0 || e.on_topic === 0);
console.log('graded:', entries.length);
console.log('correctness 2 AND on_topic 2:', solid.length);
console.log('correctness 0 OR on_topic 0:', zero.length, zero.map(([k]) => k).join(', '));
console.log('delivery 0:', entries.filter(([, e]) => e.delivery === 0).length);

const dist = (a) => [0, 1, 2].map((s) => `${s}:${entries.filter(([, e]) => e[a] === s).length}`).join(' ');
for (const a of AXES) console.log(`${a} distribution ->`, dist(a));

const ranked = entries
  .map(([k, e]) => ({ k, total: e.correctness + e.on_topic + e.delivery, co: e.correctness + e.on_topic, e }))
  .sort((x, y) => x.total - y.total || x.co - y.co);
console.log('lowest totals:');
for (const r of ranked.filter((r) => r.total <= 4)) {
  console.log(`  ${r.k}\ttotal ${r.total}\tc${r.e.correctness} o${r.e.on_topic} d${r.e.delivery}\t${r.e.reason}`);
}

const byId = {};
for (const it of packet.items) {
  const e = verdicts[it.key];
  (byId[it.id] ??= { n: 0, solid: 0 });
  byId[it.id].n += 1;
  if (e.correctness === 2 && e.on_topic === 2) byId[it.id].solid += 1;
}
console.log('solid per question:', Object.entries(byId).map(([id, s]) => `${id} ${s.solid}/${s.n}`).join(', '));
