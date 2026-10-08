// h40d: the Live ear's health and the dispatch sources inside the run window (hold-read's window, 10:32:01Z-11:39:41Z):
// quota closes (count, first, last), reconnect lines, `dispatch: answer|supersede|mark|drop` by source, not-a-question
// closes. Prints counts and timestamps only.
import fs from 'node:fs';
const LOG = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/natively_debug.log';
const A = Date.parse('2026-10-02T10:32:01.026Z'), B = Date.parse('2026-10-02T11:39:40.483Z');
const lines = fs.readFileSync(LOG, 'utf8').split('\n').filter((l) => { const t = Date.parse(l.slice(0, 24)); return t >= A && t <= B; });
const quota = lines.filter((l) => /\[LiveRouter\] quota close #/.test(l));
console.log(`lines in window: ${lines.length}`);
console.log(`Live quota closes: ${quota.length}; first ${quota[0]?.slice(0, 24)}; last ${quota.at(-1)?.slice(0, 24)}`);
const byHour = {}; for (const l of quota) { const k = l.slice(11, 15) + '0'; byHour[k] = (byHour[k] ?? 0) + 1; }
console.log(`  by 10 minutes (Z): ${JSON.stringify(byHour)}`);
const other = {}; for (const l of lines) { const m = l.match(/\[LiveRouter\] ([a-z][a-z -]{3,40}?)(?: #| —|:|\(|$)/i); if (m && !/quota close/.test(l)) other[m[1].trim()] = (other[m[1].trim()] ?? 0) + 1; }
console.log(`  other LiveRouter line kinds: ${JSON.stringify(other)}`);
const disp = {}; for (const l of lines) { const m = l.match(/\[Main\] dispatch: (\w+) source=(\w+)/); if (m) disp[`${m[1]}/${m[2]}`] = (disp[`${m[1]}/${m[2]}`] ?? 0) + 1; }
console.log(`dispatch lines by kind/source: ${JSON.stringify(disp)}`);
console.log(`turn closes not-a-question: ${lines.filter((l) => /turn: close reason=not-a-question/.test(l)).length}`);
console.log(`Live ear model line(s): ${[...new Set(lines.filter((l) => /native-audio|flash-live|LIVE_MODEL|live model/i.test(l)).map((l) => l.slice(25, 140)))].slice(0, 3).join(' | ') || '(none in window)'}`);
