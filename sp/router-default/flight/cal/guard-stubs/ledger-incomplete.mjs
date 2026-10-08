// ledger stub (calibration): the reset is derived from --now exactly as the real ledger does, unless fixed
const i = process.argv.indexOf('--now');
const NOW = i < 0 ? Date.now() : Date.parse(process.argv[i + 1]);
const DAY = 86400000, midnight = Math.floor(NOW / DAY) * DAY;
const start = midnight + 7 * 3600000 <= NOW ? midnight + 7 * 3600000 : midnight - DAY + 7 * 3600000;
const reset = new Date(start).toISOString();
const e = process.argv.indexOf('--extra-requests');
const extra = e < 0 ? 'unset' : process.argv[e + 1];
console.log('reset ' + reset + ' (10:00 local)');
console.log('LEDGER-SUMMARY reset=' + reset + ' now=' + new Date(NOW).toISOString() + ' cap=500 used35=100 used31=50 extra=' + extra + ' headroom35=400 headroom31=450 complete=no oldest=2026-10-07T08:00:00.000Z');
process.exit(0);
