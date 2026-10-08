import fs from 'node:fs';
import { looksFragmentary } from './qs.mjs';
const f = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-04T08-09-38-after4/natively_debug.log';
const log = fs.readFileSync(f, 'utf8');

// CALIBRATION: two texts whose answers the committed unit test pins.
console.log('CAL looksFragmentary("And when would you not?") =', looksFragmentary('And when would you not?'), '(expect true)');
console.log('CAL looksFragmentary("What is a Pod?") =', looksFragmentary('What is a Pod?'), '(expect false)');

const chip = [...log.matchAll(/\[QuestionDetector\] chip (?:emitted|updated): .*q="([^"]*)"/g)].map((m) => m[1]);
const live = [...log.matchAll(/\[Main\] Live question \([^)]*\): "([^"]*)"/g)].map((m) => m[1]);
const anchorRe = new RegExp('\\[Main\\] dispatch: (answer|chip|drop) source=(live|whisper) anchor="((?:[^"\\\\]|\\\\.)*)"', 'g');
const dispatchAnchors = [...log.matchAll(anchorRe)].map((m) => ({ action: m[1], source: m[2], anchor: JSON.parse('"' + m[3] + '"') }));

for (const [name, arr] of [['detector chips', chip], ['Live questions', live]]) {
    const flagged = arr.filter(looksFragmentary);
    console.log('\n' + name + ': ' + arr.length + ' texts, ' + flagged.length + ' would be HELD');
    for (const t of flagged) console.log('   HOLD:', JSON.stringify(t));
}
const flaggedD = dispatchAnchors.filter((d) => looksFragmentary(d.anchor));
console.log('\ndispatch anchors: ' + dispatchAnchors.length + ' lines, ' + flaggedD.length + ' look fragmentary');
for (const d of flaggedD) console.log('   ' + d.action + '/' + d.source + ':', JSON.stringify(d.anchor));
