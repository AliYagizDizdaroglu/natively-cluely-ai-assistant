// Verify the keyterm list against the ORIGINAL SYMPTOM: the real audio of the questions
// Deepgram garbled, transcribed with and without the list.
// Calibration: without keyterm the garble must reproduce, or this probe proves nothing.
// Key is read in-process and never printed.
import fs from 'node:fs';
import path from 'node:path';

const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const KEY = fs.readFileSync(path.join(PROJ, '.env'), 'utf8').match(/^DEEPGRAM_API_KEY=(.+)$/m)[1].trim();
const WAV = path.join(PROJ, 'electron/test/golden/scenario50.wav');
const RUN = path.join(PROJ, 'electron/test/golden/interview60.runs/2026-09-19T08-22-41-s50j');

// Read the list the BUILD carries, not a copy — a probe against a duplicated list would pass
// even if the shipped module were empty.
const { createRequire } = await import('node:module');
const require_ = createRequire(import.meta.url);
const { DEEPGRAM_KEYTERMS } = require_(
    'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn/dist-electron/electron/audio/deepgramKeyterms.js');
if (!DEEPGRAM_KEYTERMS?.length) throw new Error('built deepgramKeyterms.js exports no terms');

const buf = fs.readFileSync(WAV);
const RATE = buf.readUInt32LE(24), CH = buf.readUInt16LE(22), BITS = buf.readUInt16LE(34);
const DATA = 44, bytesPerSec = RATE * CH * (BITS / 8);

function slice(startSec, secs) {
    const from = DATA + Math.floor(startSec * bytesPerSec / 2) * 2;
    const len = Math.floor(secs * bytesPerSec / 2) * 2;
    const pcm = buf.subarray(from, Math.min(from + len, buf.length));
    const h = Buffer.alloc(44);
    h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8);
    h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(CH, 22);
    h.writeUInt32LE(RATE, 24); h.writeUInt32LE(bytesPerSec, 28); h.writeUInt16LE(CH * BITS / 8, 32);
    h.writeUInt16LE(BITS, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
    return Buffer.concat([h, pcm]);
}

async function transcribe(audio, withKeyterms) {
    const qs = new URLSearchParams({ model: 'nova-3', language: 'en', smart_format: 'true' });
    if (withKeyterms) for (const t of DEEPGRAM_KEYTERMS) qs.append('keyterm', t);
    const res = await fetch(`https://api.deepgram.com/v1/listen?${qs}`, {
        method: 'POST',
        headers: { Authorization: `Token ${KEY}`, 'Content-Type': 'audio/wav' },
        body: audio,
    });
    const j = await res.json();
    if (!res.ok) return `ERROR ${res.status} ${JSON.stringify(j).slice(0, 200)}`;
    return j.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '(empty)';
}

const timeline = JSON.parse(fs.readFileSync(path.join(RUN, 'interview60.timeline.json'), 'utf8'));
// the three questions with a measured, meaning-changing garble, plus one control
const CASES = [
    ['S1Q04F', /\btie\b/i, /\bthai\b/i],
    ['S2Q05', /\bdedup/i, /(?<!de)\bduplicate/i],
    ['S1Q09F', /\baks\b/i, /\baxe\b/i],
    ['S2Q01', /reranking|re-ranking/i, /\bre ranking\b/i],
];

console.log(`keyterms: ${DEEPGRAM_KEYTERMS.length} terms\n`);
for (const [id, want, garble] of CASES) {
    const item = (timeline.items ?? []).find((x) => x.id === id);
    if (!item) { console.log(`${id}: not in timeline`); continue; }
    const audio = slice(item.startSec, item.clipSecs + 0.5);
    const off = await transcribe(audio, false);
    const on = await transcribe(audio, true);
    const mark = (t) => `${want.test(t) ? 'RIGHT' : garble.test(t) ? 'GARBLED' : 'neither'}`;
    console.log(`=== ${id} ===`);
    console.log(`  scripted : ${item.q.slice(0, 120)}`);
    console.log(`  NO keyterm  [${mark(off)}] ${off.slice(0, 150)}`);
    console.log(`  WITH keyterm[${mark(on)}] ${on.slice(0, 150)}`);
    console.log();
}
