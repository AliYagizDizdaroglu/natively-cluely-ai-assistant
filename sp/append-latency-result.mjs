// append-latency-result.mjs — append the dated Result section to MAIN's pre-registration file,
// never touching a byte above it. Matches the file's own line endings, refuses if a Result section
// is already there, and checks afterwards that the original bytes are an exact prefix of the new file.
import fs from 'node:fs';

const TARGET = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/passes/PREREGISTER-latency-probe.md';
const SECTION = new URL('./latency-result-section.md', import.meta.url);

const before = fs.readFileSync(TARGET);
const text = before.toString('utf8');
if (/^## Result/m.test(text)) { console.error('REFUSED: a Result section already exists'); process.exit(1); }
const eol = text.includes('\r\n') ? '\r\n' : '\n';
let add = fs.readFileSync(SECTION, 'utf8').replace(/\r\n/g, '\n');
if (!text.endsWith('\n')) add = '\n' + add;
add = add.replace(/\n/g, eol);
fs.appendFileSync(TARGET, add, 'utf8');

const after = fs.readFileSync(TARGET);
const prefixIntact = after.subarray(0, before.length).equals(before);
console.log(`eol=${eol === '\r\n' ? 'CRLF' : 'LF'}  before ${before.length} bytes  after ${after.length} bytes  original bytes intact as prefix: ${prefixIntact}`);
if (!prefixIntact) process.exit(1);
