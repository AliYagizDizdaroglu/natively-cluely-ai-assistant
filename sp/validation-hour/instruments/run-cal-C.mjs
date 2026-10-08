// Brief C's calibration runner (rule 8): every known case through h40d-grader-models.mjs, h40d-hascuerule-check.mjs and h40d-rule3.mjs,
// each with an expectation written FROM THE BRIEF / r4 (never from the output), plus text-leak checks (with positive controls) and a
// cross-check of the noise reading against recheck-r3-scratch/noise-gap.mjs. Writes VH\h40d-grader-models-cal.txt,
// VH\h40d-hascuerule-cal.txt and VH\h40d-rule3-cal.txt (new files). Prints only ids, counts, model ids and YES/NO words; the runner
// holds the sensitive text in memory for the leak checks and never prints it.
//
//   node run-cal-C.mjs [grader] [hascuerule] [rule3]        (no argument = all three)
//   exit 0 = every case read as expected
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)); // VH\instruments
const VH = path.dirname(HERE);
// CAL_INSTRUMENT_DIR / CAL_OUT_DIR: where the three instruments are read from and where the -cal.txt files go. Defaults: VH, VH.
// run-mutants-C.mjs points them at a mutated COPY, so a mutant never touches the real instruments or their saved calibration.
const INST = process.env.CAL_INSTRUMENT_DIR ?? VH;
const OUT = process.env.CAL_OUT_DIR ?? VH;
const NODE = 'C:\\Program Files\\nodejs\\node.exe';
const MAIN = 'C:\\Users\\sotka\\OneDrive\\Masa\u00fcst\u00fc\\natively-cluely-ai-assistant';
const WT = path.join(MAIN, '.claude', 'worktrees', 'whole-turn');
const RUNS = path.join(MAIN, 'electron', 'test', 'golden', 'interview60.runs');
const FLIGHT_MAIN = path.join(MAIN, 'electron', 'test', 'golden', 'interview60.flight.mjs');
const FLIGHT_WT = path.join(WT, 'electron', 'test', 'golden', 'interview60.flight.mjs');
const SESSION = '9c5886c7-cdbd-48af-b8bc-e9275012ec64'; // the controller session that dispatched the h40c graders
const RUN = { h40a: path.join(RUNS, '2026-09-24T08-20-12-h40a'), h40b: path.join(RUNS, '2026-09-26T11-39-51-h40b'), h40c: path.join(RUNS, '2026-09-29T11-42-00-h40c'), br1: path.join(RUNS, '2026-09-30T11-45-30-br1') };
const SMOKE = path.join(WT, 'electron', 'test', 'golden', 'interview60.runs', '2026-10-01T02-37-41-cuesmoke', 'interview60.prompts.json');

const want = new Set(process.argv.slice(2).length ? process.argv.slice(2) : ['grader', 'hascuerule', 'rule3']);
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 16);
const mk = (...p) => { const d = path.join(...p); fs.mkdirSync(d, { recursive: true }); return d; };

