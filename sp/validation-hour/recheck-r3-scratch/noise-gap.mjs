// Re-check r3, finding on rule 3a's noise reading: the in-app acceptable count on the ids shared with the cue twins
// (best answer per item) against each captured-high rep's acceptable count on the same ids, h40a-h40c. Ids and counts
// only; never an answer or a grader reason.
import fs from 'node:fs';
import path from 'node:path';
const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const rank = { acceptable: 3, weak: 2, wrong: 1 };
for (const r of ['2026-09-24T08-20-12-h40a', '2026-09-26T11-39-51-h40b', '2026-09-29T11-42-00-h40c']) {
    const dir = path.join(RUNS, r);
    const load = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const best = (j) => {
        const m = new Map();
        for (const [k, v] of Object.entries(j.items ?? {})) {
            if (v.kind !== 'spoken') continue;
            const id = v.id ?? k.replace(/#\d+$/, '');
            const cur = m.get(id);
            if (!cur || (rank[v.verdict] ?? 0) > (rank[cur] ?? 0)) m.set(id, v.verdict);
        }
        return m;
    };
    const inapp = best(load('interview60.judge.json'));
    const reps = ['', '-r2', '-r3'].map((s) => best(load(`interview60.judge.gemini-3.5-flash-lite_captured-high${s}.json`)));
    const shared = [...reps[0].keys()].filter((id) => reps.every((m) => m.has(id)));
    const acc = (m, ids) => ids.filter((id) => m.get(id) === 'acceptable').length;
    const inappAll = [...inapp.values()].filter((v) => v === 'acceptable').length;
    const twinCounts = reps.map((m) => acc(m, shared));
    const inShared = acc(inapp, shared);
    const lowest = Math.min(...twinCounts);
    console.log(`${r.slice(-4)}: in-app ids graded ${inapp.size}, acceptable ${inappAll}; shared ids ${shared.length}; in-app on shared ${inShared}; cue twins on shared ${twinCounts.join(' / ')}; lowest ${lowest}; gap ${lowest - inShared} -> ${lowest - inShared <= 1 ? 'within 1 (noise condition holds)' : 'more than 1'}; in-app ids not shared: ${[...inapp.keys()].filter((id) => !shared.includes(id)).join(' ') || '-'}`);
}
