// index-update-armed.mjs — the swap-pitfalls pointer now says the rule is committed and armed.
import { readFileSync, writeFileSync } from 'node:fs';
const P = 'C:/Users/sotka/.claude/projects/C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant/memory/MEMORY.md';
const lines = readFileSync(P, 'utf8').split('\n');
const i = lines.findIndex((l) => l.includes('(project_model_swap_pitfalls.md)'));
if (i < 0) { console.log('swap line missing — index untouched'); process.exit(1); }
lines[i] = '- [Model swap pitfalls](project_model_swap_pitfalls.md) — label + error-fallback bugs FIXED 2026-09-23 (main 783991a+47def85); latency rule APPROVED + COMMITTED 6f91929 and ARMED for 2026-09-23 (tasks Natively-latency-W1/W2/W3 at 10:15/15:00/21:00, decide after W3); on PASS swap SPOKEN ANSWERS ONLY, never via GEMINI_FLASH_MODEL';
writeFileSync(P, lines.join('\n'), 'utf8');
console.log('index updated; bytes now', Buffer.byteLength(readFileSync(P, 'utf8')));
