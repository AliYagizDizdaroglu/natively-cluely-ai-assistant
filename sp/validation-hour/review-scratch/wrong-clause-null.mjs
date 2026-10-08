// Review scratch: exact null probability that benchDecide's wrong clause STOPs (some cue rep has more wrong than
// the worst control rep, i.e. max(cue) > max(control)) when cue and control reps are iid draws from the same
// per-rep distribution. Distributions are the observed per-rep counts on the 3.5-lite HIGH captured twins of
// h40b and h40c (six reps), from twin-wrongs.mjs. No file is read; the counts are typed in.
const cases = {
    'verdictOf wrong, all ids (h40b 3,1,2; h40c 1,0,2)': [3, 1, 2, 1, 0, 2],
    'correctness 0, all ids (h40b 2,1,1; h40c 1,0,2)': [2, 1, 1, 1, 0, 2],
    'either, the 40 gated ids (h40a-h40c, nine reps, all 0)': [0, 0, 0, 0, 0, 0, 0, 0, 0],
};
for (const [name, obs] of Object.entries(cases)) {
    const vals = [...new Set(obs)].sort((a, b) => a - b);
    const p = Object.fromEntries(vals.map((v) => [v, obs.filter((x) => x === v).length / obs.length]));
    const cdf = (k) => vals.filter((v) => v <= k).reduce((s, v) => s + p[v], 0);
    const pmax = Object.fromEntries(vals.map((v, i) => [v, cdf(v) ** 3 - (i ? cdf(vals[i - 1]) ** 3 : 0)]));
    let stop = 0;
    for (const a of vals) for (const b of vals) if (a > b) stop += pmax[a] * pmax[b];
    console.log(`${name}: P(STOP | no cue effect) = ${(stop * 100).toFixed(1)}%`);
}
