// Spec-review scratch (seam 2 only: it has per-word timings). At every boundary between consecutive non-empty
// finals where the first one is a forced mid-speech finalization (speech_final=false), print the silence between
// F1's last word and F2's first word, and whether a scripted word is missing there (joined F1+F2 vs script).
// Question: could per-word timings at least DETECT the losses that left no interim evidence?
import fs from 'node:fs';
import path from 'node:path';
import { tok } from '../../rule-v3.mjs';

const dir = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '../../seam-probe');
const stamp = '2026-09-29T13-54-49-614Z';
const plan = JSON.parse(fs.readFileSync(path.join(dir, `plan-${stamp}.json`), 'utf8'));
const finals = fs.readFileSync(path.join(dir, `events-${stamp}.jsonl`), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
    .filter((e) => e.kind === 'transcript' && e.isFinal && e.text && e.words?.length);
const playOf = (e) => { const end = e.start + e.duration; return plan.plan.find((p, i) => end >= p.startS && end < (plan.plan[i + 1]?.startS ?? Infinity)); };
const rows = [];
for (let i = 1; i < finals.length; i++) {
    const a = finals[i - 1], b = finals[i];
    if (a.speechFinal) continue;                       // only forced mid-speech boundaries
    const pa = playOf(a), pb = playOf(b);
    if (!pa || !pb || pa !== pb) continue;
    const script = tok(plan.script[pa.id]);
    const la = tok(a.text).slice(-1)[0], fb = tok(b.text)[0];
    // a word is missing at this boundary when the script has la X fb but not la fb adjacent
    let missing = null;
    for (let j = 0; j + 2 < script.length; j++) if (script[j] === la && script[j + 2] === fb) missing = script[j + 1];
    const adjacent = script.some((w, j) => w === la && script[j + 1] === fb);
    const gap = b.words[0][1] - a.words[a.words.length - 1][2];
    rows.push({ play: `${pa.id}#${pa.play}`, gap, missing: adjacent ? null : missing, la, fb });
}
rows.sort((x, y) => y.gap - x.gap);
for (const r of rows) console.log(`${r.play.padEnd(9)} gap ${r.gap.toFixed(2)}s  "${r.la}" | "${r.fb}"${r.missing ? `   MISSING "${r.missing}"` : ''}`);
