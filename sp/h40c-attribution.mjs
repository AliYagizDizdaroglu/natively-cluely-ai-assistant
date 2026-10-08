// Throwaway, read-only: how each in-app answer was attributed (the dispatch verdict and ear), so the
// result note can say whether any of the 35 rests on e311019's paraphrase attribution — the bias
// PREREGISTER-h40c names for rule 3's floor.
import fs from 'node:fs';
import path from 'node:path';
const run = process.argv[2];
const j = JSON.parse(fs.readFileSync(path.join(run, 'interview60.judge.json'), 'utf8'));
const tally = {};
for (const [key, v] of Object.entries(j.items)) {
    const k = `${v.source}/${v.verdict ?? '?'}`;
    tally[k] = tally[k] ?? [];
    tally[k].push(`${key}:${v.verdict === 'acceptable' || v.verdict === 'weak' || v.verdict === 'wrong' ? '' : ''}${v.verdict}`);
}
// v.verdict is the GRADE after the merge; the dispatch verdict lives in the pairs file.
const pairs = JSON.parse(fs.readFileSync(path.join(run, 'interview60.judge.pairs.json'), 'utf8'));
const byDispatch = {};
for (const it of pairs.items) {
    const k = `${it.source}/${it.verdict}`;
    (byDispatch[k] = byDispatch[k] ?? []).push(`${it.key}=${j.items[it.key]?.verdict ?? 'ungraded'}`);
}
for (const [k, list] of Object.entries(byDispatch)) console.log(`${k.padEnd(22)} ${list.length}: ${list.join(' ')}`);
