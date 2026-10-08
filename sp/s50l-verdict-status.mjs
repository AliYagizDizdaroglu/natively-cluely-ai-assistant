// Which of the 18 verdict files are present, do they parse, are they DISTINCT (md5), and
// how many keys does each carry? Two graders handed the same file would be a silent
// duplicate, which is exactly what the md5 check exists to catch.
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const S = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const TAGS = ['inapp', 'captured-low', 'captured-low-r2', 'captured-low-r3', 'captured-minimal', 'low',
    'captured-high', 'captured-high-r2', 'captured-high-r3', 'high', 'bare31', 'bare35',
    'qwen', 'gptoss', 'flash38', 'flash37', 'flash36', 'flash35'];

const seen = new Map();
let present = 0;
const missing = [];
for (const t of TAGS) {
    const f = `${S}/s50l-verdicts-${t}.json`;
    if (!existsSync(f)) { missing.push(t); console.log(`WAIT  ${t}`); continue; }
    present++;
    const raw = readFileSync(f);
    let keys = 'UNPARSEABLE';
    try { keys = Object.keys(JSON.parse(raw.toString('utf8'))).length; } catch { /* reported as-is */ }
    const md5 = createHash('md5').update(raw).digest('hex').slice(0, 10);
    const dup = seen.get(md5);
    console.log(`OK    ${t.padEnd(18)} keys ${String(keys).padStart(3)}  md5 ${md5}${dup ? `  *** IDENTICAL TO ${dup} ***` : ''}`);
    if (!dup) seen.set(md5, t);
}
console.log(`\npresent ${present} of ${TAGS.length}`);
if (missing.length) console.log('still running: ' + missing.join(', '));
console.log(`distinct md5: ${seen.size} of ${present}${seen.size === present ? ' (all distinct)' : ' *** DUPLICATES ***'}`);
