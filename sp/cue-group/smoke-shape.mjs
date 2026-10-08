// Throwaway (2026-09-30): the shape of what the candidate saw in this morning's cue smoke — per answer, the
// question's length, how many cue lines, words per cue line, and the spoken answer's words below the cues.
import fs from 'node:fs';
const RUN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn/electron/test/golden/interview60.runs/2026-09-30T02-38-22-cuesmoke';
const dbg = fs.readFileSync(`${RUN}/natively_debug.log`, 'utf8');
const ts = (s) => Date.parse(s);
const words = (s) => (String(s).match(/\S+/g) ?? []).length;
const dispatches = [...dbg.matchAll(/^(\S+) \[LOG\] \[Main\] dispatch: (?:answer|supersede) .*question="(.*)"$/gm)].map((m) => ({ at: ts(m[1]), q: m[2] }));
const cues = [...dbg.matchAll(/^(\S+) \[LOG\] \[Answer\] cues: (\[.*\])$/gm)].map((m) => ({ at: ts(m[1]), cues: JSON.parse(m[2]) }));
const budget = [...dbg.matchAll(/^(\S+) \[LOG\] \[Answer\] budget: words=(\d+)/gm)].map((m) => ({ at: ts(m[1]), words: Number(m[2]) }));
const rows = [];
for (const c of cues) {
    const d = dispatches.filter((x) => x.at <= c.at).pop();
    const b = budget.find((x) => x.at >= c.at);
    rows.push({ qWords: d ? words(d.q) : null, q: d?.q ?? '?', n: c.cues.length, cueWords: c.cues.map(words), answer: b?.words ?? null });
}
const q = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
for (const r of rows) console.log(`${String(r.qWords).padStart(3)}-word question | ${r.n} cue lines (${r.cueWords.join(',')} words) | answer ${r.answer} words | ${r.q.slice(0, 70)}`);
const allCueWords = rows.flatMap((r) => r.cueWords);
console.log(`\nanswers ${rows.length}: cue lines p50 ${q(rows.map((r) => r.n), 0.5)} max ${Math.max(...rows.map((r) => r.n))}; blocks with 4+ lines ${rows.filter((r) => r.n >= 4).length}; words per cue line p50 ${q(allCueWords, 0.5)} p90 ${q(allCueWords, 0.9)}; words on screen in the cue block p50 ${q(rows.map((r) => r.cueWords.reduce((a, b) => a + b, 0)), 0.5)} max ${Math.max(...rows.map((r) => r.cueWords.reduce((a, b) => a + b, 0)))}; spoken answer below p50 ${q(rows.map((r) => r.answer).filter((x) => x != null), 0.5)} max ${Math.max(...rows.map((r) => r.answer ?? 0))}`);
const long = rows.filter((r) => r.qWords >= 30), short = rows.filter((r) => r.qWords < 30);
console.log(`questions >= 30 words: ${long.length}, cue lines mean ${(long.reduce((a, r) => a + r.n, 0) / long.length).toFixed(1)}; under 30 words: ${short.length}, mean ${(short.reduce((a, r) => a + r.n, 0) / short.length).toFixed(1)}`);
