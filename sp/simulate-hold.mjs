// THROWAWAY simulation: replay after9's real detection sequence under hold policies, and
// count how many roster items end up with TWO answers (the doubles we are trying to remove)
// and how much later the first answer goes out (the latency we are paying).
//
// Policies:
//   current   hold only when the text starts with a conjunction; fixed 2500ms timeout
//   keepalive same trigger, but the timer restarts on every interviewer final
//   +punct    also hold text that does not end on ? or .
//   +punct6s  the same, with a 6000ms post-silence fallback (Live's measured lag on long
//             questions is 3.3-5.3s, so 2500 cannot let the whole question win the race)
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const D = path.join(ROOT, 'electron/test/golden/interview60.runs/2026-09-08T08-44-56-after9');
const log = fs.readFileSync(path.join(D, 'natively_debug.log'), 'utf8').split('\n');
const items = JSON.parse(fs.readFileSync(path.join(D, 'interview60.timeline.json'), 'utf8')).items
    .filter((i) => (i.kind ?? 'spoken') === 'spoken' && i.playedAt && i.clipSecs);

const finals = [];
for (const l of log) {
    const m = l.match(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=true, text="((?:[^"\\]|\\.)*)"$/);
    if (!m) continue;
    let t; try { t = JSON.parse('"' + m[2] + '"'); } catch { t = m[2]; }
    if (t.trim()) finals.push(Date.parse(m[1]));
}

// Every detection that reached dispatchDetection, in order, with what the app did.
const events = [];
for (const l of log) {
    const m = l.match(/^(\S+) \[LOG\] \[Main\] dispatch: (answer|chip|drop|hold|extend) source=(live|whisper) .*? question=("(?:[^"\\]|\\.)*")$/);
    if (m) events.push({ at: Date.parse(m[1]), action: m[2], src: m[3], q: JSON.parse(m[4]) });
}

const CONJ = /^(and|so|but|or|then|because)\b/i;
const incomplete = (q) => !/[?.!]["')\]]*\s*$/.test(q.trim());
const owner = (at) => items.find((i) => at >= i.playedAt - 2000 && at <= i.playedAt + i.clipSecs * 1000 + 15000);
const nextFinalAfter = (t) => finals.find((f) => f > t);

function simulate({ usePunct, holdMs, keepAlive }) {
    // Answers that actually leave, per item. A held detection leaves at its release time
    // unless something complete for the same item left first (the deduper would then drop it).
    const out = new Map();
    const emit = (id, at) => { if (!out.has(id)) out.set(id, []); out.get(id).push(at); };
    for (const e of events) {
        if (e.action !== 'answer' && e.action !== 'extend' && e.action !== 'hold') continue;
        const it = owner(e.at);
        if (!it) continue;
        const held = CONJ.test(e.q.trim()) || (usePunct && incomplete(e.q));
        if (!held) { emit(it.id, e.at); continue; }
        // Release: holdMs after the last final, if keepAlive; otherwise holdMs after the offer.
        let release = e.at + holdMs;
        if (keepAlive) {
            let t = e.at;
            for (;;) { const f = nextFinalAfter(t); if (f === undefined || f > t + holdMs) break; t = f; }
            release = t + holdMs;
        }
        emit(it.id, release);
    }
    // Two answers more than 2s apart for one item = a double the reader sees.
    let doubles = 0, delayed = 0, totalDelay = 0;
    for (const [, times] of out) {
        const s = times.sort((a, b) => a - b);
        const distinct = s.filter((t, i) => i === 0 || t - s[i - 1] > 2000);
        if (distinct.length >= 2) doubles++;
    }
    return { doubles, items: out.size };
}

const base = simulate({ usePunct: false, holdMs: 2500, keepAlive: false });
console.log('policy                                   items with >=2 answers');
console.log('  current (conjunction, fixed 2500)        ' + base.doubles + ' of ' + base.items);
for (const [name, cfg] of [
    ['keepalive only                          ', { usePunct: false, holdMs: 2500, keepAlive: true }],
    ['+ punctuation trigger, 2500              ', { usePunct: true, holdMs: 2500, keepAlive: true }],
    ['+ punctuation trigger, 6000              ', { usePunct: true, holdMs: 6000, keepAlive: true }],
    ['punctuation trigger, NO keepalive, 2500  ', { usePunct: true, holdMs: 2500, keepAlive: false }],
]) {
    const r = simulate(cfg);
    console.log('  ' + name + ' ' + r.doubles + ' of ' + r.items);
}
