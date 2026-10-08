// Builds followup-questions-s50l/scripts/ for the ONE pooled re-run (PREREGISTER-followup-questions.md §7) from
// Thursday's followup-questions/scripts/ by exact replacements, and refuses unless each anchor matches once:
//   common.mjs  OUT_DIR -> followup-questions-s50l; RUN_DIR -> s50l; material -> s50l-gated.json with its sha256
//               recorded HERE before any s50l call; IDS -> s50l's gate list (the same 7 roster ids) + the 4 callbacks
//               amendment A1 keeps (C2 C3 C4 C5); file count follows (PER_FILE 4 -> 3 files).
//   run.mjs     the filter chain is loaded from the PRE-cue dist snapshot (main-precue-73d7f01, filter sha
//               d8fee6ca0170 = Thursday's), never from MAIN's cue-era dist; the material line names s50l.
//   blind.mjs   the seed label carries s50l, so the shuffles differ from Thursday's.
// Everything else (model row 3.5-lite HIGH, request shape, interleaving, retries, record fields) is unchanged.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const SP = new URL('.', import.meta.url);
const FROM = new URL('followup-questions/scripts/', SP), TO = new URL('followup-questions-s50l/scripts/', SP);
const gatedSha = createHash('sha256').update(fs.readFileSync(new URL('followup-context/s50l-gated.json', SP))).digest('hex');
const G = JSON.parse(fs.readFileSync(new URL('followup-context/s50l-gated.json', SP), 'utf8'));
const ids = Object.keys(G);
const roster = ids.filter((k) => G[k].kind === 'roster'), callbacks = ids.filter((k) => G[k].kind === 'callback'), dropped = ids.filter((k) => G[k].kind === 'dropped');
if (roster.join(',') !== 'S1Q04F,S1Q06F,S1Q08,S2Q05F,S2Q08,S2Q08F,S2Q09F' || callbacks.join(',') !== 'C2,C3,C4,C5' || dropped.join(',') !== 'D1,D2,D3' || ids.length !== 14) { console.log(`REFUSED: s50l-gated.json holds ${ids.join(',')}`); process.exit(2); }
const edits = {
    'common.mjs': [
        ["export const OUT_DIR = process.env.FQ_OUT_DIR ?? `${SP}/followup-questions`;", "export const OUT_DIR = process.env.FQ_OUT_DIR ?? `${SP}/followup-questions-s50l`;"],
        ["export const RUN_DIR = `${MAIN}/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m`;", "export const RUN_DIR = `${MAIN}/electron/test/golden/interview60.runs/2026-09-21T08-22-34-s50l`;"],
        ["const GATED = `${CONTEXT}/s50m-gated.json`;", "const GATED = `${CONTEXT}/s50l-gated.json`;"],
        ["const GATED_SHA = '1aa4b3a57eea2062357b4e80b57a914ffb2303772ec2a3273390f2b2382b70b5';", `const GATED_SHA = '${gatedSha}';   // recorded 2026-10-02 by make-fq-s50l.mjs, BEFORE any s50l call`],
        ["export const IDS = ['S1Q04F', 'S1Q06F', 'S1Q08', 'S2Q05F', 'S2Q08', 'S2Q08F', 'S2Q09F', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'D1', 'D2', 'D3'];", "export const IDS = ['S1Q04F', 'S1Q06F', 'S1Q08', 'S2Q05F', 'S2Q08', 'S2Q08F', 'S2Q09F', 'C2', 'C3', 'C4', 'C5', 'D1', 'D2', 'D3'];   // s50l gate list + the callbacks A1 keeps + the dropped-parent cases (none refused)"],
        ["if (keys.length !== IDS.length || IDS.some((id) => !G[id])) throw new Error(`s50m-gated.json holds [${keys.join(',')}], not the 16 pre-registered ids`);", "if (keys.length !== IDS.length || IDS.some((id) => !G[id])) throw new Error(`s50l-gated.json holds [${keys.join(',')}], not the 14 recorded ids`);"],
    ],
    'followup-questions-run.mjs': [
        ["const FILTER_JS = path.join(MAIN, 'dist-electron/electron/llm/verbalStreamFilter.js');", "// The pooled re-run filters with Thursday's bytes: the PRE-cue dist snapshot (MAIN's dist now carries cue mode).\nconst FILTER_JS = path.join(path.dirname(OUT_DIR), 'dist-snapshots/main-precue-73d7f01/dist-electron/electron/llm/verbalStreamFilter.js');"],
        ["console.log(`material s50m-gated.json + earlierQuestions.ref.mjs: pre-registered hashes OK; filter ${path.relative(MAIN, FILTER_JS)} sha256 ${sha(fs.readFileSync(FILTER_JS)).slice(0, 12)}`);", "console.log(`material s50l-gated.json (recorded hash) + earlierQuestions.ref.mjs (pre-registered hash) OK; filter ${FILTER_JS} sha256 ${sha(fs.readFileSync(FILTER_JS)).slice(0, 12)} (must be d8fee6ca0170)`);\nif (sha(fs.readFileSync(FILTER_JS)).slice(0, 12) !== 'd8fee6ca0170') { console.log('REFUSED: the filter is not Thursday\\'s pre-cue chain'); process.exit(2); }"],
    ],
    'followup-questions-blind.mjs': [
        ["perItem[id] = shuffle(perItem[id], rng(`blind:followup-questions:${id}`));", "perItem[id] = shuffle(perItem[id], rng(`blind:followup-questions-s50l:${id}`));"],
    ],
};
fs.mkdirSync(TO, { recursive: true });
for (const f of fs.readdirSync(FROM)) {
    let s = fs.readFileSync(new URL(f, FROM), 'utf8');
    for (const [a, b] of edits[f] ?? []) {
        const n = s.split(a).length - 1;
        if (n !== 1) { console.log(`REFUSED: ${f}: anchor found ${n} times: ${a.slice(0, 80)}`); process.exit(2); }
        s = s.replace(a, b);
    }
    fs.writeFileSync(new URL(f, TO), s);
}
console.log(`wrote followup-questions-s50l/scripts/ (${fs.readdirSync(TO).length} files); s50l-gated.json sha256 ${gatedSha}`);
