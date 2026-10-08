// Throwaway (task 1): what do the fixtures contain that would pin the surviving mutations?
import fs from 'node:fs';
const fx = JSON.parse(fs.readFileSync('C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/audio/deepgramBoundaryRepair.fixtures.json', 'utf8'));
const all = [['symptom', fx.symptom], ['seam', fx.seam], ...fx.positives.map((f, i) => [`positive ${i + 1}`, f]), ...fx.negatives.map((f, i) => [`negative ${i + 1}`, f])];

console.log('--- restored words of the 17 restoring fixtures (expectedF2 minus F2) ---');
for (const [n, f] of all.filter(([n]) => !n.startsWith('negative'))) {
    const F2 = f.events[f.events.length - 1].text;
    const restored = f.expectedF2.endsWith(F2) ? f.expectedF2.slice(0, f.expectedF2.length - F2.length).trim() : `?? ${f.expectedF2}`;
    console.log(`${n.padEnd(12)} restored ${JSON.stringify(restored)}${/[A-Z]/.test(restored) ? '   <-- has uppercase' : ''}`);
}

const count = (label, re, pick) => {
    const hits = [];
    for (const [n, f] of all) for (const e of f.events) if (re.test(pick ? pick(e) : e.text)) hits.push(`${n}: ${JSON.stringify(e.text.slice(0, 60))}`);
    console.log(`\n${label}: ${hits.length} event(s)${hits.length ? '\n  ' + hits.slice(0, 5).join('\n  ') : ''}`);
};
count('events with a digit,digit (thousands comma)', /\d,\d/);
count('events whose text has NO [a-z0-9\'] token (token-less)', /^[^A-Za-z0-9']*$/);
// a repeated adjacent word ("the the") anywhere in an interim tail -- the F2[0] != T[0] guard's case
const rep = [];
for (const [n, f] of all) for (const e of f.events) { const t = (e.text.toLowerCase().match(/[a-z0-9']+/g) ?? []); for (let i = 1; i < t.length; i++) if (t[i] === t[i - 1]) rep.push(`${n}: "${t[i]} ${t[i]}" in ${JSON.stringify(e.text.slice(0, 60))}`); }
console.log(`\nadjacent repeated words in any event: ${rep.length}${rep.length ? '\n  ' + rep.slice(0, 5).join('\n  ') : ''}`);
// 1-token finals that follow an interim (the tolerant fw.length >= 2 guard's case)
let oneTok = 0;
for (const [n, f] of all) for (const e of f.events) if (e.isFinal && (e.text.toLowerCase().match(/[a-z0-9']+/g) ?? []).length === 1) { oneTok++; console.log(`1-token final: ${n}: ${JSON.stringify(e.text)}`); }
console.log(`1-token finals: ${oneTok}`);
// the largest |T| skip any positive needs
