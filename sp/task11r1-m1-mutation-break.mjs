import fs from 'node:fs';

const file = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.pass-record.mjs';
const text = fs.readFileSync(file, 'utf8');

const oldStr = `export function verbalHedgeFromLog(dbg) {
    return lastMatch(dbg, /\\[Main\\] verbal hedge: (on trigger=\\d+ms|off)/g)?.[1] ?? null;
}`;
const newStr = `export function verbalHedgeFromLog(dbg) {
    return lastMatch(dbg, /\\[Main\\] verbal-hedge: (on trigger=\\d+ms|off)/g)?.[1] ?? null;   // MUTATION for rule-8 calibration (fix round 1, Minor 1) — restore the space to "verbal hedge:"
}`;

const count = text.split(oldStr).length - 1;
if (count !== 1) {
    console.error(`FAIL: expected exactly 1 occurrence, found ${count}`);
    process.exit(1);
}
fs.writeFileSync(file, text.split(oldStr).join(newStr), 'utf8');
console.log('OK: mutation applied — the regex no longer matches "verbal hedge:"');
