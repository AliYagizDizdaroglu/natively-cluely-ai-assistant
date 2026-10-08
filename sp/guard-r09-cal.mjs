// Calibration for guard-r09.mjs's r09Missing() predicate, run once before the predicate is
// trusted inside guard-h40b.mjs. Imports the SAME function the guard runs, and exercises it
// against four known texts: HEAD's committed source (still broken), the working tree's source
// (fixed, uncommitted), the current dist build (still broken, not yet rebuilt), and a synthetic
// text with neither the bare word nor the phrase terms (the phrase-only branch, which none of
// the three real texts above reach).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { r09Missing } from './guard-r09.mjs';

const MAIN = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant';
const BARE = 'still lists bare "salary" as a negotiation term';
const PHRASE = 'lacks the R09 phrase terms';

const fail = (name, got, want) => {
    console.error(`CALIBRATION FAILED (${name}): got ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
    process.exit(1);
};

// (a) HEAD's committed source - spawned directly (no shell/cmd.exe) so the non-ASCII repo path
//     is not reinterpreted through a console codepage.
const headSrc = execFileSync('git', ['show', 'HEAD:electron/knowledge/IntentClassifier.ts'], { cwd: MAIN, encoding: 'utf8' });
const a = r09Missing(headSrc);
if (a !== BARE) fail('HEAD source', a, BARE);
console.log(`(a) HEAD source: ${a}`);

// (b) the working tree's source - the R09 fix, uncommitted.
const wtSrc = fs.readFileSync(`${MAIN}/electron/knowledge/IntentClassifier.ts`, 'utf8');
const b = r09Missing(wtSrc);
if (b !== null) fail('working tree source', b, null);
console.log(`(b) working tree source: ${b}`);

// (c) the current dist build - not yet rebuilt from the fixed source.
const dist = fs.readFileSync(`${MAIN}/dist-electron/electron/knowledge/IntentClassifier.js`, 'utf8');
const c = r09Missing(dist);
if (c !== BARE) fail('dist build', c, BARE);
console.log(`(c) dist build: ${c}`);

// (d) synthetic text with neither the bare word nor the phrase terms.
const synthetic = 'const STRONG_NEGOTIATION = ["compensation"];';
const d = r09Missing(synthetic);
if (d !== PHRASE) fail('synthetic text', d, PHRASE);
console.log(`(d) synthetic text: ${d}`);

console.log('CALIBRATION OK');
