// ET10 comparator: the app's own answers and timing on the 10 test items, from the s50k hour (the last
// in-app hour on the shipped model, 3.1-flash-lite LOW). Writes app-baseline.json. Read-only on MAIN.
//   node app-baseline.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1');
const RUN = `${MAIN}/electron/test/golden/interview60.runs/2026-09-20T11-22-43-s50k`;
export const IDS = ['S1Q02', 'S1Q02F', 'S1Q04', 'S1Q04F', 'S1Q05', 'S1Q05F', 'S1Q07', 'S1Q07F', 'S2Q02', 'S2Q02F'];
const ARMS = { 'app-inapp': '', 'app-twin1': '.gemini-3.1-flash-lite_captured-low', 'app-twin2': '.gemini-3.1-flash-lite_captured-low-r2', 'app-twin3': '.gemini-3.1-flash-lite_captured-low-r3' };

const { computeRun } = await import(pathToFileURL(`${MAIN}/electron/test/golden/interview60.metrics.mjs`).href);
const m = computeRun(RUN);
const timeline = JSON.parse(fs.readFileSync(`${RUN}/interview60.timeline.json`, 'utf8'));
// Timelines before the playsync clock stamped startedMs ~1.15 s before the audio really began.
const offset = timeline.clock === 'playsync' ? 0 : 1150;
const diag = fs.readFileSync(`${RUN}/verbal-diag.log`, 'utf8');
const firstTokens = [...diag.matchAll(/^\[(\S+)\] first token (\d+)ms/gm)].map((x) => ({ at: Date.parse(x[1]), ms: Number(x[2]) }));

const out = { run: path.basename(RUN), clock: timeline.clock ?? null, offsetMs: offset, items: {} };
for (const id of IDS) {
    const it = m.items.find((i) => i.id === id);
    if (!it) throw new Error(`${id}: not in the s50k timeline`);
    const spokeEnd = it.spokeEnd + offset;
    const ft = it.answeredAt == null ? null : firstTokens.find((f) => f.at >= it.answeredAt && f.at <= it.answeredAt + 60000);
    const answers = {};
    for (const [arm, suffix] of Object.entries(ARMS)) {
        const pairs = JSON.parse(fs.readFileSync(`${RUN}/interview60.judge.pairs${suffix}.json`, 'utf8'));
        const p = pairs.items.find((x) => x.key === id);
        if (!p) throw new Error(`${id}: missing from ${arm}`);
        const v = JSON.parse(fs.readFileSync(`${RUN}/interview60.judge.verdicts${suffix}.json`, 'utf8'))[id];
        answers[arm] = { question: p.question, heard: p.heard ?? null, answer: p.answer, topic: p.topic, level: p.level, kind: p.kind,
            oldVerdict: v ? { ...v, acceptable: v.correctness === 2 && v.on_topic === 2 && v.delivery >= 1 } : null };
    }
    out.items[id] = {
        clipSecs: it.clipSecs, detectMs: it.answeredAt == null ? null : it.answeredAt - spokeEnd,
        modelTtftMs: ft?.ms ?? null, e2eMs: ft ? ft.at - spokeEnd : null, answers,
    };
}
fs.writeFileSync(`${HERE}/app-baseline.json`, JSON.stringify(out, null, 1));
const pct = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : null);
const e2e = IDS.map((id) => out.items[id].e2eMs).filter((x) => x != null).sort((a, b) => a - b);
console.log(`s50k clock=${out.clock} offset=${offset}ms`);
for (const id of IDS) {
    const r = out.items[id];
    const acc = Object.entries(r.answers).map(([a, x]) => `${a.replace('app-', '')}:${x.oldVerdict?.acceptable ? 'A' : x.oldVerdict ? 'w' : '?'}`).join(' ');
    console.log(`${id.padEnd(7)} detect ${String(r.detectMs).padStart(6)} ms  model ${String(r.modelTtftMs).padStart(6)} ms  e2e ${String(r.e2eMs).padStart(6)} ms   old verdicts ${acc}`);
}
console.log(`app e2e (question end -> first token) n=${e2e.length} p50 ${pct(e2e, 0.5)} ms p90 ${pct(e2e, 0.9)} ms`);
