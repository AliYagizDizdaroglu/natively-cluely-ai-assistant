// Throwaway, read-only: the grader's reasons for every in-app answer that is not c2/t2/d>=1, with
// the question and the answer's word count, for the result note.
import fs from 'node:fs';
import path from 'node:path';
const [run, verdictsPath] = process.argv.slice(2);
const pairs = JSON.parse(fs.readFileSync(path.join(run, 'interview60.judge.pairs.json'), 'utf8'));
const v = JSON.parse(fs.readFileSync(verdictsPath, 'utf8'));
for (const it of pairs.items) {
    const e = v[it.key];
    if (e.correctness === 2 && e.on_topic === 2 && e.delivery >= 1) continue;
    const words = String(it.answer || '').split(/\s+/).filter(Boolean).length;
    console.log(`${it.key} c${e.correctness} t${e.on_topic} d${e.delivery} | ${words} words | Q: ${String(it.question).slice(0, 110)}`);
    console.log(`    ${e.reason}`);
}
