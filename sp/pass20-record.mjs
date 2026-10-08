// Throwaway: write the pass record for the 20-question clip pass (the standing rule is that
// every pass over the golden questions gets one), plus its INDEX row.
import fs from 'node:fs';
import path from 'node:path';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const HERE = path.join(MAIN, 'electron/test/golden');
const SCRATCH = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const RUNS = path.join(HERE, 'interview60.runs');

const now = JSON.parse(fs.readFileSync(path.join(RUNS, 'pass20.json'), 'utf8'));
const s50c = JSON.parse(fs.readFileSync(path.join(RUNS, '2026-09-12T08-22-49-s50c/interview60.judge.json'), 'utf8')).items;
const v = { ...JSON.parse(fs.readFileSync(path.join(SCRATCH, 'pass20-verdicts-s1-7f3a.json'), 'utf8')), ...JSON.parse(fs.readFileSync(path.join(SCRATCH, 'pass20-verdicts-s2-b91c.json'), 'utf8')) };
const blind = JSON.parse(fs.readFileSync(path.join(SCRATCH, 'pass20-blind-verdicts-4d2e.json'), 'utf8'));
const key = JSON.parse(fs.readFileSync(path.join(SCRATCH, 'pass20-blind-key.json'), 'utf8')).key;

const verdictOf = (s) => (!s ? 'not answered' : (s.correctness === 0 || s.on_topic === 0) ? 'wrong' : (s.correctness === 2 && s.on_topic === 2 && s.delivery >= 1) ? 'acceptable' : 'weak');
const words = (s) => (String(s ?? '').match(/\S+/g) ?? []).length;
const blindWinner = (id) => { const k = key.find((x) => x.id === id); const r = blind[id]; if (!k || !r) return '—'; return r.winner === 'tie' ? 'tie' : (r.winner === 'A' ? k.A : k.B); };

const rows = now.items.map((r) => ({ ...r, score: v[r.id] ?? null, verdict: verdictOf(v[r.id]), before: s50c[r.id] }));
const acc = rows.filter((r) => r.verdict === 'acceptable').length;
const weak = rows.filter((r) => r.verdict === 'weak').length;
const wrong = rows.filter((r) => r.verdict === 'wrong').length;
const none = rows.filter((r) => r.verdict === 'not answered').length;
const g = key.filter((k) => blindWinner(k.id) === 'guard').length;
const c = key.filter((k) => blindWinner(k.id) === 'cut').length;
const t = key.length - g - c;
const w = rows.filter((r) => r.words).map((r) => r.words).sort((a, b) => a - b);

const out = [];
out.push('# Pass 2026-09-12 14:10–14:26 UTC — pass20: the 20 mains with the 200-word guard', '');
out.push('Not a flight. The 20 scenario50 S1+S2 main questions played into the real app one clip at a');
out.push('time with a fixed 25 s gap, no follow-ups, to answer one question: did the app\'s own word cut');
out.push('cause the weak answers? Commit 85b1ce9 (SPOKEN_WORD_GUARD, a 200-word clamp) against flight');
out.push('s50c (2f00291, clamp(80, 2.5 x question words, 150) cut). Same frozen grader, same rubric,');
out.push('same questions. Timing, doubles and long-question wholeness are NOT comparable with a flight.', '');
out.push('## Result', '');
out.push('| | s50c (cut) | pass20 (guard) |');
out.push('|---|---|---|');
out.push(`| acceptable | 12/20 | ${acc}/20 |`);
out.push(`| weak | 8 | ${weak} |`);
out.push(`| wrong | 0 | ${wrong} |`);
out.push(`| not answered | 0 | ${none} |`);
out.push('| answers cut by the app | 13 of 40 | 0 of 19 |');
out.push(`| words p50 / max | 94 / 144 | ${w[Math.floor(w.length / 2)]} / ${w[w.length - 1]} |`, '');
out.push(`Blind head-to-head over the 19 answered questions, old and new answer presented in randomised`);
out.push(`order to a grader told only to pick the one that better answers what was asked, length explicitly`);
out.push(`not a criterion: **guard ${g}, cut ${c}, tie ${t}**. On the 7 questions s50c graded weak: guard ${key.filter((k) => k.s50cVerdict !== 'acceptable' && blindWinner(k.id) === 'guard').length}.`, '');
out.push('## Per question', '');
out.push('| id | s50c | now | c/o/d | s50c words | now words | blind winner | grader reason |');
out.push('|---|---|---|---|---|---|---|---|');
for (const r of rows) {
    const s = r.score;
    out.push(`| ${r.id} | ${r.before?.verdict ?? '—'} | ${r.verdict} | ${s ? `${s.correctness}/${s.on_topic}/${s.delivery}` : '—'} | ${words(r.before?.answer)} | ${r.words || '—'} | ${blindWinner(r.id)} | ${s ? s.reason : 'no answer captured — routed to the coding path'} |`);
}
out.push('', '## Answers', '');
for (const r of rows) {
    out.push(`### ${r.id} — ${r.verdict}${r.score ? ` (${r.score.correctness}/${r.score.on_topic}/${r.score.delivery})` : ''}`, '');
    out.push(`**Question (scripted):** ${r.question}`, '');
    out.push(`**Heard:** ${r.heard ?? '(nothing dispatched)'}`, '');
    out.push(`**Answer (${r.words} words, cut=${r.cut}):** ${r.answer ? r.answer.replace(/\n+/g, ' ').trim() : '(none)'}`, '');
    if (r.before) out.push(`**s50c answer (${words(r.before.answer)} words, ${r.before.verdict}):** ${String(r.before.answer ?? '').replace(/\n+/g, ' ').trim()}`, '');
    if (r.before) out.push(`**s50c grader:** ${r.before.reason}`, '');
    const b = blind[r.id];
    if (b) out.push(`**Blind head-to-head:** ${blindWinner(r.id)} — ${b.why}`, '');
}
const file = path.join(HERE, 'passes/2026-09-12T14-26-36-pass20.md');
fs.writeFileSync(file, out.join('\n'));
console.log(`wrote ${file}  (${out.length} lines)  acceptable ${acc}/20, weak ${weak}, wrong ${wrong}, none ${none}`);

// INDEX row, appended to the existing table.
const idxPath = path.join(HERE, 'passes/INDEX.md');
let idx = fs.readFileSync(idxPath, 'utf8').trimEnd().split('\n');
const row = `| 2026-09-12T14-26-36-pass20 | [record](2026-09-12T14-26-36-pass20.md) | scenario50 [S1, S2] mains only, clip pass (not a flight) | 85b1ce9 | 19/20 | 19 | — | — | — | — | ${acc}/20 (${weak} weak, ${wrong} wrong, ${none} not answered) | blind vs s50c: guard ${g} · cut ${c} · tie ${t} |`;
if (!idx.some((l) => l.includes('pass20'))) idx.push(row);
fs.writeFileSync(idxPath, idx.join('\n') + '\n');
console.log('INDEX row added');
