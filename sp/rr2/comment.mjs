// Throwaway: compare the TECHNICAL_CONTEXT comment with the ruling text; measure line widths.
import { readFileSync } from 'node:fs';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const src = readFileSync(MAIN + '/electron/knowledge/IntentClassifier.ts', 'utf8');
const lines = src.split(/\r?\n/);
const i = lines.findIndex((l) => l.startsWith('const TECHNICAL_CONTEXT'));
let j = i - 1;
while (j >= 0 && lines[j].startsWith('//')) j--;
const comment = lines.slice(j + 1, i).map((l) => l.replace(/^\/\/ ?/, '')).join(' ');
const RULING = 'A marker vetoes NEGOTIATION. On 2026-09-24 (h40a R09) "the SQL for the second highest salary in each department" went to the negotiation coaching card, and the phrase list alone still sends "write a query that returns the salary range" there. A technical question wrongly sent to the card is unspeakable; a negotiation question wrongly vetoed gets an ordinary answer without the salary block. "table" and "join" are not markers: "on the table" and "join us" are negotiation idioms.';
console.log('comment lines', i - (j + 1), 'verbatim:', comment === RULING);
if (comment !== RULING) { console.log('GOT :', comment); console.log('WANT:', RULING); }
// Calibrate the comparison: a one-character change must read false.
console.log('calibration (altered ruling) verbatim:', comment === RULING.replace('idioms.', 'idiom.'));
console.log('CRLF in file:', /\r\n/.test(src), ' trailing whitespace lines:', lines.filter((l) => /[ \t]+$/.test(l)).length);
const widths = lines.map((l, n) => [n + 1, l.length]).filter(([, w]) => w > 0);
console.log('max width', Math.max(...widths.map((x) => x[1])));
for (const [n, w] of widths) if (n >= 25 && n <= 50) console.log(String(n).padStart(3), String(w).padStart(4), lines[n - 1].slice(0, 60));
