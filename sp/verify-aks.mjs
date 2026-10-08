// Why does keyterm not recover AKS? Try spellings, and check what the decoder's alternatives
// say — if the audio genuinely says "axe", no keyterm can help and the fix is not here.
import fs from 'node:fs';
import path from 'node:path';

const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const KEY = fs.readFileSync(path.join(PROJ, '.env'), 'utf8').match(/^DEEPGRAM_API_KEY=(.+)$/m)[1].trim();
const buf = fs.readFileSync(path.join(PROJ, 'electron/test/golden/scenario50.wav'));
const RATE = buf.readUInt32LE(24), CH = buf.readUInt16LE(22), BITS = buf.readUInt16LE(34);
const bytesPerSec = RATE * CH * (BITS / 8);

function slice(startSec, secs) {
    const from = 44 + Math.floor(startSec * bytesPerSec / 2) * 2;
    const len = Math.floor(secs * bytesPerSec / 2) * 2;
    const pcm = buf.subarray(from, Math.min(from + len, buf.length));
    const h = Buffer.alloc(44);
    h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8);
    h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(CH, 22);
    h.writeUInt32LE(RATE, 24); h.writeUInt32LE(bytesPerSec, 28); h.writeUInt16LE(CH * BITS / 8, 32);
    h.writeUInt16LE(BITS, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
    return Buffer.concat([h, pcm]);
}

async function go(audio, terms, extra = {}) {
    const qs = new URLSearchParams({ model: 'nova-3', language: 'en', smart_format: 'true', ...extra });
    for (const t of terms) qs.append('keyterm', t);
    const res = await fetch(`https://api.deepgram.com/v1/listen?${qs}`, {
        method: 'POST', headers: { Authorization: `Token ${KEY}`, 'Content-Type': 'audio/wav' }, body: audio,
    });
    const j = await res.json();
    if (!res.ok) return { t: `ERROR ${res.status}`, words: [] };
    const alt = j.results?.channels?.[0]?.alternatives?.[0];
    return { t: alt?.transcript ?? '', words: alt?.words ?? [] };
}

const timeline = JSON.parse(fs.readFileSync(path.join(PROJ, 'electron/test/golden/interview60.runs/2026-09-19T08-22-41-s50j/interview60.timeline.json'), 'utf8'));
const item = timeline.items.find((x) => x.id === 'S1Q09F');
const audio = slice(item.startSec, item.clipSecs + 0.5);

for (const terms of [[], ['AKS'], ['AKS', 'Azure Kubernetes Service'], ['A K S'], ['aks'], ['AKS cluster']]) {
    const { t, words } = await go(audio, terms);
    const near = words.filter((w) => /ax|aks|a\.k|kubernetes/i.test(w.word ?? ''))
        .map((w) => `${w.word}(${(w.confidence ?? 0).toFixed(2)})`).join(' ');
    console.log(`keyterm ${JSON.stringify(terms).padEnd(42)} -> ${/\baks\b/i.test(t) ? 'RIGHT  ' : 'garbled'}  near: ${near || '—'}`);
}

// What does the decoder think the alternatives are? If every candidate is "axe", the audio says axe.
const { words } = await go(audio, ['AKS'], { alternatives: '3' });
console.log('\nword-level confidence around the term:',
    words.filter((w) => /and|which|why|ax|aks/i.test(w.word ?? '')).slice(-6).map((w) => `${w.word}(${(w.confidence ?? 0).toFixed(2)})`).join(' '));
