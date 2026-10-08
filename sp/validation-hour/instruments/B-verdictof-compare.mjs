// Builder B scratch (read-only): is verdictOf in MAIN's interview60.judge.mjs (imported by the adapter today) the same
// function as the worktree's (what MAIN becomes after the merge)? Compares the function source text and the three
// scores' 27 outputs; prints booleans and counts only.
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const UE = String.fromCharCode(0xfc);
const MAIN = path.join(os.homedir(), 'OneDrive', `Masa${UE}st${UE}`, 'natively-cluely-ai-assistant');
const WT = path.join(MAIN, '.claude', 'worktrees', 'whole-turn');
const load = async (root) => import(pathToFileURL(path.join(root, 'electron', 'test', 'golden', 'interview60.judge.mjs')).href);
const [a, b] = [await load(MAIN), await load(WT)];
const sameSource = a.verdictOf.toString() === b.verdictOf.toString();
let diffs = 0, n = 0;
for (const correctness of [0, 1, 2]) for (const on_topic of [0, 1, 2]) for (const delivery of [0, 1, 2]) { n++; if (a.verdictOf({ correctness, on_topic, delivery }) !== b.verdictOf({ correctness, on_topic, delivery })) diffs++; }
console.log(`verdictOf source text identical: ${sameSource}; outputs over the ${n} score triples that differ: ${diffs}`);
console.log(`graderPromptVersion MAIN ${a.graderPromptVersion()} / WT ${b.graderPromptVersion()}`);
