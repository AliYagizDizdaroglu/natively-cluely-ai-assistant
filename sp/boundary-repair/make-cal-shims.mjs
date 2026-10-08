// Throwaway (2026-09-29): CommonJS copies of rule-v2/v3 behind the built module's interface (PLAN.md
// Task 1: createBoundaryRepair().onTranscript(text, isFinal, atMs) -> { text, restored: string[] | null }),
// to calibrate compare-impl.mjs and guard-br1.mjs: v3 must read EQUIVALENT / pass, v2 must not.
import fs from 'node:fs';
fs.mkdirSync(new URL('./cal/', import.meta.url), { recursive: true });
for (const v of ['v2', 'v3']) {
    const src = fs.readFileSync(new URL(`./rule-${v}.mjs`, import.meta.url), 'utf8')
        .replace(/^export const /gm, 'const ').replace(/^export function /gm, 'function ');
    const shim = `${src}
function createBoundaryRepair() {
    const r = createRepair();
    return { onTranscript(t, f, a) { const o = r.onTranscript(t, f, a); return { text: o.text, restored: o.restored ?? null }; } };
}
module.exports = { createBoundaryRepair };
`;
    fs.writeFileSync(new URL(`./cal/rule-${v}.cjs`, import.meta.url), shim);
    console.log(`wrote cal/rule-${v}.cjs`);
}
