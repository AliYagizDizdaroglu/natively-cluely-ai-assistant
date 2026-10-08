// Paths-only audit of grader transcripts (s50l prep review I6, adapted for followup-turn/PREREGISTER-turn-followup.md section 1): lists every
// tool use of each grader (tool NAME and the tool input's path/pattern/command only, never the content a tool returned) and flags
//   (a) any tool other than Read and Write                                      [new]
//   (b) any mcp__* call (claude-mem or otherwise)                               [new]
//   (c) a read of any key file, (d) any answer file (interview60.answers.*), (e) a verdicts file that is not the grader's own   [as before]
// A FLAGGED grader makes its blind file "reported, not decided": that file is re-graded ONCE by a fresh grader, then decided (section 1).
//
//   node audit-graders.mjs [--projects <dir>] [--session <id>] blind-N.gX=<agentId> | blind-N.gX=session:<uuid> | blind-N.gX=file:<path> ...
//   exit 0 all clean   exit 1 flagged or a transcript not found   exit 2 usage
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ALLOWED_TOOLS = new Set(['Read', 'Write']);

/** The audit of one transcript text: { tools: {name: n}, touched: [...], flags: [...] }. `own` = this grader's verdicts file name. */
// A Bash call that only validates the grader's OWN verdicts file against its pairs file (what every s50l grader did after writing) is
// the one thing --allow-validation-bash lets through. OFF by default: the registration says "any tool other than Read/Write".
const FORBIDDEN_IN_BASH = /key\.blind|keyhold|interview60\.answers|\/memory|MEMORY|\.claude[\\/]+projects|curl|https?:|wget|\bgit\b/i;
export function isValidationBash(command, own) {
    const pairs = own.replace(/^verdicts\./, 'pairs.');
    if (!command.includes(own)) return false;
    const stripped = command.split(own).join('').split(pairs).join('');
    if (FORBIDDEN_IN_BASH.test(stripped)) return false;
    return !/verdicts\.blind-\d+\.g\d\.json/.test(stripped);             // no other grader's verdicts
}
export function auditText(text, own, { allowValidationBash = false } = {}) {
    const touched = [], tools = {}, bashCommands = [];
    for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        let j; try { j = JSON.parse(line); } catch { continue; }
        const content = j?.message?.content;
        if (j?.type !== 'assistant' || !Array.isArray(content)) continue;
        for (const c of content) if (c?.type === 'tool_use') {
            tools[c.name] = (tools[c.name] ?? 0) + 1;
            const inp = c.input ?? {};
            if (c.name === 'Bash' && typeof inp.command === 'string') bashCommands.push(inp.command);
            let any = false;
            for (const k of ['file_path', 'path', 'pattern', 'command', 'glob']) if (typeof inp[k] === 'string') { touched.push(`${c.name}:${k}=${inp[k]}`); any = true; }
            if (!any) touched.push(`${c.name}:(no path input)`);
        }
    }
    const flags = [];
    for (const name of Object.keys(tools)) {
        if (name.startsWith('mcp__')) flags.push(`MCP CALL ${name} x${tools[name]}`);
        else if (name === 'Bash' && allowValidationBash && bashCommands.length === tools.Bash && bashCommands.every((cmd) => isValidationBash(cmd, own))) continue;
        else if (!ALLOWED_TOOLS.has(name)) flags.push(`TOOL OTHER THAN Read/Write: ${name} x${tools[name]}`);
    }
    for (const t of touched) if (/key\.blind-\d|keyhold/i.test(t) || /interview60\.answers\./.test(t) || (/verdicts\.blind-\d+\.g\d\.json/.test(t) && !t.includes(own))) flags.push(t.slice(0, 160));
    return { tools, touched, flags };
}

function main() {
    const argv = process.argv.slice(2);
    let projects = 'C:/Users/sotka/.claude/projects', session = null, allowValidationBash = false;
    const items = [];
    const usage = (why) => { console.error(`audit-graders: ${why}\nusage: node audit-graders.mjs [--projects <dir>] [--session <id>] blind-N.gX=<agentId>|session:<uuid>|file:<path> ...`); process.exit(2); };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--allow-validation-bash') allowValidationBash = true;
        else if (a === '--projects' || a === '--session') { const v = argv[++i]; if (!v) usage(`${a} needs a value`); if (a === '--projects') projects = v; else session = v; }
        else if (a.startsWith('--')) usage(`unknown option ${a}`);
        else {
            const m = /^(blind-\d+\.g\d)=(?:(session|file):(.+)|(?:agent-)?([A-Za-z0-9]{8,40}))$/.exec(a);
            if (!m) usage(`"${a}" is not blind-N.gX=<agentId> | session:<uuid> | file:<path>`);
            items.push(m[2] ? { tag: m[1], kind: m[2], v: m[3] } : { tag: m[1], kind: 'agent', v: m[4] });
        }
    }
    if (!items.length) usage('nothing to audit');
    const dirs = (p) => { try { return fs.readdirSync(p, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name); } catch { return []; } };
    const find = ({ kind, v }) => {
        if (kind === 'file') return fs.existsSync(v) ? v : null;
        for (const slug of dirs(projects)) {
            if (kind === 'session') { const f = path.join(projects, slug, `${v}.jsonl`); if (fs.existsSync(f)) return f; }
            else for (const sess of session ? [session] : dirs(path.join(projects, slug))) { const f = path.join(projects, slug, sess, 'subagents', `agent-${v}.jsonl`); if (fs.existsSync(f)) return f; }
        }
        return null;
    };
    let flaggedAny = false;
    for (const it of items) {
        const f = find(it);
        if (!f) { console.log(`${it.tag}: transcript NOT FOUND (${it.kind}:${it.v}) -> cannot audit`); flaggedAny = true; continue; }
        const r = auditText(fs.readFileSync(f, 'utf8'), `verdicts.${it.tag}.json`, { allowValidationBash });
        flaggedAny ||= r.flags.length > 0;
        const toolSummary = Object.entries(r.tools).map(([k, n]) => `${k}x${n}`).join(' ') || 'none';
        console.log(`${it.tag} (${it.v.slice(0, 18)}): ${r.touched.length} tool inputs [${toolSummary}]; ${r.flags.length ? `FLAGGED ${r.flags.length}: ${r.flags.join(' | ')}` : 'clean'}`);
    }
    console.log(flaggedAny ? 'AUDIT: FLAGGED (see lines above)' : 'AUDIT: all graders clean');
    process.exitCode = flaggedAny ? 1 : 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
