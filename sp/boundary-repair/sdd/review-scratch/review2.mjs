// Throwaway (2026-09-29), Task 1 review, part 2: which real inputs move each survivor's cut state,
// and a calibrated pinning input per survivor (reference output asserted; the mutant must fail it).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRepair as refCreate } from '../../rule-v3.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BR = path.resolve(HERE, '../..');
const fx = JSON.parse(fs.readFileSync(path.join(BR, 'fixtures-v3.json'), 'utf8'));

function port(mut = {}) {
    const strip = (s) => s.replace(/(\d),(\d)/g, '$1$2');
    const tokRe = mut.noApos ? /[a-z0-9]+/g : /[a-z0-9']+/g;
    const rawRe = (mut.noApos || mut.rawNoApos) ? /[A-Za-z0-9]+/g : /[A-Za-z0-9']+/g;
    const tok = (s) => (mut.noStrip ? s : strip(s)).toLowerCase().match(tokRe) ?? [];
    const rawTok = (s) => ((mut.noStrip || mut.rawNoStrip) ? s : strip(s)).match(rawRe) ?? [];
    const MAXK = mut.maxK ?? 2;
    let lastInterim = null, cut = null;
    return {
        get cut() { return cut; },
        get lastInterim() { return lastInterim; },
        onTranscript(text, isFinal, atMs) {
            if (!isFinal) { lastInterim = text; return { text, restored: null }; }
            let out = text, restored = null;
            const rem = cut;
            if (rem && atMs - rem.atMs <= 5000) {
                const T = rem.T, f = tok(text);
                if (f.length && (mut.noF0Guard || f[0] !== T[0])) {
                    for (let k = 1; k <= MAXK && k < T.length && (mut.noFirstWins || !restored); k++) {
                        const m = mut.mFixed2 ? 2 : Math.min(2, T.length - k);
                        if (f.length >= m && T.slice(k, k + m).every((w, j) => w === f[j])) restored = rem.Traw.slice(0, k);
                    }
                }
                if (restored) out = `${restored.join(' ')} ${text}`;
            }
            cut = null;
            if (lastInterim) {
                const iw = tok(lastInterim), fw = tok(text);
                if ((mut.noFwPos || fw.length > 0) && fw.length < iw.length) {
                    const strict = fw.every((w, i) => w === iw[i]);
                    const tolerant = !strict && (mut.noTol2 || fw.length >= 2) && fw.slice(0, -1).every((w, i) => w === iw[i]);
                    if (strict || tolerant) cut = { T: iw.slice(fw.length), Traw: (mut.lowerTraw ? iw : rawTok(lastInterim)).slice(fw.length), atMs };
                }
            }
            if (!mut.keepInterim) lastInterim = null;
            return { text: out, restored };
        },
    };
}

// ---- real inputs that move the cut state (non-holdout logs + seam) ----
const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const unq = (s) => JSON.parse(`"${s}"`);
const streams = [];
for (const dir of fs.readdirSync(RUNS).filter((d) => fs.existsSync(path.join(RUNS, d, 'natively_debug.log'))).sort()) {
    if (/h40/.test(dir)) continue;
    const evs = [];
    for (const l of fs.readFileSync(path.join(RUNS, dir, 'natively_debug.log'), 'utf8').split('\n')) {
        const m = l.match(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="((?:[^"\\]|\\.)*)"/);
        if (m && unq(m[3])) evs.push({ text: unq(m[3]), isFinal: m[2] === 'true', atMs: Date.parse(m[1]) });
    }
    streams.push({ name: dir, ev: evs });
}
const SEAM = path.join(BR, 'seam-probe');
for (const f of fs.readdirSync(SEAM).filter((f) => /^events-.*\.jsonl$/.test(f)).sort()) {
    streams.push({ name: `seam ${f}`, ev: fs.readFileSync(path.join(SEAM, f), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
        .filter((e) => e.kind === 'transcript' && e.text).map((e) => ({ text: e.text, isFinal: e.isFinal, atMs: e.at })) });
}
for (const [name, mut] of Object.entries({ noStrip: { noStrip: true }, rawNoApos: { rawNoApos: true }, lowerTraw: { lowerTraw: true } })) {
    const ex = [];
    for (const s of streams) {
        const base = port({}), mt = port(mut);
        for (const e of s.ev) {
            const li = base.lastInterim;
            base.onTranscript(e.text, e.isFinal, e.atMs); mt.onTranscript(e.text, e.isFinal, e.atMs);
            if (e.isFinal && JSON.stringify(base.cut) !== JSON.stringify(mt.cut) && ex.length < 3)
                ex.push(`I=${JSON.stringify((li ?? '').slice(0, 70))} F1=${JSON.stringify(e.text.slice(0, 50))} Traw base=${JSON.stringify(base.cut?.Traw.slice(0, 2))} mut=${JSON.stringify(mt.cut?.Traw.slice(0, 2))} T base=${JSON.stringify(base.cut?.T.slice(0, 2))} mut=${JSON.stringify(mt.cut?.T.slice(0, 2))}`);
        }
    }
    console.log(`${name}:\n   ${ex.join('\n   ')}`);
}
// cuts by class, and how often the f[0] guard's repetition shapes occur
{
    let cuts = 0, normal = 0, rep1 = 0, rep2 = 0, normalRep = 0;
    for (const s of streams) {
        const r = port({});
        let pending = null;
        for (const e of s.ev) {
            if (e.isFinal && pending) {
                const f = (e.text.replace(/(\d),(\d)/g, '$1$2').toLowerCase().match(/[a-z0-9']+/g) ?? []);
                if (e.atMs - pending.atMs <= 5000 && f[0] === pending.T[0]) { normal++; if (pending.T[1] === pending.T[0] || pending.T[2] === pending.T[0]) normalRep++; }
            }
            r.onTranscript(e.text, e.isFinal, e.atMs);
            if (e.isFinal) { pending = r.cut; if (pending) { cuts++; if (pending.T[1] === pending.T[0]) rep1++; if (pending.T[2] === pending.T[0]) rep2++; } }
        }
    }
    console.log(`cuts ${cuts}; NORMAL (next final within 5 s starts with T[0]) ${normal}; T[0]==T[1] ${rep1}; T[0]==T[2] ${rep2}; NORMAL with either repetition ${normalRep}`);
}

// ---- calibrated pinning inputs: assert the reference's output; the mutant must fail ----
const [I, F1, F2] = fx.symptom.events;
const ev = (text, isFinal, atMs) => ({ text, isFinal, atMs });
const play = (factory, events) => { const r = factory(); let out = ''; for (const e of events) { const res = r.onTranscript(e.text, e.isFinal, e.atMs); if (e.isFinal) out = res.text; } return out; };
const PROPOSED = [
    ['f[0] guard, adjacent repeat', { noF0Guard: true }, [ev('How do you cut hallucinations in in a rag answer without just making', false, 0), ev('How do you cut hallucinations', true, 17), F2]],
    ['f[0] guard, repeat at distance 2', { noF0Guard: true }, [ev('How do you cut the model the data in a rag answer', false, 0), ev('How do you cut', true, 17), ev('the data in a rag answer without just making it refuse?', true, 1564)]],
    ['tolerant needs |F1| >= 2', { noTol2: true }, [I, ev('Wow.', true, 17), ev('you cut hallucinations in a rag answer without just making it refuse?', true, 1564)]],
    ['token-less final is no cut', { noFwPos: true }, [I, ev('?', true, 17), ev('you cut hallucinations in a rag answer without just making it refuse?', true, 1564)]],
    ['final clears lastInterim', { keepInterim: true }, [I, F1, ev('How do you', true, 500), F2]],
    ['k <= 2 (3-word skip)', { maxK: 3 }, [I, F1, ev('rag answer without just making it refuse?', true, 1564)]],
    ['Traw spelling + alignment', { lowerTraw: true }, [ev("What's the way you'd cut RAG hallucinations in a rag answer", false, 0), ev("What's the way you'd cut", true, 17), ev('hallucinations in a rag answer without just making it refuse?', true, 1564)]],
    ['Traw spelling + alignment', { rawNoApos: true }, [ev("What's the way you'd cut RAG hallucinations in a rag answer", false, 0), ev("What's the way you'd cut", true, 17), ev('hallucinations in a rag answer without just making it refuse?', true, 1564)]],
    ['apostrophe in tokens (lost contraction)', { noApos: true }, [ev("How do you cut it's hallucinations in a rag answer", false, 0), F1, ev('hallucinations in a rag answer without just making it refuse?', true, 1564)]],
    ['thousands strip (lost number)', { noStrip: true }, [ev('How do you cut 10,000 hallucinations in a rag answer', false, 0), F1, ev('hallucinations in a rag answer without just making it refuse?', true, 1564)]],
    ['m = min(2, available), 1-token F2', { mFixed2: true }, [ev('How do you cut hallucinations today', false, 0), F1, ev('Today?', true, 1564)]],
];
console.log('\nproposed pinning inputs (reference output = what the test asserts):');
for (const [label, mut, events] of PROPOSED) {
    const ref = play(() => refCreate(), events), base = play(() => port({}), events), mt = play(() => port(mut), events);
    console.log(`${(ok(ref === base && mt !== ref))} ${label.padEnd(40)} ${JSON.stringify(mut)}\n      assert: ${JSON.stringify(ref)}\n      mutant: ${JSON.stringify(mt)}`);
}
function ok(b) { return b ? 'PINS ' : 'NO!  '; }
