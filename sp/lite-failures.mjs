// Throwaway: per-question failure count for gemini-3.1-flash-lite across every graded arm that
// sent the verbal prompt properly (the defective app shapes are excluded), plus the flight's
// in-app answers for reference.
import fs from 'node:fs';
import path from 'node:path';

const SPIKE = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn/electron/test/golden/interview60.runs/2026-09-11-spike';
const FLIGHT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-11T08-22-32-s50b';
const files = {
    'flight bare 3.1': path.join(FLIGHT, 'interview60.judge.gemini-3.1-flash-lite.json'),
    plainB: path.join(SPIKE, 'interview60.judge.gemini-3.1-flash-lite_plainB.json'),
    plain_nf: path.join(SPIKE, 'interview60.judge.gemini-3.1-flash-lite_plain_nf.json'),
    verbal_notes: path.join(SPIKE, 'interview60.judge.gemini-3.1-flash-lite_verbal_notes.json'),
    verbal_notes_nf: path.join(SPIKE, 'interview60.judge.gemini-3.1-flash-lite_verbal_notes_nf.json'),
    appexact: path.join(SPIKE, 'interview60.judge.gemini-3.1-flash-lite_appexact.json'),
    verbal_ctx: path.join(SPIKE, 'interview60.judge.gemini-3.1-flash-lite_verbal_ctx.json'),
    swap: path.join(SPIKE, 'interview60.judge.gemini-3.1-flash-lite_swap.json'),
};
const inApp = path.join(FLIGHT, 'interview60.judge.json');

const ids = [];
for (const s of ['S1', 'S2']) for (let i = 1; i <= 10; i++) ids.push(`${s}Q${String(i).padStart(2, '0')}`);
const rows = {};
for (const id of ids) rows[id] = { fails: 0, arms: [], content: 0, delivery: 0 };
const armNames = Object.keys(files);
for (const [name, f] of Object.entries(files)) {
    const items = JSON.parse(fs.readFileSync(f, 'utf8')).items;
    for (const id of ids) {
        const v = items[id];
        if (!v) continue;
        if (v.verdict !== 'acceptable') {
            rows[id].fails++; rows[id].arms.push(name);
            if (v.correctness < 2 || v.on_topic < 2) rows[id].content++; else rows[id].delivery++;
        }
    }
}
const app = JSON.parse(fs.readFileSync(inApp, 'utf8')).items;
console.log(`arms: ${armNames.length}  (${armNames.join(', ')})\n`);
console.log('id     fails content-fails delivery-only  in-app(s50b)  short question');
const q = (id) => (app[id]?.question ?? '').slice(0, 70).replace(/\s+/g, ' ');
for (const id of ids.slice().sort((a, b) => rows[b].fails - rows[a].fails)) {
    const r = rows[id];
    console.log(`${id}  ${String(r.fails).padStart(2)}/${armNames.length}   ${String(r.content).padStart(2)}            ${String(r.delivery).padStart(2)}         ${(app[id]?.verdict ?? '?').padEnd(10)}  ${q(id)}`);
}
