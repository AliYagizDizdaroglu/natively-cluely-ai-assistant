import fs from 'fs';
import path from 'path';
const here = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const dec = decodeURIComponent(here);
process.chdir(dec);
const plan = fs.readFileSync('../../plan/2026-10-04-turn-followup-build.md', 'utf8').replace(/\r\n/g, '\n');
const t2 = plan.slice(plan.indexOf('### Task 2:'), plan.indexOf('### Task 3:'));
const blocks = [...t2.matchAll(/```ts\n([\s\S]*?)```/g)].map((m) => m[1]);
console.log('blocks', blocks.length, blocks.map((b) => b.length));
fs.writeFileSync('plan-test.ts', blocks[0]);
fs.writeFileSync('plan-mod.ts', blocks[1]);
const WT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/eq-build/electron/llm/';
for (const [p, f] of [['plan-test.ts', 'earlierQuestion.test.ts'], ['plan-mod.ts', 'earlierQuestion.ts']]) {
    const a = fs.readFileSync(p, 'utf8');
    const raw = fs.readFileSync(WT + f, 'utf8');
    const b = raw.replace(/\r\n/g, '\n');
    console.log(f, 'crlf?', raw.includes('\r\n'), 'bom?', raw.charCodeAt(0) === 0xfeff, 'equal?', a === b, a.length, b.length);
    if (a !== b) {
        const al = a.split('\n'), bl = b.split('\n');
        for (let i = 0; i < Math.max(al.length, bl.length); i++) if (al[i] !== bl[i]) { console.log(' first diff line', i + 1, JSON.stringify(al[i]), JSON.stringify(bl[i])); break; }
    }
}
