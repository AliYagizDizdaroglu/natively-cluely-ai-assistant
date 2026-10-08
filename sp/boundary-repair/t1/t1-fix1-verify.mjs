// Throwaway (fix round 1): prove the staged files differ from the brief ONLY by the two ordered changes.
//   node t1-fix1-verify.mjs test      staged test file  == brief Step 2 block + (6 new tests inserted at the end of the synthetic-edges block)
//   node t1-fix1-verify.mjs module    staged module     == brief Step 4 block with createBoundaryRepair replaced by the Step 6 block, header parenthetical replaced
import fs from 'node:fs';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/boundary-repair';
const STAGE = `${SP}/stage/electron/audio`;
const mode = process.argv[2];

const raw = fs.readFileSync(`${SP}/sdd/task-1-brief.md`, 'utf8').replace(/\r\n/g, '\n');
const blocks = [];
let cur = null;
for (const line of raw.split('\n')) {
    if (cur === null) { const m = /^```(\w*)$/.exec(line); if (m) cur = { lang: m[1], body: [] }; }
    else if (line === '```') { blocks.push(cur); cur = null; }
    else cur.body.push(line);
}
const [testBlock, skeletonBlock, implBlock] = blocks.filter((b) => b.lang === 'ts').map((b) => b.body.join('\n') + '\n');
const fail = (msg) => { console.log(`${mode}: DIFFERENT — ${msg}`); process.exit(1); };

if (mode === 'test') {
    const staged = fs.readFileSync(`${STAGE}/deepgramBoundaryRepair.test.ts`, 'utf8');
    if (staged.includes('\r')) fail('CR bytes present');
    const startMarker = "        expect(play([i, f1, { text: 'as code without', isFinal: false, atMs: f1.atMs + 2 }, f2])).toBe(m13.expectedF2);\n    });\n";
    const endMarker = '});\n';
    const s = staged.indexOf(startMarker);
    if (s < 0 || staged.indexOf(startMarker, s + 1) >= 0) fail('M13 test end marker not found exactly once');
    const from = s + startMarker.length;
    if (!staged.endsWith(endMarker)) fail('staged file does not end with the describe closer');
    const to = staged.length - endMarker.length;
    const inserted = staged.slice(from, to);
    const rebuilt = staged.slice(0, from) + staged.slice(to);
    if (rebuilt !== testBlock) fail('with the inserted region removed the file is NOT the brief block');
    const titles = [...inserted.matchAll(/^    it\('((?:[^'\\]|\\.)*)', \(\) => \{$/gm)].map((m) => m[1].replace(/\\'/g, "'"));
    console.log(`test: IDENTICAL to the brief block plus ONE inserted region of ${inserted.split('\n').length - 1} lines holding ${titles.length} tests:`);
    titles.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
    console.log(`  (${Buffer.byteLength(staged)} bytes, 0 CR)`);
} else if (mode === 'module') {
    const marker = 'export function createBoundaryRepair(): BoundaryRepair {';
    const at = skeletonBlock.indexOf(marker);
    const composed = skeletonBlock.slice(0, at) + implBlock;
    const oldP = '(rule-sim.mjs --impl proves it)';
    const newP = '(checked event for event on the recorded Deepgram streams, 2026-09-29)';
    if (composed.split(oldP).length !== 2) fail('old parenthetical not found exactly once in the brief');
    const expected = composed.split(oldP).join(newP);
    const staged = fs.readFileSync(`${STAGE}/deepgramBoundaryRepair.ts`, 'utf8');
    if (staged !== expected) {
        let i = 0;
        while (i < staged.length && i < expected.length && staged[i] === expected[i]) i++;
        console.log('staged  :', JSON.stringify(staged.slice(Math.max(0, i - 50), i + 70)));
        console.log('expected:', JSON.stringify(expected.slice(Math.max(0, i - 50), i + 70)));
        fail(`first difference at char ${i}`);
    }
    console.log(`module: IDENTICAL to the brief composition with only the header parenthetical replaced (${Buffer.byteLength(staged)} bytes, ${(staged.match(/\r/g) ?? []).length} CR)`);
} else { console.log('usage: t1-fix1-verify.mjs test|module'); process.exit(2); }
