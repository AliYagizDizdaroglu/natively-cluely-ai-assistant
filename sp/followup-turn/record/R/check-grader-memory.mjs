// Grader-memory check (PREREGISTER-turn-followup.md section 1, "Memory", I1; spec 6: graders run with NO project memory because the
// memory names this experiment and its bars). Searches a transcript (.jsonl) for
//   (A) the project-memory markers -- the "Memory Index" header, the memory file names, the memory folder path -- and
//   (B) claude-mem's SessionStart context markers -- its "# [project] recent context, <date>" header / <claude-mem-context> tag --
// and prints LOADED (any marker) or ABSENT (none), with COUNTS only: never a line of the transcript.
//
// What is deliberately NOT a marker: the NAMES of claude-mem's tools and skills (mcp__plugin_claude-mem_*, claude-mem:*). They appear in
// every session's tool/skill listing under any cwd (they are plugins, not memory), so counting them would read LOADED on the
// very outside-cwd session this check exists to prove. Calling one is the audit's business (audit-graders.mjs flags any mcp__* call).
//
//   node check-grader-memory.mjs [--projects <dir>] [--session <id>] <tag>=<agentId> | <tag>=session:<uuid> | <tag>=file:<C:/ path> ...
//   Each line reads  <tag>: LOADED|ABSENT  projectMemory=<n> claudeMem=<n>  (...)  -- both groups apart, for blind/graders.json (A2 point 5).
//   session:<uuid> is found by id in EVERY folder under --projects (hashed-suffix slugs); paths are C:/ form (a /c/... path is refused, exit 2).
//   exit 0  every transcript ABSENT      exit 1  at least one LOADED      exit 2  usage      exit 3  a transcript was not found
//
// Calibrated by scripts/grader-session-calibrate.mjs on the positive control a9d35e8deacac3eff (the s50l alias probe, which loaded the
// project memory: must read LOADED), a real top-level session (both groups), and copies of those with the effect removed (must read ABSENT).
import fs from 'node:fs';
import path from 'node:path';

export const PROJECT_MEMORY = [
    // A2 point 8: 'MEMORY.md' is NOT a marker -- every session receives the generic auto-memory instructions that name it ("add a one-line pointer in
    // MEMORY.md ..."), so it would mark every grader LOADED. 'Memory Index' (the index header) is distinctive: 0 hits in the 22:19 probe.
    'Memory Index', '-natively-cluely-ai-assistant/memory',
    // distinctive memory file names from the project's MEMORY.md index (any one is enough)
    'project_ipc_routing', 'project_overlay_sizing', 'project_context_toggle', 'project_product_invariants', 'project_answer_failure_diagnosis',
    'project_whole_turn_design', 'project_followup_earlier_questions', 'project_h40d_flight', 'project_quality_bench', 'project_gemma_coding_quality',
    'feedback_pass_records', 'feedback_grade_bare_arms', 'tooling_bash_escapes', 'tooling_commit_shared_index', 'project_cue_mode_next',
];
export const CLAUDE_MEM = [/\] recent context, \d{4}-\d{2}-\d{2}/, /<claude-mem-context>/];

/** Scans a jsonl text. Returns { records, bytes, projectMemory: { total, byMarker }, claudeMem: { total }, loaded }. */
export function scan(text) {
    const byMarker = {};
    let pm = 0, cm = 0, records = 0;
    const cmProjects = new Set();
    for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        records++;
        for (const m of PROJECT_MEMORY) { const n = line.split(m).length - 1; if (n) { byMarker[m] = (byMarker[m] ?? 0) + n; pm += n; } }
        for (const rx of CLAUDE_MEM) { const n = (line.match(new RegExp(rx.source, "g")) ?? []).length; cm += n; }
        for (const mm of line.matchAll(/# \[([^\]\\]+)\] recent context, /g)) cmProjects.add(mm[1]);
    }
    return { records, bytes: text.length, projectMemory: { total: pm, markers: Object.keys(byMarker).length, byMarker }, claudeMem: { total: cm, projects: [...cmProjects] }, loaded: pm + cm > 0 };
}

function main() {
    const argv = process.argv.slice(2);
    let projects = 'C:/Users/sotka/.claude/projects', session = null;
    const items = [];
    const usage = (why) => { console.error(`check-grader-memory: ${why}\nusage: node check-grader-memory.mjs [--projects <dir>] [--session <id>] <tag>=<agentId>|<tag>=session:<uuid>|<tag>=file:<path> ...`); process.exit(2); };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--projects' || a === '--session') { const v = argv[++i]; if (!v) usage(`${a} needs a value`); if (a === '--projects') projects = v; else session = v; }
        else if (a.startsWith('--')) usage(`unknown option ${a}`);
        else {
            const m = /^([^=]+)=(?:(session|file):(.+)|(?:agent-)?([A-Za-z0-9]{8,40}))$/.exec(a);
            if (m && m[2] === 'file' && !/^[A-Za-z]:[\\/]/.test(m[3])) usage(`file:${m[3]} is not a C:/ path (a /c/... path is not readable by node)`);
            if (!m) usage(`"${a}" is not <tag>=<agentId> | session:<uuid> | file:<path>`);
            items.push(m[2] ? { tag: m[1], kind: m[2], v: m[3] } : { tag: m[1], kind: 'agent', v: m[4] });
        }
    }
    if (!items.length) usage('nothing to check');
    const dirs = (p) => { try { return fs.readdirSync(p, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name); } catch { return []; } };
    const find = ({ kind, v }) => {
        if (kind === 'file') return fs.existsSync(v) ? v : null;
        const cands = [];
        for (const slug of dirs(projects)) {
            if (kind === 'session') cands.push(path.join(projects, slug, `${v}.jsonl`));
            else for (const sess of session ? [session] : dirs(path.join(projects, slug))) cands.push(path.join(projects, slug, sess, 'subagents', `agent-${v}.jsonl`));
        }
        return cands.find((f) => fs.existsSync(f) && fs.statSync(f).size > 0) ?? null;
    };
    let anyLoaded = false, anyMissing = false;
    for (const it of items) {
        const f = find(it);
        if (!f) { console.log(`${it.tag}: TRANSCRIPT NOT FOUND (${it.kind}:${it.v}) -> cannot check`); anyMissing = true; continue; }
        const r = scan(fs.readFileSync(f, 'utf8'));
        const names = Object.entries(r.projectMemory.byMarker).map(([k, n]) => `${k}x${n}`).join(' ');
        console.log(`${it.tag}: ${r.loaded ? 'LOADED' : 'ABSENT'}  projectMemory=${r.projectMemory.total} claudeMem=${r.claudeMem.total}  (project-memory markers: ${r.projectMemory.total} hits in ${r.projectMemory.markers} distinct${names ? ` [${names}]` : ''}; claude-mem context markers: ${r.claudeMem.total}${r.claudeMem.projects.length ? ` (project names in the header: ${r.claudeMem.projects.join(', ')})` : ''}; scanned ${r.records} records, ${r.bytes} bytes)`);
        anyLoaded ||= r.loaded;
    }
    console.log(anyMissing ? 'MEMORY CHECK: a transcript was not found' : anyLoaded ? 'MEMORY CHECK: at least one transcript LOADED' : `MEMORY CHECK: all ${items.length} transcripts ABSENT`);
    process.exitCode = anyMissing ? 3 : anyLoaded ? 1 : 0;
}
import { fileURLToPath } from 'node:url';
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
