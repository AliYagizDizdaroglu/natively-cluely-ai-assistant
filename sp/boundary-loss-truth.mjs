// Throwaway, read-only: precision of an "interim repair" for Deepgram's boundary word loss. For every
// loss the scan finds (an interim I; a final F1 that is a strict word-prefix of I; the next final F2
// that resumes I after skipping >= 1 word), label it against the TRUTH — the scripted question playing
// at that moment (timeline playedAt .. playedAt + clip + 3 s):
//   TRUE    every skipped word appears in the scripted question (the repair restores spoken words);
//   FALSE   some skipped word is not in it (the repair would insert a word nobody said);
//   UNKNOWN no scripted question was playing (candidate speech, lead-ins, between items).
// Also counts finals that are strict prefixes of their interim with NO resumption in F2 (the
// repair must not fire there), to size the rule's exposure. Holdout runs reported separately.
import fs from 'node:fs';
import path from 'node:path';

const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const tok = (s) => String(s).toLowerCase().replace(/(\d),(\d)/g, '$1$2').match(/[a-z0-9']+/g) ?? [];
const unq = (s) => JSON.parse(`"${s}"`);
const tally = { holdout: { TRUE: 0, FALSE: 0, UNKNOWN: 0, noResume: 0 }, other: { TRUE: 0, FALSE: 0, UNKNOWN: 0, noResume: 0 } };

for (const dir of fs.readdirSync(RUNS).filter((d) => fs.existsSync(path.join(RUNS, d, 'natively_debug.log'))).sort()) {
    const R = path.join(RUNS, dir);
    const bucket = /h40/.test(dir) ? 'holdout' : 'other';
    let items = [];
    try { items = JSON.parse(fs.readFileSync(path.join(R, 'interview60.timeline.json'), 'utf8')).items ?? []; } catch { /* no timeline */ }
    const playing = (atMs) => items.find((i) => atMs >= i.playedAt - 500 && atMs <= i.playedAt + (i.clipSecs ?? 0) * 1000 + 3000);
    let lastInterim = null, pending = null;
    for (const l of fs.readFileSync(path.join(R, 'natively_debug.log'), 'utf8').split('\n')) {
        const m = l.match(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="((?:[^"\\]|\\.)*)"/);
        if (!m) continue;
        const text = unq(m[3]);
        if (m[2] === 'false') { lastInterim = text; continue; }
        if (pending) {
            const rest = pending.iw.slice(pending.f1.length), f2w = tok(text);
            let k = -1;
            for (let s = 1; s < rest.length; s++) {
                const n = Math.min(3, rest.length - s, f2w.length);
                if (n >= 2 && rest.slice(s, s + n).join(' ') === f2w.slice(0, n).join(' ')) { k = s; break; }
            }
            if (k > 0) {
                const lost = rest.slice(0, k);
                const item = playing(pending.atMs);
                const truth = item ? new Set(tok(item.q)) : null;
                const label = !truth ? 'UNKNOWN' : lost.every((w) => truth.has(w)) ? 'TRUE' : 'FALSE';
                tally[bucket][label]++;
                const gap = Date.parse(m[1]) - pending.atMs;
                console.log(`${bucket === 'holdout' ? 'H ' : '  '}${label.padEnd(7)} ${dir.slice(0, 19)} lost ${k} word(s) "${lost.join(' ')}" F1->F2 ${gap} ms, resume match at skip ${k} | ${item ? item.id + ': ' + item.q.slice(0, 70) : '(no item playing)'}`);
            } else tally[bucket].noResume++;
            pending = null;
        }
        if (lastInterim) {
            const iw = tok(lastInterim), fw = tok(text);
            if (fw.length > 0 && fw.length < iw.length && fw.every((w, i) => w === iw[i])) pending = { iw, f1: fw, atMs: Date.parse(m[1]) };
        }
        lastInterim = null;
    }
}
console.log('\nTALLY', JSON.stringify(tally));
