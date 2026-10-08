// Re-check: runs SP/cue-group/hold-read.mjs (read-only) on h40c, br1 and the 16:12 run and prints only its
// summary lines (run/window, counts, T/C/B/R rows, the verdict). Never prints a cue or an answer.
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SP = path.dirname(path.dirname(HERE));
const R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const WR = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn/electron/test/golden/interview60.runs';
const keep = /^(run |lines:|T |C |B |R1|R2|HOLD|counted|  counted)/;
for (const d of [`${R}/2026-09-29T11-42-00-h40c`, `${R}/2026-09-30T11-45-30-br1`, `${WR}/2026-09-30T13-46-52-cuesmoke`]) {
    let out;
    try { out = execFileSync(process.execPath, [path.join(SP, 'cue-group', 'hold-read.mjs'), d], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (e) { out = `${e.stdout ?? ''}[exit ${e.status}]`; }
    console.log(out.split('\n').filter((l) => keep.test(l)).map((l) => l.slice(0, 160)).join('\n'));
    console.log('');
}
