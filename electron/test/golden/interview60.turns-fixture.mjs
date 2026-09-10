// Builds a replay fixture from a flown run: the clips' voice on/off times (from the
// WAVs), every interviewer transcript final, every detector fire, and what the app
// actually dispatched. interviewerTurn.replay.test.ts feeds the fixture through the
// turn tracker and asserts the spec's targets — the committed replacement for the
// 2026-09-09 spike (scratchpad/turn-spike.mjs).
//
//   node interview60.turns-fixture.mjs <run-dir> <tts-dir> [--offset-ms N] [--out <file>]
//
// --offset-ms: timelines written before Task 1 of the 2026-09-09 plan stamped
// startedMs ~1.15 s before the audio started (PowerShell + SoundPlayer start-up);
// pass 1150 for those. Timelines with clock === 'playsync' need 0 (the default).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const [runDir, ttsDir] = process.argv.slice(2);
if (!runDir || !ttsDir) { console.error('usage: node interview60.turns-fixture.mjs <run-dir> <tts-dir> [--offset-ms N] [--out file]'); process.exit(2); }
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback; };

const tl = JSON.parse(fs.readFileSync(path.join(runDir, 'interview60.timeline.json'), 'utf8'));
const OFFSET = Number(arg('--offset-ms', 0));
const dbg = fs.readFileSync(path.join(runDir, 'natively_debug.log'), 'utf8');
const ts = (s) => Date.parse(s);
const unq = (s) => JSON.parse(`"${s}"`);

// Voice segments of one clip: 20 ms frames, loud when ≥ −45 dBFS (185 RMS, the native
// module's VAD_START_RMS), merged across gaps under 250 ms — the energyVad rules on
// a clip whose floor is digital silence (energyVad.test.ts calibrates the same clip).
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
// A "hold" dispatch is the old pipeline explicitly withholding on a fragmentary anchor
// (reason=fragmentary) — matched but not yet confirmed, like the new machine's own `hold`
// decision, not a fired detection — so it is not fed to the replay as a detector fire.
// `actual` keeps the full historical record (every action); only `detections` excludes it.
// `action` rides along so the replay can tell a fresh "answer" from an "extend"/"drop" —
// the old pipeline's own bookkeeping around content it already attributed to a turn it had
// already handled, not a fresh independent detection (interviewerTurn.replay.test.ts).
const detections = actual.filter((d) => d.action !== 'hold').map((d) => ({ at: d.at, source: d.source, text: d.anchor, action: d.action }));

const fixture = { run: path.basename(runDir), roster: tl.rosterLabel ?? 'unknown', offsetMs: OFFSET, extractedAt: new Date().toISOString(), items, finals, detections, actual };
const out = arg('--out', path.join(HERE, 'fixtures', `${path.basename(runDir)}-turns.json`));
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(fixture));
console.log(`${out}: ${items.length} items, ${finals.length} finals, ${detections.length} detector fires, offset ${OFFSET} ms, ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
