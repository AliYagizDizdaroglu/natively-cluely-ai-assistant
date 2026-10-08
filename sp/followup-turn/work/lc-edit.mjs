import fs from 'node:fs';
const f = 'R/scripts/legs-decide-calibrate.mjs';
let s = fs.readFileSync(f, 'utf8');
const rep = (a, b) => { if (!s.includes(a)) throw new Error('missing: ' + a.slice(0, 70)); s = s.replace(a, () => b); };
rep("const gs = { instrument: 'x', graders: {} }, lines = { models: [], memory: [], audit: [] };",
    "const gs = { instrument: 'x', graders: {} }, lines = { models: [], memory: [], audit: [] }, launches = [];");
rep("gs.graders[t] = { agent: agentOf(t), model: PIN, memory: 'ABSENT', projectMemory: 0, claudeMem: 0, audit: 'clean', bash: ['641:abcdef012345'], replaced: [] };",
    "const cwd = `C:/F/grading/${t}-a1`;\n            gs.graders[t] = { agent: agentOf(t), attempt: 1, cwd, model: PIN, memory: 'ABSENT', projectMemory: 0, claudeMem: 0, audit: 'clean', bash: ['641:abcdef012345'], replaced: [] };\n            launches.push({ slot: t, attempt: 1, session_id: agentOf(t), model: PIN, exit: 0, cwd, startedAt: '2026-10-04T05:00:00.000Z', endedAt: '2026-10-04T05:05:00.000Z', slugJsonl: 1, memoryDir: 'absent' });");
rep("        return { gs, lines };\n    };", "        return { gs, lines, launches };\n    };");
rep("const run = (x, extra = {}) => checkGraders({ gs: x.gs, files: filesOf(x.lines), nFiles: 9, pinned: PIN, departureNote: null, ...extra });",
    "const run = (x, extra = {}) => checkGraders({ gs: x.gs, files: filesOf(x.lines), nFiles: 9, pinned: PIN, departureNote: null, launches: x.launches, ...extra });\n    const LN = (x, tag = T) => x.launches.find((l) => l.slot === tag);");
rep("checkGraders({ gs: x.gs, files: { ...filesOf(x.lines), memory: undefined }, nFiles: 9, pinned: PIN, departureNote: null })",
    "checkGraders({ gs: x.gs, files: { ...filesOf(x.lines), memory: undefined }, nFiles: 9, pinned: PIN, departureNote: null, launches: x.launches })");
// new cases, before the closing of the cases array: insert after the '.replaced lines with no replacement' case
rep("        ['.replaced lines with no replacement in graders.json: refused', () => { const x = replaced(mk()); x.gs.graders[T].replaced = []; return x; }, {}, /lists no replacement/],\n",
`        ['.replaced lines with no replacement in graders.json: refused', () => { const x = replaced(mk()); x.gs.graders[T].replaced = []; return x; }, {}, /lists no replacement/],
        // A2 points 5 + 11: the launcher's launches.jsonl
        ['launches.jsonl absent (undefined): refused', () => { const x = mk(); x.launches = undefined; return x; }, {}, /launches\\.jsonl is missing/],
        ['a slot whose agent has no launches line at all (a session the launcher never ran)', () => { const x = mk(); x.gs.graders[T].agent = 'handtypedsession00000'; return x; }, {}, /has no launches\\.jsonl line for this slot/],
        ['the launches line of the agent is for ANOTHER slot', () => { const x = mk(); LN(x).slot = 'blind-4.g2'; return x; }, {}, /blind-3\\.g1: agent .* has no launches\\.jsonl line for this slot/],
        ['launcher exit 1', () => { const x = mk(); LN(x).exit = 1; return x; }, {}, /launcher exit 1, not 0/],
        ['launcher exit null (killed on timeout)', () => { const x = mk(); LN(x).exit = null; return x; }, {}, /launcher exit null, not 0/],
        ['slugJsonl 2 (a second session in the slug folder)', () => { const x = mk(); LN(x).slugJsonl = 2; return x; }, {}, /slugJsonl 2, not 1/],
        ['slugJsonl 0 (the transcript is not in the attempt\\'s own slug folder)', () => { const x = mk(); LN(x).slugJsonl = 0; return x; }, {}, /slugJsonl 0, not 1/],
        ['memoryDir non-empty', () => { const x = mk(); LN(x).memoryDir = 'non-empty'; return x; }, {}, /memoryDir non-empty, not absent\\|empty/],
        ['memoryDir empty is fine', () => { const x = mk(); LN(x).memoryDir = 'empty'; return x; }, {}, null],
        ['attempt in graders.json differs from the launches line', () => { const x = mk(); x.gs.graders[T].attempt = 2; return x; }, {}, /attempt 2 in graders\\.json, 1 in launches\\.jsonl/],
        ['cwd in graders.json differs from the launches line', () => { const x = mk(); x.gs.graders[T].cwd = 'C:/F/grading/other-a1'; return x; }, {}, /cwd in graders\\.json differs/],
        ['a launches cwd that is not <slot>-a<attempt> (a shared cwd)', () => { const x = mk(); x.gs.graders[T].cwd = LN(x).cwd = 'C:/F/grading'; return x; }, {}, /is not <slot>-a<attempt>/],
        ['the same cwd used by two attempts', () => { const x = mk(); x.launches.push({ ...LN(x, 'blind-4.g1'), slot: 'blind-4.g1x' }); const y = LN(x, 'blind-4.g1'); y.cwd = LN(x).cwd; return x; }, {}, /was used by 2 attempts/],
        ['the launches model differs from graders.json', () => { const x = mk(); LN(x).model = 'claude-opus-4'; return x; }, {}, /model claude-opus-5-5 in graders\\.json, claude-opus-4 in launches\\.jsonl/],
        ['a replaced agent with no launches line of its own', () => { const x = replaced(mk()); x.launches = x.launches.filter((l) => l.session_id !== 'agentOLD'); return x; }, {}, /replaced agent agentOLD has no launches\\.jsonl line of its own/],
        ['the replaced attempt is not earlier than the replacement', () => { const x = replaced(mk()); x.launches.find((l) => l.session_id === 'agentOLD').attempt = 3; return x; }, {}, /replaced attempt is not earlier/],
        ['a graders.json slot with no attempt', () => { const x = mk(); delete x.gs.graders[T].attempt; return x; }, {}, /attempt undefined in graders\\.json/],
`);
rep("        x.gs.graders[T].replaced = ['agentOLD'];\n",
    "        x.gs.graders[T].replaced = ['agentOLD'];\n        x.gs.graders[T].attempt = 2; x.gs.graders[T].cwd = `C:/F/grading/${T}-a2`; Object.assign(LN(x), { attempt: 2, cwd: `C:/F/grading/${T}-a2` });\n        x.launches.push({ slot: T, attempt: 1, session_id: 'agentOLD', model: PIN, exit: 0, cwd: `C:/F/grading/${T}-a1`, startedAt: 'x', endedAt: 'y', slugJsonl: 1, memoryDir: 'absent' });\n");
fs.writeFileSync(f, s);
console.log('ok');
