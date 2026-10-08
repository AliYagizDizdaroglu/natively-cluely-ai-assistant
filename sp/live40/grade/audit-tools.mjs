// Lists each grader transcript's tool calls: tool name + file basename (no content). Also whether the key folder was ever named.
import fs from 'node:fs';
import path from 'node:path';
const P = 'C:/Users/sotka/.claude/projects';
for (const [g, id] of [['g1', '9856e006-bc09-4ac6-b635-66dd642ddfff'], ['g2', '11b1c4a8-0a51-4ab8-b76b-14801b8962c1']]) {
    let f = null;
    for (const d of fs.readdirSync(P)) { const c = path.join(P, d, `${id}.jsonl`); if (fs.existsSync(c)) f = c; }
    const text = fs.readFileSync(f, 'utf8');
    const calls = [];
    for (const line of text.split('\n')) {
        if (!line.trim()) continue; let j; try { j = JSON.parse(line); } catch { continue; }
        if (j.type !== 'assistant') continue;
        for (const c of j.message?.content ?? []) if (c.type === 'tool_use') {
            const i = c.input ?? {};
            calls.push(`${c.name} ${i.file_path ? path.basename(i.file_path) : i.command ? `[cmd ${i.command.length} chars]` : ''}${i.offset != null ? ` offset=${i.offset}` : ''}${i.limit != null ? ` limit=${i.limit}` : ''}`);
        }
    }
    console.log(`${g}: ${calls.join(' ; ')}; mentions keyhold=${text.includes('keyhold')} key.json=${text.includes('key.json')}`);
}
