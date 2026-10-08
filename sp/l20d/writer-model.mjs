// For a grader whose transcript holds a "<synthetic>" assistant entry (the harness's error placeholder when the
// session limit stopped it): which model made the tool call that WROTE its verdicts file, and does every
// "<synthetic>" entry come after that write and carry no tool call? Prints models, positions and counts only.
//   node writer-model.mjs <tag>=<agentId> ...
import fs from 'node:fs';
import path from 'node:path';
const projects = 'C:/Users/sotka/.claude/projects';
const session = '9c5886c7-cdbd-48af-b8bc-e9275012ec64';
const slugs = fs.readdirSync(projects).filter((d) => d.startsWith('C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant'));
let allOk = true;
for (const arg of process.argv.slice(2)) {
    const [tag, id] = arg.split('=');
    const f = slugs.map((s) => path.join(projects, s, session, 'subagents', `agent-${id}.jsonl`)).find((p) => fs.existsSync(p));
    if (!f) { console.log(`${tag}: NO TRANSCRIPT`); allOk = false; continue; }
    const msgs = fs.readFileSync(f, 'utf8').split('\n').filter((l) => l.trim()).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter((o) => o?.type === 'assistant');
    const want = `verdicts-${tag}.json`;
    let writeAt = -1, writeModel = null;
    msgs.forEach((o, i) => {
        for (const c of o.message?.content ?? []) {
            if (c?.type !== 'tool_use') continue;
            const s = JSON.stringify(c.input ?? {});
            if (s.includes(want) && (c.name === 'Write' || /writeFileSync|Set-Content|Out-File|> /.test(s))) { writeAt = i; writeModel = o.message.model; }
        }
    });
    const synth = msgs.map((o, i) => ({ i, m: o.message?.model, tools: (o.message?.content ?? []).filter((c) => c?.type === 'tool_use').length })).filter((x) => x.m === '<synthetic>');
    const ok = writeAt >= 0 && writeModel === 'claude-opus-5-5' && synth.every((s) => s.i > writeAt && s.tools === 0);
    if (!ok) allOk = false;
    console.log(`${tag}: verdicts written at assistant msg ${writeAt} by ${writeModel}; synthetic entries ${synth.map((s) => `#${s.i} (tool calls ${s.tools})`).join(', ') || 'none'} -> ${ok ? 'GRADED BY claude-opus-5-5' : 'NOT SHOWN'}`);
}
console.log(allOk ? 'ALL: the verdicts were written by claude-opus-5-5; the synthetic entries are the stop placeholders after the write' : 'NOT ALL SHOWN');
