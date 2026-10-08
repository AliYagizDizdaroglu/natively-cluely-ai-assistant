// Temperature probe (2026-10-02 evening): fixes the item list BEFORE any call, from s50m's prior graded twins at
// temperature 0.4 (3.5-lite HIGH captured-high r1-r3 + 3.1-lite LOW captured-low r1-r3, same captured bytes).
// Rule, written before looking at any result of this probe:
//   FAILED  = items whose six prior twin draws were acceptable (correctness 2 and on_topic 2) at most 3 times,
//             lowest first, ties by id; at most 10.
//   CONTROL = the first 2 items (by id) acceptable in all six draws.
// Writes items.json (ids + prior per-item numbers). Prints ids and counts only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const RUN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m';
const J = (f) => JSON.parse(fs.readFileSync(path.join(RUN, f), 'utf8'));
const prompts = J('interview60.prompts.json');
const arms = {
    high: ['captured-high', 'captured-high-r2', 'captured-high-r3'].map((t) => `gemini-3.5-flash-lite_${t}`),
    low: ['captured-low', 'captured-low-r2', 'captured-low-r3'].map((t) => `gemini-3.1-flash-lite_${t}`),
};
const prior = {};
const graders = new Set();
for (const [leg, tags] of Object.entries(arms)) for (const tag of tags) {
    const judge = J(`interview60.judge.${tag}.json`);
    graders.add(judge.graderModel ?? 'unrecorded');
    const ans = J(`interview60.answers.${tag}.json`);
    const recs = Array.isArray(ans) ? ans : Object.values(ans.items ?? ans);
    for (const id of Object.keys(prompts)) {
        prior[id] ??= { high: [], low: [] };
        const v = judge.items[id];
        const r = recs.find((x) => x.id === id);
        prior[id][leg].push({ ok: !!v && v.correctness === 2 && v.on_topic === 2, wrong: !!v && (v.correctness === 0 || v.on_topic === 0), graded: !!v, ttft: r?.ttft ?? null, thoughts: r?.thoughts ?? null, words: r?.words ?? null });
    }
}
const okCount = (id) => [...prior[id].high, ...prior[id].low].filter((x) => x.ok).length;
const ids = Object.keys(prompts).sort();
const failed = ids.filter((id) => okCount(id) <= 3).sort((a, b) => okCount(a) - okCount(b) || a.localeCompare(b)).slice(0, 10);
const control = ids.filter((id) => okCount(id) === 6).slice(0, 2);
const items = [...failed.map((id) => ({ id, group: 'failed' })), ...control.map((id) => ({ id, group: 'control' }))]
    .map((x) => ({ ...x, prior: prior[x.id] }));
fs.writeFileSync(path.join(HERE, 'items.json'), JSON.stringify({ rule: 'failed = s50m twins acceptable <= 3/6, lowest first, max 10; control = first 2 with 6/6', source: RUN, priorGraders: [...graders], items }, null, 1));
console.log(`prior graders: ${[...graders].join(', ')}`);
for (const x of items) console.log(`${x.group.padEnd(7)} ${x.id.padEnd(7)} prior acceptable HIGH ${prior[x.id].high.filter((d) => d.ok).length}/3  LOW ${prior[x.id].low.filter((d) => d.ok).length}/3`);
console.log(`items ${items.length} (failed ${failed.length}, control ${control.length}); calls per model = ${items.length} x 3 reps x 2 arms = ${items.length * 6}`);
console.log(`all-items distribution of prior acceptable (of 6): ${JSON.stringify(ids.reduce((m, id) => (m[okCount(id)] = (m[okCount(id)] ?? 0) + 1, m), {}))}`);
