// Scratch, read-only: every string in the rule3 fixtures' JSON files, by length; flags any longer than 30 characters (free text).
// Prints counts, key names and lengths only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'rule3-fixtures');
let files = 0, strings = 0, long = 0;
const longKeys = new Map();
const walk = (v, key, file) => {
    if (typeof v === 'string') {
        strings++;
        if (v.length > 30) { long++; longKeys.set(`${path.basename(file)}:${key}`, (longKeys.get(`${path.basename(file)}:${key}`) ?? 0) + 1); }
    } else if (Array.isArray(v)) v.forEach((x) => walk(x, key, file));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, k, file);
};
for (const dir of fs.readdirSync(root)) {
    const d = path.join(root, dir);
    if (!fs.statSync(d).isDirectory()) continue;
    for (const f of fs.readdirSync(d)) {
        if (!f.endsWith('.json')) continue;
        files++;
        const text = fs.readFileSync(path.join(d, f), 'utf8');
        try { walk(JSON.parse(text), '(root)', path.join(d, f)); } catch { console.log(`${dir}/${f}: not JSON (${text.length} chars): intentionally corrupt fixture`); }
    }
}
console.log(`json files ${files}; strings ${strings}; strings longer than 30 chars: ${long}${long ? ' in ' + [...longKeys].map(([k, n]) => `${k} x${n}`).join(', ') : ''}`);
