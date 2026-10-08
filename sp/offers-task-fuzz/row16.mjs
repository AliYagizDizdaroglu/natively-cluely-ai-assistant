// THROWAWAY: the streaming side of spec row 16 (an offer-shaped line AFTER the answer began, no second sentinel).
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const m = await import(pathToFileURL(path.join(HERE, 'shipped.ts')).href);
const warn = console.warn; let warns = 0; console.warn = () => { warns++; };
async function run(chunks) {
    let out = '', sugg = null, calls = 0;
    async function* src() { for (const c of chunks) yield c; }
    for await (const p of m.stripSuggestionBlock(src(), (s) => { sugg = s; calls++; })) out += p;
    return { out, sugg, calls };
}
const text = '__MORE__\n1| a b\nTen million vectors.\n2| c d\n';
for (const size of [1, 3, 500]) {
    const chunks = []; for (let i = 0; i < text.length; i += size) chunks.push(text.slice(i, i + size));
    const r = await run(chunks);
    console.log('size', String(size).padStart(3), JSON.stringify(r));
}
console.log('whole-string:', JSON.stringify(m.extractSuggestions(text)));
console.warn = warn;
console.log('warn lines written (3 streams, each led by a block):', warns);
