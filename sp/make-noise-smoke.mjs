// THROWAWAY — derive smoke-turn-noise.mjs from smoke-turn.mjs: the same smoke, but every
// 14 s gap carries two 1 s tones (at +4 s and +7 s after the clip ends), the pattern the
// loopback showed on 2026-09-13. Every replacement must hit exactly once or this refuses.
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname.slice(1));
let s = fs.readFileSync(path.join(HERE, 'smoke-turn.mjs'), 'utf8');
const NOISE = path.join(HERE, 'gap-noise.wav').replace(/\\/g, '/');

const edits = [
    [
        "const GAP_MS = 14_000;",
        `const GAP_MS = 14_000;
/** Gap noise: a wordless tone played twice in every gap, the loopback shape of 2026-09-13. */
const NOISE_WAV = '${NOISE}';
const NOISE_AT_MS = [4000, 7000];
async function gapWithNoise() {
    let elapsed = 0;
    for (const at of NOISE_AT_MS) {
        await new Promise((r) => setTimeout(r, at - elapsed));
        const t = await playWav(NOISE_WAV);
        log(\`    gap noise ${'$'}{Math.round((t.endedMs - t.startedMs))} ms\`);
        elapsed = at + (t.endedMs - t.startedMs);
    }
    await new Promise((r) => setTimeout(r, Math.max(0, GAP_MS - elapsed)));
}`,
    ],
    [
        "        if (i < ITEMS.length - 1) await new Promise((r) => setTimeout(r, GAP_MS));",
        "        if (i < ITEMS.length - 1) await gapWithNoise();",
    ],
    [
        "    // The last question still needs its answer plus its continuation window.\n    await new Promise((r) => setTimeout(r, GAP_MS));",
        "    // The last question still needs its answer plus its continuation window — noisy too.\n    await gapWithNoise();",
    ],
];
for (const [from, to] of edits) {
    const n = s.split(from).length - 1;
    if (n !== 1) { console.error(`expected exactly one match, found ${n}:\n${from}`); process.exit(1); }
    s = s.replace(from, to);
}
const out = path.join(HERE, 'smoke-turn-noise.mjs');
fs.writeFileSync(out, s);
console.log(`wrote ${out} (${s.length} chars)`);
