// Throwaway review probe (Task 1, R09 fix). Read-only on MAIN: bundles MAIN's
// working-tree IntentClassifier.ts in memory (new list) and the same source with
// the HEAD list line from the diff substituted back (old list), then classifies
// a table of questions with both. Nothing is written inside MAIN.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const require = createRequire(MAIN + '/package.json');
const esbuild = require('esbuild');
const here = dirname(fileURLToPath(import.meta.url));

const src = readFileSync(MAIN + '/electron/knowledge/IntentClassifier.ts', 'utf8').replace(/\r\n/g, '\n');
const NEW_LIST = [
    "    'salary expectation', 'salary expectations', 'expected salary', 'salary range', 'your salary',",
    "    'salary requirement', 'salary requirements', 'desired salary', 'base salary', 'salary offer',",
    "    'what salary', 'compensation', 'negotiate', 'negotiable', 'equity', 'rsu', 'rsus', 'signing bonus',",
].join('\n');
const OLD_LIST = "    'salary', 'compensation', 'negotiate', 'negotiable', 'equity', 'rsu', 'rsus', 'signing bonus',";
if (!src.includes(NEW_LIST)) throw new Error('working-tree list not found verbatim — probe would not test the diff');
const oldSrc = src.replace(NEW_LIST, OLD_LIST);

async function load(contents, tag) {
    const r = esbuild.buildSync({
        stdin: { contents, resolveDir: MAIN + '/electron/knowledge', sourcefile: 'IntentClassifier.ts', loader: 'ts' },
        bundle: true, format: 'esm', platform: 'node', write: false,
    });
    const out = join(here, `bundle-${tag}.mjs`);
    writeFileSync(out, r.outputFiles[0].text);
    return (await import(pathToFileURL(out).href)).classifyIntent;
}
const classifyNew = await load(src, 'new');
const classifyOld = await load(oldSrc, 'old');

const rows = [
    ['K1 calib R09', 'Give me the SQL for the second highest salary in each department.'],
    ['K2 calib real', 'What are your salary expectations for this role?'],
    ['T1 tech', 'For each department, write a query that returns the salary range: the minimum and the maximum salary.'],
    ['T2 tech', 'Write a SQL query that joins each employee to the pay grade whose salary range contains their salary.'],
    ['T3 tech', "Compute each employee's total pay in SQL as base salary plus bonus."],
    ['T4 tech', 'Train a regression model that predicts expected salary from years of experience.'],
    ['T5 tech ctl', "Write a query to find employees whose salary is higher than their manager's salary."],
    ['T6 tech', 'Write a query that computes total compensation per department.'],
    ['T7 tech', 'Design a pipeline that ingests equity trades from three exchanges.'],
    ['N1 real', "What's your current salary?"],
    ['N2 real', 'We can offer you a salary of 130k. Does that work for you?'],
    ['N3 real', 'What kind of salary are you looking for?'],
    ['N4 real', 'How flexible are you on salary?'],
    ['N5 real', 'What are the salary ranges for this level?'],
    ['N6 real ctl', 'What salary are you expecting?'],
];
for (const [id, q] of rows) console.log(`${id.padEnd(14)} old=${String(classifyOld(q)).padEnd(18)} new=${String(classifyNew(q)).padEnd(18)} | ${q}`);
