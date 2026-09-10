import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createEnergyVad, frameDbfs } from './energyVad';

const RATE = 16000;
function pcm(seconds: number, amplitudeDbfs: number | null): Buffer {
    const n = Math.round(seconds * RATE);
    const b = Buffer.alloc(n * 2);
    if (amplitudeDbfs === null) return b;
    const amp = Math.round(32767 * Math.pow(10, amplitudeDbfs / 20));
    for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(amp * Math.sin((2 * Math.PI * 440 * i) / RATE)), i * 2);
    return b;
}
/** Feed in 20 ms chunks from t=0; collect transitions. */
function run(vad: ReturnType<typeof createEnergyVad>, parts: Buffer[]): { speaking: boolean; at: number }[] {
    const all = Buffer.concat(parts);
    const chunk = (RATE * 20) / 1000 * 2;
    const out: { speaking: boolean; at: number }[] = [];
    for (let off = 0, k = 1; off < all.length; off += chunk, k++) {
        const u = vad.push(all.subarray(off, Math.min(all.length, off + chunk)), k * 20);
        if (u.changed) out.push({ speaking: u.speaking, at: u.at });
    }
    return out;
}

describe('frameDbfs', () => {
    it('measures a full-scale sine near −3 dBFS and silence as −100', () => {
        const s = pcm(0.02, 0);
        expect(frameDbfs(s, 0, 320)).toBeGreaterThan(-3.5);
        expect(frameDbfs(s, 0, 320)).toBeLessThan(-2.5);
        expect(frameDbfs(Buffer.alloc(640), 0, 320)).toBe(-100);
    });
});

describe('createEnergyVad', () => {
    it('speech on at the first loud frame, off after the hangover, stamped at the last loud frame', () => {
        const vad = createEnergyVad({ sampleRate: RATE });
        const t = run(vad, [pcm(1.0, null), pcm(0.5, -20), pcm(1.0, null)]);
        expect(t).toEqual([{ speaking: true, at: 1020 }, { speaking: false, at: 1500 }]);
        expect(vad.speaking()).toBe(false);
    });
    it('a gap shorter than the hangover is articulation, not a pause', () => {
        const vad = createEnergyVad({ sampleRate: RATE });
        const t = run(vad, [pcm(0.5, -20), pcm(0.2, null), pcm(0.5, -20), pcm(0.6, null)]);
        expect(t.map((x) => x.speaking)).toEqual([true, false]);
        expect(t[1].at).toBe(1200);
    });
    it('the threshold follows the noise floor: −50 dBFS hiss is silence, speech 15 dB above it is speech', () => {
        const vad = createEnergyVad({ sampleRate: RATE });
        const t = run(vad, [pcm(5.0, -50), pcm(0.5, -35), pcm(0.5, -50)]);
        expect(vad.thresholdDbfs()).toBeGreaterThan(-45);
        expect(vad.thresholdDbfs()).toBeLessThan(-38);
        expect(t.map((x) => x.speaking)).toEqual([true, false]);
    });
    it('never fires below −45 dBFS on a dead-silent floor', () => {
        const vad = createEnergyVad({ sampleRate: RATE });
        const t = run(vad, [pcm(2.0, null), pcm(0.5, -50), pcm(0.5, null)]);
        expect(t).toEqual([]);
        expect(vad.thresholdDbfs()).toBe(-45);
    });
    it('frames split across pushes are counted once', () => {
        const vad = createEnergyVad({ sampleRate: RATE });
        const loud = pcm(0.5, -20);
        const u1 = vad.push(loud.subarray(0, 100), 100);   // 50 samples: less than one frame
        expect(u1.changed).toBe(false);
        const u2 = vad.push(loud.subarray(100, 1000), 200);
        expect(u2).toMatchObject({ speaking: true, changed: true });
    });
});

const CLIP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/scenario50-tts-local/S1Q02.wav';
describe.skipIf(!fs.existsSync(CLIP))('calibration on a golden clip (skipped where the clip is absent)', () => {
    it('reproduces the six known pauses of S1Q02 within ±120 ms', () => {
        const wav = fs.readFileSync(CLIP);
        const rate = wav.readUInt32LE(24);
        const di = wav.indexOf(Buffer.from('data', 'ascii'), 12);
        const data = wav.subarray(di + 8, di + 8 + wav.readUInt32LE(di + 4));
        const vad = createEnergyVad({ sampleRate: rate });
        const chunk = (rate * 20) / 1000 * 2;
        const transitions: { speaking: boolean; at: number }[] = [];
        for (let off = 0, k = 1; off < data.length; off += chunk, k++) {
            const u = vad.push(data.subarray(off, Math.min(data.length, off + chunk)), k * 20);
            if (u.changed) transitions.push({ speaking: u.speaking, at: u.at });
        }
        const pauses: number[] = [];
        for (let i = 1; i < transitions.length; i++) if (transitions[i].speaking && !transitions[i - 1].speaking) pauses.push(transitions[i].at - transitions[i - 1].at);
        const known = [900, 500, 440, 940, 480, 920]; // measured 2026-09-09 at 300 RMS (clip-pauses.mjs / human_pauses.py calibration)
        expect(pauses).toHaveLength(known.length);
        pauses.forEach((p, i) => expect(Math.abs(p - known[i])).toBeLessThanOrEqual(120));
        const lastOff = [...transitions].reverse().find((t) => !t.speaking)!;
        expect(Math.abs(lastOff.at - 25420)).toBeLessThanOrEqual(150); // the probe's "voice off +25.42 s"
    });
});
