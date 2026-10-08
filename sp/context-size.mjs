// Throwaway, read-only: size of every instruction file that loads at session start here, so "is the
// global CLAUDE.md too big" is answered with numbers. Tokens are ESTIMATED as chars / 4 (English prose;
// no offline Claude tokenizer), so treat them as +-15%.
import fs from 'node:fs';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const files = [
    ['global ~/.claude/CLAUDE.md', 'C:/Users/sotka/.claude/CLAUDE.md'],
    ['MAIN CLAUDE.md', `${MAIN}/CLAUDE.md`],
    ['MAIN CLAUDE.local.md', `${MAIN}/CLAUDE.local.md`],
    ['MAIN .claude/CLAUDE.md', `${MAIN}/.claude/CLAUDE.md`],
    ['worktree CLAUDE.md', `${MAIN}/.claude/worktrees/whole-turn/CLAUDE.md`],
    ['project memory index MEMORY.md', 'C:/Users/sotka/.claude/projects/C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant/memory/MEMORY.md'],
];
let total = 0;
for (const [label, f] of files) {
    if (!fs.existsSync(f)) { console.log(`${label.padEnd(34)} absent`); continue; }
    const t = fs.readFileSync(f, 'utf8');
    const lines = t.split('\n').length;
    const words = t.split(/\s+/).filter(Boolean).length;
    const est = Math.round(t.length / 4);
    total += est;
    const longest = Math.max(...t.split('\n').map((l) => l.length));
    console.log(`${label.padEnd(34)} ${String(lines).padStart(4)} lines ${String(words).padStart(6)} words ${String(t.length).padStart(7)} chars  ~${est} tokens  longest line ${longest} chars`);
}
console.log(`${'total loaded at session start'.padEnd(34)} ~${total} tokens`);
