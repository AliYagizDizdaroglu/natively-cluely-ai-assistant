import fs from 'node:fs';

// --- verbatim ports of the HEAD implementations ---
const contentWords = (text) => {
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return new Set(tokens.filter((w) => w.length > 3));
};
function contentWordSimilar(a, b) {
  const A = contentWords(a), B = contentWords(b);
  const [S, L] = A.size <= B.size ? [A, B] : [B, A];
  if (S.size < 4) return { hit: null, size: S.size, ratio: null, similar: false, floor: true };
  let hit = 0; for (const w of S) if (L.has(w)) hit++;
  return { hit, size: S.size, ratio: hit / S.size, similar: hit / S.size >= 0.6, floor: false };
}
const words = (s) => { const t = s.toLowerCase().match(/[a-z0-9]+/g) ?? []; return new Set(t.filter(w => w.length > 3)); };
const overlap = (a, b) => { const A = words(a), B = words(b); if (!A.size) return 0; let h = 0; for (const w of A) if (B.has(w)) h++; return h / A.size; };
const sameAnchor = (a, b) => {
  const na = a.toLowerCase().trim(), nb = b.toLowerCase().trim();
  if (na.length >= 3 && nb.length >= 3 && (na.includes(nb) || nb.includes(na))) return true;
  return overlap(a, b) >= 0.5 || overlap(b, a) >= 0.5;
};
const tokenize = (t) => new Set(t.toLowerCase().split(/\W+/).filter(x => x.length > 0));
const jaccard = (a, b) => { const A = tokenize(a), B = tokenize(b); if (!A.size && !B.size) return 0; let i = 0; for (const t of A) if (B.has(t)) i++; const u = A.size + B.size - i; return u === 0 ? 0 : i / u; };
const normC = (t) => t.toLowerCase().replace(/\s+/g, ' ').trim().replace(/[?.!,;:]+$/, '');

const DQ = String.fromCharCode(34);
const BS = String.fromCharCode(92);
const dispatchRe = new RegExp('\\[Main\\] dispatch: (\\w+) source=(\\w+) anchor=' + DQ + '((?:[^' + DQ + BS + BS + ']|' + BS + BS + '.)*)' + DQ + ' verdict=(\\w+)');
const liveQRe = new RegExp('\\[Main\\] Live question \\([^)]*\\): ' + DQ + '(.*)' + DQ + '\\s*$');

const log = fs.readFileSync(process.argv[2], 'utf8').split(/\r?\n/);
const events = [];
let lastLive = null;
for (const line of log) {
  const ts = line.slice(0, 24);
  let m = line.match(liveQRe);
  if (m) { lastLive = { at: Date.parse(ts), text: m[1] }; continue; }
  m = line.match(dispatchRe);
  if (!m) continue;
  const [, action, source, anchorRaw, verdict] = m;
  const anchor = anchorRaw.split(BS + DQ).join(DQ).split(BS + BS).join(BS);
  const at = Date.parse(ts);
  let text = anchor;
  let textSrc = 'anchor';
  if (source === 'live') {
    if (lastLive && at - lastLive.at <= 3000) { text = lastLive.text; textSrc = 'liveQline'; }
  }
  events.push({ at, ts, action, source, anchor, verdict, text, textSrc });
}
console.log('dispatch events: ' + events.length);
console.log('  by source: live=' + events.filter(e => e.source === 'live').length + ' whisper=' + events.filter(e => e.source === 'whisper').length);
console.log('  live events whose text came from the Live-question line: ' + events.filter(e => e.textSrc === 'liveQline').length);

let n = 0, newMerges = 0;
for (let i = 0; i < events.length; i++) {
  for (let j = i + 1; j < events.length; j++) {
    const a = events[i], b = events[j];
    if (b.at - a.at > 5000) break;
    if (a.source === b.source) continue;
    const cw = contentWordSimilar(b.text, a.text);
    const anch = sameAnchor(b.anchor, a.anchor);
    const jac = jaccard(b.text, a.text);
    const nA = normC(a.text), nB = normC(b.text);
    const cont = nB.length >= 3 && (nA.includes(nB) || nB.includes(nA));
    const oldMatch = anch || cont || jac >= 0.7;
    n++;
    const isNew = cw.similar && !oldMatch;
    if (isNew) newMerges++;
    console.log('');
    console.log('[pair ' + n + '] gap=' + (b.at - a.at) + 'ms  ' + a.source + '@' + a.ts.slice(11, 23) + ' -> ' + b.source + '@' + b.ts.slice(11, 23));
    console.log('  A.text: ' + a.text);
    console.log('  B.text: ' + b.text);
    console.log('  contentWord: ' + (cw.floor ? 'floor(size=' + cw.size + ')' : cw.hit + '/' + cw.size + '=' + cw.ratio.toFixed(2)) + ' similar=' + cw.similar + ' | old: anchor=' + anch + ' containment=' + cont + ' jaccard=' + jac.toFixed(2) + ' => oldMatch=' + oldMatch);
    console.log('  NEW MERGE (rule changes the outcome): ' + isNew);
  }
}
console.log('');
console.log('cross-source pairs within 5000ms: ' + n + ' ; pairs the new rule newly merges: ' + newMerges);
