// Throwaway: replace every literal U+2014 (em dash) character in a file with the six-character
// ASCII escape sequence backslash-u-2-0-1-4, so the source file is pure ASCII while any regex
// or string literal built from it still matches the identical runtime character.
import fs from 'fs';

const file = process.argv[2];
const text = fs.readFileSync(file, 'utf8');
const emdash = String.fromCharCode(0x2014);
const escapeSeq = '\\' + 'u2014'; // backslash + u2014, six chars, built so no literal em dash appears in THIS file either
const count = text.split(emdash).length - 1;
const fixed = text.split(emdash).join(escapeSeq);
fs.writeFileSync(file, fixed);
console.log(`replaced ${count} occurrence(s) of U+2014 in ${file}`);
