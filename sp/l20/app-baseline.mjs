// L20 comparator: the app's own answers and timing on the 20 items (items.json), from the s50k hour (the last
// in-app hour on the shipped model, 3.1-flash-lite LOW): first token and whole answer relative to the question's
// end, plus the four answer samples (in-app + 3 captured-low twins). Writes app-baseline.json. Read-only on MAIN.
//   node app-baseline.mjs
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const HERE = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/l20';
const RUN = `${MAIN}/electron/test/golden/interview60.runs/2026-09-20T11-22-43-s50k`;
const items = JSON.parse(fs.readFileSync(`${HERE}/items.json`, 'utf8'));
const IDS = items.pairs.flat();
const ARMS = { 'app-inapp': '', 'app-twin1': '.gemini-3.1-flash-lite_captured-low', 'app-twin2': '.gemini-3.1-flash-lite_captured-low-r2', 'app-twin3': '.gemini-3.1-flash-lite_captured-low-r3' };

const { computeRun } = await import(pathToFileURL(`${MAIN}/electron/test/golden/interview60.metrics.mjs`).href);
const m = computeRun(RUN);
const timeline = JSON.parse(fs.readFileSync(`${RUN}/interview60.timeline.json`, 'utf8'));
const offset = timeline.clock === 'playsync' ? 0 : 1150; // pre-playsync timelines stamped ~1.15 s early
const diag = fs.readFileSync(`${RUN}/verbal-diag.log`, 'utf8');
const firstTokens = [...diag.matchAll(/^\[(\S+)\] first token (\d+)ms/gm)].map((x) => ({ at: Date.parse(x[1]), ms: Number(x[2]) }));
const dbg = fs.readFileSync(`${RUN}/natively_debug.log`, 'utf8');
const done = [...dbg.matchAll(/^(\S+) \[LOG\] \[Answer\] budget: words=(\d+)/gm)].map((x) => ({ at: Date.parse(x[1]), words: Number(x[2]) }));

const out = { run: 's50k', clock: timeline.clock ?? null, offsetMs: offset, items: {} };
for (const id of IDS) {
    const it = m.items.find((i) => i.id === id);
    if (!it) throw new Error(`${id}: not in the s50k timeline`);
    const spokeEnd = it.spokeEnd + offset;
    const ft = it.answeredAt == null ? null : firstTokens.find((f) => f.at >= it.answeredAt && f.at <= it.answeredAt + 60000);
    const whole = ft ? done.find((d) => d.at >= ft.at && d.at <= ft.at + 60000) : null;
    const answers = {};
    for (const [arm, suffix] of Object.entries(ARMS)) {
        const p = JSON.parse(fs.readFileSync(`${RUN}/interview60.judge.pairs${suffix}.json`, 'utf8')).items.find((x) => x.key === id);
        if (!p) throw new Error(`${id}: missing from ${arm}`);
        answers[arm] = { question: p.question, heard: p.heard ?? null, answer: p.answer, topic: p.topic, level: p.level, kind: p.kind };
    }
    out.items[id] = { group: items.hard.flat().includes(id) ? 'hard' : 'normal', clipSecs: it.clipSecs,
        e2eMs: ft ? ft.at - spokeEnd : null, wholeMs: whole ? whole.at - spokeEnd : null, answers };
}
fs.writeFileSync(`${HERE}/app-baseline.json`, JSON.stringify(out, null, 1));
const pct = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : null);
const stat = (f, g) => { const a = IDS.filter((id) => !g || out.items[id].group === g).map((id) => out.items[id][f]).filter((x) => x != null).sort((x, y) => x - y); return `n=${a.length} p50 ${pct(a, .5)} p90 ${pct(a, .9)}`; };
for (const id of IDS) console.log(`${id.padEnd(7)} ${out.items[id].group.padEnd(6)} first ${String(out.items[id].e2eMs).padStart(6)} ms  whole ${String(out.items[id].wholeMs).padStart(6)} ms`);
console.log(`app first token after question end: all ${stat('e2eMs')} | hard ${stat('e2eMs', 'hard')} | normal ${stat('e2eMs', 'normal')}`);
console.log(`app whole answer after question end: all ${stat('wholeMs')}`);
