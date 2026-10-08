// Throwaway: decompose the s50i in-app vs offline-twin gap. Same model, same level, same bytes,
// so the only candidates are (a) the 200-word guard, which the app applies and the offline arm
// does not, (b) supersede regenerations, (c) stall fallbacks, (d) sampling. Prints, per question
// that moved, what mechanical cause is present — and how often the offline arm wrote text the
// app's guard would have cut.
import fs from 'node:fs';
import path from 'node:path';
const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const RUN = path.join(PROJ, 'electron/test/golden/interview60.runs/2026-09-18T08-22-57-s50i');
const HERE = path.dirname(new URL(import.meta.url).pathname.slice(1));
const { verdictOf } = await import(`file:///${path.join(PROJ, 'electron/test/golden/interview60.judge.mjs').replace(/\\/g, '/')}`);

const vin = JSON.parse(fs.readFileSync(path.join(HERE, 's50i-verdicts-inapp.json'), 'utf8'));
const vcl = JSON.parse(fs.readFileSync(path.join(HERE, 's50i-verdicts-captured-low.json'), 'utf8'));
const pairs = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(RUN, 'interview60.judge.pairs.json'), 'utf8')).items.map((p) => [p.id, p]));
const off = JSON.parse(fs.readFileSync(path.join(RUN, 'interview60.answers.gemini-3.1-flash-lite_captured-low.json'), 'utf8'));
const words = (t) => (String(t ?? '').trim().match(/\S+/g) || []).length;
const acc = (v) => v && verdictOf(v) === 'acceptable';

// how often would the app's 200-word guard have fired on the offline arm's text?
const offRows = Object.values(off).filter((v) => v && v.spoken);
const wouldCut = offRows.filter((v) => v.words >= 200);
console.log(`offline arm answers: ${offRows.length};  at or over the app's 200-word guard: ${wouldCut.length}` +
    `${wouldCut.length ? ` (${wouldCut.map((v) => `${v.id} ${v.words}w`).join(', ')})` : ''}`);
const inRows = Object.values(pairs).map((p) => words(p.answer));
console.log(`in-app answers: ${inRows.length};  at the 200-word guard exactly: ${inRows.filter((w) => w === 200).length};  max ${Math.max(...inRows)}w` +
    `   offline max ${Math.max(...offRows.map((v) => v.words))}w\n`);

console.log('questions that MOVED between the live hour and its offline twin');
console.log('id       dir  in-app w  offline w  mechanical cause present');
let mech = 0, plain = 0;
for (const id of Object.keys(vcl).sort()) {
    if (!(id in vin)) continue;
    const a = acc(vcl[id]), b = acc(vin[id]);
    if (a === b) continue;
    const p = pairs[id], o = off[id];
    const iw = words(p?.answer), ow = o?.words ?? null;
    const causes = [];
    if (iw >= 200) causes.push('GUARD CUT the live answer');
    if (p?.superseded) causes.push('superseded (regenerated live)');
    if (!causes.length) causes.push('none — sampling');
    if (!b) { if (causes[0].startsWith('none')) plain++; else mech++; }
    console.log(`${id.padEnd(8)} ${(a && !b ? 'down' : 'up  ')} ${String(iw).padStart(8)} ${String(ow ?? '—').padStart(10)}  ${causes.join('; ')}`);
}
console.log(`\ndown-moves with a mechanical cause: ${mech};  down-moves with none (sampling or unexplained): ${plain}`);
