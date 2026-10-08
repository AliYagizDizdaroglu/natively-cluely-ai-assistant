// Re-review of the v4 revision, part 1: the M2 guard, independently of check-v4.mjs.
//  A. The regex on characters: which non-ASCII characters it takes as letters (refuses) and which it ignores.
//  B. Where it is evaluated: at cut time, on the LATEST interim only (not F1, not F2, not an older interim,
//     not at repair time).
//  C. Cost on the data: every non-empty text in all 28 logs + both seam recordings; rule-v4 vs rule-v4 WITHOUT the
//     guard (a local copy differing only there) under the adapter feed; repairs per kind; and the non-ASCII
//     characters that DO occur (to see what the guard must not trip on).
//  D. The Russian / Spanish probes on the revised rule (DESIGN §5 says Russian "passes both" guards).
import fs from 'node:fs';
import path from 'node:path';
import * as v4 from '../../rule-v4.mjs';
const RE = v4.NON_ASCII_LETTER;
console.log(`regex: ${RE}`);
// ---- A
const chars = {
    'ignored? (punctuation/symbols)': ['\u2019', '\u2018', '\u201C', '\u201D', '\u2013', '\u2014', '\u2026', '\u2022', '\u00B7', '\u00A0', '\u00B0', '\u20AC', '\u00A3', '\u00A9', '\u2122', '\u00D7', '\u00BD', '\u00B2', '\u00A7', '\u2192', '\u{1F600}', '\u200D', '\u200B', '\uFEFF'],
    'refused? (letters/marks)': ['\u00E9', '\u00FC', '\u00DF', '\u0130', '\u0131', '\u00F1', '\u00E7', '\u00F8', '\u0434', '\u03B1', '\u4E2D', '\u0628', '\u0301', '\u00B5', '\u00AA', '\uFB01', '\u02BC', '\uFE0F'],
};
for (const [k, list] of Object.entries(chars)) console.log(`${k}: ${list.map((c) => `U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}=${RE.test(`a${c}b`) ? 'REFUSED' : 'ok'}`).join(' ')}`);
console.log(`plain ASCII sentence with digits/%/$/&/apostrophe: ${RE.test("It's 92% of $10,000 & A/B — no") ? 'REFUSED' : 'ok'} (the em dash is inside)`);
// ---- B
const run = (events) => { const r = v4.createRepair(); let out = null; for (const [t, f, at, sf, clear] of events) { if (clear) { r.clear(); continue; } const o = r.onTranscript(t, f, at, sf); if (f) out = o; } return out.restored; };
const I = 'How do you cut hallucinations in a rag answer without just making', F1 = 'How do you cut', F2 = 'in a rag answer without just making it refuse?';
const cases = [
    ['control: ASCII interim -> restores', [[I, false, 0], [F1, true, 17], [F2, true, 1564]], ['hallucinations']],
    ['non-ASCII in the LATEST interim -> no cut', [[I.replace('rag', 'rág'), false, 0], [F1, true, 17], [F2, true, 1564]], null],
    ['non-ASCII only in an OLDER interim -> the latest decides (restores)', [['How do you cut hallucinatións', false, 0], [I, false, 10], [F1, true, 17], [F2, true, 1564]], ['hallucinations']],
    ['non-ASCII letter only in F1 (final) -> not the guard\'s business (restores)', [[I, false, 0], ['How do you cut \u00E9', true, 17], [F2, true, 1564]], ['hallucinations']],
    ['non-ASCII only in F2 -> still repaired (guard is at cut time)', [[I, false, 0], [F1, true, 17], ['in a rag answer without just making it refusé?', true, 1564]], ['hallucinations']],
    ['non-ASCII interim BETWEEN F1 and F2 -> the remembered cut still repairs', [[I, false, 0], [F1, true, 17], ['in a rág answer', false, 900], [F2, true, 1564]], ['hallucinations']],
    ['curly apostrophe + em dash in the interim -> not refused (restores)', [['How do you cut hallucinations in a rag answer — the model’s', false, 0], [F1, true, 17], ['in a rag answer — the model’s job?', true, 1564]], ['hallucinations']],
];
for (const [label, ev, want] of cases) { const got = run(ev); console.log(`${JSON.stringify(got) === JSON.stringify(want) ? 'PASS' : 'FAIL'}  ${label}: got ${JSON.stringify(got)}`); }
// ---- C
const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const SEAM = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '../../seam-probe');
const unq = (s) => JSON.parse(`"${s}"`);
const streams = [];
for (const dir of fs.readdirSync(RUNS).filter((d) => fs.existsSync(path.join(RUNS, d, 'natively_debug.log')))) {
    const ev = [];
    for (const l of fs.readFileSync(path.join(RUNS, dir, 'natively_debug.log'), 'utf8').split('\n')) {
        const m = l.match(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="((?:[^"\\]|\\.)*)"/);
        if (m) { ev.push({ text: m[3] === '(empty)' ? '' : unq(m[3]), isFinal: m[2] === 'true', at: Date.parse(m[1]), sf: false }); continue; }
        if (/ \[LOG\] \[Main\] turn: deepgram utterance-end /.test(l)) ev.push({ ue: true });
    }
    streams.push({ kind: /h40/.test(dir) ? 'holdout' : 'other', ev });
}
for (const f of fs.readdirSync(SEAM).filter((f) => /^events-.*\.jsonl$/.test(f))) {
    const ev = [];
    for (const l of fs.readFileSync(path.join(SEAM, f), 'utf8').split('\n').filter(Boolean)) {
        const e = JSON.parse(l);
        if (e.kind === 'transcript') ev.push({ text: e.text, isFinal: e.isFinal, at: e.at, sf: e.speechFinal === true });
        if (e.kind === 'utterance-end') ev.push({ ue: true });
    }
    streams.push({ kind: 'seam', ev });
}
// a local copy of rule-v4 with the guard switchable (everything else verbatim)
const norm = (s) => String(s).replace(/(\d),(\d)/g, '$1$2');
const rawTok = (s) => norm(s).match(/[A-Za-z0-9']+/g) ?? [];
function makeLocal(guard) {
    let lastInterim = null, cut = null;
    return {
        clear() { cut = null; lastInterim = null; },
        onTranscript(text, isFinal, atMs, speechFinal = false) {
            if (!isFinal) { lastInterim = text; return { text, restored: null }; }
            let out = text, restored = null;
            if (cut && atMs - cut.atMs <= v4.WINDOW_MS) {
                const T = cut.T, f = v4.tok(text);
                if (f.length && f[0] !== T[0]) for (let k = 1; k <= 2 && k < T.length && !restored; k++) { const m = Math.min(2, T.length - k); if (f.length >= m && T.slice(k, k + m).every((w, j) => w === f[j])) restored = cut.Traw.slice(0, k); }
                if (restored) out = `${restored.join(' ')} ${text}`;
            }
            cut = null;
            if (lastInterim && !speechFinal && (!guard || !RE.test(lastInterim))) {
                const iw = v4.tok(lastInterim), fw = v4.tok(text), raw = rawTok(lastInterim);
                if (fw.length > 0 && fw.length < iw.length && raw.length === iw.length) {
                    const strict = fw.every((w, i) => w === iw[i]);
                    const tolerant = !strict && fw.length >= 2 && fw.slice(0, -1).every((w, i) => w === iw[i]) && v4.respelling(fw[fw.length - 1], iw[fw.length - 1]);
                    if (strict || tolerant) cut = { T: iw.slice(fw.length), Traw: raw.slice(fw.length), atMs };
                }
            }
            lastInterim = null;
            return { text: out, restored };
        },
    };
}
const feed = (make, ev) => { const r = make(); return ev.map((e) => { if (e.ue) { r.clear(); return null; } if (!e.text) { if (e.isFinal) r.clear(); return null; } return r.onTranscript(e.text, e.isFinal, e.at, e.sf).text; }); };
let texts = { other: 0, holdout: 0, seam: 0 }, hits = { other: 0, holdout: 0, seam: 0 }, diff = 0, localDiff = 0;
const reps = { other: 0, holdout: 0, seam: 0 };
const nonAsciiChars = new Map();
for (const s of streams) {
    for (const e of s.ev) if (e.text) {
        texts[s.kind]++; if (RE.test(e.text)) hits[s.kind]++;
        for (const ch of e.text) if (ch.codePointAt(0) > 0x7f) nonAsciiChars.set(ch, (nonAsciiChars.get(ch) ?? 0) + 1);
    }
    const a = feed(v4.createRepair, s.ev), b = feed(() => makeLocal(false), s.ev), c = feed(() => makeLocal(true), s.ev);
    a.forEach((x, i) => { if (x !== b[i]) diff++; if (x !== c[i]) localDiff++; if (x !== null && x !== s.ev[i].text) reps[s.kind]++; });
}
console.log(`\ntexts with a guard hit: logs non-holdout ${hits.other}/${texts.other}, holdout ${hits.holdout}/${texts.holdout}, seam ${hits.seam}/${texts.seam}`);
console.log(`non-ASCII characters present in any transcript (all kinds): ${nonAsciiChars.size ? [...nonAsciiChars].map(([c, n]) => `U+${c.codePointAt(0).toString(16).toUpperCase()} x${n}`).join(', ') : 'none'}`);
console.log(`rule-v4 vs the same rule WITHOUT the guard: ${diff} of the events differ; vs my local copy WITH it: ${localDiff} (must be 0: the copy is faithful); rule-v4 repairs non-holdout ${reps.other} / holdout ${reps.holdout} / seam ${reps.seam}`);
// ---- D
for (const [label, I2, F12, F22] of [
    ['Russian with Latin names (DESIGN §5: "passes both and is still mangled by the module alone")', 'Мы используем Kafka, для кэша Redis и S3 для файлов', 'Мы используем Kafka, для кэша', 'Редис и S3 для файлов.'],
    ['Spanish with an accent in the interim', 'Cuéntame sobre la migración de datos que hiciste', 'Cuéntame sobre la', 'de datos que hiciste?'],
    ['Spanish WITHOUT any accent (module alone, gate needed)', 'dime como manejas los datos que se pierden en el pipeline', 'Dime como manejas', 'datos que se pierden en el pipeline?'],
    ['Indonesian (the plan\'s gate test strings, module alone)', 'bagaimana cara anda menangani data yang hilang di pipeline', 'Bagaimana cara Anda', 'data yang hilang di pipeline?'],
]) { const r = v4.createRepair(); r.onTranscript(I2, false, 0); r.onTranscript(F12, true, 100); const o = r.onTranscript(F22, true, 2100); console.log(`${label}: ${o.restored ? `RESTORED ${JSON.stringify(o.restored)} -> ${JSON.stringify(o.text)}` : 'unchanged'}`); }
