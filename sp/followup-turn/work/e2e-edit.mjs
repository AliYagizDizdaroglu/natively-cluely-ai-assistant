import fs from 'node:fs';
const f = 'R/scripts/e2e-synthetic.mjs';
let s = fs.readFileSync(f, 'utf8');
const rep = (a, b) => { if (!s.includes(a)) throw new Error('missing: ' + a.slice(0, 70)); s = s.replace(a, () => b); };
rep("async function build({ withEmpty, mutate, graders = {}, departure = false,", "async function build({ withEmpty, mutate, graders = {}, launch = {}, departure = false,");
rep("const slots = {}, tool = { models: [], memory: [], audit: [] };", "const slots = {}, tool = { models: [], memory: [], audit: [] }, launches = [];");
rep("const slot = { agent: `synthetic${n}${g}`, model: C.PINNED_GRADER,", "const slot = { agent: `synthetic${n}${g}`, attempt: 1, cwd: `C:/F/grading/${tag}-a1`, model: C.PINNED_GRADER,");
rep("            slots[tag] = slot;\n", "            slots[tag] = slot;\n            // A2 point 11: the launcher's line for this slot's agent (exit 0, one .jsonl, no memory folder) -- `launch[tag]` overrides fields (or null drops the line)\n            if (launch[tag] !== null) launches.push({ slot: tag, attempt: slot.attempt, session_id: slot.agent, model: slot.model, exit: 0, cwd: slot.cwd, startedAt: '2026-10-04T05:00:00.000Z', endedAt: '2026-10-04T05:05:00.000Z', slugJsonl: 1, memoryDir: 'absent', ...(launch[tag] ?? {}) });\n");
rep("    for (const [k, name] of [['models', 'graders.models.out.txt']", "    fs.writeFileSync(path.join(blindDir, 'launches.jsonl'), launches.map((l) => JSON.stringify(l)).join('\\n') + '\\n');\n    for (const [k, name] of [['models', 'graders.models.out.txt']");
// new run 14, before the final summary: find the last "cleanup" handling — insert before "// ── run 7"
rep("// ── run 7: the one allowed s50k re-run, pooled ──", `// ── run 14: A2 points 5 + 11 -- every slot's agent must be the session of a launcher line (exit 0, one .jsonl, no memory folder) ──
{
    const b0 = await build({ withEmpty: false });
    const d0 = decide(b0.tmp);
    check(\`run 14: the full synthetic run WITH launches.jsonl decides (exit \${d0.status})\`, d0.status === 0 && /DECISION/.test(d0.stdout));
    const lf = path.join(b0.blindDir, 'launches.jsonl'), orig = fs.readFileSync(lf, 'utf8');
    const setLines = (fn) => fs.writeFileSync(lf, orig.trim().split('\\n').map((l) => JSON.stringify(fn(JSON.parse(l)))).join('\\n') + '\\n');
    fs.rmSync(lf);
    const d1 = decide(b0.tmp);
    check('run 14a: launches.jsonl absent -> REPORTED, NOT DECIDED (the labels must come from launcher lines)', d1.status === 3 && /launches\\.jsonl is missing/.test(d1.stdout) && !/DECISION/.test(d1.stdout));
    setLines((l) => (l.slot === 'blind-5.g2' ? { ...l, exit: 1 } : l));
    const d2 = decide(b0.tmp);
    check('run 14b: one launcher line with exit 1 -> REPORTED, NOT DECIDED naming the slot', d2.status === 3 && /blind-5\\.g2: launcher exit 1/.test(d2.stdout));
    setLines((l) => (l.slot === 'blind-2.g1' ? { ...l, slugJsonl: 2 } : l));
    const d3 = decide(b0.tmp);
    check('run 14c: slugJsonl 2 -> REPORTED, NOT DECIDED', d3.status === 3 && /blind-2\\.g1: slugJsonl 2/.test(d3.stdout));
    setLines((l) => (l.slot === 'blind-8.g1' ? { ...l, memoryDir: 'non-empty' } : l));
    check('run 14d: a non-empty memory folder after the attempt -> REPORTED, NOT DECIDED', decide(b0.tmp).status === 3);
    setLines((l) => (l.slot === 'blind-9.g2' ? { ...l, session_id: 'someothersession' } : l));
    const d5 = decide(b0.tmp);
    check('run 14e: graders.json names an agent no launcher line has -> REPORTED, NOT DECIDED', d5.status === 3 && /blind-9\\.g2: agent .* has no launches\\.jsonl line/.test(d5.stdout));
    setLines((l) => (l.slot === 'blind-4.g1' ? { ...l, cwd: 'C:/F/grading' } : l));
    check('run 14f: a launcher line whose cwd is shared (not <slot>-a<attempt>) -> REPORTED, NOT DECIDED', decide(b0.tmp).status === 3);
    fs.writeFileSync(lf, orig);
    const d6 = decide(b0.tmp);
    check('run 14g: the restored launches.jsonl decides again (the refusals above were the lines, nothing else)', d6.status === 0 && /DECISION/.test(d6.stdout));
}
// ── run 7: the one allowed s50k re-run, pooled ──`);
fs.writeFileSync(f, s);
console.log('ok');
