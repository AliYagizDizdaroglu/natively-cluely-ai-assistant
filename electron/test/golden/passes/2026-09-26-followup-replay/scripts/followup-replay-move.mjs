// Throwaway: moves one interview60.answers.*_fparent-*.json file from MAIN's golden dir into
// SP\followup-replay\, via node fs (PowerShell Move-Item hit a sandbox DirectoryNotFoundException
// moving OneDrive <-> Temp across the worktree boundary; node's fs.renameSync also fails cross-
// volume/junction in this sandbox, so copy + unlink instead of rename).
//   node followup-replay-move.mjs <filename>
import fs from 'node:fs';
import path from 'node:path';

const MAIN = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant';
const SP = 'C:\\Users\\sotka\\AppData\\Local\\Temp\\claude\\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\\9c5886c7-cdbd-48af-b8bc-e9275012ec64\\scratchpad';

const name = process.argv[2];
if (!name) { console.error('usage: followup-replay-move.mjs <filename>'); process.exit(2); }
const src = path.join(MAIN, 'electron', 'test', 'golden', name);
const dest = path.join(SP, 'followup-replay', name);
if (!fs.existsSync(src)) { console.error(`MISSING SOURCE: ${src}`); process.exit(2); }
fs.copyFileSync(src, dest);
fs.unlinkSync(src);
console.log(`moved ${name}`);
console.log(`  dest exists: ${fs.existsSync(dest)}`);
console.log(`  src gone:    ${!fs.existsSync(src)}`);
