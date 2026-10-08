// Writes five synthetic debug-log fixtures for h40d-knowledge-lines.mjs (rule 1(g)), beside this file. Each is a
// startup block and 20 dispatch windows in the app's line shape (ISO stamp, level, tag), with no question text:
//   ok-20.log            ENABLED at start, every window classified                 -> OK
//   missing-1-of-20.log  one window without the line (19 of 20 = 95%)               -> OK (the boundary: not fewer than 95%)
//   missing-3-of-20.log  three windows without the line (17 of 20 = 85%)            -> VOID
//   disabled-inside.log  ENABLED at start, a DISABLED line inside window 5          -> VOID
//   no-enabled.log       no ENABLED line at all (the key false or absent at start)  -> VOID
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const t0 = Date.parse('2026-10-02T10:30:00.000Z');
const iso = (ms) => new Date(t0 + ms).toISOString();
const build = ({ enabled = true, missing = [], disabledIn = null }) => {
    const out = [];
    out.push(`${iso(0)} [LOG] [SettingsManager] Settings loaded`);
    if (enabled) {
        out.push(`${iso(10)} [LOG] [KnowledgeOrchestrator] Knowledge mode ENABLED`);
        out.push(`${iso(11)} [LOG] [AppState] Knowledge mode restored from settings`);
    }
    out.push(`${iso(20)} [LOG] [Main] verbal hedge: on trigger=5000ms`);
    for (let w = 1; w <= 20; w++) {
        const base = 60000 * w;
        out.push(`${iso(base)} [LOG] [Main] dispatch: answer id=Q${w}`);
        if (disabledIn === w) out.push(`${iso(base + 5)} [LOG] [KnowledgeOrchestrator] Knowledge mode DISABLED`);
        if (!missing.includes(w)) out.push(`${iso(base + 30)} [LOG] [KnowledgeOrchestrator] Intent classified: technical`);
        out.push(`${iso(base + 600)} [LOG] [LLMHelper] verbal hedge: front=gemini-3.5-flash-lite back=gemini-3.1-flash-lite`);
        out.push(`${iso(base + 4000)} [LOG] [LLMHelper] verbal hedge: won by gemini-3.5-flash-lite at 3400ms; other=pending`);
    }
    return out.join('\n') + '\n';
};
const fixtures = {
    'ok-20.log': build({}),
    'missing-1-of-20.log': build({ missing: [1] }),
    'missing-3-of-20.log': build({ missing: [1, 7, 13] }),
    'disabled-inside.log': build({ disabledIn: 5 }),
    'no-enabled.log': build({ enabled: false }),
};
for (const [name, body] of Object.entries(fixtures)) fs.writeFileSync(path.join(HERE, name), body);
console.log(`wrote ${Object.keys(fixtures).join(', ')} in ${HERE}`);
