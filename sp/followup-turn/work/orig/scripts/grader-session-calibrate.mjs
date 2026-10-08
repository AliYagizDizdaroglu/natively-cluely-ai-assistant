// Rule-8 calibration of the three grader-session instruments (PREREGISTER-turn-followup.md section 1, "Graders" / "Memory", I1; section 6.0):
//   h40d-grader-models.mjs (adapted: top-level sessions), check-grader-memory.mjs, audit-graders.mjs.
// Every check is run on a case whose answer is known and on the same case with the effect removed, so each is shown to answer
// DIFFERENTLY when the effect is absent. Real transcripts used (read-only; counts and verdicts printed, never a line of content):
//   a9d35e8deacac3eff  the s50l alias probe, which loaded the project memory (the registration's positive control: must read LOADED)
//   dea53624-...       a real top-level session of this project (project memory AND claude-mem SessionStart context)
//   727 subagent transcripts of this session, against an INDEPENDENT oracle: an `instructions` attachment carrying an AutoMem entry
//   addb84e6bd55778d5 ... the eight real s50l graders (each used Bash once to validate its own verdicts file)
// What cannot be calibrated here: a REAL outside-cwd probe reading ABSENT -- that session does not exist yet (registration 6.0 / 12.3c;
// it needs a live agent). Its ABSENT is calibrated on copies of the real positives with the memory carriers removed.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const R = path.dirname(HERE);
const PROJECTS = 'C:/Users/sotka/.claude/projects';
const SLUG = 'C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a';
const SESSION = '9c5886c7-cdbd-48af-b8bc-e9275012ec64';
const MAIN_TOP = 'dea53624-07b8-4126-a43f-b9c49064cfff';
const PROBE = 'a9d35e8deacac3eff';
const cli = (script, args) => { const r = spawnSync(process.execPath, [path.join(R, script), ...args], { encoding: 'utf8' }); return { code: r.status, out: `${r.stdout}${r.stderr}` }; };
let ok = true;
const check = (name, pass, detail = '') => { ok &&= !!pass; console.log(`${pass ? 'OK  ' : 'BAD '} ${name}${detail ? `  [${detail}]` : ''}`); };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'grader-cal-'));
const fx = path.join(tmp, 'projects', 'slugX');
fs.mkdirSync(path.join(fx, 'sess1', 'subagents'), { recursive: true });
const rec = (o) => JSON.stringify(o);
const assistant = (model, content = [{ type: 'text', text: 'ok' }]) => rec({ type: 'assistant', message: { role: 'assistant', model, content } });
const tool = (name, input) => ({ type: 'tool_use', id: 't', name, input });
const writeJsonl = (f, lines) => fs.writeFileSync(f, `${lines.join('\n')}\n`);

