// Throwaway runner: node work/runsc.mjs <out-file|-> <script> [args...]  -- runs a script with TURN_PREREG=section2-filled.md (unless already set),
// saves stdout+stderr to <out-file> (UTF-8) and prints the exit code + the marker/BAD lines.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const WORK = path.dirname(fileURLToPath(import.meta.url));
const FT = path.dirname(WORK);
const [out, script, ...args] = process.argv.slice(2);
const env = { ...process.env };
env.TURN_PREREG ??= path.join(FT, 'section2-filled.md');
if (!process.env.NOFILL) { const f = spawnSync(process.execPath, [path.join(FT, 'fill-section2.mjs')], { encoding: 'utf8', cwd: FT }); if (f.status !== 0) { console.log(`fill-section2 exit ${f.status}: ${(f.stdout + f.stderr).split('\n').filter((l) => /FAIL|NOT|Error/.test(l)).join(' | ').slice(0, 400)}`); process.exit(9); } }
const r = spawnSync(process.execPath, [path.resolve(FT, script), ...args], { encoding: 'utf8', env, maxBuffer: 256 << 20, cwd: FT });
const text = `${r.stdout}${r.stderr}`;
if (out !== '-') fs.writeFileSync(path.resolve(FT, out), text);
const lines = text.split('\n');
const bad = lines.filter((l) => /^BAD|FAILED|MISSED|REFUSED|Error/.test(l));
console.log(`exit ${r.status}; ${lines.filter((l) => /^OK/.test(l)).length} OK lines; ${bad.length} bad lines`);
for (const l of bad.slice(0, 40)) console.log(l.slice(0, 220));
console.log(lines.filter((l) => l.trim()).slice(-2).join('\n').slice(0, 400));
