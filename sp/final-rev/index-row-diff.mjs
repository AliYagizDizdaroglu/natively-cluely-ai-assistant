// Throwaway (final review): INDEX.md rows are re-derived from every run folder whenever any pass
// record is written (writePassIndex -> indexRows -> collectPass). Compare passRow(collectPass(dir))
// and the rendered per-pass record under the 07a0e5e modules vs the e94305a modules, for every run.
// Read-only: collectPass reads the run folder; nothing is written.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RUNS = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.runs';
const load = async (g) => await import(pathToFileURL(path.join(g, 'interview60.pass-record.mjs')));
const before = await load(path.join(HERE, 'base07a', 'electron', 'test', 'golden'));
const after = await load(path.join(HERE, 'e94305a', 'electron', 'test', 'golden'));
if (before.collectPass === after.collectPass) throw new Error('same module twice');

let n = 0, rowChanged = 0, recChanged = 0;
for (const d of fs.readdirSync(RUNS).sort()) {
    const dir = path.join(RUNS, d);
    if (!fs.existsSync(path.join(dir, 'interview60.timeline.json'))) continue;
    let pb, pa;
    try { pb = before.collectPass(dir); } catch (e) { pb = { error: String(e?.message ?? e) }; }
    try { pa = after.collectPass(dir); } catch (e) { pa = { error: String(e?.message ?? e) }; }
    n++;
    if (pb.error || pa.error) { if (pb.error !== pa.error) console.log(`${d}: error before=${pb.error} after=${pa.error}`); continue; }
    const rb = JSON.stringify(before.passRow(pb)), ra = JSON.stringify(after.passRow(pa));
    if (rb !== ra) {
        rowChanged++;
        const ob = before.passRow(pb), oa = after.passRow(pa);
        const keys = Object.keys({ ...ob, ...oa }).filter((k) => JSON.stringify(ob[k]) !== JSON.stringify(oa[k]));
        console.log(`${d}: INDEX row differs in ${keys.map((k) => `${k} ${JSON.stringify(ob[k])} -> ${JSON.stringify(oa[k])}`).join('; ')}`);
    }
    const mb = before.renderPassRecord(pb), ma = after.renderPassRecord(pa);
    if (mb !== ma) {
        recChanged++;
        const lb = mb.split('\n'), la = ma.split('\n');
        const changed = [];
        for (let i = 0; i < Math.max(lb.length, la.length); i++) if (lb[i] !== la[i]) changed.push(`   - ${String(lb[i]).slice(0, 160)}\n   + ${String(la[i]).slice(0, 160)}`);
        console.log(`${d}: per-pass record would differ on ${changed.length} line(s)`);
        for (const c of changed.slice(0, 12)) console.log(c);
    }
}
console.log(`runs: ${n}; INDEX rows that would change: ${rowChanged}; per-pass records that would render differently: ${recChanged}`);
