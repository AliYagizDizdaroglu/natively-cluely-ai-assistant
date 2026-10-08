// throwaway (bundle-1 spec evidence): question word counts by class on live40 and scenario50 (never holdout40),
// and how a "short single-part" shape gate would split them.
const G = 'file:///C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/';
const { LIVE40 } = await import(G + 'live40.questions.mjs');
const s50 = await import(G + 'scenario50.questions.mjs');
const S50 = Object.values(s50).find(Array.isArray);
const wc = (t) => t.trim().split(/\s+/).length;
const multi = (t) => /,|;|\band\b|\bor\b|\bvs\.?\b|\bversus\b|\bcompare\b|\bdesign\b|\bhow would you\b|\bwalk me through\b|\?.*\?/i.test(t);
const q = (a, p) => a[Math.min(a.length - 1, Math.floor(p * a.length))];
function report(name, items, keyOf) {
  const by = {};
  for (const it of items) (by[keyOf(it)] ||= []).push(it);
  for (const [k, arr] of Object.entries(by)) {
    const w = arr.map((x) => wc(x.q ?? x.question)).sort((a, b) => a - b);
    const gated = arr.filter((x) => wc(x.q ?? x.question) <= 12 && !multi(x.q ?? x.question));
    console.log(name, k.padEnd(14), 'n', String(arr.length).padStart(2), 'words p50', q(w, .5), 'min', w[0], 'max', w[w.length - 1], '| short&single (<=12, no multi marker):', gated.length, gated.map((x) => x.id).join(','));
  }
}
report('live40', LIVE40, (x) => `${x.route}/${x.class}`);
console.log('live40 misrouted r1:', LIVE40.filter((x) => ['RH04', 'RH05', 'RH07', 'RH08'].includes(x.id)).map((x) => `${x.id} [${wc(x.q)}w] ${x.q}`).join(' || '));
console.log('scenario50 keys of first item:', Object.keys(S50[0]).join(','));
report('s50', S50, (x) => `${x.level ?? '-'}/${x.class ?? x.kind ?? '-'}`);
