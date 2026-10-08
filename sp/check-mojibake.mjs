// Throwaway: report encoding health of the replay documents (stage and MAIN copies).
import fs from 'node:fs';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/stage/electron/test/golden/passes';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/passes';
for (const dir of [SP, MAIN]) {
    for (const f of ['PREREGISTER-followup-replay.md', '2026-09-26-followup-replay-result.md', 'PREREGISTER-h40c.md', '2026-09-26-h40b-result.md']) {
        const p = `${dir}/${f}`;
        if (!fs.existsSync(p)) { console.log(`${dir === SP ? 'stage' : 'MAIN '} ${f}: absent`); continue; }
        const b = fs.readFileSync(p);
        const s = b.toString('utf8');
        const moj = (s.match(/Ã|â€|Â/g) || []).length;
        const dash = (s.match(/—/g) || []).length;
        console.log(`${dir === SP ? 'stage' : 'MAIN '} ${f}: bytes ${b.length} bom ${b[0] === 0xef} cr ${b.includes(13)} mojibake ${moj} emdash ${dash} head ${JSON.stringify(s.slice(0, 50))}`);
    }
}
