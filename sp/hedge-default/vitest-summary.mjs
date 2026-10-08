// Throwaway (scratchpad only): read a vitest --reporter=json file and print, per test file, the counts and
// every failing test's full name with the first line of its failure message. Read-only.
//   node vitest-summary.mjs <vitest json file>
import fs from 'node:fs';

const j = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const rel = (p) => p.replace(/\\/g, '/').replace(/^.*\/natively-cluely-ai-assistant\//, '');
let files = 0, filesFailed = 0;
for (const f of [...j.testResults].sort((a, b) => rel(a.name).localeCompare(rel(b.name)))) {
    files++;
    const rs = f.assertionResults;
    const failed = rs.filter((r) => r.status === 'failed');
    const skipped = rs.filter((r) => r.status === 'skipped' || r.status === 'pending' || r.status === 'todo');
    const passed = rs.filter((r) => r.status === 'passed');
    if (failed.length || f.status === 'failed') filesFailed++;
    console.log(`${failed.length || f.status === 'failed' ? 'FAIL' : 'ok  '} ${rel(f.name)}: ${passed.length}/${rs.length} passed${skipped.length ? `, ${skipped.length} skipped` : ''}${failed.length ? `, ${failed.length} failed` : ''}${rs.length === 0 && f.message ? ` (file error: ${f.message.split('\n')[0].slice(0, 200)})` : ''}`);
    for (const r of failed) {
        const first = (r.failureMessages?.[0] ?? '').split('\n')[0].slice(0, 170);
        console.log(`      x ${r.fullName}\n          ${first}`);
    }
}
console.log(`TOTAL: ${files} files (${filesFailed} failing), ${j.numPassedTests} passed, ${j.numFailedTests} failed, ${j.numTotalTests} tests`);
