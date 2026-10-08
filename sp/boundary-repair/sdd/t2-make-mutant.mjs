// Throwaway (Task 2, Step 5 / rule 8): make the HOIST mutant from the WIRED staged file, exactly as the brief says:
//   1. delete `const boundaryRepair = createBoundaryRepair();` from connect()
//   2. add `private boundaryRepair = createBoundaryRepair();` to the class fields after `private sockNotOpenWrites = 0;`
//   3. call `this.boundaryRepair.onTranscript(...)` in the handler
// The wired staged file is only READ; the mutant goes to sdd/t2-mutant/ so the stage stays the exact wired version.
import fs from 'node:fs';
const SDD = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/boundary-repair/sdd';
const wired = fs.readFileSync(`${SDD}/../stage/electron/audio/DeepgramStreamingSTT.ts`, 'utf8');
const once = (hay, needle, what) => {
    const i = hay.indexOf(needle);
    if (i < 0 || hay.indexOf(needle, i + 1) >= 0) throw new Error(`${what}: anchor found ${i < 0 ? 0 : 'more than 1'} times`);
    return i;
};
let t = wired;
// 1. delete the per-socket const line
const constLine = '            const boundaryRepair = createBoundaryRepair();\n';
let i = once(t, constLine, 'per-socket const');
t = t.slice(0, i) + t.slice(i + constLine.length);
// 2. add the class field after sockNotOpenWrites
const fieldAnchor = '    private sockNotOpenWrites = 0;\n';
i = once(t, fieldAnchor, 'class field anchor') + fieldAnchor.length;
t = t.slice(0, i) + '    private boundaryRepair = createBoundaryRepair();\n' + t.slice(i);
// 3. the handler calls this.boundaryRepair
const callOld = 'const repaired = boundaryRepair.onTranscript(';
i = once(t, callOld, 'handler call');
t = t.slice(0, i) + 'const repaired = this.boundaryRepair.onTranscript(' + t.slice(i + callOld.length);
fs.mkdirSync(`${SDD}/t2-mutant`, { recursive: true });
fs.writeFileSync(`${SDD}/t2-mutant/DeepgramStreamingSTT.ts`, t);
console.log(`mutant written: ${t.length} chars (wired ${wired.length})`);
