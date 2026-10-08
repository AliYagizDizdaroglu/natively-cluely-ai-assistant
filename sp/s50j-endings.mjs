// s50j: every delivered in-app answer must end on a sentence terminator (01d3810).
import { readFileSync } from 'node:fs';
const dbg = readFileSync(`${process.argv[2]}/natively_debug.log`, 'utf8');

// [Answer] full: "..." — the text actually handed to the overlay.
const full = [...dbg.matchAll(/\[Answer\] full: ("(?:[^"\\]|\\.)*")/g)].map((m) => {
    try { return JSON.parse(m[1]); } catch { return m[1]; }
});
console.log(`[Answer] full lines: ${full.length}`);
if (!full.length) {
    console.log('sample raw context:');
    const i = dbg.indexOf('[Answer] full:');
    console.log(dbg.slice(i, i + 400));
    process.exit(0);
}
const words = (t) => t.trim().split(/\s+/).filter(Boolean).length;
const bad = [];
const ws = [];
for (const t0 of full) {
    const t = t0.trim();
    if (!t) continue;
    const w = words(t);
    ws.push(w);
    if (!/[.!?)"'”’]$/.test(t) || w === 200) bad.push({ w, tail: t.slice(-80) });
}
ws.sort((a, b) => a - b);
console.log(`answers ${ws.length}  words p50 ${ws[Math.floor(ws.length / 2)]} max ${ws[ws.length - 1]}`);
console.log(`at exactly 200 words: ${ws.filter((x) => x === 200).length}   >=195: ${ws.filter((x) => x >= 195).length}`);
console.log(`>=158 words (s50e delivery-0 zone): ${ws.filter((x) => x >= 158).length}`);
if (!bad.length) console.log('PASS — every answer ends on a sentence terminator, none at the 200-word ceiling');
else for (const b of bad) console.log(`MID-SENTENCE (${b.w}w): ...${b.tail}`);
