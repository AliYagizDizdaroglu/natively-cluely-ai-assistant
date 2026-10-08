// Throwaway: turn pass20.json into the same pairs file the frozen grader reads, so the
// graded numbers are comparable with flight s50c item for item.
import fs from 'node:fs';
import path from 'node:path';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const HERE = path.join(MAIN, 'electron/test/golden');
const src = JSON.parse(fs.readFileSync(path.join(HERE, 'interview60.runs/pass20.json'), 'utf8'));
const s50c = JSON.parse(fs.readFileSync(path.join(HERE, 'interview60.runs/2026-09-12T08-22-49-s50c/interview60.judge.pairs.json'), 'utf8'));

const items = src.items.map((r) => ({
    key: r.id,
    id: r.id,
    kind: 'spoken',
    level: r.level,
    topic: s50c.items.find((i) => i.id === r.id)?.topic ?? '',
    question: r.question,
    heard: r.heard ?? '',
    source: 'whisper',
    verdict: 'match',
    dispatchedAt: new Date(r.playEndedMs).toISOString(),
    answer: r.answer,
}));

const out = { model: 'in-app (200-word guard, 2026-09-12 pass20)', rubric: s50c.rubric, items };
const dst = path.join(HERE, 'interview60.runs/pass20.judge.pairs.json');
fs.writeFileSync(dst, JSON.stringify(out, null, 1));
console.log(`wrote ${dst}  ${items.length} items, ${items.filter((i) => i.answer).length} with an answer`);
console.log('rubric identical to s50c:', out.rubric === s50c.rubric);
