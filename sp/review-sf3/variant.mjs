// Prototype of a tighter discriminator ('{"' instead of '{') in a scratch copy; MAIN untouched.
import fs from 'node:fs';
import { createRequire } from 'node:module';
const HERE = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/review-sf3';
const SRC = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/sidefix3/build/new/verbalStreamFilter.ts';
const M = 'C:/Users/sotka/OneDrive/Masa\u00fcst\u00fc/natively-cluely-ai-assistant';
let src = fs.readFileSync(SRC, 'utf8');
const before = "        if (!decided && chunk.trim()) { decided = true; payload = chunk.trimStart().startsWith('{'); }\n";
if (!src.includes(before)) throw new Error('anchor not found');
src = src.replace("    let payload = false;\n", "    let payload = false;\n    let probe = '';\n");
src = src.replace(before, "        if (!decided) { const p = (probe += chunk).trimStart(); if (p === '' || p === '{') continue; decided = true; payload = p.startsWith('{\"'); chunk = probe; }\n");
src = src.replace('    for await (const chunk of source) {\n        if (SENTINEL_CHUNK', '    for await (let chunk of source) {\n        if (SENTINEL_CHUNK');
src = src.replace("    if (carry) {\n        if (mode === 'stream')", "    if (!decided && probe) { emitted += track(probe); yield probe; }\n    if (carry) {\n        if (mode === 'stream')");
if (!src.includes('let chunk of source') || !src.includes('!decided && probe')) throw new Error('patch anchors');
fs.mkdirSync(HERE + '/v', { recursive: true });
fs.writeFileSync(HERE + '/v/verbalStreamFilter.ts', src);
const { build } = createRequire(M + '/package.json')('esbuild');
await build({ entryPoints: [HERE + '/v/verbalStreamFilter.ts'], outfile: HERE + '/v/verbalStreamFilter.cjs', bundle: false, platform: 'node', target: 'node20', format: 'cjs', absWorkingDir: HERE });
const V = createRequire(import.meta.url)(HERE + '/v/verbalStreamFilter.cjs');
const agen = (chunks) => (async function* () { for (const c of chunks) yield c; })();
const cut = (t, n) => { const o = []; for (let i = 0; i < t.length; i += n) o.push(t.slice(i, i + n)); return o; };
const sentence = (n, i) => Array.from({ length: n }, (_, k) => `w${i}x${k}`).join(' ') + '.';
const LONG = [1, 2, 3, 4, 5, 6].map((i) => sentence(46, i)).join(' ');
async function stage(chunks) { let out = '', done = null; for await (const c of V.cutAtWordBudget(agen(chunks), { ...V.SPOKEN_WORD_GUARD, onDone: (r) => { done = r; } })) out += c; return { out, done }; }
const card = JSON.stringify({ __negotiationCoaching: { exactScript: LONG, n: '$135,000 "base"\nok' } });
for (const s of [1, 2, 3, 9, 1e6]) {
    const c = await stage(cut(card, s));
    const ws = await stage([' ', '\n', ...cut(card, s)]);
    const sp = await stage(cut('{} is empty. ' + LONG, s));
    const sp2 = await stage(cut('{x} is a set. ' + LONG, s));
    const plain = await stage(cut('So the answer. ' + LONG, s));
    let ok1 = false, ok2 = false; try { ok1 = JSON.parse(c.out) && true; } catch {} try { ok2 = ws.out.startsWith(' \n') && JSON.parse(ws.out) && true; } catch {}
    console.log(`@${s === 1e6 ? 'whole' : s}: card parses ${ok1} ${JSON.stringify(c.done)} | blank-led card ${ok2} | "{}" speech ${JSON.stringify(sp.done)} | "{x}" speech ${JSON.stringify(sp2.done)} | plain ${JSON.stringify(plain.done)}`);
}
const lone = await stage(['{']);
console.log(`lone "{" stream: out ${JSON.stringify(lone.out)} ${JSON.stringify(lone.done)}`);
