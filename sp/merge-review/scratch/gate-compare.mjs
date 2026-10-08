// Throwaway, read-only: MAIN's metrics module (fed4b07) against the merged one (1852d89) on MAIN's
// real run folders. Prints only row labels, computed values and PASS/FAIL (numbers, never answer text).
// Expected: every old row identical; one new row, "Cue block above every spoken answer", "not logged".
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const MERGED = `${MAIN}/.claude/worktrees/merge-cue`;
const oldM = await import(pathToFileURL(`${MAIN}/electron/test/golden/interview60.metrics.mjs`).href);
const newM = await import(pathToFileURL(`${MERGED}/electron/test/golden/interview60.metrics.mjs`).href);
const runs = ['2026-09-02-before', '2026-09-24T08-20-12-h40a', '2026-09-29T11-42-00-h40c', '2026-09-30T11-45-30-br1'];
for (const r of runs) {
    const dir = path.join(MAIN, 'electron/test/golden/interview60.runs', r);
    let a, b;
    try { a = oldM.evaluateGate(oldM.computeRun(dir)); } catch (e) { console.log(`${r}: OLD threw ${e.message}`); continue; }
    try { b = newM.evaluateGate(newM.computeRun(dir)); } catch (e) { console.log(`${r}: NEW threw ${e.message}`); continue; }
    const oldRows = new Map(a.rows.map((x) => [x.label, `${x.pass ? 'PASS' : 'FAIL'} ${x.value}`]));
    const diffs = [];
    for (const x of b.rows) {
        const was = oldRows.get(x.label);
        const now = `${x.pass ? 'PASS' : 'FAIL'} ${x.value}`;
        if (was === undefined) diffs.push(`NEW ROW  ${x.label}: ${now}`);
        else if (was !== now) diffs.push(`CHANGED  ${x.label}: ${was}  ->  ${now}`);
    }
    for (const l of oldRows.keys()) if (!b.rows.some((x) => x.label === l)) diffs.push(`GONE     ${l}`);
    console.log(`${r}: rows ${a.rows.length} -> ${b.rows.length}; overall ${a.pass ? 'PASS' : 'FAIL'} -> ${b.pass ? 'PASS' : 'FAIL'}`);
    for (const d of diffs) console.log(`   ${d}`);
}
