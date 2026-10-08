// Three-arm comparison + unattended flight: answers --model, judge --answers,
// the Live probe promoted into the harness. Every anchor must match exactly once.
// usage: node patch-flight.mjs <repo-root> <scratch-live-api-probe.cjs>
import fs from 'node:fs';
import path from 'node:path';
const [root, scratchProbe] = process.argv.slice(2);
const NL = '\n';
const patch = (file, edits) => {
    const p = path.join(root, file);
    let s = fs.readFileSync(p, 'utf8');
    if (s.includes('\r')) throw new Error(`${file} is CRLF; adjust`);
    for (const [a, b, label] of edits) {
        const n = s.split(a).length - 1;
        if (n !== 1) throw new Error(`${file} ${label}: matched ${n}`);
        s = s.replace(a, () => b);
        console.log(`ok ${file} ${label}`);
    }
    fs.writeFileSync(p, s);
};

// ── answers pass: --model, suffixed output, model recorded per item ──────────
patch('electron/test/golden/interview60.answers.mjs', [
    [' *   node electron/test/golden/interview60.answers.mjs' + NL,
     ' *   node electron/test/golden/interview60.answers.mjs' + NL +
     ' *   node electron/test/golden/interview60.answers.mjs --model gemma-4-31b-it   # another arm of the comparison → interview60.answers.<model>.json' + NL,
     'usage'],
    ["const MODEL = 'gemini-3.1-flash-lite';   // the app default (LLMHelper.ts GEMINI_FLASH_MODEL)" + NL +
     "const OUT = path.join(HERE, 'interview60.answers.json');",
     "const DEFAULT_MODEL = 'gemini-3.1-flash-lite';   // the app default (LLMHelper.ts GEMINI_FLASH_MODEL)" + NL +
     "// --model <id>: the same pass on another arm (same questions, prompt, filters) for the" + NL +
     "// model comparison; written beside, never over, the default arm's file the report reads." + NL +
     "const mi = process.argv.indexOf('--model');" + NL +
     "const MODEL = mi >= 0 && process.argv[mi + 1] ? process.argv[mi + 1] : DEFAULT_MODEL;" + NL +
     "const OUT = path.join(HERE, MODEL === DEFAULT_MODEL ? 'interview60.answers.json' : `interview60.answers.${MODEL}.json`);",
     'model + out'],
    ["        store[item.id] = { ...item, transientError: lastErr };",
     "        store[item.id] = { ...item, model: MODEL, transientError: lastErr };", 'transient records model'],
    ["        store[item.id] = { ...item, ...r, checks };",
     "        store[item.id] = { ...item, model: MODEL, ...r, checks };", 'answer records model'],
]);