// ───────────────────────── A. h40d-grader-models.mjs (adapted) ─────────────────────────
console.log('=== A. h40d-grader-models.mjs: top-level sessions ===');
const TOP_OPUS = '11111111-1111-4111-8111-111111111111', TOP_OTHER = '22222222-2222-4222-8222-222222222222', TOP_MIXED = '33333333-3333-4333-8333-333333333333', TOP_SYNTH = '44444444-4444-4444-8444-444444444444';
writeJsonl(path.join(fx, `${TOP_OPUS}.jsonl`), [assistant('claude-opus-5-5'), assistant('claude-opus-5-5')]);
writeJsonl(path.join(fx, `${TOP_OTHER}.jsonl`), [assistant('claude-opus-4-1')]);
writeJsonl(path.join(fx, `${TOP_MIXED}.jsonl`), [assistant('claude-opus-5-5'), assistant('claude-sonnet-5-5')]);
writeJsonl(path.join(fx, `${TOP_SYNTH}.jsonl`), [assistant('claude-opus-5-5'), assistant('<synthetic>')]);
writeJsonl(path.join(fx, 'sess1', 'subagents', 'agent-abcdef0123456789.jsonl'), [assistant('claude-opus-5-5')]);
const gm = (args) => cli('h40d-grader-models.mjs', ['--projects', path.join(tmp, 'projects'), '--temp', path.join(tmp, 'notemp'), ...args]);
{
    let r = gm([`probe=session:${TOP_OPUS}`]); check('top-level session on claude-opus-5-5 reads PINNED, exit 0', r.code === 0 && /PINNED/.test(r.out) && /top-level session file/.test(r.out) && !/NOT PINNED/.test(r.out));
    r = gm([`probe=session:${TOP_OTHER}`]); check('top-level session on another model reads NOT PINNED, exit 1', r.code === 1 && /NOT PINNED/.test(r.out) && /GRADER PIN NOT MET/.test(r.out));
    r = gm([`probe=session:${TOP_MIXED}`]); check('top-level session with two models reads NOT PINNED, exit 1', r.code === 1 && /NOT PINNED/.test(r.out));
    r = gm([`probe=session:${TOP_SYNTH}`]); check('a <synthetic> API-error record is counted apart and does not make it mixed, exit 0', r.code === 0 && /PINNED/.test(r.out) && /synthetic/.test(r.out));
    r = gm(['probe=session:55555555-5555-4555-8555-555555555555']); check('a top-level session with no transcript reads NOT VERIFIED, exit 1', r.code === 1 && /NO TRANSCRIPT FOUND/.test(r.out) && /NOT VERIFIED/.test(r.out));
    r = gm(['--session', 'sess1', 'g=abcdef0123456789', `probe=session:${TOP_OPUS}`]); check('a subagent (named session) and a top-level session in one call, both PINNED', r.code === 0 && /ALL GRADERS claude-opus-5-5 \(2 of 2 agents\)/.test(r.out));
    r = gm(['probe=notanid']); check('a malformed id is a usage error, exit 2', r.code === 2);
    r = cli('h40d-grader-models.mjs', ['--session', SESSION, `probe=${PROBE}`]); check(`the real alias probe ${PROBE} reads PINNED (claude-opus-5-5)`, r.code === 0 && /PINNED/.test(r.out) && !/NOT PINNED/.test(r.out));
    r = cli('h40d-grader-models.mjs', [`top=session:${MAIN_TOP}`]); check('a real top-level session of this project is found by its session file and read', /top-level session file/.test(r.out) && /claude-opus-5-5/.test(r.out) && r.code === 0);
}

