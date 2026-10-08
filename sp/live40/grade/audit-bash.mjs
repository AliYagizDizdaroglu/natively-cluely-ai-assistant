import fs from 'node:fs';
import path from 'node:path';
const P = 'C:/Users/sotka/.claude/projects';
for (const [g, id] of [['g1', '9856e006-bc09-4ac6-b635-66dd642ddfff'], ['g2', '11b1c4a8-0a51-4ab8-b76b-14801b8962c1']]) {
    let f = null;
    for (const d of fs.readdirSync(P)) { const c = path.join(P, d, `${id}.jsonl`); if (fs.existsSync(c)) f = c; }
    for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
        if (!line.trim()) continue; let j; try { j = JSON.parse(line); } catch { continue; }
        if (j.type !== 'assistant') continue;
        for (const c of j.message?.content ?? []) if (c.type === 'tool_use' && c.name === 'Bash') {
            const s = c.input.command;
            const flags = ['writeFileSync', 'readFileSync', 'require(', 'fetch', 'child_process', 'JSON.parse', 'keyhold', 'Object.keys', 'q01'].filter((x) => s.includes(x));
            console.log(g, s.length, 'tokens present:', flags.join(','), 'q-keys mentioned:', (s.match(/q\d\d/g) ?? []).length);
        }
    }
}
