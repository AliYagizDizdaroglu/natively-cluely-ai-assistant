// Precise, verified string-replace helper: exits nonzero if old_string isn't
// found exactly once, so a bad match never silently corrupts a file.
const fs = require('fs');

const file = process.argv[2];
const oldStr = fs.readFileSync(process.argv[3], 'utf8');
const newStr = fs.readFileSync(process.argv[4], 'utf8');

const src = fs.readFileSync(file, 'utf8');
const count = src.split(oldStr).length - 1;
if (count !== 1) {
  console.error(`FAIL: old_string found ${count} times in ${file} (expected exactly 1)`);
  process.exit(1);
}
const out = src.replace(oldStr, newStr);
fs.writeFileSync(file, out, 'utf8');
console.log(`OK: replaced 1 occurrence in ${file}`);
