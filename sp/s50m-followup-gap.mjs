// s50m-followup-gap.mjs — the live hour scored 12/20 follow-ups while its OWN captured bytes,
// replayed on the same model at the same level, scored 15/16/15. Same prompt, same model:
// so where does the gap sit? Per follow-up, in-app verdict against the three 3.5 HIGH reps.
import fs from 'node:fs';

const S = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const D = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m';
const V = (t) => JSON.parse(fs.readFileSync(`${S}/s50m-verdicts-${t}.json`, 'utf8'));
const cls = (v) => (v.correctness === 0 || v.on_topic === 0) ? 'wrong'
    : (v.correctness === 2 && v.on_topic === 2 && v.delivery >= 1) ? 'acceptable' : 'weak';

const inapp = V('inapp');
const HIGHS = ['captured-high', 'captured-high-r2', 'captured-high-r3'].map(V);
const answers = JSON.parse(fs.readFileSync(`${D}/interview60.answers.gemini-3.5-flash-lite_captured-high.json`, 'utf8'));
const judge = JSON.parse(fs.readFileSync(`${D}/interview60.judge.json`, 'utf8')).items ?? {};

const fups = Object.keys(inapp).filter((k) => /F$/.test(k)).sort();
console.log(`follow-ups in-app: ${fups.filter((k) => cls(inapp[k]) === 'acceptable').length} of ${fups.length}\n`);
console.log('id        in-app  3.5 reps  axes c/o/d   in-app grader reason');
console.log('-'.repeat(118));
let pipelineLoss = 0;
for (const k of fups) {
    const c = cls(inapp[k]);
    const reps = HIGHS.filter((h) => h[k] && cls(h[k]) === 'acceptable').length;
    const have = HIGHS.filter((h) => h[k]).length;
    const v = inapp[k];
    if (c !== 'acceptable' && reps >= 2) pipelineLoss++;
    const flag = c !== 'acceptable' && reps >= 2 ? ' <== replay passes, live fails' : '';
    console.log(`${k.padEnd(9)} ${c.padEnd(7)} ${reps}/${have}       ${v.correctness}/${v.on_topic}/${v.delivery}        ${String(v.reason ?? '').slice(0, 60)}${flag}`);
}
console.log(`\nfollow-ups the replay gets but the live hour loses: ${pipelineLoss}`);

// Did the live hour even ask the same question? The judge item carries what was heard.
console.log('\nHEARD vs ASKED on the lost follow-ups:');
for (const k of fups) {
    if (cls(inapp[k]) === 'acceptable') continue;
    const it = judge[k];
    if (!it) { console.log(`  ${k}: no judge item`); continue; }
    const q = String(it.question ?? ''), h = String(it.heard ?? '');
    const same = q.trim() === h.trim();
    console.log(`  ${k}  heard==asked: ${same ? 'yes' : 'NO'}`);
    if (!same) { console.log(`     asked: ${q.slice(0, 95)}`); console.log(`     heard: ${h.slice(0, 95)}`); }
}
