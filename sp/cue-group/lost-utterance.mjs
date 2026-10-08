// Names the metrics row's "lost utterances" in one run (the same rule as interview60.metrics.mjs:160-182: an empty
// Deepgram final whose last partial had words, with no non-empty final within 5 s carrying them). For each, prints the
// time, the partial's words (interviewer speech), and the first later final within 15 s that carries them, if any.
//   node lost-utterance.mjs <run dir>
import fs from 'node:fs';
const dbg = fs.readFileSync(`${process.argv[2]}/natively_debug.log`, 'utf8');
const ts = (s) => Date.parse(s);
const finals = [...dbg.matchAll(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=true, text="([^"]*)"/gm)].map((m) => ({ at: ts(m[1]), iso: m[1], text: m[2] }));
const partials = [...dbg.matchAll(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=false, text="([^"]+)"/gm)].map((m) => ({ at: ts(m[1]), text: m[2] }));
const empty = finals.filter((f) => !f.text).map((f) => {
    const lastPartial = partials.filter((p) => p.at < f.at && f.at - p.at < 12000).pop();
    const lastFinal = finals.filter((g) => g.at < f.at && g.text).pop();
    return lastPartial && (!lastFinal || lastPartial.at > lastFinal.at) ? { at: f.at, iso: f.iso, text: lastPartial.text } : null;
}).filter(Boolean);
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length > 2);
const carries = (lost, g) => { const w = norm(lost.text), t = norm(g.text).join(' '); const probe = w.slice(0, 3).join(' '); return (probe && t.includes(probe)) || w.filter((x) => t.includes(x)).length >= Math.min(3, w.length); };
let n = 0;
for (const lost of empty) {
    const in5 = finals.find((g) => g.text && g.at > lost.at && g.at - lost.at <= 5000 && carries(lost, g));
    if (in5) continue;
    n++;
    const in15 = finals.find((g) => g.text && g.at > lost.at && g.at - lost.at <= 15000 && carries(lost, g));
    console.log(`LOST ${lost.iso}  partial "${lost.text}"`);
    console.log(`  carried by a later final: ${in15 ? `${((in15.at - lost.at) / 1000).toFixed(1)} s later, "${in15.text}"` : 'none within 15 s'}`);
}
console.log(`lost utterances: ${n} (of ${empty.length} empty finals after a worded partial)`);
