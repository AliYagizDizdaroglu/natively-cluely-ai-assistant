// Applies SPIKE6-RULE.md (items 1-4 + the 09:22 addendum 5-7) to spike 6's rows. `chooseWording(rows)` is pure and
// calibrated by cal-decide-spike6.mjs. CLI: reads the spike6-*.json files written AFTER the 10:00 reset (the 08:14
// partial run is excluded by its name time) and prints every measure, each disqualification, and the winner.
//   node decide-spike6.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ARMS = ['cap3-min', 'strict-ex', 'one-first'];
export const M31 = '3.1-lite LOW', M35 = '3.5-lite HIGH';
const TERMS = { X1: /boost/i, X2: /\bno\b|\bnot\b|n't|unnecessary|invarian/i, X3: /cpu/i, X4: /parquet/i, X5: /log/i, X6: /batch/i };
const words = (s) => (String(s).match(/\S+/g) ?? []).length;
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };   // spike3's p50
const firstCarries = (r) => r.n >= 1 && Boolean(TERMS[r.id]?.test(r.cues[0]));

/** Per model x arm measures. rows: spike rows { id, kind, model, arm, n, total, cues, spec, raw }. */
export function measures(rows, model, arm) {
    const mine = rows.filter((r) => r.model === model && r.arm === arm);
    const simple = mine.filter((r) => r.kind === 'simple'), complex = mine.filter((r) => r.kind === 'complex');
    const hasText = (r) => String(r.raw ?? '').trim().length > 0;
    const spec = complex.filter((r) => r.spec != null).map((r) => r.spec);
    return {
        n: mine.length, nSimple: simple.length, nComplex: complex.length,
        emptyAll: mine.filter((r) => r.n === 0 && hasText(r)).length,          // addendum 5: text but no cue lines
        emptySimple: simple.filter((r) => r.n === 0 && hasText(r)).length,
        noText: mine.filter((r) => !hasText(r)).map((r) => `${r.id}#${r.rep}`),  // reported by name, not counted
        over3: complex.filter((r) => r.n > 3).length,
        servicesP50: spec.length ? med(spec) : null,
        oneLineAnswer: simple.filter((r) => r.n === 1 && firstCarries(r)).length,
        answerFirst: simple.filter(firstCarries).length,
        simpleWordsP50: simple.filter((r) => r.n >= 1).length ? med(simple.filter((r) => r.n >= 1).map((r) => r.total)) : null,
    };
}

/** SPIKE6-RULE.md verbatim, as code. Returns { winner, branch, table, disq }. */
export function chooseWording(rows) {
    const table = {};
    for (const arm of ARMS) table[arm] = { [M31]: measures(rows, M31, arm), [M35]: measures(rows, M35, arm) };
    const disq = {};
    for (const arm of ARMS) {
        const why = [];
        for (const m of [M31, M35]) {
            const x = table[arm][m];
            if (x.over3 > 2) why.push(`${m}: complex over 3 lines ${x.over3} of ${x.nComplex} > 2`);                   // item 1
            if (x.servicesP50 != null && x.servicesP50 < 5) why.push(`${m}: S1Q09 services p50 ${x.servicesP50} < 5`);  // item 1
            if (x.emptySimple > 2) why.push(`${m}: empty simple blocks ${x.emptySimple} of ${x.nSimple} > 2`);         // item 1
        }
        if (table[arm][M35].emptyAll > 1) why.push(`${M35}: empty blocks ${table[arm][M35].emptyAll} of ${table[arm][M35].n} > 1`);  // item 5
        if (why.length) disq[arm] = why;
    }
    const alive = ARMS.filter((a) => !disq[a]);
    const emptiesBoth = (a) => table[a][M31].emptyAll + table[a][M35].emptyAll;
    if (!alive.length) {   // item 7
        const order = [...ARMS].sort((a, b) => (table[a][M31].over3 + table[a][M35].over3) - (table[b][M31].over3 + table[b][M35].over3)
            || emptiesBoth(a) - emptiesBoth(b) || (a === 'strict-ex' ? -1 : b === 'strict-ex' ? 1 : 0));
        return { winner: order[0], branch: 'every arm disqualified: best-guarding arm (item 7)', table, disq };
    }
    const best = Math.max(...alive.map((a) => table[a][M35].oneLineAnswer));                       // item 2
    const tied = alive.filter((a) => table[a][M35].oneLineAnswer >= best - 2);                        // item 3: within 2
    if (tied.length === 1) return { winner: tied[0], branch: `primary: 3.5-lite one-line-answer ${best}`, table, disq };
    const af = (a) => table[a][M31].answerFirst + table[a][M35].answerFirst;
    const order = [...tied].sort((a, b) => emptiesBoth(a) - emptiesBoth(b)                             // item 6
        || af(b) - af(a)                                                                              // item 3
        || (table[a][M35].simpleWordsP50 ?? 99) - (table[b][M35].simpleWordsP50 ?? 99)
        || (a === 'strict-ex' ? -1 : b === 'strict-ex' ? 1 : 0));
    return { winner: order[0], branch: `tie within 2 of ${best} among ${tied.join(', ')}: fewest empties, then answer-first, then words, then strict-ex`, table, disq };
}

if (process.argv[1] && path.basename(process.argv[1]) === 'decide-spike6.mjs') {   // not when cal-decide-spike6.mjs imports it
    const HERE = path.dirname(fileURLToPath(import.meta.url));
    const files = fs.readdirSync(HERE).filter((f) => /^spike6-2026-09-30T(\d\d)-(\d\d).*\.json$/.test(f)).filter((f) => {
        const [, h, m] = f.match(/T(\d\d)-(\d\d)/); return Number(h) * 60 + Number(m) >= 7 * 60;   // UTC 07:00 = the 10:00 reset
    });
    const rows = files.flatMap((f) => JSON.parse(fs.readFileSync(path.join(HERE, f), 'utf8')));
    console.log(`files: ${files.join(', ')}  rows ${rows.length} (expect 216)`);
    const r = chooseWording(rows);
    console.log('arm        model           n  empty(all/simple)  noText  over3  S1Q09svc  1-line-answer  answer-first  words p50');
    for (const a of ARMS) for (const m of [M31, M35]) {
        const x = r.table[a][m];
        console.log(`${a.padEnd(10)} ${m.padEnd(14)} ${String(x.n).padStart(3)}  ${String(x.emptyAll).padStart(3)}/${String(x.emptySimple).padEnd(12)} ${String(x.noText.length).padStart(3)}  ${String(x.over3).padStart(5)}  ${String(x.servicesP50).padStart(8)}  ${String(x.oneLineAnswer).padStart(13)}  ${String(x.answerFirst).padStart(12)}  ${String(x.simpleWordsP50).padStart(9)}${x.noText.length ? `  no text: ${x.noText.join(',')}` : ''}`);
    }
    for (const [a, why] of Object.entries(r.disq)) console.log(`DISQUALIFIED ${a}: ${why.join('; ')}`);
    console.log(`WINNER: ${r.winner}  (${r.branch})`);
}
