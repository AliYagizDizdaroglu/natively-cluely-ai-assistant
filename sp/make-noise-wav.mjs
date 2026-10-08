// THROWAWAY — a 1 s 440 Hz tone at -20 dBFS, 48 kHz mono 16-bit PCM WAV: loopback energy
// with no words in it, well above the energy VAD's -45 dBFS floor, for the gap-noise smoke.
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname.slice(1));
const rate = 48000, secs = 1.0, hz = 440, amp = Math.round(32767 * Math.pow(10, -20 / 20));
const n = Math.round(rate * secs);
const data = Buffer.alloc(n * 2);
for (let i = 0; i < n; i++) {
    // 20 ms fade in/out so the tone has no click at either end
    const env = Math.min(1, i / (rate * 0.02), (n - 1 - i) / (rate * 0.02));
    data.writeInt16LE(Math.round(amp * env * Math.sin((2 * Math.PI * hz * i) / rate)), i * 2);
}
const header = Buffer.alloc(44);
header.write('RIFF', 0); header.writeUInt32LE(36 + data.length, 4); header.write('WAVE', 8);
header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
header.writeUInt32LE(rate, 24); header.writeUInt32LE(rate * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
header.write('data', 36); header.writeUInt32LE(data.length, 40);
const out = path.join(HERE, 'gap-noise.wav');
fs.writeFileSync(out, Buffer.concat([header, data]));
console.log(`${out}: ${secs}s ${hz}Hz -20 dBFS, ${data.length + 44} bytes`);
