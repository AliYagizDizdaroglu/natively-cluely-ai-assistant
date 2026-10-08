import { createEnergyVad, frameDbfs } from 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn/electron/audio/energyVad';

const RATE = 16000;
function pcm(seconds: number, amplitudeDbfs: number | null): Buffer {
    const n = Math.round(seconds * RATE);
    const b = Buffer.alloc(n * 2);
    if (amplitudeDbfs === null) return b;
    const amp = Math.round(32767 * Math.pow(10, amplitudeDbfs / 20));
    for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(amp * Math.sin((2 * Math.PI * 440 * i) / RATE)), i * 2);
    return b;
}

const vad = createEnergyVad({ sampleRate: RATE });
const parts = [pcm(0.5, -20), pcm(0.2, null), pcm(0.5, -20), pcm(0.6, null)];
const all = Buffer.concat(parts);
const chunk = (RATE * 20) / 1000 * 2;
let frameIdx = 0;
for (let off = 0, k = 1; off < all.length; off += chunk, k++) {
    frameIdx++;
    const level = frameDbfs(all, off, 320);
    const before = vad.speaking();
    const u = vad.push(all.subarray(off, Math.min(all.length, off + chunk)), k * 20);
    const thr = vad.thresholdDbfs();
    if (u.changed || frameIdx <= 5) {
        console.log(`frame ${frameIdx} at=${k * 20} level=${level.toFixed(2)} thr=${thr.toFixed(2)} before=${before} -> speaking=${u.speaking} changed=${u.changed} u.at=${u.at}`);
    }
}
console.log('final speaking:', vad.speaking());