// ── judge: --answers <file> grades an answers-pass arm into interview60.judge.<model>.json ──
patch('electron/test/golden/interview60.judge.mjs', [
    [' *   node electron/test/golden/interview60.judge.mjs <run-dir> --verdicts <run>/interview60.judge.verdicts.json',
     ' *   node electron/test/golden/interview60.judge.mjs <run-dir> --verdicts <run>/interview60.judge.verdicts.json' + NL +
     ' *' + NL +
     ' * --answers <file> takes an answer-only pass file (interview60.answers.mjs' + NL +
     ' * --model X) instead of the hour\'s log — the model comparison — and suffixes' + NL +
     ' * every file it writes with that model: interview60.judge.<model>.json,' + NL +
     ' * interview60.judge.pairs.<model>.json, interview60.judge.verdicts.<model>.json.',
     'header'],
    ['/** The gate\'s verdict from the three 0-2 scores. */',
     '/**' + NL +
     ' * Pairs from an answer-only pass file (interview60.answers.mjs --model X): the' + NL +
     ' * same questions answered outside the app, one arm of the model comparison.' + NL +
     ' * Items that ended in a transient error are left out, not scored — a 429 is' + NL +
     ' * not a model failure.' + NL +
     ' */' + NL +
     'export function pairsFromAnswers(store) {' + NL +
     '    return Object.values(store).filter((v) => v && typeof v === \'object\' && v.spoken).map((v) => ({' + NL +
     '        id: v.id, kind: \'spoken\', level: v.level ?? null, topic: v.topic ?? null, question: v.q, heard: v.q,' + NL +
     '        source: \'answers-pass\', verdict: \'n/a\', dispatchedAt: null, answer: v.spoken, model: v.model ?? null,' + NL +
     '    }));' + NL +
     '}' + NL + NL +
     '/** The gate\'s verdict from the three 0-2 scores. */',
     'pairsFromAnswers'],
    ["    const timeline = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8'));" + NL +
     "    const dbg = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8');" + NL +
     "    const pairs = pairAnswers(dbg, timeline).filter((p) => p.id !== '?');" + NL +
     "    const out = path.join(dir, 'interview60.judge.json');",
     "    const answersPath = opt('answers', null);" + NL +
     "    let pairs, tag = '';" + NL +
     "    if (answersPath) {" + NL +
     "        pairs = pairsFromAnswers(JSON.parse(fs.readFileSync(answersPath, 'utf8')));" + NL +
     "        const arm = pairs.find((p) => p.model)?.model;" + NL +
     "        if (!arm) { console.error(`${answersPath}: no model field on its items — re-run interview60.answers.mjs, which records the arm`); process.exit(2); }" + NL +
     "        tag = `.${arm}`;" + NL +
     "    } else {" + NL +
     "        const timeline = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8'));" + NL +
     "        const dbg = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8');" + NL +
     "        pairs = pairAnswers(dbg, timeline).filter((p) => p.id !== '?');" + NL +
     "    }" + NL +
     "    const out = path.join(dir, `interview60.judge${tag}.json`);",
     'pairs source'],
    ["        const pairsOut = path.join(dir, 'interview60.judge.pairs.json');",
     "        const pairsOut = path.join(dir, `interview60.judge.pairs${tag}.json`);", 'pairs out'],
    ["        console.log(`EXPORT  ${path.basename(dir)}  ${toGrade.length} delivered answers",
     "        console.log(`EXPORT  ${path.basename(dir)}  ${tag ? 'arm ' + tag.slice(1) + '   ' : ''}${toGrade.length} delivered answers", 'export line'],
    ["${path.join(dir, 'interview60.judge.verdicts.json')}",
     "${path.join(dir, `interview60.judge.verdicts${tag}.json`)}", 'verdicts hint'],
    ["        const judged = mergeVerdicts(pairs, JSON.parse(fs.readFileSync(verdictsPath, 'utf8')), opt('model', JUDGE_MODEL));",
     "        const judged = mergeVerdicts(pairs, JSON.parse(fs.readFileSync(verdictsPath, 'utf8')), opt('model', JUDGE_MODEL));" + NL +
     "        if (tag) judged.arm = tag.slice(1);", 'arm on merged file'],
]);

