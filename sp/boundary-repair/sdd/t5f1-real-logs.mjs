// Task 5 fix round 1 (throwaway): the refusals on REAL logs. MAIN's final finalsFrom (with the two `throw` checks) is run with
// since = 0 over every electron/test/golden/interview60.runs/*/natively_debug.log. The new checks must throw 0 times.
//  - non-holdout logs: throw count, plus old-inline-parse == new-parse (regression check);
//  - holdout logs (folder names containing "h40"): read ONLY for a throw count and their repair-line count, reported separately (a
//    parser-robustness check, not a tuning measurement: no accuracy or old/new comparison is made on them);
//  - the adapter-produced logs of the seam check (t5-seam\, MAIN's real DeepgramStreamingSTT under a fake socket, 17 repairs): 0 throws
//    and the parsed finals equal the emitted ones;
//  - the 4 smoke-*.natively_debug.log files at the top of interview60.runs\ (extra, informational).
// Calibration on the real adapter log: five deliberate breakages must each throw, naming the RIGHT line: (a) the event line above a
// repair dropped (the review's case: "hallucinations How do you cut"), (b) a stray line between a final and its repair, (c) a repair
// under a final its `before` text does not name, (d) a repair as the very first line, (e) two repair lines in a row.
//   node t5f1-real-logs.mjs
import fs from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const G = path.join(MAIN, 'electron/test/golden');
const RUNS = path.join(G, 'interview60.runs');
const { finalsFrom } = await import(pathToFileURL(path.join(G, 'interview60.turns-finals.mjs')).href);
const oldFile = path.join(HERE, 't5-seam', 'old-parse.mjs');       // the pre-Task-5 inline parse (brief block 1), written by t5-parity-all.mjs
const { finalsFrom: oldFinalsFrom } = await import(pathToFileURL(oldFile).href);
const { finalsFrom: round0 } = await import(pathToFileURL(path.join(HERE, 't5f1-orig', 'interview60.turns-finals.mjs')).href);   // the round-0 module: repairs, no refusals
const tryParse = (fn, log) => { try { return { ok: fn(log, 0) }; } catch (e) { return { err: e.message }; } };
let bad = 0;
const note = (ok, msg) => { if (!ok) bad++; console.log(`[${ok ? 'ok' : 'FAIL'}] ${msg}`); };

