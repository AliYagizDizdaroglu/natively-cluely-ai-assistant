// Scratch, read-only: what a <synthetic> assistant record looks like (keys, flags, content-block TYPES, text length only; never the text).
import fs from 'node:fs';
const file = process.argv[2];
let n = 0;
for (const l of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!l.trim()) continue;
    let o; try { o = JSON.parse(l); } catch { continue; }
    if (o.type !== 'assistant' || o?.message?.model !== '<synthetic>') continue;
    n++;
    const c = o.message.content;
    const blocks = Array.isArray(c) ? c.map((b) => `${b.type}${typeof b.text === 'string' ? `(len ${b.text.length})` : ''}`).join(',') : typeof c;
    console.log(`#${n}: record keys=${Object.keys(o).join(',')} | isApiErrorMessage=${JSON.stringify(o.isApiErrorMessage ?? null)} | error=${JSON.stringify(typeof o.error === 'string' ? o.error : (o.error ? 'object' : null))} | stop_reason=${JSON.stringify(o.message.stop_reason ?? null)} | content blocks=${blocks} | usage=${JSON.stringify(o.message.usage ?? null)}`);
}
console.log(`synthetic records: ${n}`);
