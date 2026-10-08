// Records the 3.8 Live temperature probe result after the 20:30 temperature probe entry of AGENDA.md, and fixes the
// grader-agents time stamp to the real one.
import fs from 'node:fs';
const F = new URL('./AGENDA.md', import.meta.url);
const lines = fs.readFileSync(F, 'utf8').split('\n');
const i = lines.findIndex((l) => l.startsWith('  - 20:30 Fri TEMPERATURE PROBE DONE'));
if (i < 0 || lines.some((l) => l.startsWith('  - 21:57 Fri 3.8 LIVE TEMPERATURE PROBE'))) { console.log('REFUSED'); process.exit(2); }
lines.splice(i + 1, 0, '  - 21:57 Fri 3.8 LIVE TEMPERATURE PROBE DONE (user: "can we do the same test on 3.8 live and compare"; SP temp-live/, analyze.out.txt): L20c harness unchanged (s50k system + CONTEXT + LIVE MODE, real-time 16 kHz clips, same waits), 6 pairs covering 8 of the 9 lite-probe items, 3 reps, temperature 0.4 vs unset interleaved per pair; spike first: the server READS the field (5.0 -> 1007 "must be in the range [0.0, 2.0]"). 36 sessions, 72 items: 0 holes, 0 loops (8-gram), 1 abnormal close (complete), 1 cap = a 64-word answer whose turnComplete never came (not a loop). Blind with L20b/L20c prior Live (unset) and tonight\'s 3.5-lite T04 answers in the same files; 4 Opus graders all claude-opus-5-5. Acceptable of 24: Live 0.4 11.5 (2 wrong, both S1Q02 "4,750" reasoning), Live unset 11.5 (0 wrong), prior Live 9.0 of 22, app 3.5-lite 7.5. First word after question end: 1.73 vs 1.82 s (p90 2.45 vs 2.63). VERDICT: temperature makes no difference to 3.8 Live; keep it unset (the app\'s Live ear sets none). GRADER-CONTEXT EFFECT: the SAME 3.5-lite answers scored 5.5 on these 8 items in the lite probe\'s files and 7.5 here (S1Q02 0/3 -> 3/3): compare arms only inside one blind file; the Sunday bench and the slim-prompt A/B must keep every arm in the same files.');
fs.writeFileSync(F, lines.join('\n'));
const G = new URL('./temp-live/grader-agents.txt', import.meta.url);
fs.writeFileSync(G, fs.readFileSync(G, 'utf8').replace('~22:05 local', '~21:50 local'));
console.log('inserted after line', i + 1);
