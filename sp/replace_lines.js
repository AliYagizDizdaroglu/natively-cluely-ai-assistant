// Replace an inclusive 1-indexed line range [start,end] in `file` with the
// lines from `newContentFile` (LF-separated), converting to the requested
// EOL. If end < start, this is a pure insertion before `start` (no deletion).
// Prints the boundary lines it kept, right before and after the edit, so the
// caller can visually confirm the splice landed in the right place.
const fs = require('fs');

const [, , file, startArg, endArg, newContentFile, eolArg] = process.argv;
const start = parseInt(startArg, 10);
const end = parseInt(endArg, 10);
const eol = eolArg === 'crlf' ? '\r\n' : '\n';

const raw = fs.readFileSync(file, 'utf8');
const hasCRLF = raw.includes('\r\n');
const lines = raw.split(hasCRLF ? '\r\n' : '\n');
// Preserve a trailing "no final newline" vs "ends with newline" distinction:
// split() on a string ending in the separator yields a trailing ''.
const trailingEmpty = lines.length && lines[lines.length - 1] === '';
if (trailingEmpty) lines.pop();

if (start < 1 || start > lines.length + 1) {
  console.error(`FAIL: start=${start} out of range (file has ${lines.length} lines)`);
  process.exit(1);
}

const newContent = fs.readFileSync(newContentFile, 'utf8');
const newLines = newContent.split('\n').filter((_, i, arr) => !(i === arr.length - 1 && arr[i] === ''));

const before = lines.slice(0, start - 1);
const removed = end >= start ? lines.slice(start - 1, end) : [];
const after = lines.slice(Math.max(end, start - 1));

const spliced = [...before, ...newLines, ...after];

const out = spliced.join(eol) + (trailingEmpty ? eol : '');
fs.writeFileSync(file, out, 'utf8');

console.log(`OK: ${file}`);
console.log(`  kept before (line ${start - 1}): ${JSON.stringify(before[before.length - 1] ?? '<start of file>')}`);
console.log(`  removed ${removed.length} line(s), first=${JSON.stringify(removed[0] ?? '<none>')} last=${JSON.stringify(removed[removed.length - 1] ?? '<none>')}`);
console.log(`  inserted ${newLines.length} line(s)`);
console.log(`  kept after: ${JSON.stringify(after[0] ?? '<end of file>')}`);
