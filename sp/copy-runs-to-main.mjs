// Copies the three cue-smoke run folders from the worktree's interview60.runs into MAIN's (git-ignored), byte-checked.
// readdirSync + copyFileSync (fs.cpSync fails silently on the non-ASCII path). Refuses an existing destination.
import fs from 'node:fs';
import path from 'node:path';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const SRC = `${MAIN}/.claude/worktrees/whole-turn/electron/test/golden/interview60.runs`;
const DST = `${MAIN}/electron/test/golden/interview60.runs`;
for (const name of ['2026-09-30T02-38-22-cuesmoke', '2026-09-30T13-46-52-cuesmoke', '2026-10-01T02-37-41-cuesmoke']) {
    const s = path.join(SRC, name), d = path.join(DST, name);
    if (fs.existsSync(d)) { console.log(`REFUSED: ${name} exists in MAIN`); process.exit(2); }
    fs.mkdirSync(d);
    let n = 0;
    for (const f of fs.readdirSync(s, { withFileTypes: true })) {
        if (!f.isFile()) { console.log(`REFUSED: ${name}/${f.name} is not a file`); process.exit(2); }
        fs.copyFileSync(path.join(s, f.name), path.join(d, f.name));
        if (Buffer.compare(fs.readFileSync(path.join(s, f.name)), fs.readFileSync(path.join(d, f.name))) !== 0) { console.log(`MISMATCH ${name}/${f.name}`); process.exit(3); }
        n++;
    }
    console.log(`${name}: ${n} files copied, byte-equal`);
}
