// THROWAWAY — provenance for a "wordless grace" constant: on the 116 golden questions, how long
// after a clip's LAST voice off-transition does its LAST transcript final arrive? A real voice
// stop is followed by its words within this; a stop with nothing by then carried no words.
import fs from 'node:fs';
import path from 'node:path';

const FIX = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/fixtures';
const lags = [];
for (const f of fs.readdirSync(FIX).filter((f) => f.endsWith('-turns.json'))) {
    const fx = JSON.parse(fs.readFileSync(path.join(FIX, f), 'utf8'));
    const items = fx.items.filter((i) => (i.kind ?? 'spoken') === 'spoken' && i.voice.length);
    for (let k = 0; k < items.length; k++) {
        const it = items[k];
        const lastOff = Math.max(...it.voice.map(([, off]) => off));
        const nextStart = items[k + 1]?.playedAt ?? Infinity;
        // finals that belong to this clip and land after its voice stopped
        const after = fx.finals.filter((x) => x.at > lastOff && x.at < nextStart && x.at < lastOff + 30_000);
        if (!after.length) continue;
        const lag = Math.max(...after.map((x) => x.at)) - lastOff;
        lags.push({ run: f.slice(0, 10), id: it.id, lag });
    }
}
lags.sort((a, b) => a.lag - b.lag);
const pct = (q) => lags[Math.min(lags.length - 1, Math.floor(lags.length * q))].lag;
console.log(`n=${lags.length} clips with a final after their last voice stop`);
console.log(`lag ms  p50 ${pct(.5)}  p90 ${pct(.9)}  p99 ${pct(.99)}  max ${lags[lags.length - 1].lag}`);
console.log('slowest five:', lags.slice(-5).map((x) => `${x.id}@${x.lag}`).join('  '));
console.log('over 2000 ms:', lags.filter((x) => x.lag > 2000).length, ' over 3000 ms:', lags.filter((x) => x.lag > 3000).length);
