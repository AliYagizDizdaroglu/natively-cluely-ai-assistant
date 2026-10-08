// Throwaway: item count, key list, word counts and unspeakable-text markers for packet-C.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const packet = JSON.parse(readFileSync(join(here, 'l20c', 'blind', 'packet-C.json'), 'utf8'));

console.log('top-level fields:', Object.keys(packet).join(', '));
console.log('items:', packet.items.length);
const keys = packet.items.map((i) => i.key);
console.log('unique keys:', new Set(keys).size);

const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;
for (const it of packet.items) {
  const a = it.answer;
  const flags = [];
  if (/\n/.test(a.trim())) flags.push('NEWLINE');
  if (/[*#`]/.test(a)) flags.push('MD_CHAR');
  if (/\$/.test(a)) flags.push('DOLLAR');
  if (/O\(/.test(a)) flags.push('BIG_O_PAREN');
  if (/_/.test(a)) flags.push('UNDERSCORE');
  if (/\?/.test(a)) flags.push('QUESTION_MARK');
  if (/^\s*[-•]\s/m.test(a)) flags.push('BULLET');
  if (/\bnp\./.test(a)) flags.push('CODE_IDENT');
  console.log(`${it.key}\t${words(a)}w\t${flags.join(',')}`);
}
