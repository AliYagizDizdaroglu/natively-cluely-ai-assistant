// Throwaway, read-only: how long each phase of the h40b flight took, from its own records (the done
// file's start/finish, the timeline's playback start, and the arm files' write times in the run
// folder), printed in local time (UTC+3), to answer "why does a flight run 13:30 to 16:30".
import fs from 'node:fs';
import path from 'node:path';

const RUN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-26T11-39-51-h40b';
const local = (ms) => new Date(ms + 3 * 3600e3).toISOString().slice(11, 16);
const done = JSON.parse(fs.readFileSync(`${RUN}/interview60.flight.done.json`, 'utf8'));
const tl = JSON.parse(fs.readFileSync(`${RUN}/interview60.timeline.json`, 'utf8'));
const playStart = tl.startedMs ?? Date.parse(tl.startedAt);
const items = tl.items ?? tl.timeline ?? [];
const last = items.at(-1);
const playEnd = last ? playStart + (last.startSec + last.clipSecs) * 1000 : NaN;
console.log(`flight start ${local(Date.parse(done.startedAt))}   finish ${local(Date.parse(done.finishedAt))}`);
console.log(`playback ${local(playStart)} to about ${local(playEnd)} (last clip ends; then answer wait, report, snapshot)`);
const files = fs.readdirSync(RUN)
    .filter((f) => /^interview60\.(answers\..+|chains|prompts|judge\.pairs.*)\.json$/.test(f))
    .map((f) => ({ f, t: fs.statSync(path.join(RUN, f)).mtimeMs }))
    .sort((a, b) => a.t - b.t);
let prev = playEnd;
for (const { f, t } of files) {
    console.log(`  ${local(t)}  +${String(Math.round((t - prev) / 60000)).padStart(3)} min  ${f}`);
    prev = t;
}
