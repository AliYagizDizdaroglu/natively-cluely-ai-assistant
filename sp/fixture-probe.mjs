import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn';
const FIX = path.join(ROOT, 'electron/test/golden/fixtures');

for (const name of ['2026-09-09T15-00-55-s50a', '2026-09-08T08-44-56-after9']) {
    const f = JSON.parse(fs.readFileSync(path.join(FIX, `${name}-turns.json`), 'utf8'));
    const byAction = {};
    for (const d of f.detections) byAction[d.action] = (byAction[d.action] ?? 0) + 1;
    // fragment drops come from `actual` where verdict === 'fragment'
    const fragDrops = f.actual.filter((a) => a.verdict === 'fragment');
    console.log(`\n=== ${name} ===`);
    console.log('items', f.items.length, 'finals', f.finals.length, 'detections', f.detections.length, 'offset', f.offsetMs);
    console.log('detections by action:', JSON.stringify(byAction));
    console.log('fragment-verdict lines (fed but the new app drops before marking):', fragDrops.length);

    // per spoken item: window, voiceOff, detections inside, and which are fragment drops
    const spoken = f.items.filter((i) => (i.kind ?? 'spoken') === 'spoken');
    const idx = (it) => f.items.indexOf(it);
    let onlyFrag = [], lateDet = [], noDet = [];
    for (const it of spoken) {
        const k = idx(it);
        const from = it.playedAt - 2000;
        const to = (f.items[k + 1]?.playedAt ?? it.playedAt + it.clipSecs * 1000 + 90_000) - 2000;
        const voiceOff = it.voice.length ? it.voice[it.voice.length - 1][1] : it.playedAt + it.clipSecs * 1000;
        const mine = f.detections.filter((x) => x.at >= from && x.at < to);
        const mineActual = f.actual.filter((x) => x.at >= from && x.at < to);
        const nonFrag = mineActual.filter((x) => x.verdict !== 'fragment');
        if (!mine.length) noDet.push(it.id);
        else if (!nonFrag.length) onlyFrag.push(it.id);
        const first = mine.length ? Math.min(...mine.map((x) => x.at)) : null;
        const firstNonFrag = nonFrag.length ? Math.min(...nonFrag.map((x) => x.at)) : null;
        const gateAt = voiceOff + 1200;
        if (firstNonFrag !== null && firstNonFrag > gateAt + 500) lateDet.push(`${it.id}:+${firstNonFrag - gateAt}ms`);
        void first;
    }
    console.log('items with NO detection at all:', noDet.length, noDet.join(','));
    console.log('items whose ONLY detections are fragment drops:', onlyFrag.length, onlyFrag.join(','));
    console.log('items where the first non-fragment detection lands >500ms AFTER the gate (classify would fire and its verdict could beat the real fire):', lateDet.length);
    console.log('  ', lateDet.slice(0, 25).join(' '));
}
