// Read-only: count line "tags" (the bracketed prefixes + first two words) in a natively_debug.log.
// Prints tags and counts only, never line bodies.
import fs from 'node:fs';
const file = process.argv[2];
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const counts = new Map();
for (const l of lines) {
  const m = l.match(/^\S+Z \[(\w+)\] (.*)$/);
  if (!m) { counts.set('<no-ts>', (counts.get('<no-ts>') ?? 0) + 1); continue; }
  const body = m[2];
  // tag = leading [X] [Y] groups + first 2 words after them, stripped of quotes/digits
  const t = body.match(/^((?:\[[^\]]*\]\s*)*)(\S+)?\s?(\S+)?/);
  let tag = `${m[1]} ${(t[1] ?? '').trim()} ${(t[2] ?? '')} ${(t[3] ?? '')}`;
  tag = tag.replace(/["'].*$/, '"…').replace(/\d+/g, 'N').slice(0, 90);
  counts.set(tag, (counts.get(tag) ?? 0) + 1);
}
const arr = [...counts.entries()].sort((a, b) => b[1] - a[1]);
for (const [k, v] of arr) console.log(String(v).padStart(6), k);
