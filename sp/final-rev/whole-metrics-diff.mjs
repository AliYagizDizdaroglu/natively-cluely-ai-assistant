// Throwaway (final review): every run folder, the WHOLE computeRun output and every judge pair,
// 07a0e5e modules vs e94305a modules. Wider than the implementer's key list: detectMs, the gate
// rows and every aggregate are compared too. Reads MAIN's run folders read-only.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RUNS = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.runs';
const load = async (g) => ({
    judge: await import(pathToFileURL(path.join(g, 'interview60.judge.mjs'))),
    metrics: await import(pathToFileURL(path.join(g, 'interview60.metrics.mjs'))),
    lib: await import(pathToFileURL(path.join(g, 'interview60.lib.mjs'))),
});
const before = await load(path.join(HERE, 'base07a', 'electron', 'test', 'golden'));
const after = await load(path.join(HERE, 'e94305a', 'electron', 'test', 'golden'));
if (before.metrics.computeRun === after.metrics.computeRun) throw new Error('same module twice');

// Rule 8: prove the comparison can see a difference — a synthetic mutation of one field must register.
const diffPaths = (a, b, p = '') => {
    if (JSON.stringify(a) === JSON.stringify(b)) return [];
    if (a && b && typeof a === 'object' && typeof b === 'object') {
        const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
        return [...keys].flatMap((k) => diffPaths(a[k], b[k], `${p}.${k}`));
    }
    return [`${p}: ${JSON.stringify(a)?.slice(0, 120)} -> ${JSON.stringify(b)?.slice(0, 120)}`];
};
const selfTest = diffPaths({ items: [{ id: 'X', detectMs: 1 }] }, { items: [{ id: 'X', detectMs: 2 }] });
if (selfTest.length !== 1) throw new Error('diffPaths self-test failed');

let checked = 0, changedRuns = 0, errors = 0;
for (const r of fs.readdirSync(RUNS).sort()) {
    const dir = path.join(RUNS, r);
    if (!fs.existsSync(path.join(dir, 'natively_debug.log')) || !fs.existsSync(path.join(dir, 'interview60.timeline.json'))) continue;
    let b, a;
    try {
        const tl = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8'));
        const dbgB = before.lib.logSince(path.join(dir, 'natively_debug.log'), tl.startDebug, tl.endDebug);
        const dbgA = after.lib.logSince(path.join(dir, 'natively_debug.log'), tl.startDebug, tl.endDebug);
        b = { run: before.metrics.computeRun(dir), pairs: before.judge.pairAnswers(dbgB, tl) };
        a = { run: after.metrics.computeRun(dir), pairs: after.judge.pairAnswers(dbgA, tl) };
    } catch (e) { errors++; console.log(`${r}: ERROR ${String(e?.message ?? e).slice(0, 160)}`); continue; }
    checked++;
    const d = diffPaths(b, a);
    if (d.length) { changedRuns++; console.log(`${r}: ${d.length} field(s) differ`); for (const l of d) console.log(`   ${l}`); }
}
console.log(`runs compared: ${checked}, runs with any difference: ${changedRuns}, errors: ${errors}`);
