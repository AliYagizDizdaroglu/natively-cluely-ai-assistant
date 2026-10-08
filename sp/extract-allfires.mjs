// REVIEWER SCRATCH — variant of electron/test/golden/interview60.turns-fixture.mjs that
// keeps EVERY dispatch action (including "hold") in detections[], to measure whether the
// committed extractor's hold-exclusion changes any replay verdict. Output goes only to the
// scratchpad, never into the repo.
import fs from 'node:fs';
import path from 'node:path';

const [runDir, ttsDir, outFile] = process.argv.slice(2);
if (!runDir || !ttsDir || !outFile) { console.error('usage: node extract-allfires.mjs <run-dir> <tts-dir> <out-file>'); process.exit(2); }

const tl = JSON.parse(fs.readFileSync(path.join(runDir, 'interview60.timeline.json'), 'utf8'));
const OFFSET = 1150;
const dbg = fs.readFileSync(path.join(runDir, 'natively_debug.log'), 'utf8');
const ts = (s) => Date.parse(s);
const unq = (s) => JSON.parse(`"${s}"`);

function voiceSegments(file, at0) {
    const b = fs.readFileSync(file);
    const rate = b.readUInt32LE(24);
    const di = b.indexOf(Buffer.from('data', 'ascii'), 12);
    const pcm = b.subarray(di + 8, di + 8 + b.readUInt32LE(di + 4));
    const FR = Math.round(rate * 0.02);
    const n = Math.floor(pcm.length / 2 / FR);
    const loud = new Array(n);
    for (let f = 0; f < n; f++) { let s = 0; for (let k = 0; k < FR; k++) { const v = pcm.readInt16LE((f * FR + k) * 2); s += v * v; } loud[f] = 20 * Math.log10(Math.sqrt(s / FR) / 32768 + 1e-9) >= -45; }
    const out = []; let start = null, last = null;
    for (let f = 0; f < n; f++) {
        if (loud[f]) { if (start === null) start = f; last = f; }
        else if (start !== null && (f - last) * 20 >= 250) { out.push([at0 + start * 20, at0 + (last + 1) * 20]); start = null; }
    }
    if (start !== null) out.push([at0 + start * 20, at0 + (last + 1) * 20]);
    return out;
}

const items = tl.items.map((i) => {
    const playedAt = tl.startedMs + OFFSET + Math.round(i.startSec * 1000);
    return { id: i.id, level: i.level, kind: i.kind ?? 'spoken', ...(i.long ? { long: true } : {}), q: i.q, playedAt, clipSecs: i.clipSecs, voice: voiceSegments(path.join(ttsDir, `${i.id}.wav`), playedAt) };
});
const since = tl.startedMs - 2000;
const finals = [...dbg.matchAll(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=true, text="((?:[^"\\]|\\.)*)"/gm)]
    .map((m) => ({ at: ts(m[1]), text: unq(m[2]).trim() })).filter((f) => f.text && f.at >= since);
const dispatchRe = /^(\S+) \[LOG\] \[Main\] dispatch: (answer|chip|drop|extend|hold|mark|supersede) source=(live|whisper) anchor="((?:[^"\\]|\\.)*)" verdict=(\w+)(?:[^\n]*? question="((?:[^"\\]|\\.)*)")?/gm;
const actual = [...dbg.matchAll(dispatchRe)].map((m) => ({ at: ts(m[1]), action: m[2], source: m[3], anchor: unq(m[4]), verdict: m[5], question: m[6] ? unq(m[6]) : '' })).filter((d) => d.at >= since);
// DIFFERENCE FROM THE COMMITTED EXTRACTOR: no `.filter((d) => d.action !== 'hold')` — every
// action, hold included, becomes a detections[] entry.
const detections = actual.map((d) => ({ at: d.at, source: d.source, text: d.anchor, action: d.action }));

const fixture = { run: path.basename(runDir), roster: tl.rosterLabel ?? 'unknown', offsetMs: OFFSET, extractedAt: new Date().toISOString(), items, finals, detections, actual };
fs.writeFileSync(outFile, JSON.stringify(fixture));
console.log(`${outFile}: ${items.length} items, ${finals.length} finals, ${detections.length} detector fires (incl. hold), offset ${OFFSET} ms`);
