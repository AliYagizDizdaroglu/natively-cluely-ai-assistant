// Builder B scratch (read-only): which of the roster's 45 ids has no twin record in h40c's captured-high answers file (ids only,
// never a text). r4 rule 3b says "the 40 gated ids" for the IN-APP answers; the twin files hold one id fewer, so the gated clause of
// rule 3c covers the twin file's ids minus the five excluded follow-ups.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const UE = String.fromCharCode(0xfc);
const MAIN = path.join(os.homedir(), 'OneDrive', `Masa${UE}st${UE}`, 'natively-cluely-ai-assistant');
const { HOLDOUT40 } = await import(pathToFileURL(path.join(MAIN, 'electron', 'test', 'golden', 'holdout40.questions.mjs')).href);
const roster = HOLDOUT40.map((i) => i.id);
const run = path.join(MAIN, 'electron', 'test', 'golden', 'interview60.runs', '2026-09-29T11-42-00-h40c');
for (const f of ['interview60.answers.gemini-3.5-flash-lite_captured-high.json', 'interview60.answers.gemini-3.1-flash-lite_captured-low.json']) {
    const ids = Object.keys(JSON.parse(fs.readFileSync(path.join(run, f), 'utf8')));
    console.log(`${f.replace('interview60.answers.', '')}: ${ids.length} ids; roster ids with no record: [${roster.filter((id) => !ids.includes(id)).join(' ')}]; file ids not in the roster: [${ids.filter((id) => !roster.includes(id)).join(' ')}]`);
}
