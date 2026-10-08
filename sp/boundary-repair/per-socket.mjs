// Throwaway (2026-09-29), Task 2 review Minor 3: the 25/25 figure came from ONE repair state per run log; the
// wiring keeps one state per live socket. Re-run rule-v3 with a fresh state at every "[DeepgramStreaming] Connected"
// line and list any repair that differs.
import fs from 'node:fs';
import path from 'node:path';
import { createRepair } from './rule-v3.mjs';
const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const unq = (s) => JSON.parse(`"${s}"`);
let single = 0, perSocket = 0, sockets = 0;
const diffs = [];
for (const dir of fs.readdirSync(RUNS).filter((d) => fs.existsSync(path.join(RUNS, d, 'natively_debug.log'))).sort()) {
    const a = createRepair();
    let b = createRepair();
    for (const l of fs.readFileSync(path.join(RUNS, dir, 'natively_debug.log'), 'utf8').split('\n')) {
        if (l.includes('[DeepgramStreaming] Connected')) { b = createRepair(); sockets++; continue; }
        const m = l.match(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="((?:[^"\\]|\\.)*)"/);
        if (!m || !unq(m[3])) continue;
        const at = Date.parse(m[1]), fin = m[2] === 'true', t = unq(m[3]);
        const x = a.onTranscript(t, fin, at).restored, y = b.onTranscript(t, fin, at).restored;
        if (x) single++;
        if (y) perSocket++;
        if (String(x) !== String(y)) diffs.push(`${dir}: single=${x} perSocket=${y} before "${t.slice(0, 40)}"`);
    }
}
console.log(`sockets ${sockets}; repairs single-state ${single}, per-socket ${perSocket}; differences ${diffs.length}`);
for (const d of diffs) console.log(d);
