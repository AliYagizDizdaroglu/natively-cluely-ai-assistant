// Throwaway (2026-09-29): run a boundary-repair implementation over every recorded run log (Deepgram
// transcript lines, in order) and label each repair against the scripted question playing at the time:
//   TRUE    the script holds  restored word(s) + F2's first token   (spoken words restored)
//   FALSE   it does not                                              (printed for review)
//   UNKNOWN no scripted question was playing (the warm-up, candidate speech)
// Holdout runs (h40*) are tallied separately: validation only, never used to choose the rule.
//   node rule-sim.mjs [--impl <module path exporting createRepair or createBoundaryRepair>] [--quiet]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createRepair as refFactory, tok } from './rule-v2.mjs';

const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const unq = (s) => JSON.parse(`"${s}"`);
const quiet = process.argv.includes('--quiet');
const ii = process.argv.indexOf('--impl');
let factory = refFactory;
if (ii > 0) {
    const p = process.argv[ii + 1];
    const mod = p.endsWith('.mjs') ? await import(pathToFileURL(p).href) : createRequire(import.meta.url)(p);
    factory = mod.createRepair ?? mod.createBoundaryRepair ?? mod.createDeepgramBoundaryRepair;
    if (typeof factory !== 'function') { console.log(`REFUSED: ${p} exports ${Object.keys(mod).join(', ')}`); process.exit(3); }
}
const hasSeq = (hay, needle) => {
    for (let i = 0; i + needle.length <= hay.length; i++) if (needle.every((w, j) => hay[i + j] === w)) return true;
    return false;
};
const tally = { other: { TRUE: 0, FALSE: 0, UNKNOWN: 0 }, holdout: { TRUE: 0, FALSE: 0, UNKNOWN: 0 } };
const repairs = [];
for (const dir of fs.readdirSync(RUNS).filter((d) => fs.existsSync(path.join(RUNS, d, 'natively_debug.log'))).sort()) {
    const R = path.join(RUNS, dir);
    const bucket = /h40/.test(dir) ? 'holdout' : 'other';
    let items = [];
    try { items = JSON.parse(fs.readFileSync(path.join(R, 'interview60.timeline.json'), 'utf8')).items ?? []; } catch { /* no timeline */ }
    const playing = (atMs) => items.find((i) => atMs >= i.playedAt - 500 && atMs <= i.playedAt + (i.clipSecs ?? 0) * 1000 + 3000);
    const r = factory();
    let lastFinalAt = null;
    for (const l of fs.readFileSync(path.join(R, 'natively_debug.log'), 'utf8').split('\n')) {
        const m = l.match(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="((?:[^"\\]|\\.)*)"/);
        if (!m) continue;
        const text = unq(m[3]);
        if (!text) continue; // the adapter returns before emit on an empty transcript
        const at = Date.parse(m[1]), isFinal = m[2] === 'true';
        const res = r.onTranscript(text, isFinal, at);
        const out = typeof res === 'string' ? res : res.text;
        if (isFinal && out !== text) {
            const restored = tok(out.slice(0, out.length - text.length));
            const item = playing(lastFinalAt ?? at);
            const label = !item ? 'UNKNOWN' : hasSeq(tok(item.q), [...restored, tok(text)[0]]) ? 'TRUE' : 'FALSE';
            tally[bucket][label]++;
            repairs.push({ bucket, dir, label, restored: restored.join(' '), f2: text, item });
        }
        if (isFinal) lastFinalAt = at;
    }
}
if (!quiet) for (const x of repairs) {
    if (x.bucket === "holdout" && !process.argv.includes("--holdout")) continue;
    console.log(`${x.label.padEnd(7)} ${x.dir.slice(0, 22)} restored "${x.restored}" before "${x.f2.slice(0, 50)}"${x.label === 'FALSE' ? ` | ${x.item.id}: ${x.item.q.slice(0, 90)}` : ''}`);
}
console.log(`\nnon-holdout repairs: ${JSON.stringify(tally.other)}\nholdout repairs (validation only): ${JSON.stringify(tally.holdout)}`);
