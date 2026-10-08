// Throwaway: for every abnormal session close in the L20 runs, the item, attempt, when it happened relative to the
// question's end, and the model's output text in that attempt up to the drop — to tell a content-triggered failure
// from a time-clustered outage. Also prints the scripted question of each affected item.
//   node drops.mjs
import fs from 'node:fs';
const HERE = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/l20c';
const app = JSON.parse(fs.readFileSync(`${HERE}/app-baseline.json`, 'utf8'));
const affected = new Set();
for (const r of [1, 2, 3]) {
    const f = `${HERE}/runs/live38-r${r}.json`;
    if (!fs.existsSync(f)) continue;
    const R = JSON.parse(fs.readFileSync(f, 'utf8'));
    const E = R.events;
    E.forEach((e, i) => {
        if (e.kind !== 'close' || e.code === 1000) return;
        // walk back to this session's 'open' to collect its output
        let j = i; while (j > 0 && E[j].kind !== 'open') j--;
        const out = E.slice(j, i).filter((x) => x.kind === 'outputTx').map((x) => `[${String(x.item).replace('~a1', '')}] ${x.text}`).join('');
        const gen = E.slice(j, i).filter((x) => x.kind === 'generationComplete').map((x) => String(x.item).replace('~a1', ''));
        const id = String(e.item).replace('~a1', '');
        affected.add(id.replace(/F$/, ''));
        console.log(`r${r} ${String(e.item).padEnd(9)} +${(e.t / 1000).toFixed(0)}s run clock, ${e.sinceClipEnd == null ? 'during the question' : `${(e.sinceClipEnd / 1000).toFixed(1)} s after its end`}: code ${e.code} "${e.reason}"`);
        console.log(`   generationComplete for: ${gen.join(', ') || 'none'}\n   output in this attempt: ${out.slice(0, 400) || '(none)'}${out.length > 400 ? '…' : ''}`);
    });
}
for (const m of affected) for (const id of [m, `${m}F`]) console.log(`\n${id}: ${app.items[id]?.answers['app-inapp'].question}`);
