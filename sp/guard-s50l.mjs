// Pre-flight guard for s50l, run from the repo root by launch-s50l.cmd.
//
// Checks BEHAVIOUR of the built dist the app will load, not the presence of a string.
// A findstr guard can only ask whether some text exists; it cannot tell whether the code
// does the thing. Every check below is written so it would answer differently if the fix
// were absent — run it against the previous build and checks 2 to 4 fail.
//
// Exit 0 = ready. Exit 1 = a named check failed; the message says which.
import { createRequire } from 'node:module';

const PROJ = process.cwd();
const require = createRequire(`${PROJ}/package.json`);
const fail = (msg) => { console.error(`GUARD FAILED: ${msg}`); process.exit(1); };

let F, V, T;
try {
    F = require(`${PROJ}/dist-electron/electron/llm/verbalStreamFilter.js`);
    V = require(`${PROJ}/dist-electron/electron/llm/verbalPrimaryModel.js`);
    T = require(`${PROJ}/dist-electron/electron/llm/geminiThinking.js`);
} catch (e) {
    fail(`dist-electron does not load: ${e.message}. Run npm run build:electron.`);
}

// 1. The shared code-fence filter the offline arms now need.
if (typeof F.filterCodeFences !== 'function') fail('dist verbalStreamFilter has no filterCodeFences export');

// 2. LaTeX-typeset numbers must not reach the spoken text. This is the exact answer
//    gemini-3.5-flash-lite produced on S1Q02 in s50k, fed one character at a time.
const RAW = 'With a population of $100,000$ and a $9.5\\%$ churn rate, there are $9,500$ actual '
    + 'churners. That gives a recall of $\\frac{3,000}{9,500}$, or about $31.5\\%$.';
async function spoken(raw) {
    async function* gen() { for (const ch of raw) yield ch; }
    let out = '';
    for await (const p of F.stripSpokenNotation(F.stripSuggestionBlock(F.filterVerbalLines(F.filterCodeFences(gen())), () => {}))) out += p;
    return out.trim();
}
const said = await spoken(RAW);
if (/[$\\]/.test(said)) fail(`notation still reaches the spoken text: ${JSON.stringify(said.match(/\S*[\\$]\S*/g))}`);
if (said.includes('frac')) fail(`a LaTeX fraction still reaches the spoken text: ${said}`);
if (!said.includes('population of 100,000')) fail(`the wrapped number was not unwrapped: ${said}`);
if (!said.includes('3,000 over 9,500')) fail(`the fraction was not spoken: ${said}`);

// 3. Money must survive — the calibration that proves check 2 is not simply deleting dollars.
const money = await spoken('that saves about $100,000 a year and costs $5 per million tokens.');
if (!money.includes('$100,000') || !money.includes('$5 ')) fail(`currency was destroyed: ${money}`);

// 4. The flight's own override must resolve, and refuse a name the build will not answer with.
const ALLOWED = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'];
const WANT = 'gemini-3.5-flash-lite';
process.env.NATIVELY_VERBAL_PRIMARY_MODEL = WANT;
if (V.verbalPrimaryModel('gemini-3.1-flash-lite', ALLOWED) !== WANT) fail('the verbal primary override does not resolve');
process.env.NATIVELY_VERBAL_PRIMARY_MODEL = 'gemini-3.5-flash-lit';
let refused = false;
try { V.verbalPrimaryModel('gemini-3.1-flash-lite', ALLOWED); } catch { refused = true; }
if (!refused) fail('the override accepts an unknown model instead of refusing');
delete process.env.NATIVELY_VERBAL_PRIMARY_MODEL;

// 5. The model s50l flies must get the level it honours. 3.5-lite ignores LOW, so the
//    per-model table has to turn the shipped LOW into HIGH or the hour measures an
//    unthought model and reads it as a model difference.
if (T.thinkingLevelForModel(WANT, 'LOW') !== 'HIGH') fail('3.5-flash-lite would fly at a level it ignores');
if (T.thinkingLevelForModel('gemini-3.1-flash-lite', 'LOW') !== 'LOW') fail('the fallback leg would not fly at LOW');

console.log('GUARD OK: fences shared, notation clean, currency intact, override resolves and refuses, levels correct');
