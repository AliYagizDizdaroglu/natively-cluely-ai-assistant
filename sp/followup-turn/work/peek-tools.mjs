import fs from 'node:fs';
import path from 'node:path';
const PROJ = 'C:/Users/sotka/.claude/projects';
const SLUG = 'C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a';
const SESSION = '9c5886c7-cdbd-48af-b8bc-e9275012ec64';
const ids = process.argv.slice(2);
for (const id of ids) {
    const f = path.join(PROJ, SLUG, SESSION, 'subagents', `agent-${id}.jsonl`);
    const lines = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
    console.log('=====', id, lines.length, 'records');
    let first = true;
    for (const j of lines) {
        if (first && j.type === 'user') {
            const c = j.message?.content;
            const t = typeof c === 'string' ? c : (c ?? []).map((x) => x.text ?? '').join('');
            console.log('FIRST USER len', t.length, 'type', typeof c, 'keys', Object.keys(j).join(','));
            first = false;
        }
        if (j.type !== 'assistant') continue;
        for (const c of j.message?.content ?? []) if (c.type === 'tool_use') {
            const i = c.input ?? {};
            if (c.name === 'Bash') console.log('Bash len', i.command.length, JSON.stringify(i.command));
            else console.log(c.name, JSON.stringify(i.file_path ?? i.path ?? i.pattern ?? '?'));
        }
    }
}
