// h40d: R31 (the one long item, rule 5b): its roster text, its timeline window, and the dispatch / Live / STT lines in
// that window (question texts and verdicts only; never an answer or a prompt).
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const G = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden';
const R = `${G}/interview60.runs/2026-10-02T11-39-41-h40d`;
const id = process.argv[2] ?? 'R31';
const ho = await import(pathToFileURL(`${G}/holdout40.questions.mjs`).href);
const list = Object.values(ho).find((v) => Array.isArray(v) && v.some?.((x) => x?.id === id));
const item = list.find((x) => x.id === id);
console.log(`${id} roster (${(item.q.match(/\S+/g) || []).length} words): ${item.q}`);
const T = JSON.parse(fs.readFileSync(`${R}/interview60.timeline.json`, 'utf8'));
const items = Array.isArray(T) ? T : T.items ?? Object.values(T).find(Array.isArray);
const ti = items.findIndex((x) => x.id === id);
const t = items[ti], next = items[ti + 1];
console.log(`timeline: startSec ${t.startSec} clipSecs ${t.clipSecs} playedAt ${JSON.stringify(t.playedAt)}; next ${next?.id} startSec ${next?.startSec}`);
const t0 = Date.parse(T.startedAt ?? T.startedIso ?? "") || null;
const startMs = t.startSec * 1000, endMs = next ? next.startSec * 1000 : startMs + 120000;
const base = T.startedAt ?? T.startedMs ?? T.t0 ?? null;
console.log(`window: start ${startMs} end ${endMs} (run base ${JSON.stringify(base)}; t0 ${t0})`);
const absStart = t0 + startMs, absEnd = t0 + endMs;
console.log(`absolute ${absStart ? new Date(absStart).toISOString() : '?'} .. ${absEnd ? new Date(absEnd).toISOString() : '?'}`);
if (!absStart) process.exit(0);
for (const line of fs.readFileSync(`${R}/natively_debug.log`, 'utf8').split('\n')) {
    const ts = Date.parse(line.slice(0, 24)); if (!(ts >= absStart - 2000 && ts <= absEnd)) continue;
    if (/dispatch: |\[LiveRouter\]|Deepgram.*final|question=|not-a-question|fragment|supersede|turn /i.test(line)) console.log(line.slice(0, 330));
}
