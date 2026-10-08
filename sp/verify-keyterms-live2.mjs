// Follow-up: S2Q05 needs a longer tail (its "deduplicate" is at the very end of a 25 s clip),
// and S2Q04's "document ids" -> "documenteds" did not respond to that spelling. Try variants.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const require_ = createRequire(import.meta.url);
const KEY = fs.readFileSync(path.join(PROJ, '.env'), 'utf8').match(/^DEEPGRAM_API_KEY=(.+)$/m)[1].trim();
const { createClient, LiveTranscriptionEvents } = require_(`${PROJ}/node_modules/@deepgram/sdk`);

const buf = fs.readFileSync(path.join(PROJ, 'electron/test/golden/scenario50.wav'));
const SRC_RATE = buf.readUInt32LE(24), OUT_RATE = 16000, bytesPerSec = SRC_RATE * 2;
function pcm16k(startSec, secs) {
    const from = 44 + Math.floor(startSec * bytesPerSec / 2) * 2;
    const src = buf.subarray(from, Math.min(from + Math.floor(secs * bytesPerSec / 2) * 2, buf.length));
    const ratio = SRC_RATE / OUT_RATE, n = Math.floor((src.length / 2) / ratio);
    const out = Buffer.alloc(n * 2);
    for (let i = 0; i < n; i++) out.writeInt16LE(src.readInt16LE(Math.floor(i * ratio) * 2), i * 2);
    return out;
}
function transcribe(pcm, terms) {
    return new Promise((resolve) => {
        const live = createClient(KEY).listen.live({
            model: 'nova-3', language: 'en', smart_format: true, interim_results: true,
            encoding: 'linear16', sample_rate: OUT_RATE, channels: 1,
            endpointing: 300, utterance_end_ms: 1000, vad_events: true,
            ...(terms.length ? { keyterm: terms } : {}),
        });
        const finals = [];
        const done = () => { try { live.requestClose(); } catch { } resolve(finals.join(' ').trim()); };
        const guard = setTimeout(done, 40000);
        live.on(LiveTranscriptionEvents.Open, async () => {
            const CH = OUT_RATE * 2 / 10;
            for (let o = 0; o < pcm.length; o += CH) {
                live.send(pcm.subarray(o, Math.min(o + CH, pcm.length)));
                await new Promise((r) => setTimeout(r, 25));
            }
            setTimeout(() => { clearTimeout(guard); done(); }, 8000);   // longer tail
        });
        live.on(LiveTranscriptionEvents.Transcript, (d) => {
            const t = d.channel?.alternatives?.[0]?.transcript;
            if (d.is_final && t) finals.push(t);
        });
        live.on(LiveTranscriptionEvents.Error, () => { clearTimeout(guard); done(); });
    });
}
const timeline = JSON.parse(fs.readFileSync(`${PROJ}/electron/test/golden/interview60.runs/2026-09-19T08-22-41-s50j/interview60.timeline.json`, 'utf8'));
const at = (id) => timeline.items.find((x) => x.id === id);

console.log('--- S2Q05: does "deduplicate" survive, with a full tail? ---');
{
    const it = at('S2Q05'), pcm = pcm16k(it.startSec, it.clipSecs + 1.5);
    for (const terms of [[], ['deduplicate'], ['deduplicate', 'deduplicate chunk ids']]) {
        const t = await transcribe(pcm, terms);
        const m = t.match(/.{0,40}dup.{0,30}/i);
        console.log(`  keyterm ${JSON.stringify(terms).padEnd(44)} -> ${/\bdedup/i.test(t) ? 'RIGHT  ' : /duplicate/i.test(t) ? 'GARBLED' : 'absent '}  "${m ? m[0].trim() : '—'}"`);
    }
}
console.log('\n--- S2Q04: "unique document ids" -> "documenteds"; try spellings ---');
{
    const it = at('S2Q04'), pcm = pcm16k(it.startSec, it.clipSecs + 1.5);
    for (const terms of [[], ['document ids'], ['document IDs'], ['unique document ids'], ['document ID'], ['IDs']]) {
        const t = await transcribe(pcm, terms);
        const m = t.match(/.{0,30}(documenteds|document ids|document i ds|uniqueids|unique ids).{0,20}/i);
        console.log(`  keyterm ${JSON.stringify(terms).padEnd(44)} -> ${/document ids/i.test(t) ? 'RIGHT  ' : /documenteds|uniqueids/i.test(t) ? 'GARBLED' : 'neither'}  "${m ? m[0].trim() : '—'}"`);
    }
}
process.exit(0);
