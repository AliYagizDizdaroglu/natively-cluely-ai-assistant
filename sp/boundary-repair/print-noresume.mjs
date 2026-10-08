// Throwaway, read-only: print the first N "cut with NO resumption" sequences of one run log, with
// the exact I / F1 / (interims between) / F2 strings, so a real negative fixture can be copied
// into the unit tests. Same detection as boundary-loss-truth.mjs.
import fs from 'node:fs';
const [, , log, limit = '6'] = process.argv;
const tok = (s) => String(s).toLowerCase().replace(/(\d),(\d)/g, '$1$2').match(/[a-z0-9']+/g) ?? [];
const unq = (s) => JSON.parse(`"${s}"`);
let lastInterim = null, pending = null, printed = 0;
for (const l of fs.readFileSync(log, 'utf8').split('\n')) {
    const m = l.match(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="((?:[^"\\]|\\.)*)"/);
    if (!m) continue;
    const text = unq(m[3]);
    if (m[2] === 'false') { lastInterim = text; if (pending) pending.between.push(text); continue; }
    if (pending) {
        const rest = pending.iw.slice(pending.f1.length), f2w = tok(text);
        let k = -1;
        for (let s = 1; s < rest.length; s++) {
            const n = Math.min(3, rest.length - s, f2w.length);
            if (n >= 2 && rest.slice(s, s + n).join(' ') === f2w.slice(0, n).join(' ')) { k = s; break; }
        }
        if (k < 0 && printed < Number(limit)) {
            printed++;
            const n0 = Math.min(3, rest.length, f2w.length);
            const continues = n0 >= 2 && rest.slice(0, n0).join(' ') === f2w.slice(0, n0).join(' ');
            console.log(`${continues ? 'CONTINUES' : 'UNRELATED'} F1@${pending.at} F2@${m[1]} gap ${Date.parse(m[1]) - Date.parse(pending.at)} ms`);
            console.log(`  I : ${JSON.stringify(pending.i)}`);
            console.log(`  F1: ${JSON.stringify(pending.f1t)}`);
            for (const b of pending.between) console.log(`  i : ${JSON.stringify(b)}`);
            console.log(`  F2: ${JSON.stringify(text)}`);
        }
        pending = null;
    }
    if (lastInterim) {
        const iw = tok(lastInterim), fw = tok(text);
        if (fw.length > 0 && fw.length < iw.length && fw.every((w, i) => w === iw[i])) pending = { iw, f1: fw, i: lastInterim, f1t: text, at: m[1], between: [] };
    }
    lastInterim = null;
}
