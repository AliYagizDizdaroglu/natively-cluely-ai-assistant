// Throwaway: are the harness's 27 "lost utterances" (an empty Deepgram final that
// follows an interim with text, with no non-empty final in between) really lost?
// For each, look for a non-empty final within 5 s AFTER the empty final that carries
// the interim's words (Deepgram closes a silent segment with an empty final before it
// finalizes the next one). usage: node after7-lost.mjs <runDir>
import fs from 'node:fs';
import path from 'node:path';
const R = process.argv[2];
const lines = fs.readFileSync(path.join(R, 'natively_debug.log'), 'utf8').split('\n');
const ev = [];
for (const l of lines) {
    const m = /^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="(.*)"$/.exec(l);
    if (m) ev.push({ at: Date.parse(m[1]), isFinal: m[2] === 'true', text: m[3] });
}
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
let lost = 0, resolved = 0, rows = [];
for (let i = 0; i < ev.length; i++) {
    const f = ev[i];
    if (!(f.isFinal && f.text === '')) continue;
    let j = i - 1, lastInterim = null;
    while (j >= 0 && !(ev[j].isFinal && ev[j].text)) { if (!ev[j].isFinal && ev[j].text && !lastInterim) lastInterim = ev[j]; j--; }
    if (!lastInterim) continue;
    const words = norm(lastInterim.text).split(' ').filter((w) => w.length > 2);
    const probe = words.slice(0, 3).join(' ');
    const later = ev.slice(i + 1).filter((e) => e.isFinal && e.text && e.at - f.at <= 5000);
    const hit = later.find((e) => probe && norm(e.text).includes(probe)) ?? later.find((e) => words.filter((w) => norm(e.text).includes(w)).length >= Math.min(3, words.length));
    if (hit) resolved++; else { lost++; rows.push(`${new Date(f.at).toISOString().slice(11, 19)} interim=${JSON.stringify(lastInterim.text.slice(0, 70))} next finals: ${later.slice(0, 2).map((e) => JSON.stringify(e.text.slice(0, 40))).join(' | ') || '(none within 5 s)'}`); }
}
console.log(`empty-final-after-interim: ${lost + resolved}; resolved by a later final within 5 s: ${resolved}; unresolved (genuinely lost speech): ${lost}`);
for (const r of rows) console.log('  ' + r);
