// Throwaway: records s50m's VERIFIED grader (claude-opus-5 — all 18 grading agents of 2026-09-22
// 12:55-12:59 ran it, per their transcripts) by re-merging each of its judge files through MAIN's
// landed judge.mjs with --model claude-opus-5. Grades must come out byte-identical: every judge
// file is backed up first, and any difference restores ALL files and stops.
//   node backfill-s50m-grader.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const RUN = `${MAIN}/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m`;
const JUDGE = `${MAIN}/electron/test/golden/interview60.judge.mjs`;
const BACKUP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/s50m-judge-backup';
const GRADER = 'claude-opus-5';
const dry = process.argv.includes('--dry');
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

// The landed judge.mjs must be the one that records graderModel.
if (!fs.readFileSync(JUDGE, 'utf8').includes('graderModel')) { console.log('STOP: MAIN\'s judge.mjs does not record graderModel yet — land the change first'); process.exit(2); }

// tag -> answers file, from each answers file's own model field (the judge CLI derives its tag the same way).
const answersByTag = {};
for (const f of fs.readdirSync(RUN).filter((x) => /^interview60\.answers(\..+)?\.json$/.test(x) && !/stale/.test(x))) {
    const store = readJson(path.join(RUN, f));
    const model = Object.values(store).find((v) => v?.model)?.model;
    if (model) answersByTag[model.replace(/\//g, '_')] = f;
}
const judgeFiles = fs.readdirSync(RUN).filter((x) => /^interview60\.judge(\..+)?\.json$/.test(x) && !/^interview60\.judge\.(pairs|verdicts)\b/.test(x)).sort();
const plan = judgeFiles.map((jf) => {
    const tag = jf === 'interview60.judge.json' ? '' : jf.replace(/^interview60\.judge\./, '').replace(/\.json$/, '');
    const verdicts = `interview60.judge.verdicts${tag ? '.' + tag : ''}.json`;
    const answers = tag ? answersByTag[tag] : null;
    const problems = [!fs.existsSync(path.join(RUN, verdicts)) && `no ${verdicts}`, tag && !answers && `no answers file for tag ${tag}`].filter(Boolean);
    return { jf, tag, verdicts, answers, problems };
});
for (const p of plan) console.log(`${p.problems.length ? 'PROBLEM' : 'ok     '} ${p.jf}  <- ${p.verdicts}${p.answers ? ` + ${p.answers}` : ''}${p.problems.length ? '  ' + p.problems.join('; ') : ''}`);
if (plan.some((p) => p.problems.length)) { console.log('STOP: unresolved inputs'); process.exit(2); }
console.log(`${plan.length} judge files planned`);
if (dry) process.exit(0);

fs.mkdirSync(BACKUP, { recursive: true });
for (const p of plan) fs.copyFileSync(path.join(RUN, p.jf), path.join(BACKUP, p.jf));
const restoreAll = () => { for (const p of plan) fs.copyFileSync(path.join(BACKUP, p.jf), path.join(RUN, p.jf)); };
console.log(`backed up ${plan.length} files to ${BACKUP}`);

for (const p of plan) {
    const before = readJson(path.join(BACKUP, p.jf));
    const args = [JUDGE, RUN, ...(p.answers ? ['--answers', path.join(RUN, p.answers)] : []), '--verdicts', path.join(RUN, p.verdicts), '--model', GRADER];
    const r = spawnSync(process.execPath, args, { cwd: BACKUP, encoding: 'utf8' });
    const after = fs.existsSync(path.join(RUN, p.jf)) ? readJson(path.join(RUN, p.jf)) : null;
    const same = after && JSON.stringify(after.items) === JSON.stringify(before.items);
    const ok = r.status === 0 && same && after.graderModel === GRADER && after.graderPrompt === before.graderPrompt;
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${p.jf}: exit ${r.status}, items identical ${same}, graderModel ${after?.graderModel}, stamp ${after?.graderPrompt} (was ${before.graderPrompt})`);
    if (!ok) { console.log((r.stderr || r.stdout || '').slice(-600)); restoreAll(); console.log('RESTORED all judge files from the backup; STOP'); process.exit(1); }
}
console.log(`BACKFILL DONE: ${plan.length} judge files now record graderModel ${GRADER}`);
