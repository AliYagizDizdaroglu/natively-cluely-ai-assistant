// Background wake-up: sleeps until the given ISO time, then prints a line and exits (the session is re-invoked on exit).
//   node sleep-until.mjs 2026-10-03T10:05:00+03:00 "label"
const target = Date.parse(process.argv[2]);
const label = process.argv[3] ?? '';
if (!Number.isFinite(target)) { console.log('usage: node sleep-until.mjs <ISO time> [label]'); process.exit(2); }
const wait = target - Date.now();
console.log(`armed ${new Date().toISOString()} -> ${new Date(target).toISOString()} (${Math.round(wait / 60000)} min) ${label}`);
if (wait > 0) await new Promise((r) => setTimeout(r, wait));
console.log(`WAKE ${new Date().toISOString()} ${label}`);
