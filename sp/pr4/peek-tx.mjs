// Tool names, path basenames, is_error counts and denial markers of given sessions; no content.
import fs from 'node:fs';
import path from 'node:path';
const P = 'C:/Users/sotka/.claude/projects';
for (const id of process.argv.slice(2)) {
    let f = null;
    for (const d of fs.readdirSync(P)) { const c = path.join(P, d, `${id}.jsonl`); if (fs.existsSync(c)) { f = c; break; } }
    if (!f) { console.log(id, 'NOT FOUND'); continue; }
    const calls = [], errs = []; let denialKind = 0, pd = 0; const types = {};
    for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
        if (!line.trim()) continue; let j; try { j = JSON.parse(line); } catch { continue; }
        types[j.type] = (types[j.type] ?? 0) + 1;
        if (j.toolDenialKind != null) denialKind++;
        if (Array.isArray(j.permission_denials)) pd += j.permission_denials.length;
        for (const c of Array.isArray(j?.message?.content) ? j.message.content : []) {
            if (c?.type === 'tool_use') calls.push(`${c.name}:${path.basename(String(c.input?.file_path ?? '?'))}:${/^[A-Za-z]:|^\//.test(String(c.input?.file_path ?? '')) ? 'abs' : 'rel'}`);
            if (c?.type === 'tool_result' && c.is_error) { const m = typeof c.content === 'string' ? c.content : JSON.stringify(c.content); errs.push(m.slice(0, 70)); }
        }
    }
    console.log(id.slice(0, 8), 'folder', path.basename(path.dirname(f)).slice(-30), 'types', JSON.stringify(types), 'calls', calls.join(' '), 'is_error', errs.length, JSON.stringify(errs), 'toolDenialKind', denialKind, 'permission_denials', pd);
}
