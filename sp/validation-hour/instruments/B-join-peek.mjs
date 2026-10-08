// Builder B scratch (read-only): do the merged judge files of every real twin family in the known-case folders join
// to their answers file the way the adapter will assume? Prints booleans and counts only, never text.
//   - every entry is keyed by its own id (answers and judge)
//   - judge item `answer` equals the answers record's `spoken` (so the judge file was merged from THIS answers file)
//   - every judge item's stored verdict equals verdictOf(its three scores)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const MAIN = path.join(os.homedir(), 'OneDrive', 'Masaüstü', 'natively-cluely-ai-assistant');
const J = await import(pathToFileURL(path.join(MAIN, 'electron/test/golden/interview60.judge.mjs')).href);
const runs = path.join(MAIN, 'electron/test/golden/interview60.runs');
let files = 0, bad = 0;
for (const run of ['2026-09-21T08-22-34-s50l', '2026-09-22T08-22-50-s50m', '2026-09-24T08-20-12-h40a', '2026-09-26T11-39-51-h40b', '2026-09-29T11-42-00-h40c']) {
    const dir = path.join(runs, run);
    for (const f of fs.readdirSync(dir).filter((x) => /^interview60\.answers\.gemini-3\.[15]-flash-lite_captured-(high|low)(-r[23])?\.json$/.test(x))) {
        const jf = f.replace('answers', 'judge');
        if (!fs.existsSync(path.join(dir, jf))) { console.log(`${run.slice(-4)} ${f}: no judge file`); continue; }
        const a = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        const j = JSON.parse(fs.readFileSync(path.join(dir, jf), 'utf8'));
        files++;
        const keyed = Object.entries(a).every(([k, v]) => v && v.id === k) && Object.entries(j.items).every(([k, v]) => v && v.id === k);
        const sameAnswer = Object.entries(j.items).filter(([k, v]) => a[k] && a[k].spoken !== v.answer).map(([k]) => k);
        const verdictMismatch = Object.entries(j.items).filter(([, v]) => v.verdict !== 'error' && J.verdictOf(v) !== v.verdict).map(([k]) => k);
        const errors = Object.entries(j.items).filter(([, v]) => v.verdict === 'error').map(([k]) => k);
        const notAnswered = Object.keys(j.items).filter((k) => !a[k] || !a[k].spoken || a[k].transientError);
        const unjudged = Object.values(a).filter((v) => !v.transientError && v.spoken && !j.items[v.id]).map((v) => v.id);
        const flag = !keyed || sameAnswer.length || verdictMismatch.length || errors.length || notAnswered.length || unjudged.length;
        if (flag) bad++;
        console.log(`${run.slice(-4)} ${f.replace('interview60.answers.', '')}: keyed ${keyed}; judge answer != spoken [${sameAnswer.join(' ')}]; verdict != verdictOf [${verdictMismatch.join(' ')}]; error verdicts [${errors.join(' ')}]; judge items not answered [${notAnswered.join(' ')}]; answered without judge item [${unjudged.join(' ')}]`);
    }
}
console.log(`files checked ${files}, with any deviation ${bad}`);