function exec(script, args, env = {}) {
    const e = { ...process.env };
    for (const [k, v] of Object.entries(env)) { if (v === null) delete e[k]; else e[k] = v; }
    const r = spawnSync(NODE, [script, ...args], { encoding: 'utf8', env: e, maxBuffer: 256 * 1024 * 1024 });
    return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

/**
 * One case: run it, evaluate the expectation, return the cal-file block and the verdict.
 *   exit / has / hasNot   exit code and regexes over stdout + stderr
 *   leakTexts             sensitive strings that must NOT appear in the output (leakMustFind: they MUST, a positive control)
 *   custom(out) -> bool   one more check, named by customName
 *   hide                  the output is not saved (a positive control's output holds the sensitive text on purpose)
 */
function runCase(id, c) {
    const r = exec(c.script, c.args, c.env);
    const out = r.stdout + (r.stderr ? `[stderr] ${r.stderr}` : '');
    const checks = [];
    if (c.exit !== undefined) checks.push([`exit ${c.exit}`, r.status === c.exit]);
    for (const rx of c.has ?? []) checks.push([`has ${rx}`, rx.test(out)]);
    for (const rx of c.hasNot ?? []) checks.push([`has not ${rx}`, !rx.test(out)]);
    if (c.leakTexts) {
        const found = c.leakTexts.filter((t) => out.includes(t)).length;
        checks.push(c.leakMustFind ? [`positive control: ${found} of ${c.leakTexts.length} sensitive strings found in the output (must be at least 1)`, found >= 1] : [`text-leak check: ${found} of ${c.leakTexts.length} sensitive strings found in the output (must be 0)`, found === 0]);
    }
    if (c.custom) checks.push([c.customName ?? 'custom check', !!c.custom(out)]);
    const ok = checks.every(([, v]) => v);
    const env = Object.entries(c.env ?? {}).filter(([, v]) => v !== null).map(([k, v]) => `${k}=${v}`).join(' ');
    const block = [
        '================================================================',
        `CASE ${id}  ${c.title}`,
        `expected: ${c.expected}`,
        `command: node ${path.dirname(c.script) === INST ? path.basename(c.script) : c.script} ${c.args.map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(' ')}${env ? `   [env ${env}]` : ''}`,
        '----------------------------------------------------------------',
        c.hide ? '(output not saved: it carries the sensitive text on purpose)' : out.trimEnd(),
        `exit code: ${r.status}`,
        `reads as expected: ${ok ? 'YES' : 'NO'}   [${checks.map(([n, v]) => `${v ? 'ok' : 'FAILED'}: ${n}`).join('; ')}]`,
        '',
    ].join('\n');
    return { id, ok, block, out, status: r.status };
}

function finish(name, header, results, extra = [], instrument = null) {
    const n = results.length;
    const good = results.filter((r) => r.ok).length;
    const bad = results.filter((r) => !r.ok).map((r) => r.id);
    const text = [
        header,
        `written by instruments\\run-cal-C.mjs on ${new Date().toISOString()}; every expectation below was written from the brief and r4 BEFORE the run`,
        instrument ? `instrument calibrated: ${path.basename(instrument)}  sha256/16 ${sha(instrument)}  ${fs.statSync(instrument).size} bytes  (compare before relying on it: a changed instrument is an uncalibrated one)` : '',
        '',
        ...results.map((r) => r.block),
        ...extra,
        '================================================================',
        `SUMMARY ${name}: ${good} of ${n} cases read as expected${bad.length ? `   NOT AS EXPECTED: ${bad.join(', ')}` : ''}`,
        '',
    ].join('\n');
    fs.writeFileSync(path.join(OUT, `h40d-${name}-cal.txt`), text, 'utf8');
    console.log(`${name}: ${good} of ${n} cases read as expected -> h40d-${name}-cal.txt${bad.length ? `   NOT AS EXPECTED: ${bad.join(', ')}` : ''}`);
    return !bad.length;
}

let allOk = true;

// ===================================================================================================================== grader
if (want.has('grader')) {
    const S = path.join(INST, 'h40d-grader-models.mjs');
    const FX = mk(HERE, 'grader-fixtures');
    const jl = (...models) => models.map((m) => JSON.stringify(m === '<synthetic>' ? { type: 'assistant', message: { model: m }, isApiErrorMessage: true } : { type: 'assistant', message: { model: m } })).join('\n') + '\n';
    mk(FX, 'projects', 'slugA', 'sess1', 'subagents');
    mk(FX, 'temp', 'slugA', 'sess1', 'tasks');
    const t = (n) => path.join(FX, 'temp', 'slugA', 'sess1', 'tasks', n);
    fs.writeFileSync(t('a1111111111111111.output'), jl('claude-opus-5-5', 'claude-opus-5-5', 'claude-opus-5-5'), 'utf8');
    fs.writeFileSync(t('a2222222222222222.output'), '', 'utf8');
    fs.writeFileSync(t('a3333333333333333.output'), jl('claude-opus-5-6', 'claude-opus-5-6'), 'utf8');
    fs.writeFileSync(t('a4444444444444444.output'), 'plain text, not a transcript\nsecond line\n', 'utf8');
    fs.writeFileSync(path.join(FX, 'projects', 'slugA', 'sess1', 'subagents', 'agent-a5555555555555555.jsonl'), jl('claude-opus-5-5', '<synthetic>', 'claude-opus-5-5'), 'utf8');
    fs.writeFileSync(t('a6666666666666666.output'), jl('claude-opus-5-5', 'claude-opus-5-5', 'claude-sonnet-5-5'), 'utf8');
    const fxArgs = ['--projects', path.join(FX, 'projects'), '--temp', path.join(FX, 'temp')];

    const H = { inapp: 'abcb62d968375290e', low: 'a120a26826e549013', low2: 'a28b3b9edce65f468', low3: 'a3e0a73e74fb788db', high: 'acfef039513d3fb5a', high2: 'af854b505d08406ca', high3: 'a3def826df863fc91' };
    const seven = [`inapp=${H.inapp}`, `captured-low=${H.low}`, `captured-low-r2=${H.low2}`, `captured-low-r3=${H.low3}`, `captured-high=${H.high}`, `captured-high-r2=${H.high2}`, `captured-high-r3=${H.high3}`];
    const cases = [
        ['G1', { title: "one of h40c's seven grader agents (Opus), named session", expected: 'PINNED, found by session path, exit 0', args: ['--session', SESSION, `inapp=${H.inapp}`], exit: 0, has: [/inapp: \{"claude-opus-5-5":\d+\} PINNED {2}\(found by session path:/, /ALL GRADERS claude-opus-5-5 \(1 of 1 agents\)/] }],
        ['G2', { title: "all seven of h40c's grader agents in one call (the real use)", expected: '7 of 7 PINNED, exit 0', args: ['--session', SESSION, ...seven], exit: 0, has: [/ALL GRADERS claude-opus-5-5 \(7 of 7 agents\)/], hasNot: [/NOT PINNED/, /NO TRANSCRIPT/] }],
        ['G3', { title: "this session's bench grader (known claude-opus-5-5)", expected: 'PINNED, exit 0', args: ['--session', SESSION, 'bench=a724b4a1166d1c18a'], exit: 0, has: [/bench: \{"claude-opus-5-5":\d+\} PINNED/] }],
        ['G4', { title: 'a known Sonnet transcript (finished 2026-09-30, claude-sonnet-5-5, in ANOTHER session and slug)', expected: 'NOT PINNED, exit 1, found by the search; the final lines say GRADER PIN NOT MET and name the model for --model', args: ['--session', SESSION, 'sonnet=ae8c58f581cf35c50'], exit: 1, has: [/sonnet: \{"claude-sonnet-5-5":\d+\} NOT PINNED {2}\(found by SEARCH/, /GRADER PIN NOT MET/, /every merge takes --model claude-sonnet-5-5/] }],
        ['G5', { title: 'a known Sonnet transcript inside the named session (2026-09-09, claude-sonnet-5)', expected: 'NOT PINNED, exit 1, found by session path', args: ['--session', SESSION, 'sonnet=af8bc9622ae011160'], exit: 1, has: [/sonnet: \{"claude-sonnet-5":\d+\} NOT PINNED {2}\(found by session path:/, /GRADER PIN NOT MET/] }],
        ['G6', { title: 'a DIFFERENT OPUS (claude-opus-5, a dual-reader agent): the pin is exact, so a neighbouring version must fail', expected: 'NOT PINNED, exit 1', args: ['--session', SESSION, 'opus5=a96f4c1416e2c9f83'], exit: 1, has: [/opus5: \{"claude-opus-5":\d+\} NOT PINNED/, /GRADER PIN NOT MET/] }],
        ['G7', { title: 'a missing id', expected: 'NO TRANSCRIPT FOUND, exit 1, GRADER PIN NOT VERIFIED', args: ['--session', SESSION, 'ghost=a0000000000000000'], exit: 1, has: [/ghost: NO TRANSCRIPT FOUND for a0000000000000000/, /GRADER PIN NOT VERIFIED/] }],
        ['G8', { title: 'the same Opus agent looked up from a DIFFERENT --session', expected: 'PINNED, exit 0, found by the SEARCH (not by the session path)', args: ['--session', '11111111-2222-3333-4444-555555555555', `inapp=${H.inapp}`], exit: 0, has: [/inapp: \{"claude-opus-5-5":\d+\} PINNED {2}\(found by SEARCH \(not under session 11111111\):/, /ALL GRADERS claude-opus-5-5/], hasNot: [/found by session path/] }],
        ['G9', { title: 'the same agent with no --session at all', expected: 'PINNED, exit 0, found by SEARCH (no --session given)', args: [`inapp=${H.inapp}`], exit: 0, has: [/found by SEARCH \(no --session given\)/, /ALL GRADERS claude-opus-5-5/] }],
        ['G10', { title: 'an Opus agent whose transcript holds one rate-limit placeholder (agent a10ccc0235aa0a220: real claude-opus-5-5 records + 1 synthetic API-error record)', expected: 'PINNED with the synthetic record named and counted apart, exit 0 (h40c-grader-models.mjs would have said NOT PINNED)', args: ['synth=a10ccc0235aa0a220'], exit: 0, has: [/synth: \{"claude-opus-5-5":\d+\} \+ 1 <synthetic> API-error record\(s\), not model output PINNED/] }],
        ['G11', { title: 'a transcript with ONLY a synthetic record (no real assistant record)', expected: 'NOT PINNED, exit 1', args: ['onlysynth=a4a92961b8530e213'], exit: 1, has: [/onlysynth: \{\} \+ 1 <synthetic>.*\(no real assistant record\) NOT PINNED/, /GRADER PIN NOT MET/] }],
        ['G12', { title: 'a transcript with two real models (claude-fable-5 and claude-sonnet-5)', expected: 'NOT PINNED, exit 1', args: ['mixed=a7d89470337c8f880'], exit: 1, has: [/mixed: \{"claude-fable-5":\d+,"claude-sonnet-5":\d+\} NOT PINNED/] }],
        ['G13', { title: "the seven h40c graders plus ONE Sonnet agent in a single call", expected: 'one failure fails the call: exit 1, GRADER PIN NOT MET names only the sonnet tag, no ALL GRADERS line', args: ['--session', SESSION, ...seven, 'sonnet=ae8c58f581cf35c50'], exit: 1, has: [/GRADER PIN NOT MET - sonnet did not run exactly/], hasNot: [/ALL GRADERS/] }],
        ['G14', { title: 'fixture: a transcript that exists only as a temp tasks/<id>.output file (the .output search path)', expected: 'PINNED, exit 0, the file is under tasks/', args: [...fxArgs, 'fx=a1111111111111111'], exit: 0, has: [/fx: \{"claude-opus-5-5":3\} PINNED {2}\(found by SEARCH \(no --session given\): .*\/tasks\/a1111111111111111\.output\)/] }],
        ['G15', { title: 'fixture: only an EMPTY tasks/<id>.output placeholder exists', expected: 'NO TRANSCRIPT FOUND naming the ignored placeholder, exit 1', args: [...fxArgs, 'fx=a2222222222222222'], exit: 1, has: [/fx: NO TRANSCRIPT FOUND for a2222222222222222 \(1 empty placeholder file\(s\) ignored\)/] }],
        ['G16', { title: 'fixture: a drifted model, claude-opus-5-6 on every agent (the GRADER DRIFT case)', expected: 'NOT PINNED, exit 1, the last line gives the exact id for every merge', args: [...fxArgs, 'fx=a3333333333333333'], exit: 1, has: [/fx: \{"claude-opus-5-6":2\} NOT PINNED/, /GRADER PIN NOT MET/, /every agent ran claude-opus-5-6: every merge takes --model claude-opus-5-6/] }],
        ['G17', { title: 'fixture: a file that holds no assistant record (plain text, like a Bash task output)', expected: 'NO TRANSCRIPT FOUND, exit 1', args: [...fxArgs, 'fx=a4444444444444444'], exit: 1, has: [/fx: NO TRANSCRIPT FOUND for a4444444444444444 \(1 file\(s\) found but none holds an assistant record\)/] }],
        ['G18', { title: 'fixture: a project transcript with real + synthetic records, session path', expected: 'PINNED, found by session path, exit 0', args: [...fxArgs, '--session', 'sess1', 'fx=a5555555555555555'], exit: 0, has: [/fx: \{"claude-opus-5-5":2\} \+ 1 <synthetic>.* PINNED {2}\(found by session path:/] }],
        ['G19', { title: 'a usage error: no agents', expected: 'exit 2', args: ['--session', SESSION], exit: 2, has: [/no <tag>=<agentId> given/] }],
        ['G20', { title: 'a usage error: a path-like --session', expected: 'exit 2', args: ['--session', '../x', `inapp=${H.inapp}`], exit: 2, has: [/--session \.\.\/x is not a session id/] }],
        ['G21', { title: 'a usage error: a path-like id', expected: 'exit 2', args: ['bad=..\\..\\x'], exit: 2, has: [/is not <tag>=<agentId>/] }],
        ['G22', { title: 'fixture: ONE agent whose transcript holds the pinned model AND another (claude-opus-5-5 x2 + claude-sonnet-5-5 x1): "the pin is exact" must mean every real record', expected: 'NOT PINNED, exit 1', args: [...fxArgs, 'fx=a6666666666666666'], exit: 1, has: [/fx: \{"claude-opus-5-5":2,"claude-sonnet-5-5":1\} NOT PINNED/, /GRADER PIN NOT MET/] }],
    ];
    const results = cases.map(([id, c]) => runCase(id, { script: S, ...c }));
    const note = [
        '================================================================',
        'NOTES',
        `- the seven h40c grader agents were found by their dispatch descriptions in the controller session's subagents folder (agent-<id>.meta.json: "Grade h40c in-app arm", "... captured-low arm" and so on to "... captured-high-r3 arm"): ids ${Object.values(H).join(', ')}.`,
        '- G4 and G5 use FINISHED Sonnet agents; the agents running while this was built (the other instrument builders) were not used: a live transcript grows between runs.',
        '- G10 / G11: "<synthetic>" assistant records are the client\'s rate-limit placeholders (isApiErrorMessage true, 0 output tokens), not model output; they are counted and printed apart. Across this machine 6 of 167 transcripts that name claude-opus-5-5 hold one.',
        "- the model field is read from the assistant records of the agent's OWN transcript; nothing from a transcript is printed except model ids, record counts and the file location.",
        '',
    ];
    allOk = finish('grader-models', 'h40d-grader-models.mjs calibration (brief C, r4 section 7.4 bullet "h40d-grader-models.mjs")', results, note, S) && allOk;
}

// ===================================================================================================================== hascuerule
if (want.has('hascuerule')) {
    const S = path.join(INST, 'h40d-hascuerule-check.mjs');
    const ST = mk(HERE, 'hascuerule-stubs');
    const honest = 'export const capturedOnly = (captured) => Object.keys(captured).filter((id) => captured[id]?.system && captured[id]?.user);';
    const liar = path.join(ST, 'flight-lies.mjs');
    fs.writeFileSync(liar, ['// stub flight module for calibration: capturedOnly is honest, hasCueRule LIES (always true)', honest, 'export const hasCueRule = () => true;', ''].join('\n'), 'utf8');
    const markdiff = path.join(ST, 'flight-markdiff.mjs');
    fs.writeFileSync(markdiff, ["// stub flight module for calibration: honest hasCueRule, but its CUE_RULE_MARK is not r4's [CUES FIRST]", "export const CUE_RULE_MARK = '[CUE FIRST]';", honest, "export const hasCueRule = (c) => { const ids = capturedOnly(c); return ids.length > 0 && ids.every((id) => String(c[id].system ?? '').includes('[CUES FIRST]')); };", ''].join('\n'), 'utf8');
    const leaky = path.join(ST, 'flight-leaks.mjs');
    fs.writeFileSync(leaky, ['// stub flight module for calibration: a DELIBERATE LEAK (prints 40 characters of a captured system prompt), the leak check\'s positive control', honest, 'export const hasCueRule = (c) => { console.log(String(Object.values(c)[0].system).slice(0, 40)); return false; };', ''].join('\n'), 'utf8');
    fs.writeFileSync(path.join(ST, 'not-json.txt'), '{"S1Q01": {"system": "SECRET-SNIPPET not closed', 'utf8');
    fs.writeFileSync(path.join(ST, 'array.json'), '[1, 2, 3]', 'utf8');

    // sensitive strings of the two real prompts files (slices of the captured system / user text), for the leak checks
    const slices = (file) => {
        const j = JSON.parse(fs.readFileSync(file, 'utf8'));
        const out = [];
        for (const v of Object.values(j)) for (const f of ['system', 'user']) {
            const s = String(v?.[f] ?? '');
            for (const at of [0, 300, 1500]) if (s.length >= at + 40) out.push(s.slice(at, at + 40));
        }
        return [...new Set(out)];
    };
    const H40C = path.join(RUN.h40c, 'interview60.prompts.json');
    const leakSmoke = slices(SMOKE);
    const leakH40c = slices(H40C);
    const scn = { NATIVELY_ROSTER: 'scenario50', NATIVELY_SCENARIOS: 'S1' };
    const hold = { NATIVELY_ROSTER: 'holdout40', NATIVELY_SCENARIOS: null };
    const nm1 = (o) => { const m = /capturedOnly ids: (\d+)\r?\ncarry \[CUES FIRST\]: (\d+) of (\d+)/.exec(o); return !!m && Number(m[2]) === Number(m[1]) - 1 && m[1] === m[3]; };

    // H1 adapts to the day: MAIN before the merge has no hasCueRule (the brief's IMPORTANT note); after it, MAIN's own file serves
    const mainHas = /export const hasCueRule\b/.test(fs.readFileSync(FLIGHT_MAIN, 'utf8'));
    const h1 = mainHas
        ? { title: "MAIN's OWN flight module (the default path), which now HAS hasCueRule: the merge has landed", expected: "the TRUE case through MAIN's own copy: true, N of N, exit 0", args: [SMOKE], env: scn, exit: 0, has: [/capturedOnly ids: ([1-9]\d*)\r?\ncarry \[CUES FIRST\]: \1 of \1\r?\nhasCueRule: true/], leakTexts: leakSmoke }
        : { title: "MAIN's own flight module as MAIN stands (pre-merge: no hasCueRule export; a fact of the day this ran)", expected: 'the check REFUSES, exit 2, names the missing export and the --flight fix (after the merge this default reads the module and this case reads true instead)', args: [SMOKE], env: scn, exit: 2, has: [/has no hasCueRule export/, /--flight/], leakTexts: leakSmoke };
    const cases = [
        ['H1', h1],
        ['H2', { title: "the TRUE case: the 05:00 re-smoke's prompts file under NATIVELY_ROSTER=scenario50 NATIVELY_SCENARIOS=S1, the worktree's flight module", expected: 'hasCueRule true, N of N carry the mark (N > 0), exit 0', args: [SMOKE, '--flight', FLIGHT_WT], env: scn, exit: 0, has: [/capturedOnly ids: ([1-9]\d*)\r?\ncarry \[CUES FIRST\]: \1 of \1\r?\nhasCueRule: true/, /CONSISTENT/, /roster in force: scenario50 \[S1\]/], leakTexts: leakSmoke }],
        ['H3', { title: "the MIXED hour: the same file with ONE id's system text stripped of the mark in memory (--mutate-one)", expected: 'hasCueRule false, N-1 of N carry the mark, exit 1 (a mixed hour gates closed)', args: [SMOKE, '--flight', FLIGHT_WT, '--mutate-one'], env: scn, exit: 1, has: [/--mutate-one: \S+'s system text stripped of the mark IN MEMORY \(nothing is written\)/, /hasCueRule: false/], custom: nm1, customName: 'N-1 of N carry the mark', leakTexts: leakSmoke }],
        ['H4', { title: 'the 05:00 re-smoke file read under NATIVELY_ROSTER=holdout40 (the check depends on the roster environment)', expected: 'hasCueRule false with 0 ids, exit 1', args: [SMOKE, '--flight', FLIGHT_WT], env: hold, exit: 1, has: [/capturedOnly ids: 0\r?\ncarry \[CUES FIRST\]: 0 of 0\r?\nhasCueRule: false/, /roster in force: holdout40/, /NOTE: capturedOnly returned 0 ids/], leakTexts: leakSmoke }],
        ['H5', { title: "h40c's prompts file under NATIVELY_ROSTER=holdout40 (a pre-cue hour)", expected: 'hasCueRule false, 0 of 44, exit 1', args: [H40C, '--flight', FLIGHT_WT], env: hold, exit: 1, has: [/capturedOnly ids: 44\r?\ncarry \[CUES FIRST\]: 0 of 44\r?\nhasCueRule: false/, /CONSISTENT/], leakTexts: leakH40c }],
        ['H6', { title: 'an invalid roster environment (NATIVELY_ROSTER=nonsense)', expected: 'exit 2 naming the bad roster', args: [SMOKE, '--flight', FLIGHT_WT], env: { NATIVELY_ROSTER: 'nonsense', NATIVELY_SCENARIOS: null }, exit: 2, has: [/NATIVELY_ROSTER=nonsense is not a roster/] }],
        ['H7', { title: "a LYING flight module (hasCueRule always true) on h40c's pre-cue prompts: the independent count must catch it", expected: 'DISAGREE, exit 3', args: [H40C, '--flight', liar], env: hold, exit: 3, has: [/capturedOnly ids: 44\r?\ncarry \[CUES FIRST\]: 0 of 44\r?\nhasCueRule: true/, /DISAGREE: hasCueRule says true, an independent count says false/], leakTexts: leakH40c }],
        ['H8', { title: "a flight module whose CUE_RULE_MARK is not r4's literal, with an honest hasCueRule, on the real cue prompts", expected: 'MARK DIFFERS, exit 3', args: [SMOKE, '--flight', markdiff], env: scn, exit: 3, has: [/flight CUE_RULE_MARK: \[CUE FIRST\] \(NOT r4's \[CUES FIRST\]\)/, /MARK DIFFERS: the flight module reads \[CUE FIRST\], r4 section 7\.6 reads \[CUES FIRST\]/], leakTexts: leakSmoke }],
        ['H9', { title: 'a usage error: no prompts file', expected: 'exit 2', args: [], env: scn, exit: 2, has: [/usage: node h40d-hascuerule-check\.mjs/] }],
        ['H10', { title: 'a prompts file that is not JSON: the error must not echo its text (the file holds the marker SECRET-SNIPPET)', expected: 'exit 2, "is not valid JSON", the marker absent from the output', args: [path.join(ST, 'not-json.txt'), '--flight', FLIGHT_WT], env: scn, exit: 2, has: [/prompts file is not valid JSON/], hasNot: [/SECRET-SNIPPET/] }],
        ['H11', { title: "--mutate-one on a pre-cue file (h40c's, under holdout40): no id carries the mark, so there is nothing to strip", expected: 'says so, hasCueRule false, 0 of 44, exit 1', args: [H40C, '--flight', FLIGHT_WT, '--mutate-one'], env: hold, exit: 1, has: [/--mutate-one: no id carries the mark, nothing to strip/, /carry \[CUES FIRST\]: 0 of 44/, /hasCueRule: false/], leakTexts: leakH40c }],
        ['H12', { title: 'a prompts file that does not exist', expected: 'exit 2', args: [path.join(ST, 'no-such-file.json'), '--flight', FLIGHT_WT], env: scn, exit: 2, has: [/prompts file not found/] }],
        ['H13', { title: 'a prompts file that is valid JSON but not an object keyed by item id (an array)', expected: 'exit 2', args: [path.join(ST, 'array.json'), '--flight', FLIGHT_WT], env: scn, exit: 2, has: [/prompts file is not an object keyed by item id/] }],
        ['H14', { title: 'a --flight path that does not exist', expected: 'exit 2', args: [SMOKE, '--flight', path.join(ST, 'no-such-flight.mjs')], env: scn, exit: 2, has: [/flight module not found/], leakTexts: leakSmoke }],
        ['H15', { title: "the leak check's POSITIVE CONTROL: a stub flight module that deliberately prints 40 characters of a captured prompt, on the real cue prompts", expected: 'the runner\'s leak scan FINDS the planted slice in the output (at least 1 of the sensitive strings); this proves the scan can fail', args: [SMOKE, '--flight', leaky], env: scn, hide: true, leakTexts: leakSmoke, leakMustFind: true }],
    ];
    const results = cases.map(([id, c]) => runCase(id, { script: S, ...c }));
    const note = [
        '================================================================',
        'NOTES',
        `- the leak scans: every case that reads a real prompts file asserts that none of its ${leakSmoke.length} (05:00 file) / ${leakH40c.length} (h40c file) 40-character slices of the captured system and user text appears in the output; H15 is the positive control (a stub that prints a slice on purpose must be caught; its output is not saved).`,
        `- the cases that pass --flight use the worktree's flight module (sha256/16 ${sha(FLIGHT_WT)}) or a stub (H7, H8, H15); the worktree's module stands in for MAIN's, which today has sha256/16 ${sha(FLIGHT_MAIN)} and hasCueRule ${mainHas ? 'present' : 'ABSENT (pre-merge)'}. After the merge MAIN's default path serves the same code (H1 then reads the TRUE case through MAIN's own copy).`,
        '- the 05:00 re-smoke file is the one r4 section 7.6 names; its content is never read by a person.',
        '',
    ];
    allOk = finish('hascuerule', 'h40d-hascuerule-check.mjs calibration (brief C, r4 section 7.6)', results, note, S) && allOk;
}

// ===================================================================================================================== rule3
if (want.has('rule3')) {
    const S = path.join(INST, 'h40d-rule3.mjs');
    const FXR = mk(HERE, 'rule3-fixtures');
    // an ids-only synthetic timeline (no question text) for the INCOMPLETE fixtures
    const ids = JSON.parse(fs.readFileSync(path.join(RUN.h40c, 'interview60.timeline.json'), 'utf8')).items.map((i) => i.id);
    const noJudge = mk(FXR, 'no-judge');
    fs.writeFileSync(path.join(noJudge, 'interview60.timeline.json'), JSON.stringify({ items: ids.map((id) => ({ id, kind: 'spoken' })) }), 'utf8');
    // R17's fixture: h40c's in-app judge file with every text field replaced by "x" (no profile text survives) and R18#2 set to wrong
    const doubleWrong = mk(FXR, 'double-wrong');
    {
        const j = JSON.parse(fs.readFileSync(path.join(RUN.h40c, 'interview60.judge.json'), 'utf8'));
        for (const v of Object.values(j.items)) for (const k of ['question', 'heard', 'answer', 'reason']) if (k in v) v[k] = 'x';
        j.items['R18#2'].verdict = 'wrong';
        j.items['R18#2'].correctness = 0;
        fs.writeFileSync(path.join(doubleWrong, 'interview60.judge.json'), JSON.stringify(j), 'utf8');
        fs.writeFileSync(path.join(doubleWrong, 'interview60.timeline.json'), JSON.stringify({ items: ids.map((id) => ({ id, kind: 'spoken' })) }), 'utf8');
    }
    // text-stripped fixtures (every question / heard / answer / reason replaced by "x": ids, numbers, verdicts and grader ids only)
    const strip = (file) => {
        const j = JSON.parse(fs.readFileSync(file, 'utf8'));
        for (const v of Object.values(j.items)) for (const k of ['question', 'heard', 'answer', 'reason']) if (k in v) v[k] = 'x';
        return j;
    };
    const idsOnlyTimeline = JSON.stringify({ items: ids.map((id) => ({ id, kind: 'spoken' })) });
    const badJson = mk(FXR, 'bad-json');
    fs.writeFileSync(path.join(badJson, 'interview60.timeline.json'), idsOnlyTimeline, 'utf8');
    fs.writeFileSync(path.join(badJson, 'interview60.judge.json'), '{"items": {"R01": {"reason": "SECRET-SNIPPET not closed', 'utf8');
    const badVerdict = mk(FXR, 'bad-verdict');
    {
        const j = strip(path.join(RUN.h40c, 'interview60.judge.json'));
        j.items.R01.verdict = 'great';
        fs.writeFileSync(path.join(badVerdict, 'interview60.judge.json'), JSON.stringify(j), 'utf8');
        fs.writeFileSync(path.join(badVerdict, 'interview60.timeline.json'), idsOnlyTimeline, 'utf8');
    }
    const pinDiffers = mk(FXR, 'pin-differs');
    {
        const j = strip(path.join(RUN.h40c, 'interview60.judge.json'));
        j.graderModel = 'claude-opus-5-6';
        j.graderPrompt = 'ffffffffffff';
        fs.writeFileSync(path.join(pinDiffers, 'interview60.judge.json'), JSON.stringify(j), 'utf8');
        fs.writeFileSync(path.join(pinDiffers, 'interview60.timeline.json'), idsOnlyTimeline, 'utf8');
    }
    const mixedGrader = mk(FXR, 'mixed-grader');
    {
        fs.writeFileSync(path.join(mixedGrader, 'interview60.judge.json'), JSON.stringify(strip(path.join(RUN.h40c, 'interview60.judge.json'))), 'utf8');
        fs.writeFileSync(path.join(mixedGrader, 'interview60.timeline.json'), idsOnlyTimeline, 'utf8');
        for (const rep of ['', '-r2', '-r3']) {
            const j = strip(path.join(RUN.h40c, `interview60.judge.gemini-3.5-flash-lite_captured-high${rep}.json`));
            if (rep === '-r2') j.graderModel = 'claude-opus-5-6';
            fs.writeFileSync(path.join(mixedGrader, `interview60.judge.gemini-3.5-flash-lite_captured-high${rep}.json`), JSON.stringify(j), 'utf8');
        }
    }
    // a cue twin rep with a HOLE: rep 2 lacks R10 (the noise reading must use the ids ALL THREE reps share)
    const cueHole = mk(FXR, 'cue-hole');
    {
        fs.writeFileSync(path.join(cueHole, 'interview60.judge.json'), JSON.stringify(strip(path.join(RUN.h40c, 'interview60.judge.json'))), 'utf8');
        fs.writeFileSync(path.join(cueHole, 'interview60.timeline.json'), idsOnlyTimeline, 'utf8');
        for (const rep of ['', '-r2', '-r3']) {
            const j = strip(path.join(RUN.h40c, `interview60.judge.gemini-3.5-flash-lite_captured-high${rep}.json`));
            if (rep === '-r2') delete j.items.R10;
            fs.writeFileSync(path.join(cueHole, `interview60.judge.gemini-3.5-flash-lite_captured-high${rep}.json`), JSON.stringify(j), 'utf8');
        }
    }
    // a double whose FIRST answer is wrong and whose second is acceptable (the mirror of R16's fixture)
    const doubleFirstWrong = mk(FXR, 'double-first-wrong');
    {
        const j = strip(path.join(RUN.h40c, 'interview60.judge.json'));
        j.items.R18.verdict = 'wrong';
        j.items.R18.correctness = 0;
        fs.writeFileSync(path.join(doubleFirstWrong, 'interview60.judge.json'), JSON.stringify(j), 'utf8');
        fs.writeFileSync(path.join(doubleFirstWrong, 'interview60.timeline.json'), idsOnlyTimeline, 'utf8');
    }
    // two byte-identical relocated copies of the instrument: HERE (where h40d-verdicts-<tag>.json is looked for) is the copy's folder,
    // so both INCOMPLETE flavours are independent of what VH holds on the day (Friday's grading writes VH\h40d-verdicts-inapp.json)
    const copyNone = mk(FXR, 'copy-no-verdicts');
    const copyDummy = mk(FXR, 'copy-with-verdicts');
    fs.copyFileSync(S, path.join(copyNone, 'h40d-rule3.mjs'));
    fs.copyFileSync(S, path.join(copyDummy, 'h40d-rule3.mjs'));
    fs.writeFileSync(path.join(copyDummy, 'h40d-verdicts-inapp.json'), '{}', 'utf8');
    const sameBytes = sha(S) === sha(path.join(copyNone, 'h40d-rule3.mjs')) && sha(S) === sha(path.join(copyDummy, 'h40d-rule3.mjs'));

    // sensitive strings of a run folder's merged judge files (reason / answer / question / heard), for the leak checks (never printed)
    const sensitive = (run) => {
        const set = new Set();
        for (const f of fs.readdirSync(run)) {
            // interview60.judge.json (the in-app arm) AND interview60.judge.<model>_<tag>.json (the twins); not the pairs / verdicts files
            if (!/^interview60\.judge(\..+)?\.json$/.test(f) || /pairs|verdicts/.test(f)) continue;
            const j = JSON.parse(fs.readFileSync(path.join(run, f), 'utf8'));
            for (const v of Object.values(j.items ?? {})) for (const k of ['reason', 'answer', 'question', 'heard']) if (typeof v[k] === 'string' && v[k].length >= 20) set.add(v[k]);
        }
        return [...new Set(set)];
    };
    const sens = { h40a: sensitive(RUN.h40a), h40b: sensitive(RUN.h40b), h40c: sensitive(RUN.h40c) };

    const c3 = ['R20=gemini-3.1-flash-lite'];
    const cases = [
        ['R1', { title: "h40c (R20 won by 3.1-lite, as h40c's own join): the baseline the floor comes from", expected: '35 of 45 = 28 mains + 7 follow-ups; 0 wrong on the 40 gated items (R09F wrong, excluded); 3a PASS, 3b PASS, exit 0; twins 36/37/38 (3.5-lite HIGH) and 37/37/36 (3.1-lite LOW); combined band 36 to 38, in-app 1 below; noise: 35 against 36 / 37 / 38, gap 1, WITHIN 1, MET; below all three own twins R04F R14 R23; the no-cue twins "absent", no crash', args: [RUN.h40c, ...c3], exit: 0, has: [/ACCEPTABLE \(items\) 35 of 45 {2}\| mains 28\/33, follow-ups 7\/12/, /WRONG answers on the 40 gated items: 0\r?\n/, /excluded follow-ups \(reported, not gated\): 1 -> R09F/, /3a: in-app acceptable 35 of 45, floor 35 -> PASS/, /3b: .* 0 -> PASS/, /RULE 3 \(3a and 3b only; 3c is h40d-twins\.mjs's\): PASS/, /captured-high: 36 \/ 44, wrong 1/, /captured-high-r2: 37 \/ 44, wrong 0/, /captured-high-r3: 38 \/ 44, wrong 2/, /captured-low: 37 \/ 44, wrong 2/, /captured-low-r2: 37 \/ 44, wrong 1/, /captured-low-r3: 36 \/ 43, wrong 2/, /combined band of the cue twins .*: 36 to 38 \(6 of 6 reps merged\); in-app 35 is 1 below it/, /in-app acceptable on the shared ids: 35 of 44/, /cue twin reps' acceptable on the same ids: 36 \/ 37 \/ 38; lowest 36/, /gap = lowest - in-app = 1 -> .*WITHIN 1/, /noise condition .*: MET/, /in-app below all three of its own twins \(\*\): R04F R14 R23\r?\n/, /captured-no-cues-high: absent/, /R01 {4}A {3}3\.5H \| A w A \| w A A \| absent/, /R20 {4}A {3}3\.1L/, /the 5 excluded follow-ups' best in-app grades .*: R02F weak, R04F weak, R09F wrong, R11F weak, R13F acceptable\r?\n/], leakTexts: sens.h40c }],
        ['R2', { title: 'h40b', expected: '35 of 45 = 27 mains + 8 follow-ups; R09F and R11F wrong, both excluded, 0 gated; PASS, exit 0; noise: 35 against 38 / 36 / 39, gap 1, WITHIN 1; no-cue twins absent', args: [RUN.h40b], exit: 0, has: [/ACCEPTABLE \(items\) 35 of 45 {2}\| mains 27\/33, follow-ups 8\/12/, /WRONG answers on the 40 gated items: 0\r?\n/, /excluded follow-ups \(reported, not gated\): 2 -> R09F, R11F/, /RULE 3 \(3a and 3b only; 3c is h40d-twins\.mjs's\): PASS/, /in-app acceptable on the shared ids: 35 of 44/, /cue twin reps' acceptable on the same ids: 38 \/ 36 \/ 39; lowest 36/, /gap = lowest - in-app = 1 -> .*WITHIN 1/, /no-cue twins: absent/], leakTexts: sens.h40b }],
        ['R3', { title: 'h40a (R09, the salary card, graded wrong on a gated item)', expected: '3b FAIL (R09 wrong on the 40 gated items), 3a PASS at 39, exit 1; noise: 39 against 37 / 42 / 38, in-app ABOVE the lowest; no-cue twins absent', args: [RUN.h40a], exit: 1, has: [/ACCEPTABLE \(items\) 39 of 45/, /WRONG answers on the 40 gated items: 1 -> R09\r?\n/, /3a: in-app acceptable 39 of 45, floor 35 -> PASS/, /3b: .* 1 -> FAIL/, /RULE 3 \(3a and 3b only; 3c is h40d-twins\.mjs's\): 3b FAIL/, /in-app acceptable on the shared ids: 39 of 44/, /cue twin reps' acceptable on the same ids: 37 \/ 42 \/ 38; lowest 37/, /gap = lowest - in-app = -2 -> in-app ABOVE the lowest cue twin/, /no-cue twins: absent/], leakTexts: sens.h40a }],
        ['R4', { title: 'the FAILING noise case: h40c with two in-app acceptable items set to weak in memory (--demote 2)', expected: '33 of 45, 3a MISS, exit 1; noise: 33 against 36 (36 / 37 / 38), gap 3, NOT WITHIN 1, condition NOT MET; the mutation banner is printed', args: [RUN.h40c, ...c3, '--demote', '2'], exit: 1, has: [/IN-MEMORY MUTATION \(--demote 2\)/, /--demote: set to weak in memory: \S+ \S+\r?\n/, /ACCEPTABLE \(items\) 33 of 45/, /3a: in-app acceptable 33 of 45, floor 35 -> MISS/, /RULE 3 \(3a and 3b only; 3c is h40d-twins\.mjs's\): 3a MISS/, /in-app acceptable on the shared ids: 33 of 44/, /cue twin reps' acceptable on the same ids: 36 \/ 37 \/ 38; lowest 36/, /gap = lowest - in-app = 3 -> in-app 3 below the lowest cue twin: NOT WITHIN 1/, /noise condition .*: NOT MET/], leakTexts: sens.h40c }],
        ['R4b', { title: "the noise threshold's BOUNDARY: h40c with ONE in-app acceptable item set to weak in memory (--demote 1): gap 2, one past the allowed 1 (R1 is gap 1)", expected: '34 of 45, 3a MISS (34 < 35), exit 1; noise: 34 against 36, gap 2, NOT WITHIN 1, condition NOT MET', args: [RUN.h40c, ...c3, '--demote', '1'], exit: 1, has: [/--demote: set to weak in memory: R01\r?\n/, /ACCEPTABLE \(items\) 34 of 45/, /3a: in-app acceptable 34 of 45, floor 35 -> MISS/, /in-app acceptable on the shared ids: 34 of 44/, /gap = lowest - in-app = 2 -> in-app 2 below the lowest cue twin: NOT WITHIN 1/, /noise condition .*: NOT MET/], leakTexts: sens.h40c }],
        ['R5', { title: 'the floor parameter: h40c with --floor 36 (3a misses by one while the noise reading is still MET: the shape of "a 3a miss read as noise")', expected: '3a MISS (35 < 36), exit 1; noise condition MET (gap 1) with the note that 3a missed and 3c must PASS too', args: [RUN.h40c, ...c3, '--floor', '36'], exit: 1, has: [/3a: in-app acceptable 35 of 45, floor 36 -> MISS/, /noise condition .*: MET {2}\(3a MISSED: it reads as noise only with 3c PASS too/], leakTexts: sens.h40c }],
        ['R6', { title: "the no-cue column WITH data: --nocue pointed at h40c's 3.1-lite LOW family as a stand-in (the real no-cue family does not exist before Friday)", expected: 'the three stand-in reps are listed as merged and the last column of a row equals the 3.1-lite LOW twins: R01 reads A w A | w A A | w A A; no "absent" anywhere', args: [RUN.h40c, ...c3, '--nocue', 'gemini-3.1-flash-lite_captured-low'], exit: 0, has: [/gemini-3\.1-flash-lite_captured-low: 37 \/ 44, wrong 2/, /R01 {4}A {3}3\.5H \| A w A \| w A A \| w A A/], hasNot: [/\| absent/, /no-cue twins: absent/], leakTexts: sens.h40c }],
        ['R7', { title: "NOT MERGED vs absent: --nocue pointed at h40c's captured-minimal family (an answers file for rep 1 only, no judge file at all)", expected: 'rep 1 reads NOT MERGED, reps 2 and 3 read absent, the table column reads - - - (not "absent": the family is not wholly absent), exit 0', args: [RUN.h40c, ...c3, '--nocue', 'gemini-3.1-flash-lite_captured-minimal'], exit: 0, has: [/gemini-3\.1-flash-lite_captured-minimal: NOT MERGED \(answers file present, no merged judge file\)/, /gemini-3\.1-flash-lite_captured-minimal-r2: absent/, /R01 {4}A {3}3\.5H \| A w A \| w A A \| - - -/], leakTexts: sens.h40c }],
        ['R8', { title: 'an UNDECIDED noise reading: --cue pointed at the captured-minimal family (not merged)', expected: 'UNDECIDED naming the not-merged rep(s); the rest of the report still prints; exit 0 (3a and 3b are read on the in-app file)', args: [RUN.h40c, ...c3, '--cue', 'gemini-3.1-flash-lite_captured-minimal'], exit: 0, has: [/UNDECIDED - cue twin rep\(s\) not merged: gemini-3\.1-flash-lite_captured-minimal: NOT MERGED/], hasNot: [/gap = lowest/], leakTexts: sens.h40c }],
        ['R9', { title: `INCOMPLETE: a holdout40 run folder with a timeline and NO merged in-app judge file, instrument relocated (byte-identical copy: ${sameBytes}) to a folder with no verdicts file`, expected: '3a/3b INCOMPLETE naming the missing file and that the arm is not graded, exit 3', script: path.join(copyNone, 'h40d-rule3.mjs'), args: [noJudge], exit: 3, has: [/RULE 3a \/ 3b: INCOMPLETE - interview60\.judge\.json is missing from the run folder; h40d-verdicts-inapp\.json is missing: the in-app arm is not graded/] }],
        ['R10', { title: 'INCOMPLETE, the other flavour: the same, relocated beside a dummy h40d-verdicts-inapp.json', expected: 'INCOMPLETE saying the verdicts file exists: graded, not merged (run h40d-merge.cmd), exit 3', script: path.join(copyDummy, 'h40d-rule3.mjs'), args: [noJudge], exit: 3, has: [/h40d-verdicts-inapp\.json exists beside this script: graded, not merged \(run h40d-merge\.cmd\)/] }],
        ['R11', { title: "a run folder that is not holdout40's (br1, scenario50, 40 items)", expected: 'refused, exit 2, naming the roster size', args: [RUN.br1], exit: 2, has: [/is not a holdout40 run folder: its roster has 40 spoken items \(45 expected\)/] }],
        ['R12', { title: 'a winners argument naming an id that is not on the roster', expected: 'refused, exit 2', args: [RUN.h40c, 'R99=gemini-3.5-flash-lite'], exit: 2, has: [/"R99=gemini-3\.5-flash-lite" is not <rosterId>=/] }],
        ['R13', { title: 'a winners argument naming a model that is not one of the two', expected: 'refused, exit 2', args: [RUN.h40c, 'R20=3.1'], exit: 2, has: [/"R20=3\.1" is not <rosterId>=/] }],
        ['R14', { title: 'a usage error: no run folder', expected: 'exit 2', args: [], exit: 2, has: [/usage: node h40d-rule3\.mjs <run-dir>/] }],
        ['R15', { title: 'a usage error: an unknown option', expected: 'exit 2', args: [RUN.h40c, '--floorr', '35'], exit: 2, has: [/unknown option --floorr/] }],
        ['R16', { title: "the counting ruling for a DOUBLE: a text-stripped copy of h40c's in-app judge file (no question, answer or reason text, only ids, numbers and verdicts) with the second answer R18#2 set to wrong in memory of the fixture; R18's first answer stays acceptable", expected: "3a still counts R18 once and acceptable (35 of 45), 3b counts EVERY delivered answer: 1 wrong on the 40 gated items, named R18#2; 3b FAIL, exit 1 (the best-of rule does not wash it out)", args: [doubleWrong], exit: 1, has: [/ACCEPTABLE \(items\) 35 of 45/, /WRONG answers on the 40 gated items: 1 -> R18#2\r?\n/, /3a: in-app acceptable 35 of 45, floor 35 -> PASS/, /3b: .* 1 -> FAIL/, /RULE 3 \(3a and 3b only; 3c is h40d-twins\.mjs's\): 3b FAIL/] }],
        ['R17', { title: 'a corrupt in-app judge file (invalid JSON holding the marker SECRET-SNIPPET): the error must not echo the file\'s text', expected: 'exit 2, "is not valid JSON", the marker absent from the output', args: [badJson], exit: 2, has: [/interview60\.judge\.json: is not valid JSON/], hasNot: [/SECRET-SNIPPET/] }],
        ['R18', { title: 'an in-app judge item with a verdict outside acceptable / weak / wrong (R01 = "great"; text-stripped copy of h40c)', expected: 'refused, exit 2, naming the item and the verdict', args: [badVerdict], exit: 2, has: [/in-app judge item R01 has verdict "great"; expected acceptable, weak or wrong/] }],
        ['R19', { title: "a MIXED-GRADER hour: text-stripped copies of h40c's in-app file and its three cue twins, with the grader model of cue rep 2 set to claude-opus-5-6", expected: 'the summary line lists both graders (x3 and x1) and carries the MORE THAN ONE GRADER flag; the in-app pin line still MATCHES; 3a / 3b read as on h40c (35, 0), exit 0', args: [mixedGrader, ...c3], exit: 0, has: [/graders across the merged files \(in-app \+ twins\): claude-opus-5-5 8564ba96369a x3, claude-opus-5-6 8564ba96369a x1 {3}\*\*\* MORE THAN ONE GRADER MODEL OR PROMPT STAMP \*\*\*/, /-> model MATCH, stamp MATCH/, /3a: in-app acceptable 35 of 45, floor 35 -> PASS/] }],
        ['R20', { title: "the grader-pin line: a text-stripped copy of h40c's in-app file graded by claude-opus-5-6 with prompt stamp ffffffffffff", expected: 'the pin line reads model DIFFERS, stamp DIFFERS (r4 section 6: GRADER DRIFT is then the controller\'s to apply); the counts still print, exit 0', args: [pinDiffers, ...c3], exit: 0, has: [/in-app judge: grader claude-opus-5-6, stamp ffffffffffff/, /grader pin \(r4 section 2\): claude-opus-5-5 stamp 8564ba96369a -> model DIFFERS, stamp DIFFERS/, /ACCEPTABLE \(items\) 35 of 45/] }],
        ['R21', { title: "the leak check's POSITIVE CONTROL: h40c with --reasons (the graders' reason text is printed on purpose)", expected: "the runner's leak scan FINDS reason strings in the output (at least 1); this proves the scan can fail; the output is not saved", args: [RUN.h40c, ...c3, '--reasons'], exit: 0, hide: true, leakTexts: sens.h40c, leakMustFind: true }],
    ];
    cases.push(
        ['R22', { title: "a HOLE in a cue twin rep: text-stripped copies of h40c's in-app file and cue twins, rep 2 with R10 removed (the ids the three reps SHARE shrink by one)", expected: 'shared 43 (R05 and R10 not shared); in-app 34 of 43 (R10 was acceptable in-app); reps 35 / 36 / 37 on the shared ids (each of reps 1 and 3 loses its acceptable R10, rep 2 never had one: 36 of 43); lowest 35; gap 1, WITHIN 1', args: [cueHole, ...c3], exit: 0, has: [/graded ids per cue twin rep: 44 \/ 43 \/ 44; shared by all three and on the roster: 43; not shared: R05 R10/, /in-app acceptable on the shared ids: 34 of 43/, /cue twin reps' acceptable on the same ids: 35 \/ 36 \/ 37; lowest 35/, /gap = lowest - in-app = 1 -> .*WITHIN 1/] }],
        ['R23', { title: "the counting ruling for a double, mirrored: R18's FIRST answer wrong, its second (R18#2) acceptable (text-stripped fixture)", expected: '3a counts R18 once by its BEST answer: still 35 of 45; 3b counts every delivered answer: 1 wrong on the 40 gated items, named R18; 3b FAIL, exit 1', args: [doubleFirstWrong], exit: 1, has: [/ACCEPTABLE \(items\) 35 of 45/, /WRONG answers on the 40 gated items: 1 -> R18\r?\n/, /3a: in-app acceptable 35 of 45, floor 35 -> PASS/, /3b: .* 1 -> FAIL/] }],
    );
    const results = cases.map(([id, c]) => runCase(id, { script: S, ...c }));

    // the cross-check of the noise reading against the pre-existing recheck-r3-scratch/noise-gap.mjs (same data, other code)
    const ng = exec(path.join(VH, 'recheck-r3-scratch', 'noise-gap.mjs'), []);
    const parse = (line) => { const m = /in-app on shared (\d+); cue twins on shared (\d+) \/ (\d+) \/ (\d+); lowest (\d+); gap (-?\d+)/.exec(line); return m ? m.slice(1).map(Number) : null; };
    const ngRows = ng.stdout.split(/\r?\n/).filter((l) => /^h40[abc]:/.test(l));
    const cross = [];
    for (const [tag, run] of [['h40a', RUN.h40a], ['h40b', RUN.h40b], ['h40c', RUN.h40c]]) {
        const mine = exec(S, [run]).stdout;
        const g = /gap = lowest - in-app = (-?\d+)/.exec(mine);
        const a = /in-app acceptable on the shared ids: (\d+) of/.exec(mine);
        const b = /cue twin reps' acceptable on the same ids: (\d+) \/ (\d+) \/ (\d+); lowest (\d+)/.exec(mine);
        const theirs = parse(ngRows.find((l) => l.startsWith(`${tag}:`)) ?? '');
        const mineN = a && b && g ? [Number(a[1]), Number(b[1]), Number(b[2]), Number(b[3]), Number(b[4]), Number(g[1])] : null;
        cross.push({ tag, same: !!mineN && !!theirs && mineN.every((v, i) => v === theirs[i]), mineN, theirs });
    }
    const crossOk = cross.length === 3 && cross.every((c) => c.same);
    const note = [
        '================================================================',
        "CROSS-CHECK against recheck-r3-scratch/noise-gap.mjs (the pre-existing script that produced r4's noise numbers; other code, same data)",
        '[in-app on shared, cue twin r1 / r2 / r3 on shared, lowest, gap]',
        ...cross.map((c) => `  ${c.tag}: h40d-rule3 ${JSON.stringify(c.mineN)}   noise-gap ${JSON.stringify(c.theirs)}  -> ${c.same ? 'IDENTICAL' : 'DIFFERENT'}`),
        `  cross-check: ${crossOk ? 'ok' : 'FAILED'}`,
        '',
        'NOTES',
        "- every case prints ids, counts and verdict classes only; the graders' reason text, the answers, the questions and what was heard are never printed (the opt-in --reasons exists for the controller). Each case also runs a text-leak scan: none of the sensitive strings of the run's judge files may appear in the output; R21 is its positive control (the same scan must FIND the reasons when --reasons prints them; that output is not saved). The first run of that control found the scan BLIND (0 of 570): its file-name pattern skipped the in-app interview60.judge.json, where the reasons print; the pattern was fixed in the runner (no expectation was changed) and the control then found 9.",
        '- the no-cue twins do not exist in h40a-h40c: they read "absent" in the twin list, in every table row and in the summary line, and nothing crashes (R1-R3). R6 and R7 exercise the same column on real files of other families.',
        '- R4 / R5: --demote and --floor are a calibration switch and the re-pin switch (section 6 option (i)); --demote prints a banner so its output cannot be taken for a reading.',
        `- R9 / R10 run byte-identical relocated copies of the instrument (sha256/16 ${sha(S)}; identical: ${sameBytes}) so the two INCOMPLETE readings do not depend on whether VH holds a verdicts file yet.`,
        '',
    ];
    const ok = finish('rule3', 'h40d-rule3.mjs calibration (brief C, r4 rule 3 and its 3a noise reading)', results, note, S);
    allOk = ok && crossOk && sameBytes && allOk;
    console.log(`rule3 cross-check against noise-gap.mjs: ${crossOk ? 'IDENTICAL on h40a, h40b, h40c' : 'DIFFERENT'}; relocated copies byte-identical: ${sameBytes}`);
}

console.log(allOk ? 'ALL CALIBRATION CASES READ AS EXPECTED' : 'SOME CALIBRATION CASE DID NOT READ AS EXPECTED');
process.exitCode = allOk ? 0 : 1;
