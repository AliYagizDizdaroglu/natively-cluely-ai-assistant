// Throwaway, read-only: the in-app pairs file's keys (45 items while the gate says 44 answered and
// R05 has no prompt) — which keys exist, which roster ids repeat or are absent, and for each item
// the fields other than question/answer text, so the 45-vs-44 difference is read, not guessed.
import fs from 'node:fs';
import path from 'node:path';

const run = process.argv[2];
const p = JSON.parse(fs.readFileSync(path.join(run, 'interview60.judge.pairs.json'), 'utf8'));
const keys = p.items.map((i) => i.key);
console.log('keys:', keys.join(' '));
console.log('item fields:', Object.keys(p.items[0]).join(', '));
const tl = JSON.parse(fs.readFileSync(path.join(run, 'interview60.timeline.json'), 'utf8'));
const played = tl.items.map((i) => i.id);
console.log('played but not a key:', JSON.stringify(played.filter((id) => !keys.includes(id))));
console.log('keys not played:', JSON.stringify(keys.filter((k) => !played.includes(k))));
const r05 = p.items.find((i) => i.key === 'R05');
if (r05) {
    const meta = Object.fromEntries(Object.entries(r05).filter(([k]) => !['question', 'answer'].includes(k)));
    console.log('R05 meta:', JSON.stringify(meta));
    console.log('R05 answer words:', String(r05.answer || '').split(/\s+/).filter(Boolean).length, '| first 12 words:', String(r05.answer || '').split(/\s+/).slice(0, 12).join(' '));
}
