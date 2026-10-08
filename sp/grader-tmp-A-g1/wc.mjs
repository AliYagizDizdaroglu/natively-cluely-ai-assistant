// Throwaway: word counts and unspeakable-text flags per item of packet-A.json.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const packetPath = join(here, '..', 'l20c', 'blind', 'packet-A.json');
const packet = JSON.parse(readFileSync(packetPath, 'utf8'));

console.log('top-level fields:', Object.keys(packet).join(', '));
console.log('items:', packet.items.length);
const keys = packet.items.map((i) => i.key);
console.log('unique keys:', new Set(keys).size);

for (const item of packet.items) {
  const a = item.answer;
  const words = a.trim().split(/\s+/).filter(Boolean).length;
  const flags = [];
  if (/\n/.test(a)) flags.push('NEWLINE');
  if (/\*/.test(a)) flags.push('ASTERISK');
  if (/`/.test(a)) flags.push('BACKTICK');
  if (/^\s*[-•]\s/m.test(a)) flags.push('BULLET');
  if (/^\s*\d+\.\s/m.test(a)) flags.push('NUMLIST');
  if (/#/.test(a)) flags.push('HASH');
  if (/\?/.test(a)) flags.push('QUESTION');
  if (/O\([^)]*\)/.test(a)) flags.push('BIGO');
  if (/https?:|s3:\/\/|[A-Za-z]:\\|\/[a-z]+\/[a-z]+/.test(a)) flags.push('URI/PATH');
  if (/would you like|do you want|shall i|let me know/i.test(a)) flags.push('OFFER');
  if (/[^\x00-\x7F]/.test(a)) {
    const non = [...new Set(a.match(/[^\x00-\x7F]/g))].join('');
    flags.push('NONASCII[' + non + ']');
  }
  console.log(item.key.padEnd(10), String(words).padStart(4), flags.join(' '));
}
