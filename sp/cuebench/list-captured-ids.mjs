// Prints the ids of s50m's captured prompts that have both a system and a user turn, comma-separated, for the cue
// bench's `--only` (cue-mode plan 2026-09-21, Task 8 Step 2). Ids only: no prompt text is read out.
//   node list-captured-ids.mjs [<prompts.json>]
import fs from 'node:fs';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const file = process.argv[2] ?? `${MAIN}/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m/interview60.prompts.json`;
const c = JSON.parse(fs.readFileSync(file, 'utf8'));
const ids = Object.entries(c).filter(([, v]) => v?.system && v?.user).map(([k]) => k);
if (process.argv.includes('--count')) console.log(ids.length); else console.log(ids.join(','));
