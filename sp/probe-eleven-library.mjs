// THROWAWAY: two questions the new full-permission key can finally answer.
//   1. Does TTS work at all on this free tier, using a voice the account already OWNS?
//      (The old key hit 402 "Free users cannot use library voices via the API" on a
//      library voice id; an owned voice may be fine.)
//   2. Does the shared Voice Library contain NON-NATIVE English accents? The 21 default
//      voices are american/australian/british only, which is useless for this test.
// Quota is 10,000 characters for the month, so the TTS probe uses a 12-character string.
import fs from 'node:fs';
import path from 'node:path';

const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const SCRATCH = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, ''));
const KEY = fs.readFileSync(PROJ + '/.env', 'utf8').match(/^ELEVENLABS_API_KEY=(.+)$/m)[1].trim();
const scrub = (s) => s.split(KEY).join('<REDACTED>');
const H = { 'xi-api-key': KEY };

// ── 1. can we synthesise at all, with an OWNED voice? ──────────────────────
const vs = await fetch('https://api.elevenlabs.io/v1/voices', { headers: H }).then((r) => r.json());
const owned = vs.voices[0];
console.log(`owned voice used for the probe: ${owned.name} (${owned.labels?.accent})`);
const PROBE = 'Testing one.';   // 12 characters
const t = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${owned.voice_id}?output_format=pcm_24000`, {
    method: 'POST', headers: { ...H, 'content-type': 'application/json' },
    body: JSON.stringify({ text: PROBE, model_id: 'eleven_multilingual_v2' }),
});
if (t.ok) {
    const b = Buffer.from(await t.arrayBuffer());
    console.log(`TTS with an owned voice: HTTP 200 OK — ${b.length} bytes raw PCM (${(b.length / 48000).toFixed(1)}s)`);
} else {
    console.log(`TTS with an owned voice: HTTP ${t.status} ${scrub(await t.text()).replace(/\s+/g, ' ').slice(0, 200)}`);
}

// ── 2. does the shared library have non-native English accents? ────────────
const WANT = ['turkish', 'indian', 'italian', 'german', 'french', 'spanish', 'polish', 'dutch', 'swedish', 'russian', 'nigerian', 'brazilian', 'portuguese', 'arabic', 'chinese', 'japanese', 'korean', 'filipino', 'greek', 'romanian'];
const found = new Map();
for (const acc of WANT) {
    const u = `https://api.elevenlabs.io/v1/shared-voices?page_size=6&search=${encodeURIComponent(acc)}&language=en`;
    const r = await fetch(u, { headers: H });
    if (!r.ok) { console.log(`\nshared-voices search: HTTP ${r.status} ${scrub(await r.text()).replace(/\s+/g, ' ').slice(0, 160)}`); break; }
    const j = await r.json();
    for (const v of j.voices ?? []) {
        const a = (v.accent || '').toLowerCase();
        if (!a.includes(acc)) continue;
        if (!found.has(a)) found.set(a, []);
        if (found.get(a).length < 3) found.get(a).push({ name: v.name, id: v.voice_id, pub: v.public_owner_id, free: v.free_users_allowed });
    }
}
console.log(`\nnon-native English accents in the shared library: ${found.size}`);
for (const [acc, list] of [...found].sort()) {
    for (const v of list) console.log(`  ${acc.padEnd(12)} ${v.name.padEnd(22)} free_users_allowed=${v.free} id=${v.id.slice(0, 10)}...`);
}
const freeOk = [...found.values()].flat().filter((v) => v.free);
console.log(`\nof those, usable by a FREE account: ${freeOk.length}`);
if (freeOk.length) {
    console.log('  candidates to add to one of the 3 voice slots:');
    for (const v of freeOk.slice(0, 6)) console.log(`    ${v.name}  id=${v.id}  owner=${v.pub}`);
}
fs.writeFileSync(path.join(SCRATCH, 'eleven-library-out.json'), JSON.stringify([...found], null, 1));
