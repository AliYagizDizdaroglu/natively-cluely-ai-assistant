// s50j: prove the level flew and that no in-app answer ends mid-sentence (01d3810).
import { readFileSync } from 'node:fs';

const R = process.argv[2];
const log = readFileSync(`${R}/natively_debug.log`, 'utf8');

// One "usage:" line per request; collapse repeats of the same request id if present.
const usage = [...log.matchAll(/usage:[^\n]*thinking=(\w+)[^\n]*thoughts=(\d+)/g)].map((m) => ({ level: m[1], thoughts: Number(m[2]) }));
const byLevel = {};
for (const u of usage) {
    byLevel[u.level] ??= { n: 0, zero: 0, thoughts: [] };
    byLevel[u.level].n++;
    if (u.thoughts === 0) byLevel[u.level].zero++;
    byLevel[u.level].thoughts.push(u.thoughts);
}
const p = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
console.log('=== thinking level, one row per request ===');
for (const [lvl, v] of Object.entries(byLevel)) {
    console.log(`${lvl}: ${v.n} requests, ${v.zero} with zero thoughts, thoughts p50 ${p(v.thoughts, 0.5)} max ${Math.max(...v.thoughts)}`);
}
console.log('stalled after 10000ms:', (log.match(/stalled after 10000ms/g) || []).length);
console.log('first-token timeout / fallback lines:', (log.match(/stall|fallback/gi) || []).length);

// Guard check over every in-app answer.
const ans = JSON.parse(readFileSync(`${R}/interview60.answers.json`, 'utf8'));
const rows = Array.isArray(ans) ? ans : Object.values(ans.answers ?? ans);
const words = (t) => (t || '').trim().split(/\s+/).filter(Boolean).length;
let bad = [];
const counts = [];
for (const r of rows) {
    const t = (r.answer ?? r.text ?? '').trim();
    if (!t) continue;
    const w = words(t);
    counts.push(w);
    const endsClean = /[.!?)"'”’]$/.test(t);
    if (!endsClean || w === 200) bad.push({ id: r.id, words: w, tail: t.slice(-70) });
}
console.log(`\n=== guard: ${counts.length} in-app answers, words p50 ${p(counts, 0.5)} p90 ${p(counts, 0.9)} max ${Math.max(...counts)} ===`);
console.log(`at exactly 200 words: ${counts.filter((c) => c === 200).length}`);
console.log(`>=195 words: ${counts.filter((c) => c >= 195).length}`);
if (bad.length === 0) console.log('every answer ends on a sentence terminator — no mid-sentence cut');
else for (const b of bad) console.log(`MID-SENTENCE ${b.id} (${b.words}w): ...${b.tail}`);
