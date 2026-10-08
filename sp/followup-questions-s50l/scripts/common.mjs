// Shared constants and the frozen-material loader for the earlier-question context replay
// (followup-context/PREREGISTER-followup-questions.md). No side effects on import.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
export const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
export const CONTEXT = `${SP}/followup-context`;
// FQ_OUT_DIR: only for the synthetic end-to-end check (e2e-synthetic.mjs); the real run leaves it unset.
export const OUT_DIR = process.env.FQ_OUT_DIR ?? `${SP}/followup-questions-s50l`;
export const BLIND_DIR = `${OUT_DIR}/blind`;
export const RUN_DIR = `${MAIN}/electron/test/golden/interview60.runs/2026-09-21T08-22-34-s50l`;
// §2's recorded hashes: the material and the reference implementation.
const GATED = `${CONTEXT}/s50l-gated.json`;
const GATED_SHA = 'bfbf1e24ddd4a6a53173f0cc2ce119a851e6d30e41ef9cc314967b51793d889b';   // recorded 2026-10-02 by make-fq-s50l.mjs, BEFORE any s50l call
const REF = `${CONTEXT}/earlierQuestions.ref.mjs`;
const REF_SHA = '0459f578e47706424df0c41684a46c041fa52109923c1eb25df1c484d0dda256';
// §4: h40c PASSED (2026-09-29), so the hedge is the default and its front leg is 3.5-lite at thinking HIGH.
export const MODEL = 'gemini-3.5-flash-lite';
export const THINKING = 'HIGH';
// The walk order: §2's seven roster items, §3's six callbacks, §3b's three dropped-parent cases.
export const IDS = ['S1Q04F', 'S1Q06F', 'S1Q08', 'S2Q05F', 'S2Q08', 'S2Q08F', 'S2Q09F', 'C2', 'C3', 'C4', 'C5', 'D1', 'D2', 'D3'];   // s50l gate list + the callbacks A1 keeps + the dropped-parent cases (none refused)
export const REPS = [1, 2, 3];
export const ARMS = ['A', 'B'];
export const GRADERS = ['g1', 'g2'];   // §5: two independent Opus graders per blind file
export const PER_FILE = 4;             // §1: 4 files of 4 items
export const fileFor = (arm, rep) => path.join(OUT_DIR, `interview60.answers.${MODEL}_fquestions-${arm}-r${rep}.json`);
export const sha = (b) => createHash('sha256').update(b).digest('hex');

/** The frozen material, refused unless every recorded hash matches and every arm B is exactly
 *  the reference insertBlock(userA, block). Returns { G, ref }. */
export async function loadGated() {
    const bytes = fs.readFileSync(GATED);
    if (sha(bytes) !== GATED_SHA) throw new Error(`${GATED} sha256 ${sha(bytes)} is not the pre-registered ${GATED_SHA}`);
    if (sha(fs.readFileSync(REF)) !== REF_SHA) throw new Error(`${REF} is not the pre-registered reference (sha256 ${REF_SHA})`);
    const ref = await import(pathToFileURL(REF).href);
    const G = JSON.parse(bytes.toString('utf8'));
    const keys = Object.keys(G);
    if (keys.length !== IDS.length || IDS.some((id) => !G[id])) throw new Error(`s50l-gated.json holds [${keys.join(',')}], not the 14 recorded ids`);
    for (const id of IDS) {
        const o = G[id];
        if (!o.system || !o.current || !o.block || !o.userA) throw new Error(`${id}: an empty field in the frozen material`);
        if (ref.insertBlock(o.userA, o.block) !== o.userB) throw new Error(`${id}: userB is not insertBlock(userA, block)`);
        if (!['roster', 'callback', 'dropped'].includes(o.kind)) throw new Error(`${id}: unknown kind ${o.kind}`);
    }
    return { G, ref };
}
