// throwaway: builds scratchpad/followup-turn-proof/ = a copy of followup-turn (R/, the *.mjs, the filled registration AS the registered file) so that
// the day's own scripts (day-pre.mjs, day-steps.mjs) can be exercised exactly as on the day, without touching the real registered file.
// Refills section2-filled.md first. Prints the sha256 of the copy's PREREGISTER-turn-followup.md (= the "approved" hash for the proof).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const FT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SP = path.dirname(FT);
const PROOF = path.join(SP, 'followup-turn-proof');
const f = spawnSync(process.execPath, [path.join(FT, 'fill-section2.mjs')], { encoding: 'utf8', cwd: FT });
if (f.status !== 0) { console.log(`fill-section2 failed: ${(f.stdout + f.stderr).slice(0, 500)}`); process.exit(1); }
fs.rmSync(PROOF, { recursive: true, force: true });
fs.mkdirSync(PROOF);
fs.cpSync(path.join(FT, 'R'), path.join(PROOF, 'R'), { recursive: true });
for (const n of fs.readdirSync(FT).filter((x) => x.endsWith('.mjs'))) fs.copyFileSync(path.join(FT, n), path.join(PROOF, n));
fs.copyFileSync(path.join(FT, 'section2-filled.md'), path.join(PROOF, 'PREREGISTER-turn-followup.md'));
console.log(createHash('sha256').update(fs.readFileSync(path.join(PROOF, 'PREREGISTER-turn-followup.md'))).digest('hex'));
