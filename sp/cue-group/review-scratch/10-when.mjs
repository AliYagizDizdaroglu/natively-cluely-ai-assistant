// When did each finished answer of the afternoon run end, relative to the hour's own window? Timestamps, kinds
// and counts only (no answer text, no cue text). The launcher log gives the window: playback started
// 2026-09-30T13:12:18.467Z, done 13:46:52.328Z; the probe attempts ran 12:56:49 .. 13:10:23.
import fs from 'node:fs';
import path from 'node:path';
import { parseDebug } from '../hold-read.mjs';

const dir = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn/electron/test/golden/interview60.runs/2026-09-30T13-46-52-cuesmoke';
const text = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8');
const d = parseDebug(text);
const START = Date.parse('2026-09-30T13:12:18.467Z'), END = Date.parse('2026-09-30T13:46:52.328Z');
const hhmmss = (t) => new Date(t).toISOString().slice(11, 23);
console.log(`debug log window ${hhmmss(d.first)} .. ${hhmmss(d.last)} UTC; the hour ${hhmmss(START)} .. ${hhmmss(END)}`);
// extra line kinds, by their heads only
const kinds = [];
for (const line of text.split('\n')) {
    const m = line.match(/^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z) /);
    if (!m) continue;
    const t = Date.parse(m[1]);
    if (line.includes('[Answer] cues:')) kinds.push({ t, k: 'cues' + (/\[Answer\] cues: \[\]\s*$/.test(line) ? ' []' : '') });
    else if (line.includes('[Answer] cues trimmed:')) kinds.push({ t, k: 'trimmed' });
    else if (line.includes('[Answer] budget:')) kinds.push({ t, k: `budget words=${line.match(/words=(\d+)/)?.[1]}` });
    else if (line.includes('[Answer] full:')) kinds.push({ t, k: 'full' });
    else if (line.includes('_what_to_say stream aborted by new generation')) kinds.push({ t, k: 'ABORTED (superseded)' });
    else if (line.includes('verbal hedge: won by')) kinds.push({ t, k: 'won-by' });
}
let before = 0, inside = 0, after = 0;
for (const e of kinds) {
    const where = e.t < START ? 'BEFORE the hour' : e.t > END ? 'AFTER the hour' : '';
    if (e.k.startsWith('budget')) { if (e.t < START) before++; else if (e.t > END) after++; else inside++; }
    console.log(`${hhmmss(e.t)}  ${e.k.padEnd(24)} ${where}`);
}
console.log(`budget lines: ${before} before the hour, ${inside} inside, ${after} after`);
