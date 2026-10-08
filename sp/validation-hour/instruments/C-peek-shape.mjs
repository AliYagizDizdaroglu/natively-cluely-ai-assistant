// Scratch, read-only: print the SHAPE of a JSON file (keys, value types, string lengths), never a string's text.
//   node peek-shape.mjs <file> [<depth>]
import fs from 'node:fs';

const file = process.argv[2];
const maxDepth = Number(process.argv[3] ?? 3);
const j = JSON.parse(fs.readFileSync(file, 'utf8'));

function shape(v, depth) {
    if (v === null) return 'null';
    if (Array.isArray(v)) return `array(${v.length})` + (v.length && depth < maxDepth ? ' of ' + shape(v[0], depth + 1) : '');
    switch (typeof v) {
        case 'string': return `string(len ${v.length})`;
        case 'number': return `number(${v})`;
        case 'boolean': return `boolean(${v})`;
        case 'object': {
            if (depth >= maxDepth) return `object{${Object.keys(v).length} keys}`;
            return '{' + Object.entries(v).map(([k, x]) => `${k}: ${shape(x, depth + 1)}`).join(', ') + '}';
        }
        default: return typeof v;
    }
}

console.log(`file: ${file}`);
console.log(`top-level keys: ${Object.keys(j).join(', ')}`);
for (const [k, v] of Object.entries(j)) {
    if (k === 'items' && v && typeof v === 'object' && !Array.isArray(v)) {
        const keys = Object.keys(v);
        console.log(`items: object with ${keys.length} keys; first 5 keys: ${keys.slice(0, 5).join(' | ')}; last: ${keys[keys.length - 1]}`);
        console.log(`items[first] shape: ${shape(v[keys[0]], 0)}`);
        continue;
    }
    console.log(`${k}: ${shape(v, 1)}`);
}
