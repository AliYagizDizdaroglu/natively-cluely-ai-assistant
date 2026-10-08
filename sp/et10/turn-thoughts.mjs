// Throwaway: per item, each model turn in time order with the thought tokens Google reported for it (the usage
// message that follows the turn), so the "system error" turns can be compared with the turns that answered.
// Also lists error events and session close codes.
//   node turn-thoughts.mjs <run.json>...
import fs from 'node:fs';
import path from 'node:path';
for (const f of process.argv.slice(2)) {
    const R = JSON.parse(fs.readFileSync(f, 'utf8'));
    const items = R.pairs ? R.pairs.flat() : R.items;
    console.log(`== ${path.basename(f)} (${R.level})`);
    for (const id of items) {
        const ev = R.events.filter((e) => e.item === id);
        const rows = [];
        let text = '';
        for (const e of ev) {
            if (e.kind === 'outputTx') text += e.text;
            if (e.kind === 'usage') {
                const t = text.trim();
                rows.push(`${t ? `"${t.slice(0, 34)}${t.length > 34 ? '…' : ''}"` : '(no text)'} thoughts=${e.thoughts ?? 0}`);
                text = '';
            }
        }
        const err = rows.some((r) => /system error/i.test(r)) ? '  <-- SYSTEM ERROR' : '';
        console.log(`${id.padEnd(7)} ${rows.join('  |  ')}${err}`);
    }
    const errs = R.events.filter((e) => e.kind === 'error');
    const closes = R.events.filter((e) => e.kind === 'close').map((e) => e.code);
    console.log(`   API error events: ${errs.length}; session close codes: ${[...new Set(closes)].join(',')}\n`);
}
