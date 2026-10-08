// Review scratch (read-only): per graded twin arm in a run folder, acceptable / wrong counts over all ids and over
// the 40 gated ids (excluding the five parentless follow-ups R02F R04F R09F R11F R13F), the ids that were wrong
// (ids only), and the grader model named in the merged file. Never prints answer text or grader reasons.
//   node twin-wrongs.mjs <run-dir>
import fs from 'node:fs';
import path from 'node:path';
const EXCL = new Set(['R02F', 'R04F', 'R09F', 'R11F', 'R13F']);
const dir = process.argv[2];
const files = fs.readdirSync(dir).filter((f) => (/^interview60\.judge\.gemini.*\.json$/.test(f) && !f.includes('pairs') && !f.includes('verdicts') && !f.includes('stale')) || f === 'interview60.judge.json').sort();
for (const f of files) {
    const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const items = Object.entries(j.items ?? {}).filter(([, v]) => v.kind === 'spoken');
    const verdict = (v) => v.verdict ?? null;
    const acc = items.filter(([, v]) => verdict(v) === 'acceptable').length;
    const wrongAll = items.filter(([, v]) => verdict(v) === 'wrong');
    const corr0 = items.filter(([, v]) => v.correctness === 0);
    const wrongGated = wrongAll.filter(([k, v]) => !EXCL.has(v.id ?? k.replace(/#\d+$/, '')));
    const corr0Gated = corr0.filter(([k, v]) => !EXCL.has(v.id ?? k.replace(/#\d+$/, '')));
    console.log(`${f.replace('interview60.judge.', '').replace('.json', '').padEnd(40)} grader=${j.graderModel ?? '?'} n=${items.length} acc=${acc} wrong(verdict)=${wrongAll.length} [${wrongAll.map(([k]) => k).join(' ')}] corr0=${corr0.length} gatedWrong=${wrongGated.length} gatedCorr0=${corr0Gated.length}`);
}
