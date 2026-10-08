// Throwaway: what does gemini-3.8-live's usageMetadata report per turn? For each pair session in L20 r1 that
// answered both items, print per usage event: seconds of audio streamed so far (clip + silence), the prompt /
// response / thought counts. If promptTokenCount on the follow-up turn includes the main turn's audio and answer,
// the per-turn prompt is the whole session context (the Google Cloud billing rule); if it tracks the streamed
// seconds including silence, silence is tokenized.
import fs from 'node:fs';
const HERE = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/l20';
const R = JSON.parse(fs.readFileSync(`${HERE}/runs/live38-r1.json`, 'utf8'));
// Split the event stream into sessions at each 'open'.
const sessions = [];
for (const e of R.events) { if (e.kind === 'open') sessions.push([]); sessions.at(-1)?.push(e); }
for (const evs of sessions.slice(0, 4)) {
    const open = evs[0];
    console.log(`\nsession ${open.pair} attempt ${open.attempt}`);
    let streamStart = null, clipSecs = 0, curItem = null, clipStartT = null;
    for (const e of evs) {
        if (e.kind === 'setupComplete') streamStart = e.t;
        if (e.kind === 'clipStart') { curItem = e.item; clipStartT = e.t; clipSecs = e.seconds; }
        if (e.kind === 'clipEnd') console.log(`  ${curItem} clip ${clipSecs} s ends at +${((e.t - streamStart) / 1000).toFixed(1)} s of streaming`);
        if (e.kind === 'usage') console.log(`  usage at +${((e.t - streamStart) / 1000).toFixed(1)} s streamed: prompt ${e.prompt}, response ${e.response}, thoughts ${e.thoughts}, total ${e.total}`);
        if (e.kind === 'close') console.log(`  close ${JSON.stringify({ code: e.code, reason: e.reason })}`);
    }
}
