// Throwaway analysis: does the hour's answer lean on the PREVIOUS question's
// topic (the prompt carries up to 12 prior turns over 180 s, including the
// app's own previous answers)? For every delivered answer paired to a scripted
// item: content-word overlap of the answer with the current question vs with
// the previous scripted question; a "bleed" candidate is an answer whose
// previous-question overlap is at least as large as its current-question
// overlap. Cross-tabulated with the judge verdicts. Same for the 3.1 arm,
// which had no prior context, as the control.
// usage: node topic-bleed.mjs <repo-root>
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.argv[2] ?? '.';
const R5 = path.join(root, 'electron/test/golden/interview60.runs/2026-09-04T22-43-34-after5');
const judgeMod = await import(pathToFileURL(path.join(root, 'electron/test/golden/interview60.judge.mjs')).href);
const timeline = JSON.parse(fs.readFileSync(path.join(R5, 'interview60.timeline.json'), 'utf8'));
const items = timeline.items;
const dbg = fs.readFileSync(path.join(R5, 'natively_debug.log'), 'utf8');
const judge = JSON.parse(fs.readFileSync(path.join(R5, 'interview60.judge.json'), 'utf8')).items;
const armJudge = JSON.parse(fs.readFileSync(path.join(R5, 'interview60.judge.gemini-3.1-flash-lite.json'), 'utf8')).items;
const armAnswers = JSON.parse(fs.readFileSync(path.join(R5, 'interview60.answers.json'), 'utf8'));
const armList = Array.isArray(armAnswers.items ?? armAnswers) ? (armAnswers.items ?? armAnswers) : Object.entries(armAnswers.items ?? armAnswers).map(([id, v]) => ({ id, ...v }));

const STOP = new Set(['what', 'when', 'where', 'which', 'would', 'could', 'should', 'this', 'that', 'with', 'from', 'your', 'about', 'have', 'does', 'into', 'than', 'them', 'they', 'were', 'will', 'been', 'there', 'their', 'some', 'more', 'most', 'also', 'just', 'like', 'over', 'make', 'used', 'using', 'each', 'many', 'much', 'very', 'tell', 'walk', 'through', 'give', 'explain', 'describe', 'model', 'models', 'data', 'production', 'system', 'systems', 'approach', 'ensure', 'first', 'then', 'need', 'needs', 'across', 'between', 'without', 'actually', 'already', 'being']);
const cw = (s) => new Set((String(s).toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 3 && !STOP.has(w)));
const overlap = (answer, question) => { const A = cw(answer), Q = cw(question); if (!Q.size) return 0; let n = 0; for (const w of Q) if (A.has(w)) n++; return n / Q.size; };

function score(rows, label) {
    const bleed = rows.filter((r) => r.prev >= r.cur && r.prev > 0);
    const acc = (rs) => rs.filter((r) => r.verdict === 'acceptable').length;
    console.log(`\n=== ${label}: ${rows.length} answers; previous-question overlap >= current: ${bleed.length}`);
    console.log(`   acceptable among bleed candidates ${acc(bleed)}/${bleed.length}; among the rest ${acc(rows.filter((r) => !bleed.includes(r)))}/${rows.length - bleed.length}`);
    console.log('   candidates:', bleed.map((r) => `${r.key}(${r.verdict}, cur ${r.cur.toFixed(2)} prev ${r.prev.toFixed(2)} <- ${r.prevId})`).join('; ') || 'none');
    const nonAcc = rows.filter((r) => r.verdict !== 'acceptable');
    console.log('   non-acceptable with their overlaps:', nonAcc.map((r) => `${r.key}(cur ${r.cur.toFixed(2)} prev ${r.prev.toFixed(2)})`).join('; '));
}

// the hour
const pairs = judgeMod.pairAnswers(dbg, timeline).filter((p) => p.id !== '?' && p.answer);
const keyed = judgeMod.keyPairs(pairs);
const rows = [];
for (const { key, pair } of keyed) {
    const idx = items.findIndex((i) => i.id === pair.id);
    if (idx < 0) continue;
    const spokenBefore = items.slice(0, idx).filter((i) => i.kind !== 'screenshot');
    const prev = spokenBefore[spokenBefore.length - 1];
    const v = judge[key];
    if (!v || v.kind !== 'spoken') continue;
    rows.push({ key, verdict: v.verdict, cur: overlap(pair.answer, items[idx].q), prev: prev ? overlap(pair.answer, prev.q) : 0, prevId: prev?.id ?? '-' });
}
score(rows, 'after5 hour (prompt carries prior turns)');

// the arm: same questions, no prior context
const armRows = [];
for (const x of armList) {
    const idx = items.findIndex((i) => i.id === x.id);
    if (idx < 0) continue;
    const spokenBefore = items.slice(0, idx).filter((i) => i.kind !== 'screenshot');
    const prev = spokenBefore[spokenBefore.length - 1];
    const v = armJudge[x.id];
    const text = x.spoken ?? x.result?.spoken ?? '';
    if (!v || !text) continue;
    armRows.push({ key: x.id, verdict: v.verdict, cur: overlap(text, items[idx].q), prev: prev ? overlap(text, prev.q) : 0, prevId: prev?.id ?? '-' });
}
score(armRows, '3.1 arm (no prior context, control)');
