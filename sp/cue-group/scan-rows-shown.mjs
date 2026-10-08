// Scans saved raw model replies (spike and probe row files) through the BUILT filter chain, as the app runs it, and
// counts the replies of which NOTHING would be shown, with their shape. Prints shapes, counts, ids and cue lines:
// never a reply's prose, never a prompt.
//   node scan-rows-shown.mjs <rows.json> [<rows.json> ...]
import fs from 'node:fs';
import path from 'node:path';
import { shape, stages } from './repro-blockonly.mjs';

for (const file of process.argv.slice(2)) {
    const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
    const list = Array.isArray(rows) ? rows : Object.values(rows);
    const withRaw = list.filter((r) => typeof r?.raw === 'string');
    console.log(`\n${path.basename(file)}: ${list.length} rows, ${withRaw.length} with a raw reply; fields: ${Object.keys(list[0] ?? {}).filter((k) => k !== 'raw').join(', ')}`);
    const groups = new Map();
    for (const r of withRaw) {
        const st = await stages(r.raw);
        const sh = shape(r.raw);
        const g = [r.arm ?? r.wording ?? r.variant ?? '-', r.model ?? '-'].join(' | ');
        const x = groups.get(g) ?? { n: 0, empty: [], moreFirst: 0, moreAny: 0, blankAfterBlock: 0, fence: 0, minShown: Infinity };
        x.n++;
        x.minShown = Math.min(x.minShown, st.w[5]);
        const iMore = sh.findIndex((s) => s.startsWith('MORE')), iProse = sh.findIndex((s) => s.startsWith('prose'));
        if (iMore !== -1) x.moreAny++;
        if (iMore !== -1 && (iProse === -1 || iMore < iProse)) x.moreFirst++;
        if (sh.some((s) => s.startsWith('FENCE'))) x.fence++;
        const lastCue = sh.map((s) => s.startsWith('cue(')).lastIndexOf(true);
        if (lastCue !== -1 && sh[lastCue + 1] === 'blank') x.blankAfterBlock++;
        if (st.w[5] === 0 && r.raw.trim()) x.empty.push({ id: `${r.id ?? '?'}#${r.rep ?? '?'}`, shape: sh.join(' '), cues: st.cues, w: st.w });
        groups.set(g, x);
    }
    for (const [g, x] of groups) {
        console.log(`  ${g}: ${x.n} replies; NOTHING shown ${x.empty.length}; smallest shown ${x.minShown} words; an offers block in ${x.moreAny}, of which BEFORE any spoken line ${x.moreFirst}; a code fence in ${x.fence}; a blank line right after the cue block in ${x.blankAfterBlock}`);
        for (const e of x.empty) console.log(`     ${e.id}: words raw ${e.w[0]} -> cue-strip ${e.w[1]} -> fences ${e.w[2]} -> line filter ${e.w[3]} -> offers ${e.w[4]} -> notation ${e.w[5]}\n        shape: ${e.shape}\n        cues ${JSON.stringify(e.cues)}`);
    }
}
