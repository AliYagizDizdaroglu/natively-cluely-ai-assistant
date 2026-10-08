// THROWAWAY: what does this ElevenLabs key actually allow?
//
// Two things decide the accent plan:
//   1. QUOTA — free tier is ~10k characters/month. The 100 scenario50 questions are far
//      more than that, so the plan has to be sized to what is left, not to what is wanted.
//   2. CLONING — instant voice cloning is a paid feature. If it is unavailable, the route
//      is the PREMADE voice library, which already contains non-native English accents.
//      That is arguably better anyway: no third party's recorded voice is involved.
// Reads the key in-process; prints status and names only, never the value.
import fs from 'node:fs';

const KEY = fs.readFileSync('C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.env', 'utf8')
    .match(/^ELEVENLABS_API_KEY=(.+)$/m)[1].trim();
const scrub = (s) => s.split(KEY).join('<REDACTED>');
const H = { 'xi-api-key': KEY };

async function get(url) {
    const r = await fetch(url, { headers: H });
    const body = await r.text();
    if (!r.ok) return { ok: false, status: r.status, body: scrub(body).slice(0, 200) };
    return { ok: true, json: JSON.parse(body) };
}

const sub = await get('https://api.elevenlabs.io/v1/user/subscription');
if (!sub.ok) { console.log(`subscription: HTTP ${sub.status} ${sub.body}`); process.exit(1); }
const s = sub.json;
const left = (s.character_limit ?? 0) - (s.character_count ?? 0);
console.log(`tier           ${s.tier}`);
console.log(`characters     ${s.character_count} used of ${s.character_limit}  ->  ${left} left`);
console.log(`resets         ${s.next_character_count_reset_unix ? new Date(s.next_character_count_reset_unix * 1000).toISOString() : 'n/a'}`);
console.log(`voice cloning  instant=${s.can_use_instant_voice_cloning}  professional=${s.can_use_professional_voice_cloning}`);
console.log(`voice slots    ${s.voice_slots_used ?? '?'} of ${s.voice_limit ?? '?'}`);

const v = await get('https://api.elevenlabs.io/v1/voices');
if (!v.ok) { console.log(`voices: HTTP ${v.status} ${v.body}`); process.exit(1); }
const voices = v.json.voices ?? [];
console.log(`\n${voices.length} voices available`);
const byAccent = new Map();
for (const x of voices) {
    const a = (x.labels?.accent || 'unlabelled').toLowerCase();
    if (!byAccent.has(a)) byAccent.set(a, []);
    byAccent.get(a).push(x.name);
}
console.log('accents present:');
for (const [a, names] of [...byAccent].sort()) console.log(`  ${a.padEnd(22)} ${names.slice(0, 4).join(', ')}${names.length > 4 ? ` (+${names.length - 4})` : ''}`);

// What matters for this test: an English voice whose accent is NOT American/British native.
const NON_NATIVE = /turkish|indian|italian|german|french|spanish|polish|swedish|dutch|arab|nigerian|african|slav|russian|portug|brazil|chinese|japanese|korean|filipino/i;
const cand = voices.filter((x) => NON_NATIVE.test(x.labels?.accent || '') || NON_NATIVE.test(x.labels?.description || '') || NON_NATIVE.test(x.name || ''));
console.log(`\nnon-native-English candidates: ${cand.length}`);
for (const c of cand.slice(0, 10)) console.log(`  ${c.name.padEnd(18)} accent=${c.labels?.accent || '?'}  id=${c.voice_id.slice(0, 8)}...`);
if (!cand.length) console.log('  none in the default set — the shared Voice Library would need to be searched');

// Sizing: how many scenario50 questions fit in the remaining quota?
const { SCENARIO50 } = await import('file:///C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/scenario50.questions.mjs');
const chars = SCENARIO50.map((q) => q.q.length).sort((a, b) => a - b);
const total = chars.reduce((a, b) => a + b, 0);
const median = chars[Math.floor(chars.length / 2)];
console.log(`\nscenario50: ${SCENARIO50.length} items, ${total} characters total, median ${median}`);
console.log(`=> the whole roster needs ${total} chars; ${left} remain, which covers about ${Math.floor(left / median)} items.`);
