// The calibration material: scenario50 bench cue blocks (ids and counts only).
import fs from 'node:fs';
const WT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn/electron/test/golden';
const words = (s) => (String(s).trim().match(/\S+/g) ?? []).length;
for (const r of [1, 2, 3]) {
  const f = `${WT}/interview60.answers.gemini-3.5-flash-lite_cues-r${r}.json`;
  const st = fs.statSync(f);
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  const ids = Object.keys(j);
  const blocks = ids.filter((id) => Array.isArray(j[id].cues) && j[id].cues.length);
  const lineCounts = blocks.map((id) => j[id].cues.length);
  const hist = {}; for (const n of lineCounts) hist[n] = (hist[n] || 0) + 1;
  const over5 = blocks.filter((id) => j[id].cues.some((l) => words(l) > 5)).length;
  const notation = blocks.filter((id) => j[id].cues.some((l) => /\$|\\[a-zA-Z]/.test(l))).length;
  const emptySpoken = ids.filter((id) => !String(j[id].spoken ?? '').trim()).length;
  const scen = {}; for (const id of ids) scen[id.slice(0, 2)] = (scen[id.slice(0, 2)] || 0) + 1;
  console.log(`r${r}: mtime ${st.mtime.toISOString()}, ids ${ids.length} ${JSON.stringify(scen)}, blocks ${blocks.length}, lines/block ${JSON.stringify(hist)}, blocks with a >5-word line ${over5}, notation blocks ${notation}, empty spoken ${emptySpoken}, model ${j[ids[0]].model}`);
}
