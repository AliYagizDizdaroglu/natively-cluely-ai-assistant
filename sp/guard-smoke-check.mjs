// Throwaway: reads the app's own diag log for the budget lines a run emitted after a
// given ISO instant, and reports words/cut per answer. Used to prove live that the
// 200-word guard never cuts (the s50c baseline in the same log: 40 answers, 13 cut,
// p50 94, max 144). Usage: node guard-smoke-check.mjs <since-iso>
import fs from 'node:fs';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const SINCE = Date.parse(process.argv[2] ?? '');
if (Number.isNaN(SINCE)) throw new Error('pass an ISO instant, e.g. 2026-09-12T14:00:00Z');
const LOG = `${MAIN}/verbal-diag.log`;   // WhatToAnswerLLM writes it to the repo root (process.cwd())
const lines = fs.readFileSync(LOG, 'utf8').split('\n');

const rows = [];
for (const l of lines) {
    const t = l.match(/^\[([^\]]+)\]/);
    const at = t ? Date.parse(t[1]) : NaN;
    const b = l.match(/word budget: words=(\d+) cut=(yes|no) allowance=(yes|no)/);
    if (b && at >= SINCE) rows.push({ at: t[1], words: Number(b[1]), cut: b[2] === 'yes' });
}
const w = rows.map((r) => r.words).sort((a, b) => a - b);
console.log(`${rows.length} answers since ${process.argv[2]}`);
for (const r of rows) console.log(`  ${r.at}  words=${r.words}  cut=${r.cut ? 'YES' : 'no'}`);
if (rows.length) console.log(`\np50 ${w[Math.floor(w.length * 0.5)]}  max ${w[w.length - 1]}  cut ${rows.filter((r) => r.cut).length}/${rows.length}`);
// The guard's contract: nothing cut, nothing over 200.
const bad = rows.filter((r) => r.cut || r.words > 200);
console.log(bad.length === 0 && rows.length > 0 ? '\nGUARD OK — no cut, nothing over 200' : `\nGUARD CHECK FAILED — ${bad.length} bad rows (or no rows at all)`);
