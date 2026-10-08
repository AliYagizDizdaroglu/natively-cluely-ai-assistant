/**
 * THROWAWAY BENCH — per-arm view of the 2026-09-17 bench: acceptable / weak / wrong per arm,
 * split mains vs follow-ups, per rep and pooled over every grader that saw the arm, plus words
 * and time-to-first-spoken from the rep files. Same verdict rule as the flights (verdictOf).
 */
import fs from 'node:fs';
import path from 'node:path';

const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const HERE = path.dirname(new URL(import.meta.url).pathname.slice(1));
const OUT = path.join(HERE, 'bench');
const { verdictOf } = await import(`file:///${path.join(PROJ, '.claude/worktrees/whole-turn/electron/test/golden/interview60.judge.mjs').replace(/\\/g, '/')}`);

const ARMS = ['control', 'think-low', 'think-high', 'bare', 'bare-low', 'bare-high', 'gemma26-min', 'gemma26-min-bare', 'think35-medium', 'think35-high'];
// The 2026-09-17 and 2026-09-18 pairings (earlier coverage/scaffold pairings graded control too;
// keep the instrument to these graders). think-low appears on both sides across days, so it
// carries more graders per answer than the arms it was paired against — the pooled row says how many.
const TODAY = /^pairs\.(control|gemma26-min|bare|think-low)r\d-vs-(think-low|think-high|bare|bare-low|bare-high|gemma26-min|gemma26-min-bare|think35-medium|think35-high)r\d\.h\d\.key\.json$/;

// arm -> rep -> id -> [verdict strings]
const seen = {};
for (const kf of fs.readdirSync(OUT).filter((f) => TODAY.test(f)).sort()) {
    const tag = kf.slice('pairs.'.length, -'.key.json'.length);
    const vf = path.join(OUT, `verdicts.${tag}.json`);
    if (!fs.existsSync(vf)) { console.error(`missing verdicts for ${tag}`); continue; }
    const key = JSON.parse(fs.readFileSync(path.join(OUT, kf), 'utf8'));
    const verdicts = JSON.parse(fs.readFileSync(vf, 'utf8'));
    for (const [k, meta] of Object.entries(key)) {
        const v = verdicts[k];
        if (!v) continue;
        ((seen[meta.arm] ??= {})[meta.rep] ??= {})[meta.id] ??= [];
        seen[meta.arm][meta.rep][meta.id].push(verdictOf(v));
    }
}

const isMain = (id) => !id.endsWith('F');
const pct = (arr, q) => { const s = [...arr].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * q))] : null; };
const count = (list) => { const c = { acceptable: 0, weak: 0, wrong: 0 }; for (const v of list) c[v]++; return c; };

for (const arm of ARMS) {
    const reps = seen[arm];
    if (!reps) { console.log(`\n== ${arm}: not graded today`); continue; }
    console.log(`\n== ${arm}`);
    console.log('rep   mains: ok/weak/wrong (of 19, majority over graders)   follow-ups: ok/weak/wrong (of 20)   graders/answer');
    const pooled = { m: [], f: [] };
    for (const rep of Object.keys(reps).sort()) {
        const m = { acceptable: 0, weak: 0, wrong: 0 }, f = { acceptable: 0, weak: 0, wrong: 0 };
        let gradersTotal = 0, answers = 0;
        for (const [id, list] of Object.entries(reps[rep])) {
            gradersTotal += list.length; answers++;
            // majority verdict per answer; a tie between graders counts as the worse one
            const c = count(list);
            const maj = ['wrong', 'weak', 'acceptable'].reduce((best, v) => (c[v] > c[best] ? v : best), 'wrong'); // most votes; tie -> the worse verdict
            (isMain(id) ? m : f)[maj]++;
            pooled[isMain(id) ? 'm' : 'f'].push(...list);
        }
        const mm = `${m.acceptable}/${m.weak}/${m.wrong}`, ff = `${f.acceptable}/${f.weak}/${f.wrong}`;
        console.log(`r${rep}    ${mm.padEnd(46)} ${ff.padEnd(36)} ${(gradersTotal / answers).toFixed(1)}`);
    }
    const pm = count(pooled.m), pf = count(pooled.f);
    const n = (c) => c.acceptable + c.weak + c.wrong;
    console.log(`pooled over every grader: mains ${pm.acceptable}/${pm.weak}/${pm.wrong} of ${n(pm)} (${(100 * pm.acceptable / n(pm)).toFixed(0)} % ok, ${(100 * pm.wrong / n(pm)).toFixed(0)} % wrong)` +
        (n(pf) ? `   follow-ups ${pf.acceptable}/${pf.weak}/${pf.wrong} of ${n(pf)} (${(100 * pf.acceptable / n(pf)).toFixed(0)} % ok)` : '   follow-ups: not in this arm'));

    const rows = [];
    for (const rf of fs.readdirSync(OUT).filter((f) => f.startsWith(`${arm}.rep`) && f.endsWith('.json'))) {
        for (const v of Object.values(JSON.parse(fs.readFileSync(path.join(OUT, rf), 'utf8')))) if (v.spoken) rows.push(v);
    }
    const ws = rows.map((r) => r.words), ts = rows.map((r) => r.ttfs);
    console.log(`latency/length over ${rows.length} answers: ttfs p50 ${pct(ts, .5)} ms, p90 ${pct(ts, .9)} ms, max ${Math.max(...ts)} ms; words p50 ${pct(ws, .5)}, p90 ${pct(ws, .9)}, max ${Math.max(...ws)}, >150 w ${ws.filter((w) => w > 150).length}, >200 w ${ws.filter((w) => w > 200).length}`);
}
