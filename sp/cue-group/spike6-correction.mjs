// Correction to the spike-6 addendum of 15:27 (its recount said "0 block-only of 216"). That recount took every word
// after the cue block as prose, offers included, so it was blind to a reply whose offers block comes BEFORE the spoken
// answer: the app's filters show nothing of such a reply. This recounts spike 6's 216 counted rows by what the BUILT
// chain would show, and the rule's primary measure with those rows taken out. Counts and ids only.
//   node spike6-correction.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { measures, ARMS, M31, M35 } from './decide-spike6.mjs';
import { shape, stages } from './repro-blockonly.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const rows = ['spike6-2026-09-30T07-04-03-320Z.json', 'spike6-2026-09-30T07-04-05-912Z.json'].flatMap((f) => JSON.parse(fs.readFileSync(path.join(HERE, f), 'utf8')));
console.log(`spike 6 counted rows: ${rows.length}`);
const shownNothing = [];
for (const r of rows) { const st = await stages(r.raw ?? ''); r.shown = st.w[5]; if (r.shown === 0) shownNothing.push(r); }
console.log(`rows of which the built chain shows nothing: ${shownNothing.length}`);
for (const r of shownNothing) console.log(`   ${r.arm} | ${r.model} ${r.id}#${r.rep} (${r.kind}; block of ${r.n} line(s)): ${shape(r.raw).join(' ')}`);
const visible = rows.filter((r) => r.shown > 0);
console.log('\narm        model            one-line-answer as registered   among replies that show text   smallest shown answer (words)');
for (const a of ARMS) for (const m of [M31, M35]) {
    const reg = measures(rows, m, a), vis = measures(visible, m, a);
    const mine = visible.filter((r) => r.model === m && r.arm === a);
    console.log(`${a.padEnd(10)} ${m.padEnd(15)} ${String(reg.oneLineAnswer).padStart(6)} of ${reg.nSimple}                    ${String(vis.oneLineAnswer).padStart(6)} of ${reg.nSimple}                 ${Math.min(...mine.map((r) => r.shown))}`);
}
const best = Math.max(...ARMS.map((a) => measures(visible, M35, a).oneLineAnswer));
console.log(`\nprimary measure with those rows taken out (3.5-lite HIGH): best ${best}; arms within 2 of it: ${ARMS.filter((a) => measures(visible, M35, a).oneLineAnswer >= best - 2).join(', ')}`);
