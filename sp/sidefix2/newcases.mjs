// The two new cases on the OLD (HEAD) and NEW built filters, chunk sizes 1,2,3,7 and whole.
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const run = async (F, text, size) => { let o = ''; const g = (async function* () { for (let i = 0; i < text.length; i += size) yield text.slice(i, i + size); })(); for await (const c of F.stripSpokenNotation(g)) o += c; return o; };
const cases = [['That is $100,000$. Next.', 'That is 100,000. Next.'], ['That is $100,000$.', 'That is 100,000.']];
for (const [name, F] of [['OLD', require('./build/old/verbalStreamFilter.cjs')], ['NEW', require('./build/new/verbalStreamFilter.cjs')]]) {
    for (const [text, want] of cases) {
        const whole = await run(F, text, text.length);
        const line = [`whole ${whole === want ? 'ok' : 'WRONG ' + JSON.stringify(whole)}`];
        for (const s of [1, 2, 3, 7]) { const o = await run(F, text, s); line.push(`@${s} ${o === whole ? 'same' : 'DIFF ' + JSON.stringify(o)}`); }
        console.log(`${name} ${JSON.stringify(text)}: ${line.join('; ')}`);
    }
}
