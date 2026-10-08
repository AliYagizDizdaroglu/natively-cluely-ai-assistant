// Saves the 21:00 prestart (run 5, READY) into the prestart folder: the launcher log section from its start marker,
// MAIN's natively_debug.log as app:stop left it (A6), and the error-log absence. Refuses to overwrite.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const OUT = path.join(HERE, '2026-10-01-prestart-h40d');
const marker = '=== LAUNCHER h40d-prestart start Thu 10/01/2026 21:00:01.40';
const log = fs.readFileSync(path.join(MAIN, 'electron/test/golden/interview60.runs/flight-h40d-prestart.launcher.log'), 'utf8');
const at = log.indexOf(marker);
if (at < 0) throw new Error('21:00 start marker not found');
if (log.indexOf('=== LAUNCHER h40d-prestart start', at + 10) >= 0) throw new Error('a later start follows the 21:00 run');
for (const f of ['launcher.run5.log', 'natively_debug.run5.log', 'launcher-error.run5.log']) if (fs.existsSync(path.join(OUT, f))) throw new Error(`${f} exists`);
fs.writeFileSync(path.join(OUT, 'launcher.run5.log'), log.slice(at));
const dbg = path.join(MAIN, 'natively_debug.log');
const st = fs.statSync(dbg);
fs.copyFileSync(dbg, path.join(OUT, 'natively_debug.run5.log'));
const err = 'C:/Users/sotka/AppData/Local/Temp/natively-h40d-launcher-error.log';
fs.writeFileSync(path.join(OUT, 'launcher-error.run5.log'), fs.existsSync(err) ? `PRESENT at ${new Date().toISOString()}:\n${fs.readFileSync(err, 'utf8')}` : `absent at ${new Date().toISOString()} (run 5, 21:00, PROBE READY)\n`);
console.log(`saved launcher.run5.log (${log.length - at} chars), natively_debug.run5.log (${st.size} bytes, mtime ${st.mtime.toISOString()}), error log ${fs.existsSync(err) ? 'PRESENT' : 'absent'}`);
