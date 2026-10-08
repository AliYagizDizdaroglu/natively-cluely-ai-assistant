// Throwaway re-review probe (Task 1 fix round 1, the TECHNICAL_CONTEXT veto).
// Read-only on MAIN: bundles MAIN's CURRENT IntentClassifier.ts in memory and
// writes the bundle HERE (scratchpad). Compares against the previous reviewer's
// bundles: bundle-old.mjs = HEAD (bare 'salary'), bundle-new.mjs = fix round 0
// (phrase list, no veto).
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const require = createRequire(MAIN + '/package.json');
const esbuild = require('esbuild');
const here = dirname(fileURLToPath(import.meta.url));
const prev = join(here, '..', 'review-task1-probe');

const src = readFileSync(MAIN + '/electron/knowledge/IntentClassifier.ts', 'utf8').replace(/\r\n/g, '\n');
const VETO_LINE = "const strong = STRONG_NEGOTIATION.some(kw => hasWord(lower, kw)) && !TECHNICAL_CONTEXT.some(kw => hasWord(lower, kw));";
if (!src.includes(VETO_LINE)) throw new Error('veto line not found verbatim in MAIN - probe would not test the fix');
const m = src.match(/const TECHNICAL_CONTEXT = \[([\s\S]*?)\];/);
if (!m) throw new Error('TECHNICAL_CONTEXT not found');
const MARKERS = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
console.log(`TECHNICAL_CONTEXT has ${MARKERS.length} terms: ${MARKERS.join(', ')}`);

const r = esbuild.buildSync({
    stdin: { contents: src, resolveDir: MAIN + '/electron/knowledge', sourcefile: 'IntentClassifier.ts', loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', write: false,
});
const out = join(here, 'bundle-fix1.mjs');
writeFileSync(out, r.outputFiles[0].text);
const fix1 = await import(pathToFileURL(out).href);
const fix0 = await import(pathToFileURL(join(prev, 'bundle-new.mjs')).href);
const head = await import(pathToFileURL(join(prev, 'bundle-old.mjs')).href);

const rows = [
    // calibration: answers known in advance
    ['K1 calib R09', 'Give me the SQL for the second highest salary in each department.'],
    ['K2 calib real', 'What are your salary expectations for this role?'],
    // the six loop cases of the new test (each must be negotiation at fix0 to be a live RED case)
    ['T1 test', 'For each department, write a query that returns the salary range: the minimum and the maximum salary.'],
    ['T2 test', 'Write a SQL query that joins each employee to the pay grade whose salary range contains their salary.'],
    ['T3 test', "Compute each employee's total pay in SQL as base salary plus bonus."],
    ['T4 test', 'Train a regression model that predicts expected salary from years of experience.'],
    ['T5 test', 'Write a query that computes total compensation per department.'],
    ['T6 test', 'Design a pipeline that ingests equity trades from three exchanges.'],
    // the three guard cases
    ['G1 guard', "What's your expected salary?"],
    ['G2 guard', 'What is your salary range for this level?'],
    ['G3 guard', 'Is the compensation package negotiable?'],
    // real negotiation wording that carries a marker (interviewer side)
    ['N1 table', 'A signing bonus is also on the table if that helps you decide.'],
    ['N2 table', 'Everything is on the table - what compensation would make this work for you?'],
    ['N3 table', 'Is equity on the table for you, or would you rather have a higher base?'],
    ['N4 join', 'What salary would it take for you to join us?'],
    ['N5 join', 'What compensation would you need to join our team?'],
    ['N6 join', 'If you join, the equity vests over four years. Does that work for you?'],
    ['N7 pipeline', 'Do you have other offers in the pipeline, and what compensation are they offering?'],
    ['N8 function', "Our salary ranges are set by job function. What's your expected salary?"],
    ['N9 database', "What's your expected salary for a senior database engineer role?"],
    ['N10 sql turn', "That was the last SQL question. Let's switch gears: what are your salary expectations?"],
    ['N11 query', 'If you have any query about the compensation package, just let me know.'],
    // technical questions the whole-word veto misses (plurals / unlisted words)
    ['V1 queries', "Write queries that return each department's salary range."],
    ['V2 tables', "Given the employees and departments tables, return each department's salary range."],
    ['V3 functions', 'Use window functions to rank employees by base salary within each department.'],
    ['V4 columns', 'The data has name, department and base salary columns; find the top three per department.'],
    ['V5 postgres', 'In PostgreSQL, return the salary range for each department.'],
    ['V6 api', "Design an API that returns an employee's total compensation."],
    ['V7 pandas', 'Using pandas, compute the salary range for each department.'],
];
const markersIn = (q) => MARKERS.filter((t) => fix1.hasWord(q.toLowerCase(), t)).join('+') || '-';
for (const [id, q] of rows) {
    console.log(`${id.padEnd(14)} head=${String(head.classifyIntent(q)).padEnd(16)} fix0=${String(fix0.classifyIntent(q)).padEnd(16)} fix1=${String(fix1.classifyIntent(q)).padEnd(16)} veto=${markersIn(q).padEnd(10)} | ${q}`);
}