// ───────────────────────── B. check-grader-memory.mjs ─────────────────────────
console.log('\n=== B. check-grader-memory.mjs ===');
const { scan } = await import(new URL(`file:///${path.join(R, 'check-grader-memory.mjs').replace(/\\/g, '/')}`).href);
const probeFile = path.join(PROJECTS, SLUG, SESSION, 'subagents', `agent-${PROBE}.jsonl`);
const topFile = path.join(PROJECTS, 'C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant', `${MAIN_TOP}.jsonl`);
const probeText = fs.readFileSync(probeFile, 'utf8'), topText = fs.readFileSync(topFile, 'utf8');
const mem = (file) => cli('check-grader-memory.mjs', [`t=file:${file}`]);
const countOf = (s, re) => Number((re.exec(s) ?? [])[1] ?? NaN);
{
    let r = cli('check-grader-memory.mjs', ['--session', SESSION, `probe=${PROBE}`]);
    check(`POSITIVE CONTROL ${PROBE} (the s50l alias probe) reads LOADED, exit 1`, r.code === 1 && /^probe: LOADED/m.test(r.out) && countOf(r.out, /project-memory markers: (\d+) hits/) > 0);
    r = cli('check-grader-memory.mjs', [`top=session:${MAIN_TOP}`]);
    check('a real top-level session reads LOADED by BOTH marker groups (project memory and claude-mem context)', r.code === 1 && /^top: LOADED/m.test(r.out) && countOf(r.out, /project-memory markers: (\d+) hits/) > 0 && countOf(r.out, /claude-mem context markers: (\d+)/) > 0);

    // break the effect, structurally (by record type, not by marker text): drop the `instructions` attachment (memory + CLAUDE.md carrier)
    const dropType = (text, types) => text.split('\n').filter((l) => { if (!l.trim()) return true; try { const j = JSON.parse(l); return !(j.type === 'attachment' && types.some((t) => j.attachment?.type?.startsWith(t))); } catch { return true; } }).join('\n');
    const probeNoMem = path.join(tmp, 'probe-no-instructions.jsonl'); fs.writeFileSync(probeNoMem, dropType(probeText, ['instructions']));
    const rA = mem(probeNoMem);
    check('the positive control with its `instructions` attachment removed reads ABSENT, exit 0 (the check answers differently when the effect is absent)', rA.code === 0 && /^t: ABSENT/m.test(rA.out), rA.out.split('\n')[0].slice(0, 90));
    // the same file with ONE marker line put back must flip to LOADED
    const withMarker = path.join(tmp, 'probe-no-instructions+marker.jsonl');
    fs.writeFileSync(withMarker, `${fs.readFileSync(probeNoMem, 'utf8')}\n${JSON.stringify({ type: 'user', message: { role: 'user', content: 'see project_followup_earlier_questions.md' } })}\n`);
    check('... and one memory file NAME put back flips it to LOADED', mem(withMarker).code === 1);
    const withIdx = path.join(tmp, 'probe-no-instructions+index.jsonl');
    fs.writeFileSync(withIdx, `${fs.readFileSync(probeNoMem, 'utf8')}\n${JSON.stringify({ type: 'user', message: { role: 'user', content: '# Memory Index — x' } })}\n`);
    check('... and the "Memory Index" header put back flips it to LOADED', mem(withIdx).code === 1);
    const withCm = path.join(tmp, 'probe-no-instructions+claudemem.jsonl');
    fs.writeFileSync(withCm, `${fs.readFileSync(probeNoMem, 'utf8')}\n${JSON.stringify({ type: 'attachment', attachment: { type: 'hook_additional_context', content: ['# [grading] recent context, 2026-10-03 6:00pm GMT+3\nMode: x'] } })}\n`);
    const rCm = mem(withCm);
    check('... and a claude-mem SessionStart header (any project name) put back flips it to LOADED, naming the project', rCm.code === 1 && /claude-mem context markers: 1 \(project names in the header: grading\)/.test(rCm.out));
    const names = path.join(tmp, 'probe-no-instructions+toolnames.jsonl');
    fs.writeFileSync(names, `${fs.readFileSync(probeNoMem, 'utf8')}\n${JSON.stringify({ type: 'attachment', attachment: { type: 'skill_listing', content: '- claude-mem:babysit: x\n- claude-mem:mem-search: y mcp__plugin_claude-mem_mcp-search__search' } })}\n`);
    check('claude-mem TOOL/SKILL NAMES alone (present in every session under any cwd) do NOT read LOADED', mem(names).code === 0);

    // the top-level session: remove each carrier separately
    const topNoInstr = path.join(tmp, 'top-no-instructions.jsonl'); fs.writeFileSync(topNoInstr, dropType(topText, ['instructions']));
    const topNoHooks = path.join(tmp, 'top-no-hooks.jsonl'); fs.writeFileSync(topNoHooks, dropType(topText, ['hook_']));
    const topNone = path.join(tmp, 'top-no-instructions-no-hooks.jsonl'); fs.writeFileSync(topNone, dropType(dropType(topText, ['instructions']), ['hook_']));
    const rI = mem(topNoInstr), rH = mem(topNoHooks), rN = mem(topNone);
    const g = (o, re) => countOf(o.out, re);
    console.log(`     leftovers in the top-level session: without instructions pm=${g(rI, /project-memory markers: (\d+)/)} cm=${g(rI, /claude-mem context markers: (\d+)/)}; without hook records pm=${g(rH, /project-memory markers: (\d+)/)} cm=${g(rH, /claude-mem context markers: (\d+)/)}; without both pm=${g(rN, /project-memory markers: (\d+)/)} cm=${g(rN, /claude-mem context markers: (\d+)/)}`);
    check('top-level session minus its `instructions` attachment: the claude-mem group still reads LOADED', g(rI, /claude-mem context markers: (\d+)/) > 0 && rI.code === 1);
    check('top-level session minus its hook records: the project-memory group still reads LOADED', g(rH, /project-memory markers: (\d+)/) > 0 && rH.code === 1);
    check('top-level session minus the claude-mem hook records loses the claude-mem group (0 hits)', g(rH, /claude-mem context markers: (\d+)/) === 0);
    check('top-level session minus the `instructions` attachment loses most of the project-memory hits', g(rI, /project-memory markers: (\d+)/) < countOf(mem(topFile).out, /project-memory markers: (\d+)/));
}
{   // population: 727 real subagent transcripts of this session vs an independent oracle (an `instructions` attachment with an AutoMem entry)
    const dir = path.join(PROJECTS, SLUG, SESSION, 'subagents');
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl'));
    const cm = { memLoaded: 0, memAbsent: 0, noMemLoaded: 0, noMemAbsent: 0 }, odd = [];
    for (const f of files) {
        const text = fs.readFileSync(path.join(dir, f), 'utf8');
        let oracle = false;
        for (const l of text.split('\n')) { if (!l.includes('"instructions"')) continue; try { const j = JSON.parse(l); if (j.attachment?.type === 'instructions' && (j.attachment.files ?? []).some((x) => x.type === 'AutoMem')) oracle = true; } catch { /* skip */ } }
        const loaded = scan(text).loaded;
        if (oracle && loaded) cm.memLoaded++; else if (oracle) { cm.memAbsent++; odd.push(`${f}: AutoMem entry but ABSENT`); } else if (loaded) { cm.noMemLoaded++; odd.push(`${f}: no AutoMem entry but LOADED`); } else cm.noMemAbsent++;
    }
    console.log(`     population: ${files.length} subagent transcripts; with an AutoMem entry: ${cm.memLoaded} LOADED / ${cm.memAbsent} ABSENT; without: ${cm.noMemLoaded} LOADED / ${cm.noMemAbsent} ABSENT`);
    check('the check never misses an AutoMem-loaded transcript (0 false ABSENT in the population)', cm.memAbsent === 0 && cm.memLoaded > 100);
    check('the check reads ABSENT on every transcript without an AutoMem entry except those that READ memory files through a tool', cm.noMemAbsent > 50 && cm.noMemLoaded <= 5, `${cm.noMemLoaded} such exceptions (a transcript with a Read/Bash of a memory file is exposed too)`);
    for (const f of odd.slice(0, 6)) {   // each exception must really be a tool read of memory: a tool_use input naming memory
        const text = fs.readFileSync(path.join(dir, f.split(':')[0]), 'utf8');
        let toolRead = 0;
        for (const l of text.split('\n')) { if (!l.trim()) continue; try { for (const c of JSON.parse(l).message?.content ?? []) if (c?.type === 'tool_use' && /memory|MEMORY/.test(JSON.stringify(c.input))) toolRead++; } catch { /* skip */ } }
        check(`exception ${f.split(':')[0].slice(0, 22)}: a tool call names a memory file (a real exposure, LOADED is right)`, toolRead > 0);
    }
}

