import fs from 'node:fs';
import { createEnergyVad } from 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn/electron/audio/energyVad';

const CLIP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/scenario50-tts-local/S1Q02.wav';
const wav = fs.readFileSync(CLIP);
const rate = wav.readUInt32LE(24);
const di = wav.indexOf(Buffer.from('data', 'ascii'), 12);
const data = wav.subarray(di + 8, di + 8 + wav.readUInt32LE(di + 4));
console.log('rate:', rate, 'data chunk offset:', di, 'data bytes:', data.length);

const vad = createEnergyVad({ sampleRate: rate });
const chunk = (rate * 20) / 1000 * 2;
const transitions: { speaking: boolean; at: number }[] = [];
for (let off = 0, k = 1; off < data.length; off += chunk, k++) {
    const u = vad.push(data.subarray(off, Math.min(data.length, off + chunk)), k * 20);
    if (u.changed) transitions.push({ speaking: u.speaking, at: u.at });
}
console.log('transitions:', JSON.stringify(transitions));

const pauses: number[] = [];
for (let i = 1; i < transitions.length; i++) if (transitions[i].speaking && !transitions[i - 1].speaking) pauses.push(transitions[i].at - transitions[i - 1].at);
console.log('measured pauses:', pauses);
const known = [900, 500, 440, 940, 480, 920];
console.log('known pauses:   ', known);
console.log('deltas:         ', pauses.map((p, i) => p - known[i]));

const lastOff = [...transitions].reverse().find((t) => !t.speaking)!;
console.log('last off at:', lastOff.at, 'delta from 25420:', lastOff.at - 25420);
