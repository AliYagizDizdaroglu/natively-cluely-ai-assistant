// Throwaway: word counts + top-level shape for packet-D.json (grader D-g1).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const packetPath = join(here, '..', 'l20c', 'blind', 'packet-D.json');
const packet = JSON.parse(readFileSync(packetPath, 'utf8'));

console.log('top-level fields:', Object.keys(packet).join(', '));
console.log('items:', packet.items.length);

const keys = packet.items.map((i) => i.key);
console.log('unique keys:', new Set(keys).size);

const byId = {};
for (const it of packet.items) byId[it.id] = (byId[it.id] || 0) + 1;
console.log('per id:', JSON.stringify(byId));

for (const it of packet.items) {
  const a = it.answer;
  const words = a.trim().split(/\s+/).filter(Boolean).length;
  const flags = [];
  if (/[*_#`]/.test(a)) flags.push('markdown-char');
  if (/\n\s*[-*\d]+[.)]?\s/.test(a)) flags.push('list-like');
  if (/\?/.test(a)) flags.push('question-mark');
  if (/O\([^)]*\)/.test(a)) flags.push('big-O');
  if (/https?:\/\/|[A-Za-z]:\\|\/[a-z]+\/[a-z]+\//.test(a)) flags.push('uri-or-path');
  if (/would you like/i.test(a)) flags.push('offer');
  if (/\n/.test(a.trim())) flags.push('inner-newline');
  if (a !== a.trim()) flags.push('trailing-ws');
  console.log(it.key.padEnd(10), String(words).padStart(4), flags.join(','));
}
