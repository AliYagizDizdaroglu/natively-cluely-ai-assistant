// After the user's live look (merge review I1) on the worktree build: the proof lines from the worktree app's own
// log, timestamps and line HEADS only (never an answer, a question or the profile). Prints, for lines at/after
// --since (ISO or local "HH:MM"): the `[IPC] gemini-chat-stream intent:` lines (both typed questions), the
// `[KnowledgeOrchestrator] Intent classified:` lines (Context ON), the `[Answer] cues:` lines (the spoken answer's
// cue block), `budget: words=` (a block-only answer would read words=0), and the knowledge-mode ENABLED/DISABLED
// lines (the look must END with Context ON).
//   node live-look-lines.mjs --since 14:40 [--log <path>]
import fs from 'node:fs';
const WT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const log = arg('--log', `${WT}/natively_debug.log`);
const sinceArg = arg('--since');
if (!sinceArg) { console.log('usage: live-look-lines.mjs --since <ISO or HH:MM local> [--log <path>]'); process.exit(2); }
let since;
if (/^\d{2}:\d{2}$/.test(sinceArg)) { const d = new Date(); const [h, m] = sinceArg.split(':').map(Number); d.setHours(h, m, 0, 0); since = d.getTime(); }
else since = Date.parse(sinceArg);
if (!Number.isFinite(since)) { console.log(`bad --since ${sinceArg}`); process.exit(2); }
const PATTERNS = [
    ['typed intent', '[IPC] gemini-chat-stream intent:'],
    ['knowledge classify', '[KnowledgeOrchestrator] Intent classified:'],
    ['cues', '[Answer] cues:'],
    ['budget', 'budget: words='],
    ['knowledge ENABLED', 'Knowledge mode ENABLED'],
    ['knowledge DISABLED', 'Knowledge mode DISABLED'],
    ['hedge won', 'verbal hedge: won by'],
];
const lines = fs.readFileSync(log, 'utf8').split('\n');
const stamped = lines.map((l) => ({ l, t: Date.parse(l.slice(0, 24)) })).filter((x) => Number.isFinite(x.t) && x.t >= since);
console.log(`${log}: ${lines.length} lines, ${stamped.length} at/after ${new Date(since).toISOString()}`);
for (const [name, pat] of PATTERNS) {
    const hits = stamped.filter((x) => x.l.includes(pat));
    console.log(`${name.padEnd(20)} ${String(hits.length).padStart(3)}  ${hits.map((x) => x.l.slice(11, 23)).join(' ')}`);
}
const last = stamped.filter((x) => x.l.includes('Knowledge mode ENABLED') || x.l.includes('Knowledge mode DISABLED')).at(-1);
console.log(`last knowledge-mode line: ${last ? (last.l.includes('ENABLED') ? 'ENABLED' : 'DISABLED') + ' at ' + last.l.slice(11, 23) : 'none since the start time'}`);
for (const x of stamped.filter((x) => x.l.includes('budget: words='))) { const m = x.l.match(/budget: words=(\d+)/); console.log(`  budget at ${x.l.slice(11, 23)}: words=${m?.[1]}`); }
