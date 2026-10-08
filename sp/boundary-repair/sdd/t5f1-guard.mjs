// Task 5 fix round 1 (throwaway): the guard run before every copy into MAIN. MAIN's file must still be byte-identical to the snapshot
// this round expects it to hold (nobody else touched it since), else exit 1 and copy nothing.
//   node t5f1-guard.mjs <test|module> <snapshot file>
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const G = 'electron/test/golden/';
const [kind, snap] = process.argv.slice(2);
const REL = { test: G + 'interview60.turns-finals.test.ts', module: G + 'interview60.turns-finals.mjs' }[kind];
if (!REL || !snap) { console.log('usage: node t5f1-guard.mjs <test|module> <snapshot file>'); process.exit(2); }
const m = fs.readFileSync(path.join(MAIN, REL)), s = fs.readFileSync(path.resolve(snap));
const same = Buffer.compare(m, s) === 0;
const sha = (b) => createHash('sha256').update(b).digest('hex').slice(0, 16);
console.log(`MAIN ${REL}: ${m.length} B ${sha(m)} vs ${path.basename(snap)}: ${s.length} B ${sha(s)} -> ${same ? 'byte-identical (safe to overwrite)' : 'DIFFERENT: STOP, MAIN was changed by someone else'}`);
process.exit(same ? 0 : 1);
