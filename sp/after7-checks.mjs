// Throwaway: after7 report-time checks — (1) classify the empty Deepgram finals the
// stt row counts as "lost utterances": inside a clip's play window or in a gap;
// (2) items with more than one answer dispatch (the 2 doubles); (3) delivered
// answer length by question level. usage: node after7-checks.mjs <runDir>
import fs from 'node:fs';
import path from 'node:path';

const R = process.argv[2];
const dbg = fs.readFileSync(path.join(R, 'natively_debug.log'), 'utf8');
const tl = JSON.parse(fs.readFileSync(path.join(R, 'interview60.timeline.json'), 'utf8')).items;
const pairs = JSON.parse(fs.readFileSync(path.join(R, 'interview60.judge.pairs.json'), 'utf8'));
const items = pairs.items ?? Object.values(pairs).find(Array.isArray);

const inClip = (t) => tl.find((i) => t >= i.playedAt - 500 && t <= i.playedAt + Math.round((i.clipSecs ?? 0) * 1000) + 1500);
const lines = dbg.split('\n');

// (1) empty finals
const finals = [];
for (const l of lines) {
    const m = /^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="(.*)"$/.exec(l);
    if (m) finals.push({ at: Date.parse(m[1]), isFinal: m[2] === 'true', text: m[3] });
}
const empties = finals.filter((f) => f.isFinal && f.text === '');
let inside = 0, gap = 0, afterInterim = 0;
for (let i = 0; i < finals.length; i++) {
    const f = finals[i];
    if (!(f.isFinal && f.text === '')) continue;
    const clip = inClip(f.at);
    if (clip) inside++; else gap++;
    // was there a non-empty interim since the last non-empty final? (speech that never got a final)
    let j = i - 1, sawInterim = false;
    while (j >= 0 && !(finals[j].isFinal && finals[j].text)) { if (!finals[j].isFinal && finals[j].text) sawInterim = true; j--; }
    if (sawInterim) afterInterim++;
}
console.log(`(1) empty finals: ${empties.length} — inside a clip window ${inside}, in a gap ${gap}; preceded by an interim with text since the last non-empty final: ${afterInterim}`);
const totalFinals = finals.filter((f) => f.isFinal).length;
console.log(`    finals total ${totalFinals}, non-empty ${totalFinals - empties.length}, interims ${finals.filter((f) => !f.isFinal).length}`);

// (2) doubles
const DISPATCH = /^(\S+) \[LOG\] \[Main\] dispatch: (answer|chip|drop|hold) source=(live|whisper) anchor="((?:[^"\\]|\\.)*)" verdict=(\w+)(?: duplicateOf=(\w+) answered=(true|false))?(?: reason=(\w+))?(?: question=("(?:[^"\\]|\\.)*"))?/;
const answers = [];
for (const l of lines) { const m = DISPATCH.exec(l); if (m && m[2] === 'answer') answers.push({ at: Date.parse(m[1]), source: m[3], q: m[9] ? JSON.parse(m[9]) : JSON.parse('"' + m[4] + '"') }); }
const byItem = new Map();
for (const a of answers) {
    let best = null; for (const it of tl) { if (it.playedAt <= a.at + 2000 && (!best || it.playedAt > best.playedAt)) best = it; }
    const id = best?.id ?? '?'; (byItem.get(id) ?? byItem.set(id, []).get(id)).push(a);
}
console.log('(2) items with more than one answer dispatch:');
for (const [id, arr] of byItem) if (arr.length > 1) for (const a of arr) console.log(`    ${id} ${new Date(a.at).toISOString().slice(11, 19)} [${a.source}] ${JSON.stringify(a.q.slice(0, 90))}`);

// (3) length by level (delivered text from the pairs file; first key per item only)
const byLevel = {};
for (const it of items) { if (!/^[WMH]\d\d$/.test(it.key)) continue; const w = (it.answer ?? '').match(/\S+/g)?.length ?? 0; (byLevel[it.key[0]] ??= []).push(w); }
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor((s.length - 1) * p)]; };
console.log('(3) delivered words by level (after6 hour: W 71 / M 67 / H 50; uncut arms 59 / 61 / 66):');
for (const [l, a] of Object.entries(byLevel)) console.log(`    ${l}: n=${a.length} p50 ${q(a, .5)} p90 ${q(a, .9)} max ${Math.max(...a)} over80 ${a.filter((x) => x > 80).length}`);
