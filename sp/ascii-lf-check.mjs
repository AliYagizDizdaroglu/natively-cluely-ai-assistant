// Throwaway (scratchpad-only) final sweep: non-ASCII bytes and CRLF line endings across every
// file touched in h40c task 7 fix round 2.
import fs from 'fs';

const files = process.argv.slice(2);
let problems = 0;
for (const f of files) {
    const buf = fs.readFileSync(f);
    const text = buf.toString('utf8');
    const nonAscii = [];
    let line = 1;
    for (let i = 0; i < text.length; i++) {
        const c = text.charCodeAt(i);
        if (c === 10) { line++; continue; }
        if (c > 126 && c !== 13) nonAscii.push(`line ${line}: U+${c.toString(16).padStart(4, '0')} ${JSON.stringify(text[i])}`);
    }
    const crlfCount = (text.match(/\r\n/g) || []).length;
    const lfOnlyCount = (text.match(/(?<!\r)\n/g) || []).length;
    const bareCrCount = (text.match(/\r(?!\n)/g) || []).length;
    console.log(`=== ${f} ===`);
    console.log(`  non-ASCII: ${nonAscii.length === 0 ? 'none' : nonAscii.length + ' found'}`);
    if (nonAscii.length) { problems++; nonAscii.slice(0, 10).forEach((l) => console.log('    ' + l)); }
    console.log(`  CRLF=${crlfCount}  LF-only=${lfOnlyCount}  bare-CR=${bareCrCount}`);
    if (crlfCount > 0) problems++;
}
console.log(problems === 0 ? '\nALL CLEAN' : `\n${problems} FILE(S) WITH ISSUES`);
process.exit(problems === 0 ? 0 : 1);
