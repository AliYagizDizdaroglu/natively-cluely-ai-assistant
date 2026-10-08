// Throwaway: per-question acceptable rate per arm over EVERY graded bench answer (each grading
// of an answer is one sample). Shows which questions are coin flips and which are hard.
import fs from 'node:fs';
import path from 'node:path';
const HERE = path.dirname(new URL(import.meta.url).pathname.slice(1));
const OUT = path.join(HERE, 'bench');
const acc = (v) => v.correctness === 2 && v.on_topic === 2 && v.delivery >= 1;
const stats = {}; // arm -> id -> {n, ok}
for (const kf of fs.readdirSync(OUT).filter((f) => f.startsWith('pairs.') && f.endsWith('.key.json'))) {
    const tag = kf.slice('pairs.'.length, -'.key.json'.length);
    const vf = path.join(OUT, `verdicts.${tag}.json`);
    if (!fs.existsSync(vf)) continue;
    const key = JSON.parse(fs.readFileSync(path.join(OUT, kf), 'utf8'));
    const verdicts = JSON.parse(fs.readFileSync(vf, 'utf8'));
    for (const [k, meta] of Object.entries(key)) {
        const v = verdicts[k]; if (!v) continue;
        const s = ((stats[meta.arm] ??= {})[meta.id] ??= { n: 0, ok: 0 });
        s.n++; if (acc(v)) s.ok++;
    }
}
const arms = Object.keys(stats).sort();
const ids = [...new Set(arms.flatMap((a) => Object.keys(stats[a])))].sort();
const rate = (a, id) => { const s = stats[a]?.[id]; return s ? `${String(s.ok).padStart(2)}/${String(s.n).padEnd(2)} ${(s.ok / s.n).toFixed(2)}` : '      --  '; };
console.log('id      ' + arms.map((a) => a.padEnd(14)).join(''));
const rows = ids.map((id) => ({ id, p: stats.control?.[id] ? stats.control[id].ok / stats.control[id].n : NaN }));
rows.sort((x, y) => x.p - y.p);
for (const { id } of rows) console.log(id.padEnd(8) + arms.map((a) => rate(a, id).padEnd(14)).join(''));
for (const a of arms) {
    const mains = ids.filter((i) => !i.endsWith('F') && stats[a][i]), fups = ids.filter((i) => i.endsWith('F') && stats[a][i]);
    const sum = (list) => list.reduce((t, i) => t + stats[a][i].ok / stats[a][i].n, 0);
    const buckets = (list) => { const ps = list.map((i) => stats[a][i].ok / stats[a][i].n); return `>=0.9: ${ps.filter((p) => p >= 0.9).length}  0.5-0.9: ${ps.filter((p) => p >= 0.5 && p < 0.9).length}  <0.5: ${ps.filter((p) => p < 0.5).length}`; };
    console.log(`\n${a}: expected mains ${sum(mains).toFixed(1)}/${mains.length}  follow-ups ${sum(fups).toFixed(1)}/${fups.length}   mains buckets ${buckets(mains)}   follow-up buckets ${buckets(fups)}`);
}