const dirs = fs.readdirSync(RUNS, { withFileTypes: true }).filter((d) => d.isDirectory() && fs.existsSync(path.join(RUNS, d.name, 'natively_debug.log'))).map((d) => d.name).sort();
const groups = { 'non-holdout': dirs.filter((d) => !d.includes('h40')), holdout: dirs.filter((d) => d.includes('h40')) };
for (const [group, names] of Object.entries(groups)) {
    let throws = 0, finals = 0, repairLines = 0, differs = 0, lines = 0;
    const detail = [];
    for (const name of names) {
        const log = fs.readFileSync(path.join(RUNS, name, 'natively_debug.log'), 'utf8');
        lines += log.split('\n').length;
        repairLines += (log.match(/boundary repair: restored/g) ?? []).length;
        const r = tryParse(finalsFrom, log);
        if (r.err) { throws++; detail.push(`${name}: THROW ${r.err}`); continue; }
        finals += r.ok.length;
        if (group === 'non-holdout' && !isDeepStrictEqual(r.ok, oldFinalsFrom(log, 0))) { differs++; detail.push(`${name}: differs from the old inline parse`); }
    }
    note(throws === 0 && differs === 0, `${group} logs: ${names.length} logs, ${lines} lines, ${repairLines} 'boundary repair:' lines, ${group === 'non-holdout' ? `${finals} finals parsed, ` : ''}throws ${throws}${group === 'non-holdout' ? `, differs from the old inline parse on ${differs}` : ''}${names.length && group === 'holdout' ? ` (${names.join(', ')})` : ''}`);
    for (const d of detail) console.log(`    ${d}`);
}
// extra: the smoke app logs at the top of interview60.runs
const smoke = fs.readdirSync(RUNS).filter((n) => /^smoke-.*natively_debug\.log$/.test(n));
{
    let throws = 0, lines = 0;
    for (const n of smoke) { const log = fs.readFileSync(path.join(RUNS, n), 'utf8'); lines += log.split('\n').length; if (tryParse(finalsFrom, log).err) throws++; }
    note(throws === 0, `smoke-*.natively_debug.log (extra): ${smoke.length} logs, ${lines} lines, throws ${throws}`);
}
// the adapter-produced log
const SEAM = path.join(HERE, 't5-seam');
const log = fs.readFileSync(path.join(SEAM, 'adapter-natively_debug.log'), 'utf8');
const emitted = JSON.parse(fs.readFileSync(path.join(SEAM, 'emitted-finals.json'), 'utf8'));
const lines = log.split('\n');
const repIdx = lines.map((l, i) => (l.includes('boundary repair: restored') ? i : -1)).filter((i) => i >= 0);
const ra = tryParse(finalsFrom, log);
note(!ra.err && repIdx.length === 17 && isDeepStrictEqual(ra.ok, emitted), `the real adapter's log (t5-seam): ${lines.length - 1} lines, ${repIdx.length} repair lines, throws ${ra.err ? 1 : 0}, parsed finals == the finals the adapter emitted: ${!ra.err && isDeepStrictEqual(ra.ok, emitted)}${ra.err ? ` (${ra.err})` : ''}`);
// calibration: each breakage must throw with the right 1-based line number
const k = repIdx[3];                                                // an arbitrary repair line, index k; its final is at k - 1
const rep = lines[k], fin = lines[k - 1];
const cases = [
    // (a) the repair now sits under the sequence's FIRST final (F1): the parser names F1's line (1-based k - 1) and the repair's (k)
    ['(a) the event line above a repair dropped (the review\'s case)', lines.filter((_, i) => i !== k - 1).join('\n'), new RegExp(`finalsFrom: line ${k} is a boundary repair for another final than line ${k - 1}`)],
    ['(b) a stray line between a final and its repair', [...lines.slice(0, k), '2026-09-29T12:00:00.000Z [LOG] [Main] stray', ...lines.slice(k)].join('\n'), new RegExp(`finalsFrom: line ${k + 2} is a boundary repair with no final directly above it`)],
    ['(c) a repair under a final its `before` text does not name', [...lines.slice(0, k - 1), fin.replace(/text="[^"]*"/, 'text="a different final entirely"'), ...lines.slice(k)].join('\n'), new RegExp(`finalsFrom: line ${k + 1} is a boundary repair for another final than line ${k}`)],
    ['(d) a repair as the very first line', [rep, ...lines].join('\n'), /finalsFrom: line 1 is a boundary repair with no final directly above it/],
    ['(e) two repair lines in a row', [...lines.slice(0, k + 1), rep, ...lines.slice(k + 1)].join('\n'), new RegExp(`finalsFrom: line ${k + 2} is a boundary repair with no final directly above it`)],
];
for (const [name, broken, re] of cases) {
    const r = tryParse(finalsFrom, broken);
    const o = tryParse(round0, broken);     // the round-0 module must NOT refuse the same breakage (so the refusal expectation can fail)
    note(!!r.err && re.test(r.err) && !o.err, `calibration ${name}: ${r.err ? `throws "${r.err}"` : 'NO THROW'}; the round-0 module (no refusals) ${o.err ? `throws "${o.err}"` : `silently returns ${o.ok.length} finals${o.ok.some((f) => /^hallucinations How do you cut$/.test(f.text)) ? ', "hallucinations How do you cut" among them' : ''}`}`);
}
console.log(bad ? `RESULT: ${bad} problem(s)` : 'RESULT: the refusals throw 0 times on every real log and on the real adapter log, and every deliberate breakage is refused with the right line');
process.exit(bad ? 1 : 0);
