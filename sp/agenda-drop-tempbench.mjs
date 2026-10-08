// Records the user's removal of the Sunday temperature bench (2026-10-02 ~22:20) and frees the slim-prompt A/B from
// its dependency on it. Adds dated lines; earlier entries stay as the record.
import fs from 'node:fs';
const F = new URL('./AGENDA.md', import.meta.url);
let t = fs.readFileSync(F, 'utf8');
if (t.includes('**SUNDAY TEMPERATURE BENCH REMOVED')) { console.log('REFUSED: already recorded'); process.exit(2); }
const lines = t.split('\n');
const i = lines.findIndex((l) => l.startsWith('  - 21:57 Fri 3.8 LIVE TEMPERATURE PROBE DONE'));
if (i < 0) { console.log('REFUSED: anchor missing'); process.exit(2); }
lines.splice(i + 1, 0, '  - 22:20 Fri **SUNDAY TEMPERATURE BENCH REMOVED (user: "remove this from agenda if safe; since no difference")**: safe because removing it changes nothing: the app keeps temperature 0.4, the value every baseline since s50a was measured at. Evidence: 3.5-lite HIGH (hedge front, ~85% of answers) 8.5 vs 8.5 and same latency; 3.8 Live 11.5 vs 11.5 and same latency; 3.1-lite LOW unset was faster but 7.5 vs 10.0 with 2 wrongs, which favours KEEPING 0.4. Re-check only if the answer model changes (e.g. paid 3.8 Flash) or Google changes the guidance\'s consequences. The Live ear keeps no temperature (as today).');
t = lines.join('\n');
const before = "Day: after Sunday\\'s temperature bench (not Sat: the follow-up re-run owns 3.5-lite).";
const raw = "Day: after Sunday's temperature bench (not Sat: the follow-up re-run owns 3.5-lite).";
const anchor = t.includes(raw) ? raw : (t.includes(before) ? before : null);
if (!anchor) { console.log('REFUSED: slim-prompt day anchor missing'); process.exit(2); }
t = t.replace(anchor, "Day: Sunday 4 Oct after 10:00 is now free (the temperature bench was removed 22:20 Fri); not Sat: the follow-up re-run owns 3.5-lite.");
t = t.replace('One variable at a time: the temperature stays 0.4 unless the Sunday bench changed it first.', 'One variable at a time: the temperature stays 0.4 (the Sunday bench was removed).');
fs.writeFileSync(F, t);
console.log('recorded; slim-prompt day updated');
