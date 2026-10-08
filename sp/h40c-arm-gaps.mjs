// Throwaway, read-only: which of the 44 captured ids each captured arm lacks (two arms hold 43), and
// what the arm's answers file says for it, so the note names the gap instead of guessing.
import fs from 'node:fs';
const R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-29T11-42-00-h40c';
const ids = Object.keys(JSON.parse(fs.readFileSync(`${R}/interview60.prompts.json`, 'utf8')));
for (const tag of ['gemini-3.1-flash-lite_captured-low', 'gemini-3.1-flash-lite_captured-low-r2', 'gemini-3.1-flash-lite_captured-low-r3', 'gemini-3.1-flash-lite_captured-minimal', 'gemini-3.5-flash-lite_captured-high', 'gemini-3.5-flash-lite_captured-high-r2', 'gemini-3.5-flash-lite_captured-high-r3']) {
    const pairs = JSON.parse(fs.readFileSync(`${R}/interview60.judge.pairs.${tag}.json`, 'utf8')).items.map((i) => i.key);
    const missing = ids.filter((id) => !pairs.includes(id));
    const ans = JSON.parse(fs.readFileSync(`${R}/interview60.answers.${tag}.json`, 'utf8'));
    const detail = missing.map((id) => {
        const a = ans[id] ?? Object.values(ans).find((v) => v?.id === id);
        return `${id}: ${a ? JSON.stringify(Object.fromEntries(Object.entries(a).filter(([k]) => !['answer', 'prompt', 'system', 'user'].includes(k)))).slice(0, 220) : 'absent from the answers file'}`;
    });
    console.log(`${tag}: ${pairs.length} graded; missing ${missing.length ? detail.join(' | ') : 'none'}`);
}
