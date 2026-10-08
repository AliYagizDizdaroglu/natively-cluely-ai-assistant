// Re-check: apply edits N6-a and N6-b of RECHECK-r2.md literally to a COPY of h40d-thoughts-noise.mjs (written here as
// thoughts-noise.n6.mjs; the original is not touched), then run original and copy on a known no-hole case (h40c) and a
// real >3-holes case (s50e's single-rep gemini-3.7-flash arm, 4 holes of 5). Prints the 2c reading lines only.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const VH = path.dirname(HERE);
const src = fs.readFileSync(path.join(VH, 'h40d-thoughts-noise.mjs'), 'utf8');
const OLD_A = "    const verdict = covOk ? (dTh <= THRESHOLD ? 'PASS' : 'FAIL') : (dTt <= TTFT_FALLBACK_MS ? 'PASS (fallback)' : 'FAIL (fallback)');";
const NEW_A = [
    '    // Rule 2c: a rep with more than 3 true holes on either side makes 2c INCOMPLETE, whatever the medians say.',
    "    const holey = [...cue.reps.map((r) => ['cue', r]), ...control.reps.map((r) => ['control', r])].filter(([, r]) => r.holes.length > 3).map(([side, r]) => `${side} ${r.rep} (${r.holes.length})`);",
    "    const verdict = holey.length ? `INCOMPLETE (more than 3 true holes: ${holey.join(', ')})` : covOk ? (dTh <= THRESHOLD ? 'PASS' : 'FAIL') : (dTt <= TTFT_FALLBACK_MS ? 'PASS (fallback)' : 'FAIL (fallback)');",
].join('\n');
const OLD_B = '(a rep with more than 3 true holes makes 3c INCOMPLETE; 2c is read on the ids answered)';
const NEW_B = '(a rep with more than 3 true holes makes 2c and 3c INCOMPLETE; otherwise 2c is read on the ids answered)';
for (const [o, name] of [[OLD_A, 'N6-a'], [OLD_B, 'N6-b']]) if (src.split(o).length !== 2) { console.log(`${name}: anchor not unique/absent`); process.exit(1); }
const patched = path.join(HERE, 'thoughts-noise.n6.mjs');
fs.writeFileSync(patched, src.replace(OLD_A, NEW_A).replace(OLD_B, NEW_B));

const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const cases = [
    ['h40c, cue = control (0 holes)', `${RUNS}/2026-09-29T11-42-00-h40c`, ['--control', 'gemini-3.5-flash-lite_captured-high']],
    ['s50e 3.7-flash as both sides (4 holes of 5)', `${RUNS}/2026-09-14T08-22-28-s50e`, ['--cue', 'gemini-3.7-flash', '--control', 'gemini-3.7-flash']],
];
for (const [label, dir, args] of cases) {
    for (const [which, file] of [['original', path.join(VH, 'h40d-thoughts-noise.mjs')], ['N6 copy ', patched]]) {
        let out; try { out = execFileSync(process.execPath, [file, dir, ...args], { encoding: 'utf8' }); } catch (e) { out = `${e.stdout ?? ''}[exit ${e.status}]`; }
        const line = out.split('\n').find((l) => l.startsWith('rule 2c reading')) ?? '(no reading)';
        console.log(`${label.padEnd(44)} ${which}: ${line}`);
    }
}
