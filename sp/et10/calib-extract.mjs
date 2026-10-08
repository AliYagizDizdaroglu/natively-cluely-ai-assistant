// Throwaway calibration: wrap the 2026-09-27 spike run (10 items, one session, known turn structure from
// live-et-turns.mjs) in the ET10 run shape, so et-extract.mjs can be checked against answers already known.
// Expected real-answer starts (s): S1Q01 3.3, S1Q01F 6.7, S1Q02 4.7 (system error), S1Q02F 7.2, S1Q03 11.1,
// S1Q03F 5.8, S1Q04 10.9, S1Q04F 6.6, S1Q05 14.2 (system error), S1Q05F 5.7; holding lines on 9 of 10.
import fs from 'node:fs';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const S = JSON.parse(fs.readFileSync(`${SP}/live-et/2026-09-27T12-00-38-gemini-3.8-live-extended-thinking-low-AUDIO.json`, 'utf8'));
fs.writeFileSync(`${SP}/et10/runs/calib-spike.json`, JSON.stringify({ model: S.model, level: S.level, pairs: [S.items], answerWords: 25, events: S.events }));
console.log('wrote runs/calib-spike.json');
