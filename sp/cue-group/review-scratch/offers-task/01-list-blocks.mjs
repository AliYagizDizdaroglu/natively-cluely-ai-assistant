// Lists the fenced code blocks of the offers task brief, in order, with their first line and length.
import fs from 'node:fs';
const WT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn';
const BRIEF = WT + '/.superpowers/sdd/2026-09-30-cue-early-close/offers-task-brief.md';
const raw = fs.readFileSync(BRIEF, 'utf8');
console.log('brief CR count', (raw.match(/\r/g) || []).length, 'length', raw.length);
const lines = raw.split('\n');
const blocks = [];
let cur = null;
for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    const m = L.match(/^(\s*)```(\S*)\s*$/);
    if (m && cur === null) { cur = { start: i + 1, indent: m[1], lang: m[2], body: [] }; continue; }
    if (m && cur !== null && m[1] === cur.indent && m[2] === '') { cur.end = i + 1; blocks.push(cur); cur = null; continue; }
    if (cur) cur.body.push(L);
}
blocks.forEach((b, k) => console.log(k, `lines ${b.start}-${b.end}`, `indent=${JSON.stringify(b.indent)}`, b.lang || '(none)', `n=${b.body.length}`, JSON.stringify(b.body[0]).slice(0, 90)));
fs.writeFileSync(new URL('./blocks.json', import.meta.url), JSON.stringify(blocks, null, 1));
