// Throwaway: the identifiers (and string literals, numbers, punctuation) of the `node -e "<code>"` text of the 8 real design-2 s50l validation commands and the
// pilot's command. Prints names and counts only -- never a transcript line other than the validation code itself (a shell command the grader ran).
import fs from 'node:fs';
import path from 'node:path';
const PROJ = 'C:/Users/sotka/.claude/projects';
const SLUG = 'C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a';
const SESSION = '9c5886c7-cdbd-48af-b8bc-e9275012ec64';
const PILOT = path.join(PROJ, 'C--Users-sotka-AppData-Local-Temp-claude-C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a-9c5886c7-cdbd-48af-b8bc-e9275012ec64-scratchpad-followup-epcae2', '6441d4bf-d00c-4007-871e-b7dc480b2cab.jsonl');
const ids = ['addb84e6bd55778d5', 'a681f259dff0dae30', 'a5eb230f8d7cb101a', 'ab34ebe95114932db', 'a83e3007ff2d0bc45', 'ab605c210a849d667', 'aa08ae8c058eb8aa9', 'aa85ea6faa528f27c'];
const files = ids.map((id) => path.join(PROJ, SLUG, SESSION, 'subagents', `agent-${id}.jsonl`)).concat([PILOT]);
export const realCodes = [];
for (const f of files) {
    for (const l of fs.readFileSync(f, 'utf8').split('\n').filter(Boolean)) {
        const j = JSON.parse(l);
        if (j.type !== 'assistant') continue;
        for (const c of j.message?.content ?? []) if (c.type === 'tool_use' && c.name === 'Bash') {
            const m = /node -e "([^"]*)"/.exec(c.input.command);
            if (m) realCodes.push(m[1]);
        }
    }
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))) {
    console.log('codes:', realCodes.length);
    const idents = new Map(), lits = new Set(), puncts = new Set();
    for (const code of realCodes) {
        const bare = code.replace(/'[^'\n]*'/g, (s) => { lits.add(s); return ' '; });
        for (const m of bare.matchAll(/[A-Za-z_][A-Za-z0-9_]*/g)) idents.set(m[0], (idents.get(m[0]) ?? 0) + 1);
        for (const m of bare.replace(/[A-Za-z_][A-Za-z0-9_]*/g, ' ').replace(/\d+/g, ' ').matchAll(/\S+/g)) puncts.add(m[0]);
    }
    console.log('identifiers:', [...idents.keys()].sort().join(' '));
    console.log('literals:', [...lits].sort().join(' '));
    console.log('punctuation runs:', [...puncts].sort().join('  '));
}
