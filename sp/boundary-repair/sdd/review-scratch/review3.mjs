// Throwaway (2026-09-29): the one Traw test I recommend, on the reference and on both Traw mutants.
import { createRepair as refCreate } from '../../rule-v3.mjs';

function port(mut = {}) {
    const strip = (s) => s.replace(/(\d),(\d)/g, '$1$2');
    const tok = (s) => strip(s).toLowerCase().match(/[a-z0-9']+/g) ?? [];
    const rawTok = (s) => strip(s).match(mut.rawNoApos ? /[A-Za-z0-9]+/g : /[A-Za-z0-9']+/g) ?? [];
    let lastInterim = null, cut = null;
    return {
        onTranscript(text, isFinal, atMs) {
            if (!isFinal) { lastInterim = text; return { text, restored: null }; }
            let out = text, restored = null;
            if (cut && atMs - cut.atMs <= 5000) {
                const T = cut.T, f = tok(text);
                if (f.length && f[0] !== T[0]) {
                    for (let k = 1; k <= 2 && k < T.length && !restored; k++) {
                        const m = Math.min(2, T.length - k);
                        if (f.length >= m && T.slice(k, k + m).every((w, j) => w === f[j])) restored = cut.Traw.slice(0, k);
                    }
                }
                if (restored) out = `${restored.join(' ')} ${text}`;
            }
            cut = null;
            if (lastInterim) {
                const iw = tok(lastInterim), fw = tok(text);
                if (fw.length > 0 && fw.length < iw.length) {
                    const strict = fw.every((w, i) => w === iw[i]);
                    const tolerant = !strict && fw.length >= 2 && fw.slice(0, -1).every((w, i) => w === iw[i]);
                    if (strict || tolerant) cut = { T: iw.slice(fw.length), Traw: (mut.lowerTraw ? iw : rawTok(lastInterim)).slice(fw.length), atMs };
                }
            }
            lastInterim = null;
            return { text: out, restored };
        },
    };
}
const events = [
    { text: "How'd you cut RAG hallucinations in a rag answer without just making", isFinal: false, atMs: 0 },
    { text: "How'd you cut", isFinal: true, atMs: 17 },
    { text: 'hallucinations in a rag answer without just making it refuse?', isFinal: true, atMs: 1564 },
];
const run = (r) => events.map((e) => r.onTranscript(e.text, e.isFinal, e.atMs)).pop();
const ref = run(refCreate());
console.log('reference :', JSON.stringify(ref));
console.log('base port :', JSON.stringify(run(port())));
console.log('lowerTraw :', JSON.stringify(run(port({ lowerTraw: true }))));
console.log('rawNoApos :', JSON.stringify(run(port({ rawNoApos: true }))));
