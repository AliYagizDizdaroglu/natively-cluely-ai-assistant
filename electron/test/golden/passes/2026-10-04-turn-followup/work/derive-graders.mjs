// Controller tool (A2 point 5): runs the three checkers ONCE each over all 18 slots (tags = slot names, session = the slot's latest
// exit-0 launch in R/blind/launches.jsonl), keeps their stdout beside graders.json as graders.models.out.txt / graders.memory.out.txt /
// graders.audit.out.txt, and DERIVES R/blind/graders.json from those outputs (never typed). Every command + output goes to R/run.log.
// The audit runs in its DEFAULT mode (no --allow-validation-bash; A2 point 15, M-3).
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const R = 'C:/Users/sotka/AppData/Local/Temp/claude/C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a/9c5886c7-cdbd-48af-b8bc-e9275012ec64/scratchpad/followup-turn/R';
const B = `${R}/blind`, PROJ = 'C:/Users/sotka/.claude/projects', LOG = `${R}/run.log`;
const stamp = () => new Date().toLocaleString('sv-SE', { hour12: false });
const launches = fs.readFileSync(`${B}/launches.jsonl`, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const slots = []; for (let n = 1; n <= 9; n++) for (const g of ['g1', 'g2']) slots.push(`blind-${n}.${g}`);
const agent = {}, replaced = {}, launchOf = {};
for (const s of slots) {
    const ok = launches.filter((l) => l.slot === s && l.exit === 0).sort((a, b) => a.attempt - b.attempt);
    if (!ok.length) { console.log(`REFUSED: ${s} has no exit-0 launch`); process.exit(2); }
    agent[s] = ok[ok.length - 1].session_id;
    launchOf[s] = ok[ok.length - 1];
    // A3: an attempt the provider refused before any output (empty model, rate_limit) is not a grader attempt and never a `replaced` entry;
    // only a grader that ran (model recorded) and died or wrote an incomplete file is.
    replaced[s] = launches.filter((l) => l.slot === s && l.session_id && l.session_id !== agent[s] && l.model).map((l) => l.session_id);
}
const pairs = slots.map((s) => `${s}=session:${agent[s]}`);
function tool(name, args, outFile, okExit) {
    const r = spawnSync('node', args, { cwd: R, encoding: 'utf8', maxBuffer: 64 << 20 });
    const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
    fs.writeFileSync(`${B}/${outFile}`, out);
    fs.appendFileSync(LOG, `\n[${stamp()}] graders -- (cwd ${R}) node ${args.join(' ')} -> exit ${r.status}\n${out.trimEnd()}\n`);
    console.log(`${name}: exit ${r.status} (${outFile})`);
    if (!okExit.includes(r.status)) { console.log(`STOP: ${name} exit ${r.status}`); process.exit(2); }
    return out;
}
const models = tool('models', ['h40d-grader-models.mjs', '--projects', PROJ, ...pairs], 'graders.models.out.txt', [0, 1]);
const memory = tool('memory', ['check-grader-memory.mjs', '--projects', PROJ, ...pairs], 'graders.memory.out.txt', [0, 1]);
const audit = tool('audit', ['audit-graders.mjs', '--blind-dir', B, '--projects', PROJ, ...pairs], 'graders.audit.out.txt', [0, 1]);
const lineFor = (text, s) => text.split('\n').find((l) => l.startsWith(`${s}:`) || l.startsWith(`${s} (`));
const graders = {};
for (const s of slots) {
    const ml = lineFor(models, s), mm = lineFor(memory, s), al = lineFor(audit, s);
    const model = /\{"([^"]+)":\d+\}\s+PINNED/.exec(ml ?? '')?.[1] ?? null;
    const mem = /:\s+(ABSENT|LOADED)\s+projectMemory=(\d+) claudeMem=(\d+)/.exec(mm ?? '');
    const au = /;\s*(clean|FLAGGED)[^;]*;\s*bash=\[([^\]]*)\]/.exec(al ?? '') ?? /(FLAGGED)/.exec(al ?? '');
    graders[s] = { agent: agent[s], attempt: launchOf[s].attempt, cwd: launchOf[s].cwd, model, memory: mem?.[1] ?? null, projectMemory: mem ? Number(mem[2]) : null, claudeMem: mem ? Number(mem[3]) : null,
        audit: au?.[1] ?? null, bash: au?.[2] ? au[2].split(',').map((x) => x.trim()).filter(Boolean) : [], replaced: replaced[s] };
    console.log(`${s}: model ${model} memory ${graders[s].memory} pm=${graders[s].projectMemory} cm=${graders[s].claudeMem} audit ${graders[s].audit} bash ${graders[s].bash.length} replaced ${graders[s].replaced.length}`);
}
fs.writeFileSync(`${B}/graders.json`, JSON.stringify({ instrument: '8564ba96369a', departure: false, graders }, null, 1));
fs.appendFileSync(LOG, `[${stamp()}] graders.json derived from the three outputs + launches.jsonl (work/derive-graders.mjs)\n`);
console.log('graders.json written');
