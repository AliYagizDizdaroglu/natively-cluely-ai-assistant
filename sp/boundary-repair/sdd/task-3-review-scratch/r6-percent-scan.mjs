// Task 3 review (Opus), throwaway. Read-only. How often do interims spell a unit after DIGITS ("92 percent"), the
// shape where a final "92%" makes a STRICT cut whose T starts with the word the "%" already covers?
//   node r6-percent-scan.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BR = path.resolve(HERE, '..', '..');
const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const LINE = /^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="((?:[^"\\]|\\.)*)"/;
const c = { interims: 0, finals: 0, interimDigitPercent: 0, interimDigitUnitWord: 0, finalPercentSign: 0, interimPercentSign: 0 };
const scan = (text, isFinal) => {
    if (!text) return;
    if (isFinal) { c.finals++; if (/%/.test(text)) c.finalPercentSign++; return; }
    c.interims++;
    if (/\d\s+percent\b/i.test(text)) c.interimDigitPercent++;
    if (/\d\s+(percent|dollars?|degrees?|milliseconds?|seconds?|minutes?|hours?|x)\b/i.test(text)) c.interimDigitUnitWord++;
    if (/%/.test(text)) c.interimPercentSign++;
};
for (const d of fs.readdirSync(RUNS)) {
    const f = path.join(RUNS, d, 'natively_debug.log');
    if (!fs.existsSync(f)) continue;
    for (const l of fs.readFileSync(f, 'utf8').split('\n')) { const m = l.match(LINE); if (m && m[3] !== '(empty)') scan(m[3], m[2] === 'true'); }
}
for (const f of fs.readdirSync(path.join(BR, 'seam-probe')).filter((f) => /^events-.*\.jsonl$/.test(f))) {
    for (const l of fs.readFileSync(path.join(BR, 'seam-probe', f), 'utf8').split('\n').filter(Boolean)) { const e = JSON.parse(l); if (e.kind === 'transcript') scan(e.text, e.isFinal); }
}
console.log(JSON.stringify(c));
