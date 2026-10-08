// Throwaway: insert one ledger entry (a text file) after the first line that starts with an anchor.
//   node ledger-insert.mjs <entry-file> <anchor-prefix>
import fs from 'node:fs';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const L = `${SP}/sdd/2026-09-25-flight-h40b/progress.md`;
const [entryFile, anchor] = process.argv.slice(2);
if (!entryFile || !anchor) { console.log('USAGE: node ledger-insert.mjs <entry-file> <anchor-prefix>'); process.exit(1); }
const lines = fs.readFileSync(L, 'utf8').split('\n');
const entry = fs.readFileSync(`${SP}/${entryFile}`, 'utf8').replace(/\n+$/, '');
if (lines.some((l) => l === entry)) { console.log('ALREADY PRESENT'); process.exit(0); }
const i = lines.findIndex((l) => l.startsWith(anchor));
if (i < 0) { console.log(`ANCHOR NOT FOUND: ${anchor}`); process.exit(2); }
lines.splice(i + 1, 0, entry);
fs.writeFileSync(L, lines.join('\n'));
console.log(`inserted after line ${i + 1}; ledger now ${lines.length} lines`);
