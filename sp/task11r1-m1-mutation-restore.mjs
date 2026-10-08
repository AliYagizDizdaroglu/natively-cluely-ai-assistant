import fs from 'node:fs';

const file = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.pass-record.mjs';
const text = fs.readFileSync(file, 'utf8');

const newStr = `export function verbalHedgeFromLog(dbg) {
    return lastMatch(dbg, /\\[Main\\] verbal-hedge: (on trigger=\\d+ms|off)/g)?.[1] ?? null;   // MUTATION for rule-8 calibration (fix round 1, Minor 1) — restore the space to "verbal hedge:"
}`;
const oldStr = `export function verbalHedgeFromLog(dbg) {
    return lastMatch(dbg, /\\[Main\\] verbal hedge: (on trigger=\\d+ms|off)/g)?.[1] ?? null;
}`;

const count = text.split(newStr).length - 1;
if (count !== 1) {
    console.error(`FAIL: expected exactly 1 occurrence, found ${count}`);
    process.exit(1);
}
fs.writeFileSync(file, text.split(newStr).join(oldStr), 'utf8');
console.log('OK: mutation restored');
