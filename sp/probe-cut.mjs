// Throwaway probe: extract the REAL cutAtWordBudget out of the TS source
// (strip only the type annotations), then check the ret/no-ret behaviour the
// new test asserts, plus two controls that must answer differently.
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const SRC = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/llm/verbalStreamFilter.ts';
const OUT = path.join(path.dirname(url.fileURLToPath(import.meta.url)), 'cut.mjs');

const text = fs.readFileSync(SRC, 'utf8');
const start = text.indexOf('const SENTINEL_CHUNK');
if (start < 0) throw new Error('anchor not found');
let body = text.slice(start);
// cutAtWordBudget is the last export in the region we need; cut after its closing brace.
const endMark = body.indexOf('\n    finish();\n}\n');
if (endMark < 0) throw new Error('end anchor not found');
body = body.slice(0, endMark + '\n    finish();\n}\n'.length);

const js = body
    .replace('export async function* cutAtWordBudget(\n    source: AsyncGenerator<string>,\n    opts: WordBudgetOptions,\n): AsyncGenerator<string> {', 'export async function* cutAtWordBudget(source, opts) {')
    .replace('const countWords = (s: string): number =>', 'const countWords = (s) =>')
    .replace('const track = (s: string): number => {', 'const track = (s) => {')
    .replace("let mode: 'stream' | 'buffer' = 'stream';", "let mode = 'stream';")
    .replace('const finish = (): void =>', 'const finish = () =>');
if (/:\s*(string|number|void|AsyncGenerator|WordBudget)/.test(js)) {
    console.log('!! leftover type annotation — transformation incomplete:');
    console.log(js.split('\n').filter((l) => /:\s*(string|number|void|AsyncGenerator|WordBudget)/.test(l)).join('\n'));
    process.exit(2);
}
fs.writeFileSync(OUT, js, 'utf8');
const { cutAtWordBudget } = await import(url.pathToFileURL(OUT).href);

const sentence = (n, i) => Array.from({ length: n }, (_, k) => `w${i}x${k}`).join(' ') + '.';
const words = (s) => (s.match(/\S+/g) ?? []).length;

async function run(text, size, opts) {
    async function* chunked() { for (let i = 0; i < text.length; i += size) yield text.slice(i, i + size); }
    const src = chunked();
    let retCalls = 0;
    const realReturn = src.return.bind(src);
    src.return = (...a) => { retCalls++; return realReturn(...a); };
    const done = [];
    let out = '';
    for await (const c of cutAtWordBudget(src, { limit: 80, floor: 40, ...opts, onDone: (r) => done.push(r) })) out += c;
    return { words: words(out), done, retCalls };
}

const four = [1, 2, 3, 4].map((i) => sentence(30, i)).join(' ');
const five = [1, 2, 3, 4, 5].map((i) => sentence(30, i)).join(' ');

console.log('CASE 1  committed test fixture (4x30 words, floor 80):        ', JSON.stringify(await run(four, 7, { floor: 80 })));
console.log('CASE 2  control: cut sentence NOT last (5x30, floor 80):      ', JSON.stringify(await run(five, 7, { floor: 80 })));
console.log('CASE 3  control: same fixture at the OLD floor 40:            ', JSON.stringify(await run(four, 7, { floor: 40 })));
console.log('CASE 4  control: fixture + trailing space (4x30, floor 80):   ', JSON.stringify(await run(four + ' ', 7, { floor: 80 })));
