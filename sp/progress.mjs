// THROWAWAY: one-line progress pulse for the running hour — items played so far versus
// Live questions the app has logged since the hour started. Read-only; never touches the run.
import fs from 'node:fs';
const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const t = JSON.parse(fs.readFileSync(PROJ + '/electron/test/golden/interview60.timeline.json', 'utf8'));
const now = Date.now();
const played = t.items.filter((i) => t.startedMs + i.startSec * 1000 <= now).length;
const log = fs.readFileSync(PROJ + '/natively_debug.log', 'utf8');
const since = new Date(t.startedAt).getTime();
const live = [...log.matchAll(/^(\S+) \[LOG\] \[Main\] Live question \((\w+), mode=(\w+)\): "([^"]*)"/gm)]
    .filter((m) => Date.parse(m[1]) >= since);
const failed = [...log.matchAll(/^(\S+) .*Stream failed/gm)].filter((m) => Date.parse(m[1]) >= since).length;
const last = live.at(-1);
const mins = ((now - t.startedMs) / 60000).toFixed(0);
console.log(`${new Date().toTimeString().slice(0, 5)} +${mins}min  played ${played}/${t.items.length}  live-questions ${live.length}  stream-failures ${failed}${t.endedAt ? '  ENDED ' + t.endedAt : ''}${last ? `  last: [${last[2]}] "${last[4].slice(0, 70)}"` : ''}`);
