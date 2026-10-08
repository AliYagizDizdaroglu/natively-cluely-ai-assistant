// Throwaway (2026-09-29), Task 1 review. Read-only: nothing in MAIN is written.
// 0. package vs brief (verbatim claims) and fixture sha
// 1. a parametrised copy of the port; the unmutated copy must equal rule-v3.mjs on every event (calibration)
// 2. the test file's decision checks, restated, on each mutant (which survive?)
// 3. a synthetic pinning input per survivor: rule-v3.mjs's output vs the mutant's
// 4. non-holdout corpus: how often each mutant diverges from the reference on REAL Deepgram events
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRepair as refCreate } from '../../rule-v3.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BR = path.resolve(HERE, '../..');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

// ---------- 0. package vs brief ----------
const brief = fs.readFileSync(path.join(BR, 'sdd/task-1-brief.md'), 'utf8').replace(/\r\n/g, '\n');
const pkgRaw = fs.readFileSync(path.join(BR, 'sdd/task-1-review-package.txt'), 'utf8');
console.log(`package has CR bytes: ${/\r/.test(pkgRaw)}`);
const pkg = pkgRaw.replace(/\r\n/g, '\n');
function block(afterMarker) {
    const i = brief.indexOf(afterMarker);
    const s = brief.indexOf('```ts\n', i) + 6;
    const e = brief.indexOf('\n```\n', s);
    return brief.slice(s, e + 1);
}
function pkgFile(name) {
    const i = pkg.indexOf(`===== ${name} =====`);
    const j = pkg.indexOf('\n@@ ', i);
    const body = pkg.slice(pkg.indexOf('\n', j + 1) + 1);
    const lines = [];
    for (const l of body.split('\n')) { if (!l.startsWith('+')) break; lines.push(l.slice(1)); }
    return lines.join('\n') + '\n';
}
const step2 = block('**Step 2: Write the failing tests**');
const step4 = block('**Step 4: Write the pass-through skeleton');
const step6 = block('**Step 6: Implement the rule');
const wantModule = step4.slice(0, step4.indexOf('export function createBoundaryRepair')) + step6;
const gotModule = pkgFile('electron/audio/deepgramBoundaryRepair.ts');
const gotTest = pkgFile('electron/audio/deepgramBoundaryRepair.test.ts');
console.log(`module == Step4 header + Step6 body: ${gotModule === wantModule}  (sha ${sha(gotModule).slice(0, 16)}, ${Buffer.byteLength(gotModule)} bytes; STAT says 7b684f162188c932 / 5901)`);
console.log(`test   == Step2 block:               ${gotTest === step2}  (sha ${sha(gotTest).slice(0, 16)}, ${Buffer.byteLength(gotTest)} bytes; STAT says 8845563b2b7ef406 / 5749)`);
const fxBuf = fs.readFileSync(path.join(BR, 'fixtures-v3.json'));
console.log(`fixtures-v3.json sha ${sha(fxBuf).slice(0, 16)} ${fxBuf.length} bytes CR=${fxBuf.includes(13)}  (STAT says e65c6e746f821642 / 22788)`);
const fx = JSON.parse(fxBuf.toString('utf8'));

