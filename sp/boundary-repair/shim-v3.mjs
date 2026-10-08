// Calibration shim (2026-09-29): a module with the BUILT module's export shape (createBoundaryRepair with
// clear() and a speechFinal argument) but rule-v3's behaviour — clear() does nothing, speechFinal is
// ignored, the tolerant cut is v3's. check-v4-built.mjs --calibrate must report it NOT EQUIVALENT.
import { createRepair } from './rule-v3.mjs';
export function createBoundaryRepair() {
    const r = createRepair();
    return {
        clear() { },
        onTranscript(text, isFinal, atMs) { const o = r.onTranscript(text, isFinal, atMs); return { text: o.text, restored: o.restored ?? null }; },
    };
}
