// Summarise a vitest --reporter=json file into one line per test: "<relative file> :: <full name> :: <status>".
// usage: node summarize-vitest-json.mjs <report.json> <out.txt> [<root-to-strip>]
import fs from 'node:fs';

const [, , src, out, rootArg] = process.argv;
if (!src || !out) {
    console.error('usage: node summarize-vitest-json.mjs <report.json> <out.txt> [<root>]');
    process.exit(2);
}
const report = JSON.parse(fs.readFileSync(src, 'utf8'));
const root = (rootArg || '').replace(/\\/g, '/').toLowerCase();

const lines = [];
const suiteFailures = [];
for (const file of report.testResults) {
    let name = file.name.replace(/\\/g, '/');
    if (root && name.toLowerCase().startsWith(root)) name = name.slice(root.length).replace(/^\//, '');
    if (file.status === 'failed' && file.assertionResults.length === 0) {
        suiteFailures.push(`${name} :: SUITE FAILED TO RUN :: ${String(file.message).split('\n')[0]}`);
    }
    for (const t of file.assertionResults) {
        lines.push(`${name} :: ${t.fullName} :: ${t.status}`);
    }
}
lines.sort();
fs.writeFileSync(out, [...suiteFailures, ...lines].join('\n') + '\n', 'utf8');

const by = {};
for (const l of lines) {
    const st = l.slice(l.lastIndexOf(' :: ') + 4);
    by[st] = (by[st] || 0) + 1;
}
console.log(JSON.stringify({
    numTotalTestSuites: report.numTotalTestSuites,
    numTotalTests: report.numTotalTests,
    numPassedTests: report.numPassedTests,
    numFailedTests: report.numFailedTests,
    numPendingTests: report.numPendingTests,
    numFailedTestSuites: report.numFailedTestSuites,
    files: report.testResults.length,
    filesFailed: report.testResults.filter((f) => f.status === 'failed').length,
    byStatus: by,
    suiteFailures,
}, null, 2));
