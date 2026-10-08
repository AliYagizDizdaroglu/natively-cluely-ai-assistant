// Task 4 fix round 1 (throwaway): snapshot the two MAIN files this round changes, exactly as round 0 left them, into
// sdd\t4-r0\ (a rollback point and the "before" side of every diff), refusing if MAIN differs from the round-0 hashes.
// Then prove the staged test file is a PURE INSERTION into MAIN's round-0 test file (prefix and tail byte-identical) and
// print the inserted text's size; CR / BOM / UTF-8 checks on the staged file. Read-only on MAIN.
//   node t4-fix1-snapshot.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const STAGE = path.join(HERE, '..', 'stage');
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const OUT = path.join(HERE, 't4-r0');
const sha = (b) => createHash('sha256').update(b).digest('hex');
const R0 = {
    'electron/audio/DeepgramStreamingSTT.ts': '2af5409f94f0f3e51a248d3e1b72889de91907da0059bb6aae3b787cf40e7415',
    'electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts': 'a2f0015faa7a30bf16cbaf6821b9aa4f274a91154ea8f7eba30e7c8118dddb77',
};
fs.mkdirSync(OUT, { recursive: true });
let bad = 0;
for (const [rel, want] of Object.entries(R0)) {
    const b = fs.readFileSync(path.join(MAIN, rel));
    const ok = sha(b) === want;
    if (!ok) bad++;
    else fs.writeFileSync(path.join(OUT, path.basename(rel)), b);
    console.log(`${ok ? 'saved  ' : 'REFUSED'} ${rel}: ${b.length} B sha256 ${sha(b).slice(0, 16)}`);
}
if (bad) process.exit(1);
const rel = 'electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts';
const before = fs.readFileSync(path.join(OUT, path.basename(rel)), 'utf8');
const staged = fs.readFileSync(path.join(STAGE, rel));
const stagedText = staged.toString('utf8');
const TAIL = '    });\n});\n';
if (!before.endsWith(TAIL)) throw new Error('round-0 test file does not end with the expected tail');
const prefix = before.slice(0, -TAIL.length);
const pure = stagedText.startsWith(prefix) && stagedText.endsWith(TAIL) && stagedText.length > prefix.length + TAIL.length;
const inserted = pure ? stagedText.slice(prefix.length, stagedText.length - TAIL.length) : '';
console.log(`staged test: ${staged.length} B (${stagedText.length} chars), sha256 ${sha(staged).slice(0, 16)}, CR=${staged.filter((x) => x === 13).length}, BOM=${staged[0] === 0xef && staged[1] === 0xbb && staged[2] === 0xbf}`);
console.log(`pure insertion into the round-0 file (prefix + tail byte-identical): ${pure ? 'YES' : 'NO'}; inserted ${inserted.length} chars, ${inserted.split('\n').length - 1} lines`);
// calibration: a one-character change inside the prefix must make the check say NO
const corrupted = stagedText.replace('const unchanged', 'const unchanged ');
console.log(`calibration (a character added inside the untouched prefix): ${corrupted.startsWith(prefix) ? 'still YES (BAD: the check cannot fail)' : 'NO (good: the check can fail)'}`);
process.exit(pure ? 0 : 1);
