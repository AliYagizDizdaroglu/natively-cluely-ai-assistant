// Throwaway (2026-09-29): the app's first answer token after the question ENDS, on the 20 L20 items, for the
// in-app hours that flew 3.5-flash-lite HIGH first (s50l, s50m) and for s50k (3.1-lite LOW, L20's registered
// comparator, as a calibration: it must reproduce app-baseline.json's p50 6812 / p90 9441). Same method as
// l20/app-baseline.mjs (timeline spokeEnd + playsync offset, first "first token" diag line within 60 s of the
// answer). Also L20b's live38 first words from its runs, for the side-by-side. Prints only; writes nothing.
//   node e2e-35.mjs
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const RUNS = `${MAIN}/electron/test/golden/interview60.runs`;
const IDS = JSON.parse(fs.readFileSync(new URL('items.json', import.meta.url), 'utf8')).pairs.flat();
const { computeRun } = await import(pathToFileURL(`${MAIN}/electron/test/golden/interview60.metrics.mjs`).href);
const pct = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : null);

for (const [name, dir] of [['s50k', '2026-09-20T11-22-43-s50k'], ['s50l', '2026-09-21T08-22-34-s50l'], ['s50m', '2026-09-22T08-22-50-s50m']]) {
    const RUN = `${RUNS}/${dir}`;
    const m = computeRun(RUN);
    const timeline = JSON.parse(fs.readFileSync(`${RUN}/interview60.timeline.json`, 'utf8'));
    const offset = timeline.clock === 'playsync' ? 0 : 1150;
    const diag = fs.readFileSync(`${RUN}/verbal-diag.log`, 'utf8');
    const firstTokens = [...diag.matchAll(/^\[(\S+)\] first token (\d+)ms/gm)].map((x) => ({ at: Date.parse(x[1]), ms: Number(x[2]) }));
    const e2e = [];
    let none = 0;
    for (const id of IDS) {
        const it = m.items.find((i) => i.id === id);
        if (!it) throw new Error(`${name} ${id}: not in the timeline`);
        const ft = it.answeredAt == null ? null : firstTokens.find((f) => f.at >= it.answeredAt && f.at <= it.answeredAt + 60000);
        if (!ft) { none++; continue; }
        e2e.push(ft.at - (it.spokeEnd + offset));
    }
    e2e.sort((a, b) => a - b);
    console.log(`${name} app first token after question end: n=${e2e.length} (no match ${none}) p50 ${pct(e2e, 0.5)} p90 ${pct(e2e, 0.9)} max ${e2e.at(-1)} ms`);
}