// ── judge test: pairsFromAnswers ─────────────────────────────────────────────
patch('electron/test/golden/interview60.judge.test.ts', [
    ["import { mergeVerdicts, pairAnswers, summarizeVerdicts, verdictOf } from './interview60.judge.mjs';",
     "import { mergeVerdicts, pairAnswers, pairsFromAnswers, summarizeVerdicts, verdictOf } from './interview60.judge.mjs';", 'import'],
]);
{
    const p = path.join(root, 'electron/test/golden/interview60.judge.test.ts');
    const block = [
        '',
        "describe('pairsFromAnswers (an answer-only pass arm, for the model comparison)', () => {",
        "    it('maps answered items to spoken pairs carrying the arm model and leaves transient errors out', () => {",
        "        const store = {",
        "            W01: { id: 'W01', level: 'easy', topic: 'Docker', q: 'What is a Docker image?', model: 'gemma-4-31b-it', spoken: 'An image is a read-only template.', words: 6, ttft: 900 },",
        "            W02: { id: 'W02', level: 'easy', topic: 'Docker', q: 'Why do layers matter?', model: 'gemma-4-31b-it', transientError: 'HTTP 429' },",
        "        };",
        "        const pairs = pairsFromAnswers(store);",
        "        expect(pairs).toHaveLength(1);",
        "        expect(pairs[0]).toMatchObject({ id: 'W01', kind: 'spoken', question: 'What is a Docker image?', heard: 'What is a Docker image?', answer: 'An image is a read-only template.', model: 'gemma-4-31b-it', source: 'answers-pass' });",
        "        // A transient item is absent from the pairs, so the merge never scores it as wrong.",
        "        expect(Object.keys(mergeVerdicts(pairs, { W01: { correctness: 2, on_topic: 2, delivery: 2, reason: 'ok' } }).items)).toEqual(['W01']);",
        "    });",
        "});",
        '',
    ].join(NL);
    fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/\n$/, '') + NL + block);
    console.log('ok judge test appended');
}

// ── the Live probe, promoted from the scratchpad into the harness ────────────
{
    let s = fs.readFileSync(scratchProbe, 'utf8').replace(/\r\n/g, NL);
    const cut = s.indexOf('const NM = ');
    if (cut < 0) throw new Error('probe: NM anchor');
    s = s.slice(cut);
    const reqEnd = "require(NM + '/@google/genai');";
    const i = s.indexOf(reqEnd);
    if (i < 0) throw new Error('probe: require anchor');
    s = "const { GoogleGenAI } = require('@google/genai');" + s.slice(i + reqEnd.length);
    const wavRe = /fs\.readFileSync\('[^']*probe-continuous\.wav'\)/;
    if (!wavRe.test(s)) throw new Error('probe: wav anchor');
    s = s.replace(wavRe, "fs.readFileSync(require('path').join(__dirname, 'probe-continuous.wav'))");
    const once = (a, b, label) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error(`probe ${label}: matched ${n}`); s = s.replace(a, () => b); };
    once('  let audioMsgs = 0;', '  let audioMsgs = 0, toolCalls = 0;', 'counters');
    once("          log('TOOLCALL ' + JSON.stringify(", "          toolCalls++; log('TOOLCALL ' + JSON.stringify(", 'toolcall count');
    once("  log('closed');" + NL + "  process.exit(0);",
         "  log(`LIVE-PROBE ${model}: ${toolCalls ? 'TOOLCALL seen — the Live ear generates' : 'SILENT — connected and transcribed but never called the tool'}`);" + NL +
         "  process.exit(toolCalls ? 0 : 3);", 'exit codes');
    const header = [
        '/**',
        " * Live-ear probe: does the Live model still call handle_question for the",
        " * harness's 34 s probe clip, with the app's exact session config (AUDIO",
        " * modality, the listener prompt, the tool, input transcription, resumption,",
        " * context compression)? gemini-3.1-flash-live-preview has been observed to",
        " * exhaust a daily allowance SILENTLY — it connects and transcribes but never",
        " * generates — which the app's own preflight only discovers after a build and",
        " * a launch. One minute, one session, a yes/no before anything is spent.",
        ' *',
        " *   node --env-file=.env electron/test/golden/interview60.live-probe.cjs",
        " *   NATIVELY_LIVE_MODEL=<id> overrides the model, exactly as it does in the app.",
        ' *',
        " * Exit 0: a tool call was seen. Exit 3: connected but silent. Exit 1: could",
        " * not connect (FATAL line says why). Exit 2: no Gemini key in the env.",
        " * interview60.flight.mjs turns 0/3 into the model for the hour.",
        ' */',
        '',
    ].join(NL);
    fs.writeFileSync(path.join(root, 'electron/test/golden/interview60.live-probe.cjs'), header + s);
    console.log('ok live-probe written');
}