// ---------- 1. parametrised port ----------
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
        onTranscript(text, isFinal, atMs) {
            if (mut.passThrough) return { text, restored: null };
            if (!isFinal) { lastInterim = text; return { text, restored: null }; }
            let out = text, restored = null;
            const rem = cut;
            if (rem && (mut.windowLt ? atMs - rem.atMs < 5000 : atMs - rem.atMs <= 5000)) {
                const T = rem.T, f = tok(text);
                if ((mut.noFlen || f.length) && (mut.noF0Guard || f[0] !== T[0])) {
                    for (let k = 1; k <= MAXK && k < T.length && (mut.noFirstWins || !restored); k++) {
                        const m = mut.mFixed2 ? 2 : Math.min(2, T.length - k);
                        if ((mut.noFgeM || f.length >= m) && T.slice(k, k + m).every((w, j) => w === f[j])) restored = rem.Traw.slice(0, k);
                    }
                }
                if (restored) out = `${restored.join(' ')} ${text}`;
            }
            cut = null;
            if (lastInterim) {
                const iw = tok(lastInterim), fw = tok(text);
                if ((mut.noFwPos || fw.length > 0) && (mut.fwLe ? fw.length <= iw.length : fw.length < iw.length)) {
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
const MUTANTS = {
    base: {},
    // flagged survivors
    noF0Guard: { noF0Guard: true }, noTol2: { noTol2: true }, noFwPos: { noFwPos: true }, keepInterim: { keepInterim: true },
    maxK3: { maxK: 3 }, lowerTraw: { lowerTraw: true }, noStrip: { noStrip: true },
    // unflagged variants
    rawNoStrip: { rawNoStrip: true }, noApos: { noApos: true }, rawNoApos: { rawNoApos: true },
    noFirstWins: { noFirstWins: true }, mFixed2: { mFixed2: true },
    // expected equivalent
    noFlen: { noFlen: true }, noFgeM: { noFgeM: true }, fwLe: { fwLe: true },
    // expected killed (calibrates the check harness)
    windowLt: { windowLt: true }, maxK1: { maxK: 1 }, passThrough: { passThrough: true },
};

// ---------- 2. the test file's checks ----------
const lastRaw = (f) => f.events[f.events.length - 1].text;
function play(factory, events) { const r = factory(); let out = ''; for (const e of events) { const res = r.onTranscript(e.text, e.isFinal, e.atMs); if (e.isFinal) out = res.text; } return out; }
function checks(factory) {
    const fails = [];
    const eq = (name, got, want) => { if (got !== want) fails.push(name); };
    eq('symptom', play(factory, fx.symptom.events), fx.symptom.expectedF2);
    eq('seam', play(factory, fx.seam.events), fx.seam.expectedF2);
    fx.positives.forEach((f, i) => eq(`pos#${i + 1}`, play(factory, f.events), f.expectedF2));
    fx.negatives.forEach((f, i) => eq(`neg#${i + 1}`, play(factory, f.events), lastRaw(f)));
    const [I, F1, F2] = fx.symptom.events;
    eq('edge:5000', play(factory, [I, F1, { ...F2, atMs: F1.atMs + 5000 }]), fx.symptom.expectedF2);
    eq('edge:5001', play(factory, [I, F1, { ...F2, atMs: F1.atMs + 5001 }]), F2.text);
    eq('edge:notPrefix', play(factory, [I, { ...F1, text: 'How do we cut' }, F2]), F2.text);
    eq('edge:tolerant', play(factory, [I, { ...F1, text: 'How do you cat' }, F2]), fx.symptom.expectedF2);
    { const r = factory(); [['How do', false, 0], [I.text, false, 500], [I.text, true, 1000], [F2.text, true, 2000]]
        .forEach(([t, fin, at], j) => { const res = r.onTranscript(t, fin, at); if (res.text !== t || res.restored !== null) fails.push(`edge:interimOnly${j}`); }); }
    eq('edge:anyFinalClears', play(factory, [I, F1, { text: 'Okay.', isFinal: true, atMs: 500 }, F2]), F2.text);
    const m13 = fx.positives[2]; const [i, f1, f2] = m13.events;
    eq('edge:m13', play(factory, [i, f1, { text: 'as code without', isFinal: false, atMs: f1.atMs + 2 }, f2]), m13.expectedF2);
    return fails;
}
console.log('\n== 2. test checks per mutant (failing checks; [] = SURVIVES) ==');
for (const [name, mut] of Object.entries(MUTANTS)) {
    const f = checks(() => port(mut));
    console.log(`${name.padEnd(12)} ${f.length ? `KILLED by ${f.length}: ${f.slice(0, 6).join(', ')}${f.length > 6 ? ' ...' : ''}` : 'SURVIVES'}`);
}
// the reference itself through the same checks (restored:null check skipped for interims: the reference omits the key)
{
    const refLike = () => { const r = refCreate(); return { onTranscript: (t, f, a) => { const x = r.onTranscript(t, f, a); return { text: x.text, restored: x.restored ?? null }; } }; };
    console.log(`rule-v3.mjs  ${JSON.stringify(checks(refLike))}`);
}

// ---------- 3. pinning inputs ----------
const [I, F1, F2] = fx.symptom.events;
const ev = (text, isFinal, atMs) => ({ text, isFinal, atMs });
const PINS = {
    noF0Guard: [ev('How do you cut hallucinations in in a rag answer without just making', false, 0), ev('How do you cut hallucinations', true, 17), F2],
    noTol2: [I, ev('Wow.', true, 17), ev('you cut hallucinations in a rag answer without just making it refuse?', true, 1564)],
    noFwPos: [I, ev('?', true, 17), ev('you cut hallucinations in a rag answer without just making it refuse?', true, 1564)],
    keepInterim: [I, F1, ev('How do you', true, 500), F2],
    maxK3: [I, F1, ev('rag answer without just making it refuse?', true, 1564)],
    lowerTraw: [ev('How do you cut hallucinations in a RAG answer without just making', false, 0), ev('How do you cut hallucinations in a', true, 17), ev('answer without just making it refuse?', true, 1564)],
    noStrip: [ev('How do you cut 10,000 hallucinations in a rag answer', false, 0), F1, F2],
    noStrip_b: [ev('How do you cut 10,000,000 hallucinations in a rag answer', false, 0), F1, F2],
    rawNoStrip: [ev('With 10,000 users how do you cut hallucinations in a rag answer', false, 0), ev('With 10,000 users how do you cut', true, 17), F2],
    rawNoApos: [ev("What's the way you cut hallucinations in a rag answer", false, 0), ev("What's the way you cut", true, 17), F2],
    noApos: [ev("How do you cut hallucinations in a rag answer", false, 0), F1, ev("in a rag answer without just making it refuse?", true, 1564)],
};
const pinMut = { noStrip_b: MUTANTS.noStrip };
console.log('\n== 3. pinning inputs: rule-v3.mjs vs mutant (last final) ==');
for (const [name, events] of Object.entries(PINS)) {
    const refOut = play(() => refCreate(), events);
    const mutOut = play(() => port(pinMut[name] ?? MUTANTS[name]), events);
    const baseOut = play(() => port({}), events);
    console.log(`${name.padEnd(12)} ${refOut === mutOut ? 'SAME   ' : 'DIFFERS'} base==ref:${baseOut === refOut}\n   ref: ${JSON.stringify(refOut)}\n   mut: ${JSON.stringify(mutOut)}`);
}

// ---------- 4. non-holdout corpus ----------
const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const unq = (s) => JSON.parse(`"${s}"`);
const streams = [];
let holdoutSkipped = 0;
for (const dir of fs.readdirSync(RUNS).filter((d) => fs.existsSync(path.join(RUNS, d, 'natively_debug.log'))).sort()) {
    if (/h40/.test(dir)) { holdoutSkipped++; continue; }
    const evs = [];
    for (const l of fs.readFileSync(path.join(RUNS, dir, 'natively_debug.log'), 'utf8').split('\n')) {
        const m = l.match(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="((?:[^"\\]|\\.)*)"/);
        if (m && unq(m[3])) evs.push({ text: unq(m[3]), isFinal: m[2] === 'true', atMs: Date.parse(m[1]) });
    }
    streams.push({ name: dir, ev: evs });
}
const SEAM = path.join(BR, 'seam-probe');
for (const f of fs.readdirSync(SEAM).filter((f) => /^events-.*\.jsonl$/.test(f)).sort()) {
    const evs = fs.readFileSync(path.join(SEAM, f), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
        .filter((e) => e.kind === 'transcript' && e.text).map((e) => ({ text: e.text, isFinal: e.isFinal, atMs: e.at }));
    streams.push({ name: `seam ${f}`, ev: evs });
}
const nEv = streams.reduce((a, s) => a + s.ev.length, 0);
console.log(`\n== 4. corpus: ${streams.length} streams (holdout skipped: ${holdoutSkipped}), ${nEv} events ==`);
const refRepairsPerSeam = {};
for (const [name, mut] of Object.entries(MUTANTS)) {
    let outDiff = 0, cutDiff = 0; const ex = [];
    for (const s of streams) {
        const ref = refCreate(), base = port({}), mt = port(mut);
        let prevInterim = null;
        for (const e of s.ev) {
            const a = ref.onTranscript(e.text, e.isFinal, e.atMs), b = base.onTranscript(e.text, e.isFinal, e.atMs), c = mt.onTranscript(e.text, e.isFinal, e.atMs);
            if (name === 'base' && a.text !== b.text) { console.log('CALIBRATION FAIL base != ref', s.name, e.text); process.exit(1); }
            if (name === 'base' && e.isFinal && a.text !== e.text && s.name.startsWith('seam')) refRepairsPerSeam[s.name] = (refRepairsPerSeam[s.name] ?? 0) + 1;
            if (a.text !== c.text) { outDiff++; if (ex.length < 3) ex.push(`${s.name.slice(0, 26)}: ref=${JSON.stringify(a.text.slice(0, 60))} mut=${JSON.stringify(c.text.slice(0, 60))} | prevInterim=${JSON.stringify((prevInterim ?? '').slice(0, 60))}`); }
            if (e.isFinal && JSON.stringify(base.cut) !== JSON.stringify(mt.cut)) cutDiff++;
            if (!e.isFinal) prevInterim = e.text;
        }
    }
    console.log(`${name.padEnd(12)} output diffs ${String(outDiff).padStart(3)}  cut-state diffs ${String(cutDiff).padStart(4)}${ex.length ? '\n   ' + ex.join('\n   ') : ''}`);
}
console.log('reference repairs per seam recording:', JSON.stringify(refRepairsPerSeam));

// plausibility counts
const tokR = (s) => s.replace(/(\d),(\d)/g, '$1$2').toLowerCase().match(/[a-z0-9']+/g) ?? [];
const rawR = (s) => s.replace(/(\d),(\d)/g, '$1$2').match(/[A-Za-z0-9']+/g) ?? [];
let finals = 0, interims = 0, tokenless = { i: 0, f: 0 }, tokenlessTexts = new Set(), finalAfterFinal = 0, oneTokFinal = 0, oneTokDiffers = 0, oneTokEx = [];
let cuts = 0, cutStutter = 0, cutUpper = 0, cutUpperEx = [], cutDigit = 0, cutApos = 0, interimRepeat = 0, finalRepeat = 0, commaNum = 0, fmtDisagree = 0, fmtEx = [];
let restartPrefix = 0, restartEx = [];
for (const s of streams) {
    let last = null, lastInterim = null, staleInterim = null;
    for (const e of s.ev) {
        const t = tokR(e.text);
        if (/\d,\d/.test(e.text)) commaNum++;
        if (!t.length) { e.isFinal ? tokenless.f++ : tokenless.i++; tokenlessTexts.add(`${e.isFinal ? 'F' : 'I'}:${e.text}`); }
        const rep = t.some((w, i) => i > 0 && w === t[i - 1]);
        if (!e.isFinal) { interims++; if (rep) interimRepeat++; lastInterim = e.text; staleInterim = null; }
        else {
            finals++; if (rep) finalRepeat++;
            if (last && last.isFinal) {
                finalAfterFinal++;
                if (staleInterim) { const iw = tokR(staleInterim); if (t.length > 0 && t.length < iw.length && t.every((w, i) => w === iw[i])) { restartPrefix++; if (restartEx.length < 3) restartEx.push(`${JSON.stringify(staleInterim.slice(0, 50))} then final ${JSON.stringify(e.text.slice(0, 40))}`); } }
            }
            if (t.length === 1) { oneTokFinal++; if (lastInterim) { const iw = tokR(lastInterim); if (iw.length >= 2 && iw[0] !== t[0]) { oneTokDiffers++; if (oneTokEx.length < 4) oneTokEx.push(`${JSON.stringify(lastInterim.slice(0, 40))} -> ${JSON.stringify(e.text)}`); } } }
            if (lastInterim) {
                const iw = tokR(lastInterim), fw = t;
                // number formatting disagreement between the interim and its final: same tokens without the strip differ in count
                const iwN = lastInterim.toLowerCase().match(/[a-z0-9']+/g) ?? [], fwN = e.text.toLowerCase().match(/[a-z0-9']+/g) ?? [];
                const sharedNum = (lastInterim.match(/\d[\d,]*\d|\d/g) ?? []).filter((n) => (e.text.match(/\d[\d,]*\d|\d/g) ?? []).some((m) => m !== n && m.replace(/,/g, '') === n.replace(/,/g, '')));
                if (sharedNum.length) { fmtDisagree++; if (fmtEx.length < 3) fmtEx.push(`${JSON.stringify(lastInterim.slice(0, 60))} -> ${JSON.stringify(e.text.slice(0, 60))}`); }
                if (fw.length > 0 && fw.length < iw.length) {
                    const strict = fw.every((w, i) => w === iw[i]);
                    const tol = !strict && fw.length >= 2 && fw.slice(0, -1).every((w, i) => w === iw[i]);
                    if (strict || tol) {
                        cuts++;
                        const T = iw.slice(fw.length), Traw = rawR(lastInterim).slice(fw.length);
                        if (T.length >= 2 && T[0] === T[1]) cutStutter++;
                        if (Traw.slice(0, 2).some((w) => /[A-Z]/.test(w))) { cutUpper++; if (cutUpperEx.length < 4) cutUpperEx.push(Traw.slice(0, 2).join(' ')); }
                        if (T.slice(0, 3).some((w) => /\d/.test(w))) cutDigit++;
                        if (Traw.slice(0, 2).some((w) => /'/.test(w))) cutApos++;
                    }
                }
            }
            staleInterim = lastInterim ?? staleInterim; lastInterim = null;
        }
        last = e;
    }
}
console.log(`\nplausibility: interims ${interims}, finals ${finals}`);
console.log(`  token-less non-empty events: interim ${tokenless.i}, final ${tokenless.f}  e.g. ${JSON.stringify([...tokenlessTexts].slice(0, 8))}`);
console.log(`  finals directly after a final (no interim between): ${finalAfterFinal}; of those, a strict proper prefix of the stale interim: ${restartPrefix} ${JSON.stringify(restartEx)}`);
console.log(`  one-token finals ${oneTokFinal}; after an interim of >=2 tokens whose first token differs: ${oneTokDiffers} ${JSON.stringify(oneTokEx)}`);
console.log(`  reference cuts ${cuts}: T[0]==T[1] ${cutStutter}; uppercase in Traw[0..2) ${cutUpper} ${JSON.stringify(cutUpperEx)}; digit in T[0..3) ${cutDigit}; apostrophe in Traw[0..2) ${cutApos}`);
console.log(`  adjacent repeated token: interims ${interimRepeat}, finals ${finalRepeat}`);
console.log(`  events with a digit,digit number: ${commaNum}; interim->final pairs formatting the same number differently: ${fmtDisagree} ${JSON.stringify(fmtEx)}`);

// U+0130 claim: code points whose lowercase breaks tok/rawTok alignment
const bad = [];
for (let cp = 0; cp < 0x10000; cp++) {
    if (cp >= 0xd800 && cp <= 0xdfff) continue;
    const ch = String.fromCharCode(cp);
    for (const s of [ch, `a${ch}b`, `a ${ch} b`]) if (tokR(s).length !== rawR(s).length) { bad.push(cp.toString(16)); break; }
}
console.log(`\nalignment-breaking BMP code points: ${bad.join(', ')}`);
