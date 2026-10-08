// s50j: the usage line is printed per STREAM CHUNK, not per request. Collapse a run of
// consecutive lines with the same model+in-tokens into ONE request, and take that
// request's LAST thoughts value (the final cumulative count).
import { readFileSync } from 'node:fs';
const dbg = readFileSync(`${process.argv[2]}/natively_debug.log`, 'utf8');

const lines = [...dbg.matchAll(/\[LLMHelper\] (\S+) usage: thinking=(\w+) thoughts=(\d+) out=(\d+) in=(\d+)/g)]
    .map((m) => ({ model: m[1], level: m[2], thoughts: Number(m[3]), out: Number(m[4]), in: Number(m[5]) }));

const reqs = [];
for (const l of lines) {
    const prev = reqs[reqs.length - 1];
    // same request while model+in-tokens hold AND out-tokens keep growing
    if (prev && prev.model === l.model && prev.in === l.in && l.out >= prev.out) {
        prev.thoughts = l.thoughts; prev.out = l.out; prev.chunks++;
    } else {
        reqs.push({ ...l, chunks: 1 });
    }
}
const p = (a, q) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : null; };
const by = {};
for (const r of reqs) {
    const k = `${r.model} @ ${r.level}`;
    by[k] ??= { n: 0, zero: 0, th: [] };
    by[k].n++; if (r.thoughts === 0) by[k].zero++; by[k].th.push(r.thoughts);
}
console.log(`collapsed ${lines.length} usage lines -> ${reqs.length} requests\n`);
for (const [k, v] of Object.entries(by)) {
    console.log(`${k}: ${v.n} requests, ${v.zero} with ZERO thoughts, thoughts p50 ${p(v.th, .5)} max ${Math.max(...v.th)}`);
}
