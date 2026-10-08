import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const OLD = require('../sidefix2/build/old/verbalStreamFilter.cjs');
const NEW = require('../sidefix2/build/new/verbalStreamFilter.cjs');
const J = JSON.stringify;
const run = async (F, text, size) => { let o = ''; const g = (async function* () { for (let i = 0; i < text.length; i += size) yield text.slice(i, i + size); })(); for await (const c of F.stripSpokenNotation(g)) o += c; return o; };
for (const t of ['That is $100,000$. Next one.', 'That is $5$. Next.', 'rate $0.5$, ok.', 'That is $100,000$.']) {
    const r = [];
    for (const [n, F] of [['old', OLD], ['new', NEW]]) { const w = await run(F, t, t.length); const by = {}; for (const s of [1, 2, 3, 7]) by[s] = await run(F, t, s); r.push(`${n}: whole ${J(w)} @1 ${J(by[1])} @2 ${J(by[2])} @3 ${J(by[3])} @7 ${J(by[7])}`); }
    console.log(J(t)); for (const x of r) console.log('   ' + x);
}
const time = async (label, t, size) => { for (const [n, F] of [['old', OLD], ['new', NEW]]) { const a = performance.now(); await run(F, t, size); console.log(`${label} ${n}: ${(performance.now() - a).toFixed(0)} ms`); } };
await time('$1$ x6000 whole', '$1$ '.repeat(6000), 1e9);
await time('$1$ x2000 @7', '$1$ '.repeat(2000), 7);
await time('$\\a{b}$. x3000 whole', '$\\a{b}$.'.repeat(3000), 1e9);
await time('digits 20000 then $ whole', '1'.repeat(20000) + '$ x', 1e9);
await time('$+digits 4000 @1 (pre-existing unbounded hold)', '$' + '1'.repeat(4000) + ' x', 1);
