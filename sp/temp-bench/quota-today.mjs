// Requests spent today (quota day from 07:00 UTC 2026-10-02) per answer model, counted from the h40d run folder's
// offline arm files (one request per answered item; a failed or retried call is not visible here, so this is a FLOOR)
// and the hour's in-app hedge legs from the hedge-stats reading. Prints counts only.
import fs from 'node:fs';
import path from 'node:path';
const G = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden';
const RUN = `${G}/interview60.runs/2026-10-02T11-39-41-h40d`;
const dayStart = Date.parse('2026-10-02T07:00:00Z');
const per = {};
const add = (m, n, why) => { per[m] ??= { n: 0, parts: [] }; per[m].n += n; per[m].parts.push(`${why} ${n}`); };
for (const f of fs.readdirSync(RUN).filter((x) => /^interview60\.answers\.gemini-.+\.json$/.test(x))) {
    const st = fs.statSync(path.join(RUN, f));
    if (st.mtimeMs < dayStart) continue;
    const j = JSON.parse(fs.readFileSync(path.join(RUN, f), 'utf8'));
    const items = Array.isArray(j) ? j : (j.items ?? j.answers ?? Object.values(j));
    const n = Array.isArray(items) ? items.length : Object.keys(items).length;
    const m = f.match(/^interview60\.answers\.(gemini-[0-9.]+-flash(?:-lite)?)/)[1];
    add(m, n, f.replace(/^interview60\.answers\./, '').replace(/\.json$/, ''));
}
// golden-root copies written today that are NOT in the run folder (e.g. the 3.8 sidecar)
for (const f of fs.readdirSync(G).filter((x) => /^interview60\.answers\.gemini-.+\.json$/.test(x))) {
    if (fs.existsSync(path.join(RUN, f))) continue;
    const st = fs.statSync(path.join(G, f));
    if (st.mtimeMs < dayStart) continue;
    const j = JSON.parse(fs.readFileSync(path.join(G, f), 'utf8'));
    const items = Array.isArray(j) ? j : (j.items ?? j.answers ?? Object.values(j));
    const m = f.match(/^interview60\.answers\.(gemini-[0-9.]+-flash(?:-lite)?)/)[1];
    add(m, Array.isArray(items) ? items.length : Object.keys(items).length, `root:${f.replace(/^interview60\.answers\./, '').replace(/\.json$/, '')}`);
}
// in-app: 45 hedge fronts (3.5-lite) + 9 back legs (3.1-lite), from h40d-hedge-stats.out.txt
add('gemini-3.5-flash-lite', 45, 'in-app hedge fronts');
add('gemini-3.1-flash-lite', 9, 'in-app back legs');
for (const [m, v] of Object.entries(per)) console.log(`${m}: ~${v.n} requests (floor)  [${v.parts.join(', ')}]`);
