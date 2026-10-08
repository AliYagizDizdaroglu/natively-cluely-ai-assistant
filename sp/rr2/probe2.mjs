// Throwaway: live transcript forms (h40a "heard" lines) through MAIN's real classifier, plus the
// round-1 six questions' landing categories.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const require = createRequire(MAIN + '/package.json');
const esbuild = require('esbuild');
const SRC = readFileSync(MAIN + '/electron/knowledge/IntentClassifier.ts', 'utf8');
const IMPORT_LINE = "import { IntentType } from './types';";
if (!SRC.includes(IMPORT_LINE)) throw new Error('import line not found');
globalThis.__IT = { TECHNICAL: 'technical', INTRO: 'intro', COMPANY_RESEARCH: 'company_research', NEGOTIATION: 'negotiation', PROFILE_DETAIL: 'profile_detail', GENERAL: 'general' };
const code = esbuild.transformSync(SRC.replace(IMPORT_LINE, 'const IntentType = globalThis.__IT;'), { loader: 'ts', format: 'cjs' }).code;
const module = { exports: {} };
new Function('module', 'exports', 'require', code)(module, module.exports, require);
const { classifyIntent } = module.exports;
for (const q of [
    // h40a R09, the roster text and the in-app transcript ("heard") of the same clip
    'Give me the SQL for the second highest salary in each department. Say it out loud.',
    'Give me the sequel for the second highest salary in each department. Say it out ',
    // the same STT forms with a strong pay phrase (the class the veto exists for)
    "Give me the sequel for each department's salary range.",
    "Write PostgreSQL that returns each department's salary range.",
    "Write SQL that returns each department's salary range.",
    // round-1 "marker beats pay" questions: where they land
    'For each department, write a query that returns the salary range: the minimum and the maximum salary.',
    'Write a SQL query that joins each employee to the pay grade whose salary range contains their salary.',
    "Compute each employee's total pay in SQL as base salary plus bonus.",
    'Train a regression model that predicts expected salary from years of experience.',
    'Write a query that computes total compensation per department.',
    'Design a pipeline that ingests equity trades from three exchanges.',
]) console.log(classifyIntent(q).padEnd(17), q);
