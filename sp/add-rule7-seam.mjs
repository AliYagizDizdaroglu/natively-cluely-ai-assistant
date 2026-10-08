// Append the seam-exercise paragraph to rule 7 of the global CLAUDE.md.
// Every assumption this makes is checked at the boundary and refuses loudly (rule 11):
// LF-only, the anchor present exactly once, and rule 8 still starting where it did.
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'C:/Users/sotka/.claude/CLAUDE.md';
const ANCHOR = '"fixed", "works" or "verified" about something you did not watch work.';

const ADDITION = [
    'A change with no symptom to reproduce — a new flag, a new path, a first',
    'integration — still earns one live exercise before anything depends on it,',
    'and that exercise must cross the seams the tests could only mock: the',
    'environment variable actually reaching the process, the real SDK actually',
    'called, the built artifact actually loaded. A test that mocks a boundary',
    'proves the logic on one side of it and says nothing about the boundary.',
    'Then enumerate what the exercise did NOT reach — a live call where the',
    'model happened to emit no LaTeX did not test the LaTeX filter (natively) —',
    'because an unexercised branch is a residual risk, not part of your',
    'confidence.',
].join('\n');

const before = readFileSync(FILE, 'utf8');

if (before.includes('\r')) throw new Error('file is not LF-only; the insert would mix line endings');
const hits = before.split(ANCHOR).length - 1;
if (hits !== 1) throw new Error(`anchor found ${hits} times, expected exactly 1`);
if (before.includes('still earns one live exercise')) throw new Error('addition is already present');

const after = before.replace(ANCHOR, ANCHOR + '\n' + ADDITION);
writeFileSync(FILE, after, 'utf8');

const lines = (s) => s.split('\n').length;
const ruleStart = (s, n) => s.split('\n').findIndex((l) => l.startsWith(`${n}. `)) + 1;
console.log(`lines ${lines(before)} -> ${lines(after)}`);
console.log(`rule 7 starts at line ${ruleStart(after, 7)}, rule 8 at ${ruleStart(after, 8)}`);
console.log(`rules found: ${after.split('\n').filter((l) => /^\d+\. /.test(l)).length}`);
const wide = ADDITION.split('\n').filter((l) => l.length > 78);
console.log(`added lines wider than 78 chars: ${wide.length}`);
