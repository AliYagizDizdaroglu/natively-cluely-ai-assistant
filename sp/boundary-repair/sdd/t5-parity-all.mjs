// Task 5 (throwaway): differential parity of the NEW finalsFrom (MAIN's module) against the OLD inline parse (the brief's first
// ```js block) on EVERY non-holdout run log (folder names containing "h40" are skipped), both with since = 0 and with the
// extractor's since = startedMs - 2000 where a timeline exists. Pre-repair logs hold no repair line, so they must be identical.
// Calibration: the same comparison on a copy of each log with one synthetic repair line inserted after its first non-empty
// final must DIFFER (so the comparison can fail). Read-only on MAIN.
//   node t5-parity-all.mjs
import fs from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const RUNS = path.join(MAIN, 'electron/test/golden/interview60.runs');
const { finalsFrom } = await import(pathToFileURL(path.join(MAIN, 'electron/test/golden/interview60.turns-finals.mjs')).href);
const brief = fs.readFileSync(path.join(HERE, 'task-5-brief.md'), 'utf8');
const blocks = [];
{ let cur = null; for (const ln of brief.split('\n')) { if (ln.startsWith('```')) { if (cur === null) cur = []; else { blocks.push(cur.join('\n') + '\n'); cur = null; } } else if (cur !== null) cur.push(ln); } }
const oldFile = path.join(HERE, 't5-seam', 'old-parse.mjs');
fs.mkdirSync(path.dirname(oldFile), { recursive: true });
fs.writeFileSync(oldFile, blocks[1]);
const { finalsFrom: oldFinalsFrom } = await import(pathToFileURL(oldFile).href);
const FINAL = /^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=true, text="((?:[^"\\]|\\.)*)"/;
let bad = 0, logs = 0, totalFinals = 0, totalLines = 0, calibrated = 0;
const dirs = fs.readdirSync(RUNS, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.includes('h40') && fs.existsSync(path.join(RUNS, d.name, 'natively_debug.log'))).map((d) => d.name);
for (const name of dirs) {
    const dbg = fs.readFileSync(path.join(RUNS, name, 'natively_debug.log'), 'utf8');
    const tlPath = path.join(RUNS, name, 'interview60.timeline.json');
    const since = fs.existsSync(tlPath) ? JSON.parse(fs.readFileSync(tlPath, 'utf8')).startedMs - 2000 : null;
    const same0 = isDeepStrictEqual(finalsFrom(dbg, 0), oldFinalsFrom(dbg, 0));
    const sameS = since === null ? null : isDeepStrictEqual(finalsFrom(dbg, since), oldFinalsFrom(dbg, since));
    const n = finalsFrom(dbg, 0).length;
    const repairLines = (dbg.match(/boundary repair: restored/g) ?? []).length;
    // calibration: insert one repair line after the first non-empty final; the new parse must now differ from the old one
    const lines = dbg.split('\n');
    const i = lines.findIndex((l) => { const m = l.match(FINAL); return m && m[2].trim(); });
    let cal = 'n/a';
    if (i >= 0) {
        const mutated = [...lines.slice(0, i + 1), '2026-01-01T00:00:00.000Z [LOG] [DeepgramStreaming] boundary repair: restored "zzz" before "x"', ...lines.slice(i + 1)].join('\n');
        const differs = !isDeepStrictEqual(finalsFrom(mutated, 0), oldFinalsFrom(mutated, 0));
        cal = differs ? 'detected' : 'NOT DETECTED';
        if (differs) calibrated++; else bad++;
    }
    const ok = same0 && sameS !== false && repairLines === 0;
    if (!ok) bad++;
    logs++; totalFinals += n; totalLines += lines.length;
    console.log(`[${ok ? 'identical' : 'DIFFERENT'}] ${name}: ${n} finals (since 0: ${same0}${since === null ? ', no timeline' : `, since startedMs-2000: ${sameS}`}), repair lines in log ${repairLines}, calibration (synthetic repair inserted) ${cal}`);
}
console.log(`${logs} non-holdout logs, ${totalFinals} non-empty finals, ${totalLines} log lines; calibration detected on ${calibrated} of ${logs}`);
console.log(bad ? `RESULT: ${bad} problem(s)` : 'RESULT: the new parse equals the old inline parse on every non-holdout log');
process.exit(bad ? 1 : 0);
