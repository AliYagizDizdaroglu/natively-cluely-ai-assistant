// Spec-review scratch (read-only, non-holdout logs only): do Deepgram INTERIMS hold multi-word spelled
// numbers followed by more words, while the segment's FINAL writes the same number in digits? That is the
// precondition of the tolerant-cut misalignment (F1 ending in a digit token that covers 2-3 interim words).
import fs from 'node:fs';
import path from 'node:path';

const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const unq = (s) => JSON.parse(`"${s}"`);
const RE = /^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="((?:[^"\\]|\\.)*)"/;
const NUM = '(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion)';
// two or more number words in a row (a multi-token spelled number), followed by at least one more word
const MID = new RegExp(`\\b${NUM}(?:[ -]${NUM})+(?: percent)?\\s+[A-Za-z]`, 'i');
const seen = new Map();
for (const dir of fs.readdirSync(RUNS).filter((d) => !/h40/.test(d) && fs.existsSync(path.join(RUNS, d, 'natively_debug.log'))).sort()) {
    let lastInterim = null;
    for (const l of fs.readFileSync(path.join(RUNS, dir, 'natively_debug.log'), 'utf8').split('\n')) {
        const m = l.match(RE); if (!m) continue;
        const text = unq(m[3]); if (!text) continue;
        if (m[2] === 'false') { lastInterim = text; continue; }
        if (lastInterim && MID.test(lastInterim)) {
            const key = `${lastInterim} => ${text}`;
            if (!seen.has(key)) seen.set(key, { dir, n: 0 });
            seen.get(key).n++;
        }
        lastInterim = null;
    }
}
console.log(`last-interim-before-a-final with a multi-word spelled number followed by more words: ${seen.size} distinct`);
for (const [k, v] of seen) console.log(`  x${v.n} ${v.dir.slice(0, 22)} ${k.slice(0, 220)}`);
