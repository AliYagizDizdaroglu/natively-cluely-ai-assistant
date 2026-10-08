// index-update-2026-09-23.mjs — refresh the swap-pitfalls pointer and add the build-trap pointer.
import { readFileSync, writeFileSync } from 'node:fs';
const P = 'C:/Users/sotka/.claude/projects/C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant/memory/MEMORY.md';
let lines = readFileSync(P, 'utf8').split('\n');

const SWAP = '- [Model swap pitfalls](project_model_swap_pitfalls.md) — label + error-fallback bugs FIXED 2026-09-23 (main 783991a+47def85, live-verified); the swap must be spoken-answer-only, never via GEMINI_FLASH_MODEL; latency rule DRAFTED in worktree docs/superpowers/drafts/latency-rule/, awaiting the user\'s approval';
const TRAP = '- [Build cwd trap](tooling_build_cwd_trap.md) — build-electron.js resolves entries against the CWD: build MAIN with -WorkingDirectory <main>, then check a marker + timestamp in dist-electron/electron';

const i = lines.findIndex((l) => l.includes('(project_model_swap_pitfalls.md)'));
if (i < 0) { console.log('swap line missing — not touching the index'); process.exit(1); }
lines[i] = SWAP;
if (!lines.some((l) => l.includes('(tooling_build_cwd_trap.md)'))) {
    const j = lines.findIndex((l) => l.includes('(tooling_bash_escapes.md)'));
    lines.splice(j >= 0 ? j + 1 : lines.length, 0, TRAP);
}
writeFileSync(P, lines.join('\n'), 'utf8');
console.log('index updated; bytes now', Buffer.byteLength(readFileSync(P, 'utf8')));
