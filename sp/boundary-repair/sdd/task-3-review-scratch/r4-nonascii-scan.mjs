// Task 3 review (Opus), throwaway. Read-only. What do Deepgram's texts show about non-ASCII letters and Unicode
// normalisation (NFC vs NFD)? Scans the Transcript event lines of every interview60 run log, MAIN's own current
// debug logs (natively_debug.log, .log.1 — real sessions, not only flights) and both seam recordings. Prints only
// counts and code points, never the texts.
//   node r4-nonascii-scan.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BR = path.resolve(HERE, '..', '..');
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const RUNS = path.join(MAIN, 'electron/test/golden/interview60.runs');
const LINE = /^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="((?:[^"\\]|\\.)*)"/;
const NON_ASCII_LETTER = /(?![\x00-\x7F])[\p{L}\p{M}]/u;

function tally(name, texts) {
    const t = { name, texts: 0, anyNonAscii: 0, letterOrMark: 0, mark: 0, notNFC: 0, cps: new Map() };
    for (const s of texts) {
        if (!s) continue;
        t.texts++;
        if (/[^\x00-\x7F]/.test(s)) t.anyNonAscii++;
        if (NON_ASCII_LETTER.test(s)) t.letterOrMark++;
        if (/\p{M}/u.test(s)) t.mark++;
        if (s !== s.normalize('NFC')) t.notNFC++;
        for (const c of s) if (c.codePointAt(0) > 127) { const k = `U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`; t.cps.set(k, (t.cps.get(k) ?? 0) + 1); }
    }
    return t;
}
const fromLog = (file) => {
    const out = [];
    for (const l of fs.readFileSync(file, 'utf8').split('\n')) {
        const m = l.match(LINE);
        if (m && m[3] !== '(empty)') { try { out.push(JSON.parse(`"${m[3]}"`)); } catch { out.push(m[3]); } }
    }
    return out;
};
const rows = [];
const runTexts = [];
for (const d of fs.readdirSync(RUNS).sort()) {
    const f = path.join(RUNS, d, 'natively_debug.log');
    if (fs.existsSync(f)) runTexts.push(...fromLog(f));
}
rows.push(tally('interview60.runs (all run logs)', runTexts));
for (const f of ['natively_debug.log', 'natively_debug.log.1']) {
    const p = path.join(MAIN, f);
    if (fs.existsSync(p)) rows.push(tally(`MAIN/${f} (${(fs.statSync(p).size / 1e6).toFixed(1)} MB)`, fromLog(p)));
}
const seam = [];
for (const f of fs.readdirSync(path.join(BR, 'seam-probe')).filter((f) => /^events-.*\.jsonl$/.test(f))) {
    for (const l of fs.readFileSync(path.join(BR, 'seam-probe', f), 'utf8').split('\n').filter(Boolean)) {
        const e = JSON.parse(l);
        if (e.kind === 'transcript') seam.push(e.text);
    }
}
rows.push(tally('seam recordings', seam));
for (const t of rows) {
    console.log(`${t.name}: ${t.texts} non-empty texts; any non-ASCII char ${t.anyNonAscii}; non-ASCII letter or mark ${t.letterOrMark}; combining mark ${t.mark}; not NFC ${t.notNFC}`);
    if (t.cps.size) console.log(`   non-ASCII code points: ${[...t.cps.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([k, n]) => `${k} x${n}`).join(', ')}`);
}
