// Throwaway (2026-09-29): event-for-event equivalence of the BUILT boundary repair against the reference
// rule (rule-v3.mjs), over every recorded Deepgram event stream we have: every run folder's
// natively_debug.log (holdout included: this checks code equivalence, it chooses nothing) and every
// seam-probe recording. Prints the repair counts of both and every event where the outputs differ.
// Exit 0 only when they never differ AND the reference repairs at least once (a check that sees no
// repairs could not tell a working module from one that does nothing).
//   node compare-impl.mjs <built module .js>     e.g. MAIN/dist-electron/electron/audio/deepgramBoundaryRepair.js
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createRepair } from './rule-v3.mjs';

const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const SEAM = new URL('./seam-probe/', import.meta.url);
const unq = (s) => JSON.parse(`"${s}"`);
const built = process.argv[2];
if (!built) { console.log('usage: compare-impl.mjs <built module .js>'); process.exit(2); }
const mod = createRequire(import.meta.url)(path.resolve(built));
// The plan's API (PLAN.md Task 1): createBoundaryRepair().onTranscript(text, isFinal, atMs) -> { text, restored: string[] | null }.
if (typeof mod.createBoundaryRepair !== 'function') { console.log(`REFUSED: ${built} exports ${Object.keys(mod).join(', ')} (no createBoundaryRepair)`); process.exit(3); }
const mkBuilt = () => { const r = mod.createBoundaryRepair(); return (text, isFinal, at) => r.onTranscript(text, isFinal, at); };
const mkRef = () => { const r = createRepair(); return (text, isFinal, at) => r.onTranscript(text, isFinal, at); };
const words = (restored) => (restored ? restored.join(' ') : null);

const streams = [];
for (const dir of fs.readdirSync(RUNS).filter((d) => fs.existsSync(path.join(RUNS, d, 'natively_debug.log'))).sort()) {
    const ev = [];
    for (const l of fs.readFileSync(path.join(RUNS, dir, 'natively_debug.log'), 'utf8').split('\n')) {
        const m = l.match(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="((?:[^"\\]|\\.)*)"/);
        if (m && unq(m[3])) ev.push({ text: unq(m[3]), isFinal: m[2] === 'true', at: Date.parse(m[1]) });
    }
    streams.push({ name: dir, ev });
}
for (const f of fs.readdirSync(SEAM).filter((f) => /^events-.*\.jsonl$/.test(f)).sort()) {
    const ev = fs.readFileSync(new URL(f, SEAM), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
        .filter((e) => e.kind === 'transcript' && e.text).map((e) => ({ text: e.text, isFinal: e.isFinal, at: e.at }));
    streams.push({ name: `seam ${f}`, ev });
}
let events = 0, refRepairs = 0, builtRepairs = 0, diffs = 0;
for (const s of streams) {
    const ref = mkRef(), got = mkBuilt();
    let sRef = 0, sBuilt = 0;
    for (const e of s.ev) {
        events++;
        const a = ref(e.text, e.isFinal, e.at), b = got(e.text, e.isFinal, e.at);
        if (a.text !== e.text) sRef++;
        if (b.text !== e.text) sBuilt++;
        const aw = words(a.restored), bw = words(b.restored);
        if (a.text !== b.text || aw !== bw) {
            diffs++;
            if (diffs <= 15) console.log(`DIFF ${s.name}: ${JSON.stringify(e.text.slice(0, 60))} ref=${JSON.stringify(a.text.slice(0, 70))} restored=${aw} | built=${JSON.stringify(b.text.slice(0, 70))} restored=${bw}`);
        }
    }
    refRepairs += sRef; builtRepairs += sBuilt;
    if (sRef || sBuilt) console.log(`${s.name.padEnd(48)} repairs ref ${sRef} built ${sBuilt}`);
}
console.log(`\n${streams.length} streams, ${events} events; repairs: reference ${refRepairs}, built ${builtRepairs}; differing events ${diffs}`);
if (diffs || refRepairs === 0) { console.log('NOT EQUIVALENT'); process.exit(1); }
console.log('EQUIVALENT');
