// Throwaway helper for grader g2, packet B: word counts and unspeakable-text flags per item.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const packet = JSON.parse(readFileSync(join(here, 'l20c', 'blind', 'packet-B.json'), 'utf8'));

console.log('top-level fields:', Object.keys(packet).join(', '));
console.log('items:', packet.items.length);
const keys = packet.items.map((i) => i.key);
console.log('unique keys:', new Set(keys).size);

const words = (s) => s.replace(/[—–]/g, ' ').split(/\s+/).filter(Boolean).length;

for (const it of packet.items) {
  const a = it.answer;
  const flags = [];
  if (/[*#`_]|^\s*[-•]\s/m.test(a)) flags.push('MARKDOWN?');
  if (/\?/.test(a)) flags.push('QUESTION-MARK');
  if (/\n/.test(a)) flags.push('NEWLINE');
  if (/https?:|\/\w+\/\w+|\\\w+/.test(a)) flags.push('PATH/URI?');
  if (/\d/.test(a)) flags.push('DIGITS:' + (a.match(/\d[\d.,%]*/g) || []).join('|'));
  if (/would you like|shall i|do you want/i.test(a)) flags.push('OFFER');
  if (!/\bI\b|\bI'|\bI’|\bmy\b|\bwe\b|\bour\b/i.test(a)) flags.push('NOT-FIRST-PERSON');
  console.log(`${it.key.padEnd(10)} words=${String(words(a)).padStart(3)} ${flags.join(' ')}`);
}
