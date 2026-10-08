// Throwaway: the SAME s50m reference answers, graded 2026-09-22 (flight) vs tonight (blind).
// Also: which S1/S2 ids the flight captured, and whether the 09-22 grading recorded a grader model.
import fs from 'node:fs';

const RUN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const IDS = 'S1Q01F,S1Q02,S1Q02F,S1Q03,S1Q03F,S1Q04,S1Q04F,S1Q05,S1Q05F,S1Q06,S1Q06F,S1Q07,S1Q07F,S1Q08,S1Q08F,S1Q09,S1Q09F,S1Q10,S1Q10F,S2Q01,S2Q01F,S2Q02,S2Q02F,S2Q03,S2Q03F,S2Q04,S2Q04F,S2Q05,S2Q05F,S2Q06,S2Q06F,S2Q07,S2Q07F,S2Q08,S2Q08F,S2Q09,S2Q09F,S2Q10,S2Q10F'.split(',');
const verdictOf = ({ correctness, on_topic, delivery }) =>
    correctness === 0 || on_topic === 0 ? 'wrong' : correctness === 2 && on_topic === 2 && delivery >= 1 ? 'acceptable' : 'weak';

// 1. Which S1/S2 ids exist in the captured prompts and in the reference answers.
const prompts = JSON.parse(fs.readFileSync(`${RUN}/interview60.prompts.json`, 'utf8'));
const pk = Array.isArray(prompts) ? prompts.map((p) => p.id) : Object.keys(prompts);
const s12 = (ids) => ids.filter((id) => /^S[12]Q/.test(id));
const ans = JSON.parse(fs.readFileSync(`${RUN}/interview60.answers.gemini-3.1-flash-lite_captured-low.json`, 'utf8'));
console.log('captured prompts S1/S2:', s12(pk).length, '| not in our 39:', s12(pk).filter((i) => !IDS.includes(i)).join(',') || '-');
console.log('3.1 captured-low answers S1/S2:', s12(Object.keys(ans)).length, '| not in our 39:', s12(Object.keys(ans)).filter((i) => !IDS.includes(i)).join(',') || '-');
const s1q01 = Object.entries(ans).find(([id]) => id === 'S1Q01');
console.log('S1Q01 in answers:', s1q01 ? `yes, spoken=${!!s1q01[1].spoken} words=${s1q01[1].words}` : 'no');

// 2. 09-22 verdicts vs tonight's blind grades, per arm and rep, on the same 39 ids.
const blind = JSON.parse(fs.readFileSync(`${SP}/gemma-arms/blind/score.json`, 'utf8')).grade;
const STRUGGLE = new Set('S2Q02,S2Q06F,S2Q07F,S1Q02,S1Q04F,S2Q02F,S2Q10F,S1Q04,S1Q06,S1Q06F,S1Q10,S2Q08F'.split(','));
for (const [arm, stem] of [['3.1-lite LOW', 'gemini-3.1-flash-lite_captured-low'], ['3.5-lite HIGH', 'gemini-3.5-flash-lite_captured-high']]) {
    for (const [rep, suf] of [[1, ''], [2, '-r2'], [3, '-r3']]) {
        const V = JSON.parse(fs.readFileSync(`${RUN}/interview60.judge.verdicts.${stem}${suf}.json`, 'utf8'));
        const ids = rep === 1 ? IDS : IDS.filter((i) => STRUGGLE.has(i));
        const then = ids.filter((id) => V[id] && verdictOf(V[id]) === 'acceptable').length;
        const graded = ids.filter((id) => V[id]).length;
        const now = ids.filter((id) => blind[arm]?.[rep]?.[id]?.verdict === 'acceptable').length;
        let up = 0, down = 0;
        for (const id of ids) {
            const a = V[id] && verdictOf(V[id]) === 'acceptable', b = blind[arm]?.[rep]?.[id]?.verdict === 'acceptable';
            if (b && !a) up++; else if (a && !b) down++;
        }
        // Over all 40+ S1/S2 ids the flight graded (its own denominator), rep files only.
        const allS12 = s12(Object.keys(V));
        const thenAll = allS12.filter((id) => verdictOf(V[id]) === 'acceptable').length;
        console.log(`${arm.padEnd(14)} rep ${rep}: 09-22 ${then}/${graded} -> tonight ${now}/${ids.length}  (${up} up / ${down} down)   [09-22 over all its S1/S2 ids: ${thenAll}/${allS12.length}]`);
    }
}

// 3. Did the 09-22 grading record a grader model anywhere?
const J = JSON.parse(fs.readFileSync(`${RUN}/interview60.judge.gemini-3.1-flash-lite_captured-low.json`, 'utf8'));
const P = JSON.parse(fs.readFileSync(`${RUN}/interview60.judge.pairs.gemini-3.1-flash-lite_captured-low.json`, 'utf8'));
console.log('judge file top-level keys:', Object.keys(J).slice(0, 12).join(','));
console.log('pairs file model field:', P.model ?? '(none)');
for (const k of ['graderModel', 'grader', 'model', 'judgeModel', 'graderPromptVersion', 'instrument']) if (J[k] !== undefined) console.log(`judge.${k}:`, JSON.stringify(J[k]).slice(0, 120));
