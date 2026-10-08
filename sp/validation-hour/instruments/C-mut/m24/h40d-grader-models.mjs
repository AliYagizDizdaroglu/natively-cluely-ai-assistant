// The grader pin of PREREGISTER-h40d.r4.md (section 2 "The grader", section 6 "GRADER DRIFT", section 7.4): the model each grading agent
// actually ran on, read from the agent's OWN transcript (the model field of its assistant records), never from what was requested.
// h40c-grader-models.mjs with the session a parameter and a search behind it (review M1): an agent is looked up first in the named
// session's folders, and when they do not hold it, in EVERY session's subagents/ under EVERY project slug and in every temp tasks/
// folder. Prints only model ids, message counts and where the file was found; never transcript content.
//
//   node h40d-grader-models.mjs [--session <id>] <tag>=<agentId> ...
//   node h40d-grader-models.mjs --session 9c5886c7-cdbd-48af-b8bc-e9275012ec64 inapp=abcb62d968375290e probe=a724b4a1166d1c18a
//
//   exit 0  every agent found, every one of them ran exactly claude-opus-5-5
//   exit 1  GRADER PIN NOT MET (a different model, mixed models) or NOT VERIFIED (an agent with no transcript found)
//   exit 2  usage error
//
// Where a transcript lives (both searched):  <projects>/<slug>/<session>/subagents/agent-<id>.jsonl
//                                            <temp>/<slug>/<session>/tasks/<id>.output   (a hard link to the same file, or an EMPTY
//                                            placeholder while the agent runs: empty files are ignored)
// --projects <dir> and --temp <dir> change the two roots (calibration fixtures); the defaults are this machine's.
//
// One deliberate difference from h40c-grader-models.mjs: a "<synthetic>" assistant record is the CLIENT's placeholder for an API error
// (isApiErrorMessage true, error "rate_limit", 0 output tokens), not a model's output. It carries no model identity, so it is counted
// and PRINTED beside the model ids but does not make an agent "mixed". h40c's script would have read it as a second model and said
// NOT PINNED. 6 of the 167 transcripts that name claude-opus-5-5 on this machine hold one (checked 2026-10-01), so a rate limit on
// one of Friday's ten graders is likely enough to matter.
import fs from 'node:fs';
import path from 'node:path';

const PIN = 'claude-opus-5-5';
const SYNTHETIC = '<synthetic>';
let projects = 'C:/Users/sotka/.claude/projects';
let temp = 'C:/Users/sotka/AppData/Local/Temp/claude';

const usage = (why) => {
    console.error(`h40d-grader-models: ${why}`);
    console.error('usage: node h40d-grader-models.mjs [--session <id>] [--projects <dir>] [--temp <dir>] <tag>=<agentId> ...');
    process.exit(2);
};

let session = null;
const agents = [];
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--session' || a === '--projects' || a === '--temp') {
        const v = argv[++i];
        if (!v) usage(`${a} needs a value`);
        if (a === '--session') { if (!/^[A-Za-z0-9_-]{4,64}$/.test(v)) usage(`--session ${v} is not a session id`); session = v; }
        else if (a === '--projects') projects = v;
        else temp = v;
    } else if (a.startsWith('--')) usage(`unknown option ${a}`);
    else {
        const m = /^([^=]+)=(?:agent-)?([A-Za-z0-9]{8,40})$/.exec(a);
        if (!m) usage(`"${a}" is not <tag>=<agentId>`);
        agents.push({ tag: m[1], id: m[2] });
    }
}
if (!agents.length) usage('no <tag>=<agentId> given');

const dirs = (p) => {
    try { return fs.readdirSync(p, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name); } catch { return []; }
};

/** Every existing candidate file for an agent, in one session (named) or in all of them (null). */
function places(id, onlySession) {
    const out = [];
    for (const slug of dirs(projects)) {
        for (const sess of onlySession ? [onlySession] : dirs(path.join(projects, slug))) {
            out.push({ kind: 'subagents', slug, sess, file: path.join(projects, slug, sess, 'subagents', `agent-${id}.jsonl`) });
        }
    }
    for (const slug of dirs(temp)) {
        for (const sess of onlySession ? [onlySession] : dirs(path.join(temp, slug))) {
            out.push({ kind: 'tasks', slug, sess, file: path.join(temp, slug, sess, 'tasks', `${id}.output`) });
        }
    }
    return out.filter((p) => fs.existsSync(p.file));
}