// ───────────────────────── C. audit-graders.mjs ─────────────────────────
console.log('\n=== C. audit-graders.mjs ===');
const au = (lines, tag = 'blind-1.g1', extra = []) => {
    const f = path.join(tmp, `audit-${Math.random().toString(36).slice(2)}.jsonl`);
    writeJsonl(f, lines);
    return cli('audit-graders.mjs', [...extra, `${tag}=file:${f}`]);
};
const B = 'C:/x/blind';
const cleanLines = [assistant('claude-opus-5-5', [tool('Read', { file_path: 'C:/x/interview60.grader-prompt.md' }), tool('Read', { file_path: `${B}/pairs.blind-1.json` }), tool('Write', { file_path: `${B}/verdicts.blind-1.g1.json`, content: '{}' })])];
const valBash = (cmd) => [...cleanLines, assistant('claude-opus-5-5', [tool('Bash', { command: cmd })])];
{
    let r = au(cleanLines); check('a grader that only Reads the rubric + pairs and Writes its own verdicts is clean, exit 0', r.code === 0 && /clean/.test(r.out) && !/FLAGGED/.test(r.out.replace('AUDIT: all graders clean', '')));
    r = au([...cleanLines, assistant('claude-opus-5-5', [tool('mcp__plugin_claude-mem_mcp-search__search', { query: 'x' })])]); check('an mcp__* call (claude-mem search) is FLAGGED, exit 1', r.code === 1 && /MCP CALL mcp__plugin_claude-mem/.test(r.out));
    r = au([...cleanLines, assistant('claude-opus-5-5', [tool('mcp__plugin_claude-mem_mcp-search__search', { query: 'x' })])], 'blind-1.g1', ['--allow-validation-bash']); check('... and stays FLAGGED under --allow-validation-bash', r.code === 1 && /MCP CALL/.test(r.out));
    r = au([...cleanLines, assistant('claude-opus-5-5', [tool('WebFetch', { url: 'https://x' })])]); check('a tool other than Read/Write (WebFetch) is FLAGGED', r.code === 1 && /TOOL OTHER THAN Read\/Write: WebFetch/.test(r.out));
    r = au([...cleanLines, assistant('claude-opus-5-5', [tool('Grep', { pattern: 'x', path: B })])]); check('Grep is FLAGGED', r.code === 1 && /Grep/.test(r.out));
    r = au(valBash('node -e "console.log(1)" verdicts.blind-1.g1.json')); check('a Bash call is FLAGGED by default (the registered rule: any tool other than Read/Write)', r.code === 1 && /Bash x1/.test(r.out));
    r = au(valBash('cd C:/x/blind && node -e "JSON.parse(require(\'fs\').readFileSync(\'verdicts.blind-1.g1.json\'))" pairs.blind-1.json'), 'blind-1.g1', ['--allow-validation-bash']); check('--allow-validation-bash passes a Bash that only validates its OWN verdicts file against its pairs file', r.code === 0 && /clean/.test(r.out));
    r = au(valBash('cat key.blind-1.json verdicts.blind-1.g1.json'), 'blind-1.g1', ['--allow-validation-bash']); check('... but not a Bash that touches a key file', r.code === 1);
    r = au(valBash('cat verdicts.blind-1.g1.json verdicts.blind-1.g2.json'), 'blind-1.g1', ['--allow-validation-bash']); check('... nor one that reads the other grader\'s verdicts', r.code === 1);
    r = au(valBash('cat verdicts.blind-1.g1.json ~/.claude/projects/x/memory/MEMORY.md'), 'blind-1.g1', ['--allow-validation-bash']); check('... nor one that reads a memory file', r.code === 1);
    r = au(valBash('echo hi'), 'blind-1.g1', ['--allow-validation-bash']); check('... nor a Bash that does not name the grader\'s own verdicts file', r.code === 1);
    r = au([...cleanLines, assistant('claude-opus-5-5', [tool('Read', { file_path: `${B}/key.blind-1.json` })])]); check('a Read of a key file is FLAGGED', r.code === 1 && /key\.blind-1/.test(r.out));
    r = au([...cleanLines, assistant('claude-opus-5-5', [tool('Read', { file_path: 'C:/x/interview60.answers.gemini-3.5-flash-lite_fturn-s50m-A-r1.json' })])]); check('a Read of an answer file is FLAGGED', r.code === 1 && /interview60\.answers/.test(r.out));
    r = au([...cleanLines, assistant('claude-opus-5-5', [tool('Read', { file_path: `${B}/verdicts.blind-1.g2.json` })])]); check('a Read of the other grader\'s verdicts is FLAGGED', r.code === 1 && /verdicts\.blind-1\.g2/.test(r.out));
    r = au([...cleanLines, assistant('claude-opus-5-5', [tool('Write', { file_path: `${B}/verdicts.blind-2.g1.json`, content: '{}' })])]); check('a Write to another file\'s verdicts is FLAGGED', r.code === 1);
    r = cli('audit-graders.mjs', ['--projects', path.join(tmp, 'projects'), 'blind-1.g1=ffffffffffffffff']); check('a transcript that cannot be found cannot be audited: exit 1', r.code === 1 && /NOT FOUND/.test(r.out));
    r = cli('audit-graders.mjs', ['--session', SESSION, `blind-1.g1=${PROBE}`]); check(`the real alias probe ${PROBE} (no tool use at all) is clean`, r.code === 0 && /0 tool inputs/.test(r.out));
    const real = ['blind-1.g1=addb84e6bd55778d5', 'blind-1.g2=a681f259dff0dae30', 'blind-2.g1=a5eb230f8d7cb101a', 'blind-2.g2=ab34ebe95114932db', 'blind-3.g1=a83e3007ff2d0bc45', 'blind-3.g2=ab605c210a849d667', 'blind-4.g1=aa08ae8c058eb8aa9', 'blind-4.g2=aa85ea6faa528f27c'];
    r = cli('audit-graders.mjs', ['--session', SESSION, ...real]);
    check('REGISTRATION CONFLICT, shown on the 8 real s50l graders: under the rule as written every grader is FLAGGED (each ran one Bash to validate its own verdicts file)', r.code === 1 && (r.out.match(/TOOL OTHER THAN Read\/Write: Bash x1/g) ?? []).length === 8);
    r = cli('audit-graders.mjs', ['--allow-validation-bash', '--session', SESSION, ...real]);
    check('... and under --allow-validation-bash the same 8 real graders read clean', r.code === 0 && /all graders clean/.test(r.out));
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(ok ? '\nGRADER-SESSION CALIBRATION OK' : '\nGRADER-SESSION CALIBRATION FAILED');
process.exit(ok ? 0 : 1);
