// Re-check r3, new fact (a): how often 3c's band clause (max over cue reps >= min over no-cue reps, else STOP)
// fails when the cue arm really is lower by delta acceptable answers per rep, as the bench measured on scenario50
// (-2, -3, -3 of 39; about -2.7 per rep; scaled to holdout40's 44 ids about -3). Reps iid normal with rep-to-rep SD
// sigma, rounded to integer counts (one grader per arm on h40d); ties pass (">="). A sketch with stated assumptions,
// not a calibration: the reps of one hour share their bytes, so real rep-to-rep spread is what the twins show.
// Also: the twins' own rep-to-rep SD on holdout40, from the h40a-h40c captured-high per-rep counts printed by the
// reviewer's mains-band.mjs / pass records is about 1-1.5 (bands [36, 38] h40c, [36, 39] h40b).
let seed = 12345;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const norm = () => { let u = 0, v = 0; while (u === 0) u = rnd(); while (v === 0) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const N = 200000;
for (const sigma of [1.0, 1.5, 2.0]) {
    const row = [];
    for (const delta of [0, 1, 2, 2.7, 3, 4]) {
        let fail = 0;
        for (let i = 0; i < N; i++) {
            const c = [0, 0, 0].map(() => Math.round(37 + sigma * norm()));
            const q = [0, 0, 0].map(() => Math.round(37 - delta + sigma * norm()));
            if (Math.max(...q) < Math.min(...c)) fail++;
        }
        row.push(`delta ${delta}: ${(100 * fail / N).toFixed(1)}%`);
    }
    console.log(`sigma ${sigma}: band STOP  ${row.join('   ')}`);
}
