// throwaway (bundle-1 spec evidence): in r1, is the router's route known when the pipeline request is sent?
// dispatch_ms = dispatch at - q_at (the pipeline prompt is built right after it); live_first_ms = the router's first word - q.
const fs = require('fs');
const D = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-10-07T00-22-47-router-default-r1/natively_debug.log';
const L = fs.readFileSync(D, 'utf8').split('\n'); const disp = {}, rows = [];
for (const l of L) {
  let m = l.match(/\[Router\] dispatch turn=(\d+) at=(\d+) q_at=(\d+)/); if (m) disp[m[1]] = +m[2] - +m[3];
  m = l.match(/\[Router\] turn=(\d+) route=(\S+) reason=(\S+) live_first_ms=(\S+)/);
  if (m && disp[m[1]] !== undefined) rows.push({ t: m[1], route: m[2], reason: m[3], d: disp[m[1]], lf: m[4] === '-' ? null : +m[4] });
}
const known = rows.filter((r) => r.lf !== null && r.lf <= r.d).length;
const ds = rows.map((r) => r.d).sort((a, b) => a - b);
const lfs = rows.filter((r) => r.lf !== null).map((r) => r.lf).sort((a, b) => a - b);
console.log('turns', rows.length, 'dispatch_ms p50', ds[ds.length >> 1], 'min', ds[0], 'max', ds[ds.length - 1]);
console.log('live_first_ms p50', lfs[lfs.length >> 1], 'min', lfs[0], 'max', lfs[lfs.length - 1]);
console.log('router first word BEFORE the dispatch:', known, 'of', rows.length);
console.log('routes', JSON.stringify(rows.reduce((a, r) => (a[r.route + '/' + r.reason] = (a[r.route + '/' + r.reason] || 0) + 1, a), {})));
