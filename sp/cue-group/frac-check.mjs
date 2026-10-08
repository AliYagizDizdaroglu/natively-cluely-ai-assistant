// Checks the claim in the "chunk-independent notation filter" chip against the BUILT filter (the v2 dist, which
// Task 1 has not rebuilt): stripSpokenNotation on typeset fractions, whole against one character at a time.
import { createRequire } from 'node:module';
const WT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn';
const F = createRequire(`${WT}/package.json`)(`${WT}/dist-electron/electron/llm/verbalStreamFilter.js`);
async function run(text, size) {
    async function* src() { for (let i = 0; i < text.length; i += size) yield text.slice(i, i + size); }
    let out = '';
    for await (const p of F.stripSpokenNotation(src())) out += p;
    return out;
}
for (const t of ['$\\frac{3000}{9500}$', '$\\frac{3,000}{9,500}$', 'About $\\frac{3000}{9500}$ of it.', '\\frac{a}{b}', '$x^2$', 'about $120k a year']) {
    const whole = await run(t, t.length), one = await run(t, 1), two = await run(t, 2), three = await run(t, 3);
    console.log(`${JSON.stringify(t)}\n   whole ${JSON.stringify(whole)}\n   size1 ${JSON.stringify(one)}${one === whole ? '' : '  DIFFERS'}\n   size2 ${JSON.stringify(two)}${two === whole ? '' : '  DIFFERS'}\n   size3 ${JSON.stringify(three)}${three === whole ? '' : '  DIFFERS'}`);
}