/** The model ids of a transcript's assistant records, with counts; "<synthetic>" client placeholders counted apart. */
function readModels(file) {
    const models = new Map();
    let synthetic = 0;
    for (const l of fs.readFileSync(file, 'utf8').split('\n')) {
        if (!l.trim()) continue;
        let o; try { o = JSON.parse(l); } catch { continue; }
        const m = o?.message?.model;
        if (o.type !== 'assistant' || !m) continue;
        if (false) synthetic++;
        else models.set(m, (models.get(m) ?? 0) + 1);
    }
    return { models, synthetic };
}

/** The first non-empty candidate that holds assistant records; the named session's before the search. */
function locate(id) {
    let how = 'SEARCH (no --session given)';
    let list = [];
    if (session) {
        list = places(id, session).filter((p) => fs.statSync(p.file).size > 0);
        how = 'session path';
    }
    let empties = 0;
    if (!list.length) {
        const all = places(id, null);
        empties = all.filter((p) => fs.statSync(p.file).size === 0).length;
        list = all.filter((p) => fs.statSync(p.file).size > 0);
        if (session) how = `SEARCH (not under session ${session.slice(0, 8)})`;
    }
    let noAssistant = 0;
    for (const p of list) {
        const r = readModels(p.file);
        if (r.models.size + r.synthetic > 0) return { ...r, how, where: `${p.slug.slice(-24)}/${p.sess.slice(0, 8)}/${p.kind}/${path.basename(p.file)}` };
        noAssistant++;
    }
    return { missing: true, empties, noAssistant };
}

const results = [];
for (const { tag, id } of agents) {
    const r = locate(id);
    if (r.missing) {
        const why = r.noAssistant ? `${r.noAssistant} file(s) found but none holds an assistant record` : r.empties ? `${r.empties} empty placeholder file(s) ignored` : 'nothing under any session';
        console.log(`${tag}: NO TRANSCRIPT FOUND for ${id} (${why})`);
        results.push({ tag, found: false, real: [], pinned: false });
        continue;
    }
    const real = [...r.models.keys()];
    const pinned = real.length === 1 && real[0] === PIN;
    const synth = r.synthetic ? ` + ${r.synthetic} ${SYNTHETIC} API-error record(s), not model output` : '';
    const noReal = real.length === 0 ? ' (no real assistant record)' : '';
    console.log(`${tag}: ${JSON.stringify(Object.fromEntries(r.models))}${synth}${noReal} ${pinned ? 'PINNED' : 'NOT PINNED'}  (found by ${r.how}: ${r.where})`);
    results.push({ tag, found: true, real, pinned });
}

// exitCode, not process.exit(): stdout is a pipe under a runner and must drain first
const n = results.length;
const missing = results.filter((r) => !r.found);
const unpinned = results.filter((r) => r.found && !r.pinned);
if (!missing.length && !unpinned.length) {
    console.log(`ALL GRADERS ${PIN} (${n} of ${n} agents)`);
} else {
    process.exitCode = 1;
    if (missing.length) console.log(`GRADER PIN NOT VERIFIED - no transcript for ${missing.map((r) => r.tag).join(', ')}: nothing may be merged on an unread model`);
    if (unpinned.length) {
        const seen = [...new Set(unpinned.flatMap((r) => r.real))];
        const uniform = !missing.length && seen.length === 1 && results.every((r) => r.real.length === 1 && r.real[0] === seen[0]);
        console.log(`GRADER PIN NOT MET - ${unpinned.map((r) => r.tag).join(', ')} did not run exactly ${PIN} (models seen: ${seen.join(', ') || 'none'}); read section 6 (GRADER DRIFT): 3a is reported, not gated; 3b and 3c still gate`);
        if (uniform) console.log(`every agent ran ${seen[0]}: every merge takes --model ${seen[0]}`);
    }
}
