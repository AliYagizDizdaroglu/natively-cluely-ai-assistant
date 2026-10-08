// Builds et-live/run.mjs from temp-live/run.mjs (tonight's Live temperature probe) by exact replacements: the model
// becomes gemini-3.8-live-extended-thinking, the two arms become thinkingLevel low / medium (no temperature, as
// ET38 ran), the folder and file names change. Refuses if any anchor is missing or matches more than once.
import fs from 'node:fs';
const SP = new URL('.', import.meta.url);
let s = fs.readFileSync(new URL('temp-live/run.mjs', SP), 'utf8');
const swaps = [
    ["scratchpad/temp-live';", "scratchpad/et-live';"],
    ["const MODEL = 'gemini-3.8-live';", "const MODEL = 'gemini-3.8-live-extended-thinking';"],
    ['const ARMS = { T04: 0.4, TDEF: undefined };', "const ARMS = { LOW: 'low', MED: 'medium' };"],
    ['const l20cSrc = fs.readFileSync(`${HERE}/../l20c/run.mjs`, \'utf8\');', 'const l20cSrc = fs.readFileSync(`${HERE}/../l20c/run.mjs`, \'utf8\');   // LIVE_MODE byte-check, unchanged'],
    ["temperature: ARMS[F.arm] ?? null,", "thinkingLevel: ARMS[F.arm],"],
    ['    const temperature = ARMS[F.arm];\n', '    const thinkingLevel = ARMS[F.arm];\n'],
    ['            ...(temperature === undefined ? {} : { temperature }),\n', '            thinkingConfig: { thinkingLevel },\n'],
    ["const order = (i + rep) % 2 === 0 ? ['T04', 'TDEF'] : ['TDEF', 'T04'];", "const order = (i + rep) % 2 === 0 ? ['LOW', 'MED'] : ['MED', 'LOW'];"],
    ["out: `${HERE}/runs/live38-${k}.json`", "out: `${HERE}/runs/live38et-${k}.json`"],
];
for (const [a, b] of swaps) {
    const n = s.split(a).length - 1;
    if (n !== 1) { console.log(`REFUSED: anchor found ${n} times: ${a.slice(0, 70)}`); process.exit(2); }
    s = s.replace(a, b);
}
s = s.replace(/^\/\/ Temperature probe on gemini-3\.8-live[\s\S]*?\n\/\/   node run\.mjs\n/, `// 3.8 Live EXTENDED THINKING re-probe (2026-10-02 night, user: "can we probe 3.8 live ET, low and medium again").
// tonight's temp-live/run.mjs (itself L20c's harness unchanged) with ONLY the model (gemini-3.8-live-extended-thinking)
// and the arm changed: thinkingConfig.thinkingLevel low vs medium, no temperature (as ET38 ran). Same 6 pairs / 8
// graded items, 3 reps, arms interleaved per pair. Writes runs/live38et-<LOW|MED>-r<rep>.json in L20c's format.
//   node run.mjs
`);
if (!s.startsWith('// 3.8 Live EXTENDED THINKING')) { console.log('REFUSED: header not replaced'); process.exit(2); }
fs.mkdirSync(new URL('et-live/', SP), { recursive: true });
fs.writeFileSync(new URL('et-live/run.mjs', SP), s);
console.log('wrote et-live/run.mjs');
