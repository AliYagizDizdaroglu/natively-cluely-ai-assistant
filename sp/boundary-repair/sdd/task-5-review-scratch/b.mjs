// Fix round 1, check (b): can the refusal fire on a log the app writes? Lines are written the way
// DeepgramStreamingSTT.ts:227/:243 + main.ts:63 write them (raw template literals, appendFileSync UTF-8),
// read back, and parsed by MAIN's CURRENT finalsFrom. Plus: sizes and character hazards of every run log.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const G = path.join(MAIN, 'electron/test/golden');
const { finalsFrom } = await import(pathToFileURL(path.join(G, 'interview60.turns-finals.mjs')).href);

const TMP = path.join(HERE, 'b-probe.log');
const ev = (t, transcript, isFinal = true) => `2026-09-30T08:00:0${t}.000Z [LOG] [DeepgramStreaming] Transcript event — isFinal=${isFinal}, text="${transcript ?? '(empty)'}"`;
const rep = (t, restored, transcript) => `2026-09-30T08:00:0${t}.000Z [LOG] [DeepgramStreaming] boundary repair: restored "${restored.join(' ')}" before "${transcript.slice(0, 40)}"`;
const viaFile = (lines) => { fs.writeFileSync(TMP, ''); for (const l of lines) fs.appendFileSync(TMP, `${l}\n`); return fs.readFileSync(TMP, 'utf8'); };
const run = (name, f2) => {
    const log = viaFile([ev(1, 'How do you cut'), ev(2, f2), rep(2, ['hallucinations'], f2), ev(3, '')]);
    let r; try { r = JSON.stringify(finalsFrom(log, 0).map((f) => f.text)); } catch (e) { r = `THROWS: ${e.message}`; }
    console.log(`${name.padEnd(44)} ${r}`);
};
const x39 = 'a'.repeat(38) + ' ';
run('plain', 'in a rag answer');
run('longer than 40 chars', 'in a rag answer without just making it refuse today?');
run('unescaped quote inside the first 40', 'he said "hi" to me and then left the room early');
run('quote as the first char', '"Hello" she said');
run('quote exactly at index 39', `${x39}"quoted" tail`);
run('backslash inside the first 40', 'the path C:\\temp is here');
run('backslash-quote pairs', 'say \\"hi\\" now');
run('backslash exactly at index 39', `${x39}\\more text`);
run('trailing backslash', 'ends with a backslash \\');
run('astral char straddling index 39/40', `${'a'.repeat(39)}\u{1F600} tail`);
run('raw newline in the transcript', 'line one\nline two');
fs.unlinkSync(TMP);

// every run log: size, and the hazards above in its Transcript texts (holdout counted, not analysed)
const EV = /\[DeepgramStreaming\] Transcript event — isFinal=(?:true|false), text="(.*)"\r?$/;
let maxSize = 0, maxName = '', texts = 0, quotes = 0, backslashes = 0, astral = 0, logs = 0;
for (const name of fs.readdirSync(path.join(G, 'interview60.runs'))) {
    const f = path.join(G, 'interview60.runs', name, 'natively_debug.log');
    if (!fs.existsSync(f)) continue;
    logs++;
    const size = fs.statSync(f).size; if (size > maxSize) { maxSize = size; maxName = name; }
    for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
        const m = line.match(EV); if (!m) continue;
        texts++;
        if (m[1].includes('"')) quotes++;
        if (m[1].includes('\\')) backslashes++;
        if (/[\u{10000}-\u{10FFFF}]/u.test(m[1])) astral++;
    }
}
console.log(`run logs ${logs} (incl. holdout): largest ${(maxSize / 1048576).toFixed(2)} MB (${maxName.includes('h40') ? 'a holdout run' : maxName}) vs the 10 MB rotation; Transcript texts ${texts}: with a quote ${quotes}, a backslash ${backslashes}, an astral char ${astral}`);
