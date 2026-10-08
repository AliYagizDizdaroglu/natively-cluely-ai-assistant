// The proposed refusal (pt/d module) on the REAL adapter's log (t5-seam: MAIN's DeepgramStreamingSTT under a fake
// socket, 17 repairs) and on every non-holdout run log: it must never throw there and must equal MAIN's parser.
import fs from 'node:fs';
import path from 'node:path';
import util from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const G = path.join(MAIN, 'electron/test/golden');
const cur = (await import(pathToFileURL(path.join(G, 'interview60.turns-finals.mjs')).href)).finalsFrom;
const hard = (await import(pathToFileURL(path.join(HERE, 'pt/d/interview60.turns-finals.mjs')).href)).finalsFrom;
const SEAM = path.join(HERE, '..', 't5-seam');
const log = fs.readFileSync(path.join(SEAM, 'adapter-natively_debug.log'), 'utf8');
const emitted = JSON.parse(fs.readFileSync(path.join(SEAM, 'emitted-finals.json'), 'utf8'));
const lines = log.split('\n');
const reps = lines.filter((l) => l.includes('boundary repair: restored')).length;
const adjacent = lines.filter((l, i) => l.includes('boundary repair: restored') && /Transcript event — isFinal=true/.test(lines[i - 1] ?? '')).length;
console.log(`seam log: ${lines.length} lines, ${reps} repair lines, ${adjacent} directly under a final; emitted ${Array.isArray(emitted) ? emitted.length : typeof emitted} finals (first ${JSON.stringify(emitted[0])})`);
let h; try { h = hard(log, 0); } catch (e) { h = `THROW ${e.message}`; }
const c = cur(log, 0);
const norm = (a) => a.map((f) => ({ at: f.at, text: f.text }));
console.log(`hardened: ${typeof h === 'string' ? h : `${h.length} finals`}; equals MAIN's parser: ${util.isDeepStrictEqual(h, c)}; equals the emitted finals: ${typeof h !== 'string' && util.isDeepStrictEqual(norm(h), norm(emitted))}`);
// calibration on the same real log: drop one event line that has a repair under it -> the repair becomes an orphan
const k = lines.findIndex((l, i) => l.includes('boundary repair: restored') && i > 0);
const broken = lines.filter((_, i) => i !== k - 1).join('\n');
try { hard(broken, 0); console.log('calibration: NO THROW on a real log with one event line dropped'); } catch (e) { console.log(`calibration (event line ${k} dropped): throws "${e.message}"; MAIN's parser silently returns ${cur(broken, 0).length} finals, the first two ${JSON.stringify(cur(broken, 0).slice(0, 2).map((f) => f.text))}; lines ${k - 1}..${k + 1} of the intact log: ${JSON.stringify(lines.slice(k - 2, k + 1).map((l) => l.slice(25, 140)))}`); }
// every non-holdout run log
let n = 0, thrown = 0, differ = 0;
for (const name of fs.readdirSync(path.join(G, 'interview60.runs'))) {
    const f = path.join(G, 'interview60.runs', name, 'natively_debug.log');
    if (name.includes('h40') || !fs.existsSync(f)) continue;
    n++;
    const dbg = fs.readFileSync(f, 'utf8');
    try { if (!util.isDeepStrictEqual(hard(dbg, 0), cur(dbg, 0))) differ++; } catch { thrown++; }
}
console.log(`non-holdout logs ${n}: hardened throws on ${thrown}, differs from MAIN's parser on ${differ}`);
