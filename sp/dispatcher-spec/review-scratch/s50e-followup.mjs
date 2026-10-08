// REVIEW THROWAWAY: s50e S2Q01F's late Live claim against its own answered text and its parent's (question text only).
import fs from 'node:fs';
const [log] = process.argv.slice(2);
const L = fs.readFileSync(log, 'utf8').split(/\r?\n/);
const q = (re) => { const l = L.find((x) => re.test(x)); const m = l.match(/question="((?:[^"\\]|\\.)*)"/); return JSON.parse('"' + m[1] + '"'); };
const claim = q(/2026-09-14T07:49:52\.145Z .*dispatch: mark source=live/);
const s2q01f = q(/2026-09-14T07:49:41\.588Z .*dispatch: answer/);
const s2q01 = q(/2026-09-14T07:48:36\.251Z .*dispatch: answer/);
const cw = (s) => new Set((s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 3));
const ov = (a, b) => { const A = cw(a), B = cw(b); if (A.size < 4) return 0; let h = 0; for (const w of A) if (B.has(w)) h++; return h / A.size; };
console.log('claim  :', claim);
console.log('S2Q01F :', s2q01f);
console.log('S2Q01  :', s2q01.slice(0, 200));
console.log(`quote(claim, S2Q01F own text) = ${ov(claim, s2q01f).toFixed(2)}; quote(claim, S2Q01 parent) = ${ov(claim, s2q01).toFixed(2)}; claim content words ${cw(claim).size}`);
