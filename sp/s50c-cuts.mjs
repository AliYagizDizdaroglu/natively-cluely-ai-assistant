// Throwaway: which in-app s50c answers were cut, and by how much, from the shipped
// diag log. Pairs each "word budget limit=L for a Q-word question" line with the
// "word budget: words=N cut=..." line that follows it, and matches them in order to
// the answers the harness recorded, so the smoke can target questions that WERE cut.
import fs from 'node:fs';
import path from 'node:path';

const RUN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-12T08-22-49-s50c';
const diag = fs.readFileSync(path.join(RUN, 'verbal-diag.log'), 'utf8').split('\n');
const answers = JSON.parse(fs.readFileSync(path.join(RUN, 'interview60.answers.json'), 'utf8'));
const items = Array.isArray(answers) ? answers : answers.items;

const events = [];
let pending = null;
for (const line of diag) {
    const lim = line.match(/word budget limit=(\d+) for a (\d+)-word question/);
    if (lim) { pending = { limit: Number(lim[1]), qWords: Number(lim[2]) }; continue; }
    const done = line.match(/word budget: words=(\d+) cut=(yes|no) allowance=(yes|no)/);
    if (done) { events.push({ ...(pending ?? {}), words: Number(done[1]), cut: done[2] === 'yes' }); pending = null; }
}
const cuts = events.filter((e) => e.cut);
console.log(`${events.length} budget events, ${cuts.length} cut`);
console.log('cut events (limit / question words / words emitted):');
for (const c of cuts) console.log(`  limit ${c.limit}  q ${c.qWords}w  -> ${c.words}w`);

// Map to ids where the harness recorded the spoken answer, by word count.
const words = (s) => (String(s ?? '').match(/\S+/g) || []).length;
const rows = (items ?? []).filter((i) => i.spoken).map((i) => ({ id: i.id, w: words(i.spoken) }));
const cutWords = new Set(cuts.map((c) => c.words));
const hits = rows.filter((r) => cutWords.has(r.w));
console.log(`\nrecorded answers whose word count matches a cut event (${hits.length}):`);
console.log('  ' + hits.map((h) => `${h.id}:${h.w}w`).join('  '));
