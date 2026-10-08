// Re-check r3, new fact (c): the hasCueRule calibration case of r3 §7.6 is the 05:00 re-smoke's prompts file.
// Counts only (never a prompt): ids with a system and a user turn, how many systems carry the mark '[CUES FIRST]'
// (interview60.flight.mjs CUE_RULE_MARK), the file's size, mtime and sha256/16. Also h40c's file (the known-false case).
import fs from 'node:fs';
import crypto from 'node:crypto';
const WTR = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn/electron/test/golden/interview60.runs';
const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
for (const f of [`${WTR}/2026-10-01T02-37-41-cuesmoke/interview60.prompts.json`, `${RUNS}/2026-09-29T11-42-00-h40c/interview60.prompts.json`]) {
    if (!fs.existsSync(f)) { console.log(`${f}: MISSING`); continue; }
    const buf = fs.readFileSync(f);
    const j = JSON.parse(buf.toString('utf8'));
    const ids = Object.keys(j).filter((id) => j[id]?.system && j[id]?.user);
    const marked = ids.filter((id) => String(j[id].system).includes('[CUES FIRST]'));
    const st = fs.statSync(f);
    console.log(`${f.split('/').slice(-2).join('/')}: size ${st.size}, mtime ${st.mtime.toISOString()}, sha256/16 ${crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16)}; keys ${Object.keys(j).length}, ids with system+user ${ids.length}, carrying [CUES FIRST] ${marked.length}; id prefixes ${[...new Set(ids.map((id) => id.replace(/\d.*$/, '')))].join(',')}`);
}
