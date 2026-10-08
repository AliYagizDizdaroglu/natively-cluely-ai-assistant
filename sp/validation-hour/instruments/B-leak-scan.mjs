// Builder B: did any answer, raw text, question, topic or grader reason leak into the files I produced? For every text
// field of every record in the real files the calibration read (answers: spoken, raw, q, topic; judge: answer, reason,
// heard, question), take up to five 28-character windows (start, quartiles, end; whitespace-collapsed) and search each
// output file for them. Prints counts, and for a hit only the file and field NAMES, never the text. Read-only.
//   node B-leak-scan.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const VH = path.resolve(HERE, '..');
const UE = String.fromCharCode(0xfc);
const MAIN = path.join(os.homedir(), 'OneDrive', `Masa${UE}st${UE}`, 'natively-cluely-ai-assistant');
const RUNS = path.join(MAIN, 'electron', 'test', 'golden', 'interview60.runs');
const WINDOW = 28;
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();

// the files that were read: the five runs' captured-high / captured-low families and the bench copies
const sources = [];
for (const run of ['2026-09-21T08-22-34-s50l', '2026-09-22T08-22-50-s50m', '2026-09-26T11-39-51-h40b', '2026-09-29T11-42-00-h40c']) {
    for (const f of fs.readdirSync(path.join(RUNS, run))) if (/^interview60\.(answers|judge)\.gemini-3\.[15]-flash-lite_captured-(high|low)(-r[23])?\.json$/.test(f)) sources.push(path.join(RUNS, run, f));
}
for (const f of fs.readdirSync(path.join(HERE, 'twins-bench'))) sources.push(path.join(HERE, 'twins-bench', f));

// the files I produced (everything under VH that is mine and could carry printed output), except the scan itself and the fake inputs
const outputs = [path.join(VH, 'h40d-twins.mjs'), path.join(VH, 'h40d-twins-cal.txt')];
for (const f of fs.readdirSync(HERE)) if (/^B-.*\.(mjs|txt|md)$/.test(f) && f !== 'B-leak-scan.mjs') outputs.push(path.join(HERE, f));
const report = path.join(HERE, 'report-B.md');
if (fs.existsSync(report)) outputs.push(report);
const mut = path.join(HERE, 'mutants');
if (fs.existsSync(mut)) for (const f of fs.readdirSync(mut)) if (f.endsWith('.txt')) outputs.push(path.join(mut, f));
const hay = outputs.map((f) => [f, norm(fs.readFileSync(f, 'utf8'))]);
// --canary: calibrates the scan itself (rule 8): a haystack that DOES carry one real answer window must be reported as a leak.
if (process.argv.includes('--canary')) {
    const first = Object.values(JSON.parse(fs.readFileSync(sources.find((s) => s.includes('.answers.')), 'utf8')))[0];
    hay.push([path.join(VH, 'CANARY-NOT-A-FILE.txt'), `x ${norm(first.spoken).slice(0, 60)} y`]);
}

let windows = 0;
const hits = new Map();
for (const f of sources) {
    const store = JSON.parse(fs.readFileSync(f, 'utf8'));
    const recs = f.includes('.judge.') ? Object.values(store.items ?? {}) : Object.values(store);
    const fields = f.includes('.judge.') ? ['answer', 'reason', 'heard', 'question'] : ['spoken', 'raw', 'q', 'topic'];
    for (const r of recs) for (const k of fields) {
        const t = r?.[k];
        if (typeof t !== 'string') continue;
        const s = norm(t);
        if (s.length < WINDOW) continue;
        const starts = [0, Math.floor((s.length - WINDOW) / 4), Math.floor((s.length - WINDOW) / 2), Math.floor((3 * (s.length - WINDOW)) / 4), s.length - WINDOW];
        for (const at of new Set(starts)) {
            const w = s.slice(at, at + WINDOW);
            windows++;
            for (const [of, h] of hay) if (h.includes(w)) hits.set(`${path.relative(VH, of)} <- ${path.basename(f)} field ${k}`, (hits.get(`${path.relative(VH, of)} <- ${path.basename(f)} field ${k}`) ?? 0) + 1);
        }
    }
}
console.log(`source files read ${sources.length}; ${windows} text windows of ${WINDOW} characters searched in ${outputs.length} output files`);
console.log(hits.size ? `LEAK: ${[...hits].map(([k, n]) => `${k} (${n})`).join('; ')}` : 'no window found in any output file: no answer, raw text, question, topic or reason is in anything I wrote');
process.exit(hits.size ? 1 : 0);
