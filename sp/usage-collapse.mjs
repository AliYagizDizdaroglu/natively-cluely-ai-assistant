// Throwaway: the "usage: thinking=X thoughts=N" line repeats per stream chunk, so collapse runs
// of identical consecutive values to one per request before counting. Prints level distribution,
// thought-token quantiles, and how many requests reported zero thoughts (i.e. did not think).
import fs from 'node:fs';
const LOG = process.argv[2] || 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/natively_debug.log';
const RE = /usage: thinking=(\w+) thoughts=(\d+) out=(\d+|\?) in=(\d+|\?)/;
const reqs = [];
let prev = '';
for (const line of fs.readFileSync(LOG, 'utf8').split(/\r?\n/)) {
    const m = line.match(RE);
    if (!m) continue;
    const key = `${m[1]}|${m[2]}|${m[4]}`;   // level, thoughts, prompt tokens — a request's fingerprint
    if (key === prev) continue;              // same request, later chunk
    prev = key;
    reqs.push({ level: m[1], thoughts: Number(m[2]), out: m[3] === '?' ? null : Number(m[3]) });
}
const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * q))] : null; };
const byLevel = {};
for (const r of reqs) (byLevel[r.level] ??= []).push(r.thoughts);
console.log(`requests (collapsed): ${reqs.length}`);
for (const [lvl, ts] of Object.entries(byLevel)) {
    console.log(`  ${lvl.padEnd(8)} n=${String(ts.length).padStart(3)}  zero-thought ${ts.filter((t) => t === 0).length}  thoughts p50 ${pct(ts, .5)}  p90 ${pct(ts, .9)}  max ${Math.max(...ts)}`);
}
