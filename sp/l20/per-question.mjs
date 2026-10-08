// Throwaway: per-question outcome of gemini-3.8-live across L20 r1-r3 (every attempt) and today's health probes,
// plus the thought tokens the usage events report for each attempt (does the bare model think before answering?).
import fs from 'node:fs';
const HERE = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/l20';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;
const rows = new Map(); // id -> [{src, ok, firstMs, thoughts, how}]
const add = (id, r) => rows.set(id, [...(rows.get(id) ?? []), r]);
for (const rep of [1, 2, 3]) {
    const R = JSON.parse(fs.readFileSync(`${HERE}/runs/live38-r${rep}.json`, 'utf8'));
    const byItem = new Map();
    for (const e of R.events) if (e.item) byItem.set(e.item, [...(byItem.get(e.item) ?? []), e]);
    for (const [item, evs] of byItem) {
        const id = item.replace(/~a1$/, ''), attempt = item.endsWith('~a1') ? 'a1' : 'last';
        const clipEnd = evs.find((e) => e.kind === 'clipEnd');
        if (!clipEnd) { add(id, { src: `r${rep}${attempt === 'a1' ? 'a1' : ''}`, ok: false, how: 'cut before clip end' }); continue; }
        const after = evs.filter((e) => e.t >= clipEnd.t);
        const tx = after.filter((e) => e.kind === 'outputTx').map((e) => e.text).join('');
        const first = after.find((e) => e.kind === 'outputTx');
        const thoughts = Math.max(0, ...after.filter((e) => e.kind === 'usage').map((e) => e.thoughts ?? 0));
        const close = after.find((e) => e.kind === 'close');
        const ok = words(tx) >= 25;
        add(id, { src: `r${rep}${attempt === 'a1' ? 'a1' : ''}`, ok, firstMs: first ? first.t - clipEnd.t : null, thoughts, how: ok ? 'answered' : close && close.code !== 1000 ? `${close.code}` : 'silent' });
    }
}
for (const f of fs.readdirSync(`${HERE}/health`).filter((f) => f.endsWith('Z.json')).sort()) {
    const H = JSON.parse(fs.readFileSync(`${HERE}/health/${f}`, 'utf8'));
    for (const r of H.results) {
        const ok = r.firstWordMs != null && words(r.text) >= 25;
        add(r.id, { src: `probe ${H.t0Iso.slice(11, 16)}Z${r.comp ? ` comp=${r.comp}` : ''}`, ok, firstMs: r.firstWordMs, thoughts: null, how: ok ? 'answered' : r.abnormal && r.closed?.code ? `${r.closed.code}` : 'silent' });
    }
}
const qsrc = fs.readFileSync(`${MAIN}/electron/test/golden/scenario50.questions.mjs`, 'utf8');
const qtext = (id) => { const m = qsrc.match(new RegExp(`id:\\s*['"]${id}['"][\\s\\S]{0,400}?text:\\s*(['"\`])([\\s\\S]*?)\\1`)); return m ? m[2].replace(/\s+/g, ' ').slice(0, 150) : '(text not found)'; };
for (const id of ['S1Q02', 'S1Q06', 'S1Q04', 'S2Q01', 'S2Q08']) {
    const rs = rows.get(id) ?? [];
    console.log(`\n${id}: answered ${rs.filter((r) => r.ok).length}/${rs.length} — ${qtext(id)}`);
    for (const r of rs) console.log(`  ${r.src.padEnd(22)} ${r.how.padEnd(9)} first ${r.firstMs == null ? '-' : (r.firstMs / 1000).toFixed(1) + ' s'}${r.thoughts == null ? '' : `  thoughts ${r.thoughts}`}`);
}
const all = [...rows.values()].flat().filter((r) => r.thoughts != null && r.ok);
console.log(`\nL20 answered attempts: ${all.length}; with thought tokens > 0: ${all.filter((r) => r.thoughts > 0).length}; min ${Math.min(...all.map((r) => r.thoughts))}, max ${Math.max(...all.map((r) => r.thoughts))}`);
