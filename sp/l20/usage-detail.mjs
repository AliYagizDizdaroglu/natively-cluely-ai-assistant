// Throwaway: the full usageMetadata 3.8 Live returned in the prompt/audio A/B sessions that answered — modality
// breakdown and any cached-token count (would a re-billed context be discounted?).
import fs from 'node:fs';
const H = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/l20/health';
for (const f of fs.readdirSync(H).filter((f) => /^(prompt|audio)-ab-.*\.json$/.test(f))) {
    const J = JSON.parse(fs.readFileSync(`${H}/${f}`, 'utf8'));
    for (const r of J.results) if (r.usage?.length) {
        console.log(`${f.slice(0, 9)} ${r.id} ${r.arm}: ${r.usage.length} usage message(s)`);
        for (const u of r.usage) console.log(`  ${JSON.stringify(u)}`);
    }
}
