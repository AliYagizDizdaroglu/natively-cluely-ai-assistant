// Read-only: per run folder, count classify calls, not-a-question closes, nothing-heard closes.
import fs from 'node:fs';
import path from 'node:path';
const roots = process.argv.slice(2);
for (const root of roots) {
  for (const d of fs.readdirSync(root).sort()) {
    const dir = path.join(root, d);
    const log = path.join(dir, 'natively_debug.log');
    if (!fs.existsSync(log)) continue;
    const txt = fs.readFileSync(log, 'utf8');
    const cnt = (re) => (txt.match(re) ?? []).length;
    let tl = 'no-timeline';
    try { const t = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8')); tl = `${t.clock ?? 'legacy'} items=${t.items.length}`; } catch {}
    const classify = cnt(/turn: classify/g);
    if (!classify && !/turn: gate=/.test(txt)) continue; // pre-whole-turn app
    console.log(`${d.padEnd(34)} classify=${String(classify).padStart(3)} notq=${String(cnt(/close reason=not-a-question/g)).padStart(3)} nothing-heard=${String(cnt(/close reason=nothing-heard/g)).padStart(3)} dispatch-answer=${String(cnt(/dispatch: answer /g)).padStart(3)} ${tl}`);
  }
}
