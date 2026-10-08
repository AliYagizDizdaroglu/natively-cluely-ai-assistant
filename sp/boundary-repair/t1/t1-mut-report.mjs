// Throwaway (fix round 1): print, from a vitest text run, the counts line and every failure with its Expected / Received lines.
//   node t1-mut-report.mjs <vitest output file>
import fs from 'node:fs';
const text = fs.readFileSync(process.argv[2], 'utf8').replace(/\x1b\[[0-9;]*m/g, '').replace(/\r/g, '');
const lines = text.split('\n');
const seen = new Set();
let printing = false;
for (const l of lines) {
    if (/^\s*FAIL\s/.test(l)) {
        const name = l.replace(/^\s*FAIL\s+electron\/audio\/deepgramBoundaryRepair\.test\.ts\s*>?\s*/, '').replace('deepgramBoundaryRepair synthetic edges (the symptom\'s strings) > ', 'EDGE > ').replace('deepgramBoundaryRepair reproduces the reference (rule-v3.mjs) on the extracted fixtures > ', 'REF > ');
        if (seen.has(name)) { printing = false; continue; }
        seen.add(name);
        printing = true;
        console.log(`FAIL  ${name}`);
    } else if (printing && /^(AssertionError|Error|TypeError)/.test(l)) console.log(`      ${l.slice(0, 200)}`);
    else if (printing && /^(Expected|Received):/.test(l)) console.log(`      ${l}`);
    else if (/^\s*(Tests|Test Files)\s/.test(l)) console.log(l.trim());
}
if (!seen.size) console.log('(no FAIL blocks)');
