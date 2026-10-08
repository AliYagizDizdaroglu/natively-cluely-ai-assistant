// Throwaway (2026-09-29): what each spec-review fix costs in repairs. Runs rule-v3 and candidate variants over
// every run log (holdout reported separately) and both seam recordings, and prints each variant's repairs that
// differ from v3's. Variants:
//   strict    : no tolerant cut at all
//   digit     : tolerant cut refused when F1's last token contains a digit (smart_format number merges)
//   digitcat  : digit + refused when F1's last token starts with the interim token at that position and is
//               longer (a compound merge: "alright" over "all right")
//   pause     : v3 + an EMPTY final clears the cut (seam: also speech_final on F1, and UtteranceEnd)
//   align     : v3 + refuse a cut when rawTok and tok counts differ (v2's guard)
import fs from 'node:fs';
import path from 'node:path';
const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const SEAM = new URL('./seam-probe/', import.meta.url);
const unq = (s) => JSON.parse(`"${s}"`);
const norm = (s) => String(s).replace(/(\d),(\d)/g, '$1$2');
const tok = (s) => norm(s).toLowerCase().match(/[a-z0-9']+/g) ?? [];
const rawTok = (s) => norm(s).match(/[A-Za-z0-9']+/g) ?? [];

function make(v) {
    let lastInterim = null, cut = null;
    return {
        clear() { cut = null; lastInterim = null; },
        on(text, isFinal, atMs, speechFinal) {
            if (!isFinal) { lastInterim = text; return null; }
            if (!text) { if (v === 'pause') { cut = null; lastInterim = null; } return null; }
            let restored = null;
            if (cut && atMs - cut.atMs <= 5000) {
                const T = cut.T, f = tok(text);
                if (f.length && f[0] !== T[0]) {
                    for (let k = 1; k <= 2 && k < T.length && !restored; k++) {
                        const m = Math.min(2, T.length - k);
                        if (f.length >= m && T.slice(k, k + m).every((w, j) => w === f[j])) restored = cut.Traw.slice(0, k);
                    }
                }
            }
            cut = null;
            if (lastInterim && !(v === 'pause' && speechFinal)) {
                const iw = tok(lastInterim), fw = tok(text);
                if (fw.length > 0 && fw.length < iw.length) {
                    const strict = fw.every((w, i) => w === iw[i]);
                    const last = fw[fw.length - 1], atPos = iw[fw.length - 1];
                    let tolerant = !strict && fw.length >= 2 && fw.slice(0, -1).every((w, i) => w === iw[i]);
                    if (v === 'strict') tolerant = false;
                    if ((v === 'digit' || v === 'digitcat') && /\d/.test(last)) tolerant = false;
                    if (v === 'digitcat' && last.startsWith(atPos) && last.length > atPos.length) tolerant = false;
                    const raw = rawTok(lastInterim);
                    const aligned = v !== 'align' || raw.length === iw.length;
                    if ((strict || tolerant) && aligned) cut = { T: iw.slice(fw.length), Traw: raw.slice(fw.length), atMs };
                }
            }
            lastInterim = null;
            return restored ? restored.join(' ') : null;
        },
    };
}
const streams = [];
for (const dir of fs.readdirSync(RUNS).filter((d) => fs.existsSync(path.join(RUNS, d, 'natively_debug.log'))).sort()) {
    const ev = [];
    for (const l of fs.readFileSync(path.join(RUNS, dir, 'natively_debug.log'), 'utf8').split('\n')) {
        const m = l.match(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="((?:[^"\\]|\\.)*)"/);
        // (empty) is how the adapter logs an empty transcript: keep empties so the pause variant sees them
        if (m) ev.push({ text: m[3] === '(empty)' ? '' : unq(m[3]), isFinal: m[2] === 'true', at: Date.parse(m[1]) });
    }
    streams.push({ name: dir, holdout: /h40/.test(dir), ev });
}
for (const f of fs.readdirSync(SEAM).filter((f) => /^events-.*\.jsonl$/.test(f)).sort()) {
    const ev = [];
    for (const l of fs.readFileSync(new URL(f, SEAM), 'utf8').split('\n').filter(Boolean)) {
        const e = JSON.parse(l);
        if (e.kind === 'transcript') ev.push({ text: e.text, isFinal: e.isFinal, at: e.at, speechFinal: e.speechFinal });
        if (e.kind === 'utterance-end') ev.push({ utteranceEnd: true });
    }
    streams.push({ name: `seam ${f.slice(7, 26)}`, holdout: false, ev });
}
const variants = ['v3', 'strict', 'digit', 'digitcat', 'pause', 'align'];
const totals = Object.fromEntries(variants.map((v) => [v, { other: 0, holdout: 0, seam: 0 }]));
const diffs = [];
for (const s of streams) {
    const res = {};
    for (const v of variants) {
        const r = make(v);
        res[v] = s.ev.map((e) => (e.utteranceEnd ? (v === 'pause' ? (r.clear(), null) : null) : (!e.text && v !== 'pause' ? null : r.on(e.text, e.isFinal, e.at, e.speechFinal))));
        const n = res[v].filter(Boolean).length;
        totals[v][s.name.startsWith('seam') ? 'seam' : s.holdout ? 'holdout' : 'other'] += n;
    }
    for (const v of variants.slice(1)) s.ev.forEach((e, i) => { if (res[v][i] !== res.v3[i]) diffs.push(`${v.padEnd(8)} ${s.name.slice(0, 28).padEnd(28)} v3=${JSON.stringify(res.v3[i])} ${v}=${JSON.stringify(res[v][i])} before "${(e.text ?? '').slice(0, 40)}"`); });
}
for (const v of variants) console.log(`${v.padEnd(8)} repairs: non-holdout logs ${totals[v].other}, holdout ${totals[v].holdout}, seam ${totals[v].seam}`);
console.log(`\n${diffs.length} differences from v3:`);
for (const d of diffs) console.log(d);
