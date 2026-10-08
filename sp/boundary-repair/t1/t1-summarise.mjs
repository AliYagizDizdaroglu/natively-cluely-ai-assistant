// Throwaway (task 1): summarise a vitest --reporter=json output file by test name and status.
//   node t1-summarise.mjs <vitest-json> [failed|passed|all]
import fs from 'node:fs';
const [file, which = 'all'] = process.argv.slice(2);
const j = JSON.parse(fs.readFileSync(file, 'utf8'));
console.log(`totals: ${j.numTotalTests} tests, ${j.numFailedTests} failed, ${j.numPassedTests} passed, ${j.numFailedTestSuites} failed suites`);
let n = 0;
for (const suite of j.testResults) {
    for (const t of suite.assertionResults) {
        n++;
        if (which !== 'all' && t.status !== which) continue;
        const name = t.fullName.replace('deepgramBoundaryRepair reproduces the reference (rule-v3.mjs) on the extracted fixtures ', 'REF ').replace('deepgramBoundaryRepair synthetic edges (the symptom\'s strings) ', 'EDGE ');
        console.log(`${t.status.padEnd(6)} ${String(n).padStart(2)}  ${name.slice(0, 170)}`);
    }
}
