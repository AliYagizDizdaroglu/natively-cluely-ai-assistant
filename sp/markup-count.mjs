// Throwaway: count unspeakable markup in the delivered text of an answers file (arm store,
// keyed by item id with .spoken/.raw) or a judge file ({items:{id:{answer}}}).
//   node markup-count.mjs <file> [<file> ...]
import fs from 'node:fs';
import path from 'node:path';

const LIST = /(^|\n)\s*(\d{1,2}[.)]|[-*•])\s/;
const DOLLAR = /\$/;
const BACKSLASH = /\\[a-zA-Z]+/;
const BOLD = /\*\*/;
const BRACE = /[{}]/;
const words = (s) => (s.trim().match(/\S+/g) || []).length;

for (const file of process.argv.slice(2)) {
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    const entries = j.items ? Object.entries(j.items).map(([id, v]) => [id, v.answer, null]) : Object.entries(j).map(([id, v]) => [id, v.spoken, v.raw]);
    const mains = entries.filter(([id, t]) => t && !id.endsWith('F'));
    const c = { list: 0, dollar: 0, backslash: 0, bold: 0, brace: 0, rawList: 0, rawDollar: 0, rawN: 0 };
    const ws = [];
    const listIds = [];
    for (const [id, t, raw] of mains) {
        if (LIST.test(t)) { c.list++; listIds.push(id); }
        if (DOLLAR.test(t)) c.dollar++;
        if (BACKSLASH.test(t)) c.backslash++;
        if (BOLD.test(t)) c.bold++;
        if (BRACE.test(t)) c.brace++;
        if (raw != null) { c.rawN++; if (LIST.test(raw)) c.rawList++; if (DOLLAR.test(raw)) c.rawDollar++; }
        ws.push(words(t));
    }
    ws.sort((a, b) => a - b);
    console.log(`${path.basename(file)}  n=${mains.length}  words p50=${ws[Math.floor(ws.length / 2)]} min=${ws[0]} max=${ws[ws.length - 1]}  spoken: lists=${c.list}${listIds.length ? '(' + listIds.join(',') + ')' : ''} dollar=${c.dollar} backslash=${c.backslash} bold=${c.bold} brace=${c.brace}  raw(n=${c.rawN}): lists=${c.rawList} dollar=${c.rawDollar}`);
}
