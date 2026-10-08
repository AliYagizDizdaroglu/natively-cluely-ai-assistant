// node mut.mjs <name> : applies the named mutation to the MIRROR (never MAIN), runs its test file, restores.
import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
const SPR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const R = path.join(SPR, 'mirror');
const VITEST = path.join(R, 'node_modules', 'vitest', 'vitest.mjs');
const HEADDIR = path.join(SPR, 'head');
const MUTS = {
  baseline: { edits: [], test: ['electron/LLMHelper.verbalHedge.test.ts', 'electron/llm/followUpParent.test.ts', 'electron/test/golden/interview60.pass-record.test.ts', 'electron/LLMHelper.geminiThinking.test.ts', 'electron/LLMHelper.verbalPrimary.test.ts'] },
  // implementer's M1 mutation 1
  'm1-both-empty-throws': { edits: [['electron/LLMHelper.ts', 'return;   // both empty: nothing to say, as today', "throw new Error('rev: both empty');"]], test: ['electron/LLMHelper.verbalHedge.test.ts'] },
  // implementer's M1 mutation 2
  'm1-front-empty-no-back': { edits: [['electron/LLMHelper.ts', '    const back = start(BACK);', "    if (reason === 'front-empty') return;\n    const back = start(BACK);"]], test: ['electron/LLMHelper.verbalHedge.test.ts'] },
  // mine: an empty front is treated as a trigger (front kept racing) — label/other would still say empty? reason changes
  'm1-mine-empty-reason-mislabel': { edits: [['electron/LLMHelper.ts', ": frontFirst.kind === 'error' ? 'front-error' : 'front-empty';", ": frontFirst.kind === 'error' ? 'front-error' : 'trigger';"]], test: ['electron/LLMHelper.verbalHedge.test.ts'] },
  // mine: the empty loser is aborted/labelled aborted instead of empty
  'm1-mine-empty-loser-aborted': { edits: [['electron/LLMHelper.ts', ": loser.settled?.kind === 'empty' ? 'empty' : 'aborted';", ": 'aborted';"]], test: ['electron/LLMHelper.verbalHedge.test.ts'] },
  // mine: both-empty warn line drops the back's state
  'm1-mine-both-empty-silent': { edits: [['electron/LLMHelper.ts', 'console.warn(`[LLMHelper] verbal hedge: no answer - front ${f.kind}, back ${b.kind}`);', ''], ], test: ['electron/LLMHelper.verbalHedge.test.ts'] },
  // implementer's M4 mutation (swallow the throw)
  'm4-swallow': { edits: [['electron/llm/followUpParent.ts', "    return followUpParentEnabled(env) ? 'follow-up parent: on' : 'follow-up parent: off';", "    try { return followUpParentEnabled(env) ? 'follow-up parent: on' : 'follow-up parent: off'; } catch { return 'follow-up parent: off'; }"]], test: ['electron/llm/followUpParent.test.ts'] },
  // mine: on/off swapped for '0'
  'm4-mine-zero-on': { edits: [['electron/llm/followUpParent.ts', "    return followUpParentEnabled(env) ? 'follow-up parent: on' : 'follow-up parent: off';", "    return (followUpParentEnabled(env) || env[FOLLOWUP_PARENT_ENV] === '0') ? 'follow-up parent: on' : 'follow-up parent: off';"]], test: ['electron/llm/followUpParent.test.ts'] },
  // implementer's M6 mutation: drop the null guard
  'm6-no-null-guard': { edits: [['electron/test/golden/interview60.pass-record.mjs', '    if (t.verbalHedge != null) out.push(', '    out.push(']], test: ['electron/test/golden/interview60.pass-record.test.ts'] },
  // mine: the collectPass parse never matches (regex typo) — do the tests notice?
  'm6-mine-parse-broken': { edits: [['electron/test/golden/interview60.pass-record.mjs', "/\\[Main\\] verbal hedge: (on trigger=\\d+ms|off)/g", "/\\[Main\\] verbal-hedge: (on trigger=\\d+ms|off)/g"]], test: ['electron/test/golden/interview60.pass-record.test.ts'] },
  // mine: the answers row ignores the hedge
  'm6-mine-label-ignored': { edits: [['electron/test/golden/interview60.pass-record.mjs', "t.verbalHedge?.startsWith('on') ? 'hedge (", "false ? 'hedge ("]], test: ['electron/test/golden/interview60.pass-record.test.ts'] },
  // round 1: the reviewer's regex mutation, now in verbalHedgeFromLog
  'r1-parse-broken': { edits: [['electron/test/golden/interview60.pass-record.mjs', "/\\[Main\\] verbal hedge: (on trigger=\\d+ms|off)/g", "/\\[Main\\] verbal-hedge: (on trigger=\\d+ms|off)/g"]], test: ['electron/test/golden/interview60.pass-record.test.ts'] },
  // round 1 (mine): the trigger group drops the unit — parse returns 'on trigger=5000' not '...ms'
  'r1-parse-on-only': { edits: [['electron/test/golden/interview60.pass-record.mjs', "/\\[Main\\] verbal hedge: (on trigger=\\d+ms|off)/g", "/\\[Main\\] verbal hedge: (off)/g"]], test: ['electron/test/golden/interview60.pass-record.test.ts'] },
  // round 1: collectPass stops calling the helper
  'r1-collect-bypass': { edits: [['electron/test/golden/interview60.pass-record.mjs', 'verbalHedge: verbalHedgeFromLog(dbg),', 'verbalHedge: null,']], test: ['electron/test/golden/interview60.pass-record.test.ts'] },
  // round 1: the lite condition dropped (Minor 3 reverted)
  'r1-lite-check-dropped': { edits: [['electron/test/golden/interview60.pass-record.mjs', "const hedgeEngaged = t.verbalHedge?.startsWith('on') && (t.answerModel === 'gemini-3.1-flash-lite' || t.answerModel === 'gemini-3.5-flash-lite');", "const hedgeEngaged = t.verbalHedge?.startsWith('on');"]], test: ['electron/test/golden/interview60.pass-record.test.ts'] },
  // round 1 (mine): only 3.1-lite counts as a lite (3.5-lite primary would lose the hedge label)
  'r1-lite-31-only': { edits: [['electron/test/golden/interview60.pass-record.mjs', " || t.answerModel === 'gemini-3.5-flash-lite');", ");"]], test: ['electron/test/golden/interview60.pass-record.test.ts'] },
  // M2 calibration: HEAD versions of the two hygiene files, run with the hedge env set
  'm2-head-files': { copyHead: ['electron/LLMHelper.geminiThinking.test.ts', 'electron/LLMHelper.verbalPrimary.test.ts'], edits: [], env: { NATIVELY_VERBAL_HEDGE: '1' }, test: ['electron/LLMHelper.geminiThinking.test.ts', 'electron/LLMHelper.verbalPrimary.test.ts'] },
  'm2-new-files-env': { edits: [], env: { NATIVELY_VERBAL_HEDGE: '1', NATIVELY_VERBAL_HEDGE_TRIGGER_MS: '1' }, test: ['electron/LLMHelper.geminiThinking.test.ts', 'electron/LLMHelper.verbalPrimary.test.ts'] },
};
const name = process.argv[2]; const mu = MUTS[name]; if (!mu) throw new Error('unknown mutation ' + name);
const saved = new Map();
const touch = (f) => { if (!saved.has(f)) saved.set(f, fs.readFileSync(path.join(R, f))); };
try {
  for (const f of mu.copyHead ?? []) { touch(f); fs.copyFileSync(path.join(HEADDIR, f), path.join(R, f)); }
  for (const [f, from, to] of mu.edits) {
    touch(f);
    const p = path.join(R, f); const t = fs.readFileSync(p, 'utf8');
    const k = t.split(from).length - 1; if (k !== 1) throw new Error(`${name}: '${from}' found ${k} times in ${f}`);
    fs.writeFileSync(p, t.replace(from, to));
  }
  const env = { ...process.env }; for (const k of Object.keys(env)) if (k.startsWith('NATIVELY_')) delete env[k];
  Object.assign(env, mu.env ?? {}, { NO_COLOR: '1', FORCE_COLOR: '0' });
  const r = spawnSync(process.execPath, [VITEST, 'run', '--root', R, '--config', path.join(R, 'vitest.config.ts'), ...mu.test], { cwd: R, env, encoding: 'utf8' });
  const out = (r.stdout + r.stderr).split('\n').filter((l) => !/^stdout|^stderr/.test(l) && /Test Files|Tests |[✓❯×]|→|Error:/.test(l)).map((l) => l.slice(0, 220));
  console.log(`=== ${name} (exit ${r.status})`); console.log(out.join('\n'));
} finally {
  for (const [f, buf] of saved) fs.writeFileSync(path.join(R, f), buf);
}
