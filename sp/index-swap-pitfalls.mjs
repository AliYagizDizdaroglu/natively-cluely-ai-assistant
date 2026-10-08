// index-swap-pitfalls.mjs — add the one-line pointer for project_model_swap_pitfalls.md,
// placed right after the thinking-flights line it depends on.
import { readFileSync, writeFileSync } from 'node:fs';
const P = 'C:/Users/sotka/.claude/projects/C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant/memory/MEMORY.md';
const LINE = '- [Model swap pitfalls](project_model_swap_pitfalls.md) — read BEFORE making 3.5-lite the default: the constant swap misses the technical route (stored selection), the error fallback re-asks 3.5-lite under the override, the answer label lies; fix test-first';
let s = readFileSync(P, 'utf8');
if (s.includes('project_model_swap_pitfalls.md')) { console.log('already indexed'); process.exit(0); }
const lines = s.split('\n');
const at = lines.findIndex((l) => l.includes('(project_thinking_flights.md)'));
if (at < 0) { console.log('anchor missing — appending at end'); lines.push(LINE); }
else lines.splice(at + 1, 0, LINE);
writeFileSync(P, lines.join('\n'), 'utf8');
console.log('indexed; MEMORY.md bytes now', Buffer.byteLength(readFileSync(P, 'utf8')));
