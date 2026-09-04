/**
 * Judge pass over a 60-minute flight test: grades the answers the app actually
 * delivered during the hour for correctness, on-topic-ness and spoken delivery.
 *
 * Input is the run folder's own log: every `[Main] dispatch: answer` line is
 * paired with the `[Answer] full: <json>` line that follows it (SessionTracker
 * logs the whole answer once), and claimed to the scripted question by the
 * anchor's content-word overlap. The judge is Claude Opus 5 through the
 * official SDK; the key is read in-process from CLAUDE_API_KEY (or
 * ANTHROPIC_API_KEY) and never printed. Results are written per item to
 * <run>/interview60.judge.json as they arrive, so a rerun resumes.
 *
 *   node --env-file=.env electron/test/golden/interview60.judge.mjs <run-dir> [--effort high] [--concurrency 2] [--force]
 *
 * No key: --export writes <run>/interview60.judge.pairs.json (the pairs plus this rubric)
 * for an Opus subagent in Claude Code to grade into <run>/interview60.judge.verdicts.json,
 * then --verdicts <that file> writes the same judge file the gate reads:
 *   node electron/test/golden/interview60.judge.mjs <run-dir> --export
 *   node electron/test/golden/interview60.judge.mjs <run-dir> --verdicts <run>/interview60.judge.verdicts.json
 *
 * --answers <file> takes an answer-only pass file (interview60.answers.mjs
 * --model X) instead of the hour's log — the model comparison — and suffixes
 * every file it writes with that model: interview60.judge.<model>.json,
 * interview60.judge.pairs.<model>.json, interview60.judge.verdicts.<model>.json.
 *
 * Verdict rule (verdictOf): wrong when correctness or on_topic is 0;
 * acceptable when both are 2 and delivery is at least 1; weak otherwise. An
 * answer that was dispatched but never delivered is wrong — the candidate
 * heard nothing. Cue (screenshot) items are judged but excluded from the
 * gate's count: they are not spoken questions.
 *
 * Cost: about 52 calls of ~700 input and ~300 output tokens plus thinking;
 * at Opus 5 list prices ($5 / $25 per MTok) an hour grades for roughly $1-4
 * depending on effort. The script prints the measured usage at the end.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const JUDGE_MODEL = 'claude-opus-5';
export const ACCEPTABLE_FLOOR = 47; // of 52 spoken questions (90 %); wrong must be 0

const STOP = new Set(['what', 'when', 'where', 'which', 'would', 'could', 'should', 'this', 'that', 'with', 'from', 'your', 'about', 'have', 'does', 'into', 'than', 'them', 'they', 'were', 'will', 'been', 'there', 'their', 'some', 'more', 'most', 'also', 'just', 'like', 'over', 'make', 'used', 'using', 'each', 'many', 'much', 'very', 'tell', 'walk', 'through', 'give', 'explain', 'describe']);
const contentWords = (s) => (String(s).toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 3 && !STOP.has(w));
const overlap = (a, b) => {
    const A = new Set(contentWords(a)), B = new Set(contentWords(b));
    if (!A.size || !B.size) return 0;
    let n = 0; for (const w of A) if (B.has(w)) n++;
    return Math.max(n / A.size, n / B.size);
};

/**
 * Pair every answer dispatch in the debug log with the full answer text that
 * follows it (before the next dispatch, within 60 s) and claim it to the
 * scripted item whose window contains it with the best content-word overlap.
 * Returns dispatch-ordered pairs; `answer` is null when nothing was delivered.
 */
export function pairAnswers(debugLog, timeline) {
    const items = timeline.items.map((i) => ({ ...i, spokeEnd: i.playedAt + Math.round((i.clipSecs ?? 0) * 1000) }));
    const dispatches = [...debugLog.matchAll(/^(\S+) \[LOG\] \[Main\] dispatch: answer source=(live|whisper) anchor="((?:[^"\\]|\\.)*)" verdict=(\w+)/gm)]
        .map((m) => ({ at: Date.parse(m[1]), source: m[2], anchor: JSON.parse(`"${m[3]}"`), verdict: m[4] }));
    const fulls = [...debugLog.matchAll(/^(\S+) \[LOG\] \[Answer\] full: (".*")$/gm)]
        .map((m) => ({ at: Date.parse(m[1]), text: JSON.parse(m[2]) }));
    return dispatches.map((d, i) => {
        const end = Math.min(dispatches[i + 1]?.at ?? Infinity, d.at + 60_000);
        const full = fulls.find((f) => f.at >= d.at && f.at < end) ?? null;
        let best = null, bestOv = 0;
        for (const it of items) {
            if (d.at < it.playedAt - 2000 || d.at > it.spokeEnd + 60_000) continue;
            const ov = overlap(d.anchor, it.q);
            if (ov > bestOv || (ov === bestOv && best && it.playedAt > best.playedAt && it.playedAt <= d.at)) { best = it; bestOv = ov; }
        }
        // An anchor made only of stop words ("And when would you not?" — the tail of a
        // question STT split in two) overlaps nothing; it is claimed by time alone, the
        // latest item already playing when it was dispatched. Anchors WITH content words
        // that still overlap nothing stay unclaimed: those are answers to nobody.
        const byTime = items.filter((it) => it.playedAt <= d.at && d.at <= it.spokeEnd + 60_000).sort((a, b) => b.playedAt - a.playedAt)[0] ?? null;
        const item = best && bestOv >= 0.25 ? best : contentWords(d.anchor).length === 0 ? byTime : null;
        return {
            id: item?.id ?? '?', kind: item?.kind ?? 'unknown', level: item?.level ?? null, topic: item?.topic ?? null,
            question: item?.q ?? null, heard: d.anchor, source: d.source, verdict: d.verdict,
            dispatchedAt: new Date(d.at).toISOString(), answer: full?.text ?? null,
        };
    });
}

/**
 * Pairs from an answer-only pass file (interview60.answers.mjs --model X): the
 * same questions answered outside the app, one arm of the model comparison.
 * Items that ended in a transient error are left out, not scored — a 429 is
 * not a model failure.
 */
export function pairsFromAnswers(store) {
    return Object.values(store).filter((v) => v && typeof v === 'object' && v.spoken).map((v) => ({
        id: v.id, kind: 'spoken', level: v.level ?? null, topic: v.topic ?? null, question: v.q, heard: v.q,
        source: 'answers-pass', verdict: 'n/a', dispatchedAt: null, answer: v.spoken, model: v.model ?? null,
    }));
}

/** The gate's verdict from the three 0-2 scores. */
export function verdictOf({ correctness, on_topic, delivery }) {
    if (correctness === 0 || on_topic === 0) return 'wrong';
    if (correctness === 2 && on_topic === 2 && delivery >= 1) return 'acceptable';
    return 'weak';
}

/** Counts over spoken items only (cues are judged for information, not gated). */
export function summarizeVerdicts(judged) {
    const spoken = Object.values(judged.items ?? {}).filter((v) => v.kind === 'spoken');
    const count = (verdict) => spoken.filter((v) => v.verdict === verdict).length;
    return { model: judged.model ?? null, n: spoken.length, acceptable: count('acceptable'), weak: count('weak'), wrong: count('wrong'), errors: count('error') };
}

const SCORES = ['correctness', 'on_topic', 'delivery'];

/** Stable keys for the judge file: an item dispatched twice keeps both verdicts, under W01 and W01#2. */
export function keyPairs(pairs) {
    const seen = {};
    return pairs.map((p) => { seen[p.id] = (seen[p.id] ?? 0) + 1; return { key: seen[p.id] > 1 ? `${p.id}#${seen[p.id]}` : p.id, pair: p }; });
}

const baseOf = (pair) => ({ kind: pair.kind, question: pair.question, heard: pair.heard, source: pair.source, dispatchedAt: pair.dispatchedAt, answer: pair.answer });
const undelivered = (pair) => ({ ...baseOf(pair), correctness: 0, on_topic: 0, delivery: 0, verdict: 'wrong', reason: 'no answer was delivered' });

/**
 * The no-key route: verdicts graded outside this script (an Opus subagent in
 * Claude Code reading the --export file, same rubric) merged into the judge
 * file the gate reads. A missing or out-of-range verdict is an error, so a
 * half-graded file cannot pass the gate.
 */
export function mergeVerdicts(pairs, verdicts, model = JUDGE_MODEL) {
    /** @type {Record<string, Record<string, unknown>>} */
    const items = {};
    for (const { key, pair } of keyPairs(pairs)) {
        if (!pair.answer) { items[key] = undelivered(pair); continue; }
        const v = verdicts[key];
        if (!v) { items[key] = { ...baseOf(pair), verdict: 'error', reason: 'no verdict' }; continue; }
        const bad = SCORES.find((k) => ![0, 1, 2].includes(v[k]));
        if (bad) { items[key] = { ...baseOf(pair), verdict: 'error', reason: `verdict ${bad}=${v[bad]}` }; continue; }
        items[key] = { ...baseOf(pair), correctness: v.correctness, on_topic: v.on_topic, delivery: v.delivery, verdict: verdictOf(v), reason: String(v.reason ?? '') };
    }
    return { model, effort: null, items, usage: { input: 0, output: 0 } };
}

const RUBRIC = `You grade answers that an interview copilot generated for a candidate to say OUT LOUD, in real time, in a live technical interview (MLOps, cloud, Kubernetes, data engineering). You see the interviewer's scripted question, what the app actually heard, and the answer the candidate was given to read.

Score three things, each 0, 1 or 2:
- correctness: 0 = technically wrong, fabricated, or would embarrass the candidate; 1 = partly right, vague, or missing the key point; 2 = technically correct and shows real understanding.
- on_topic: 0 = answers a different question than the scripted one; 1 = partially addresses it or drifts; 2 = directly answers the question asked.
- delivery: 0 = unusable when spoken (markdown, bullet lists, code, "Time: O(n)" lines, offers like "would you like me to", questions back to the interviewer, or far too long); 1 = usable with small edits; 2 = a natural first-person spoken answer of roughly 40-80 words that an interviewer would accept.

Grade against the scripted question. If the app misheard and the answer fits what was heard but not what was asked, on_topic is 0 or 1. Reason in at most 25 words.`;

const OUTPUT_SCHEMA = {
    type: 'object',
    properties: {
        correctness: { type: 'integer', enum: [0, 1, 2] },
        on_topic: { type: 'integer', enum: [0, 1, 2] },
        delivery: { type: 'integer', enum: [0, 1, 2] },
        reason: { type: 'string' },
    },
    required: ['correctness', 'on_topic', 'delivery', 'reason'],
    additionalProperties: false,
};

async function judgeOne(client, pair, effort) {
    const user = `Interviewer's scripted question (${pair.level ?? '?'} / ${pair.topic ?? '?'}): ${pair.question}
What the app heard: ${pair.heard}

Answer given to the candidate:
"""
${pair.answer}
"""`;
    const res = await client.messages.create({
        model: JUDGE_MODEL,
        max_tokens: 8000,
        system: RUBRIC,
        output_config: { effort, format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
        messages: [{ role: 'user', content: user }],
    });
    if (res.stop_reason === 'refusal') throw new Error(`judge refused: ${res.stop_details?.category ?? 'unknown'}`);
    const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    const parsed = JSON.parse(text);
    for (const k of ['correctness', 'on_topic', 'delivery']) {
        if (![0, 1, 2].includes(parsed[k])) throw new Error(`judge returned ${k}=${parsed[k]}`);
    }
    return { ...parsed, usage: { input: res.usage.input_tokens, output: res.usage.output_tokens } };
}

function printSummary(judged, out) {
    const s = summarizeVerdicts(judged);
    const cost = (judged.usage.input * 5 + judged.usage.output * 25) / 1e6;
    console.log(`\nJUDGE SUMMARY  spoken ${s.n}: acceptable ${s.acceptable}, weak ${s.weak}, wrong ${s.wrong}, errors ${s.errors}   gate: ${s.wrong === 0 && s.acceptable >= ACCEPTABLE_FLOOR ? 'PASS' : 'FAIL'} (needs ≥ ${ACCEPTABLE_FLOOR} acceptable and 0 wrong)`);
    if (judged.usage.input) console.log(`usage: ${judged.usage.input} in / ${judged.usage.output} out tokens ≈ $${cost.toFixed(2)} at list price`);
    const bad = Object.entries(judged.items).filter(([, v]) => v.kind === 'spoken' && v.verdict !== 'acceptable');
    if (bad.length) { console.log('\nNot acceptable:'); for (const [k, v] of bad) console.log(`  ${k.padEnd(6)} ${v.verdict.padEnd(11)} ${v.reason}`); }
    console.log(`\nwritten ${out}`);
}

async function main() {
    const args = process.argv.slice(2);
    const dir = args.find((a) => !a.startsWith('--'));
    if (!dir) { console.error('usage: interview60.judge.mjs <run-dir> [--effort high] [--concurrency 2] [--force] | --export | --verdicts <file> [--model <name>]'); process.exit(2); }
    const opt = (name, dflt) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : dflt; };
    const effort = opt('effort', 'high');
    const concurrency = Number(opt('concurrency', '2'));
    const force = args.includes('--force');
    const exportOnly = args.includes('--export');
    const verdictsPath = opt('verdicts', null);
    const keyName = ['CLAUDE_API_KEY', 'ANTHROPIC_API_KEY'].find((n) => process.env[n]);
    if (!exportOnly && !verdictsPath && !keyName) { console.error('no Claude key: set CLAUDE_API_KEY (or ANTHROPIC_API_KEY) in .env and run with --env-file=.env, or grade without one: --export, then --verdicts <file>'); process.exit(2); }

    const answersPath = opt('answers', null);
    let pairs, tag = '';
    if (answersPath) {
        pairs = pairsFromAnswers(JSON.parse(fs.readFileSync(answersPath, 'utf8')));
        const arm = pairs.find((p) => p.model)?.model;
        if (!arm) { console.error(`${answersPath}: no model field on its items — re-run interview60.answers.mjs, which records the arm`); process.exit(2); }
        tag = `.${arm}`;
    } else {
        const timeline = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8'));
        const dbg = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8');
        pairs = pairAnswers(dbg, timeline).filter((p) => p.id !== '?');
    }
    const out = path.join(dir, `interview60.judge${tag}.json`);
    if (exportOnly) {
        const pairsOut = path.join(dir, `interview60.judge.pairs${tag}.json`);
        const toGrade = keyPairs(pairs).filter(({ pair }) => pair.answer).map(({ key, pair }) => ({ key, ...pair }));
        fs.writeFileSync(pairsOut, JSON.stringify({ model: JUDGE_MODEL, rubric: RUBRIC, items: toGrade }, null, 1));
        console.log(`EXPORT  ${path.basename(dir)}  ${tag ? 'arm ' + tag.slice(1) + '   ' : ''}${toGrade.length} delivered answers to grade; ${pairs.length - toGrade.length} undelivered will be scored wrong at merge`);
        console.log(`written ${pairsOut}`);
        console.log(`next: grade every item with the rubric in that file into ${path.join(dir, `interview60.judge.verdicts${tag}.json`)} as {<key>: {correctness, on_topic, delivery, reason}} with scores 0-2, then rerun with --verdicts <that file>`);
        return;
    }
    if (verdictsPath) {
        const judged = mergeVerdicts(pairs, JSON.parse(fs.readFileSync(verdictsPath, 'utf8')), opt('model', JUDGE_MODEL));
        if (tag) judged.arm = tag.slice(1);
        fs.writeFileSync(out, JSON.stringify(judged, null, 1));
        console.log(`JUDGE  ${path.basename(dir)}  ${pairs.length} dispatched answers merged from ${verdictsPath}  model=${judged.model}`);
        printSummary(judged, out);
        return;
    }
    const judged = !force && fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : { model: JUDGE_MODEL, effort, items: {}, usage: { input: 0, output: 0 } };
    judged.model = JUDGE_MODEL; judged.effort = effort;
    const save = () => fs.writeFileSync(out, JSON.stringify(judged, null, 1));

    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env[keyName] });
    console.log(`JUDGE  ${path.basename(dir)}  ${pairs.length} dispatched answers (${pairs.filter((p) => p.kind === 'spoken').length} spoken)  model=${JUDGE_MODEL} effort=${effort} key=${keyName}`);

    const keyed = keyPairs(pairs);
    const todo = keyed.filter(({ key }) => !judged.items[key] || judged.items[key].verdict === 'error');
    let i = 0;
    const worker = async () => {
        while (i < todo.length) {
            const { key, pair } = todo[i++];
            const base = baseOf(pair);
            if (!pair.answer) {
                judged.items[key] = undelivered(pair);
                console.log(`  ${key.padEnd(6)} wrong        no answer was delivered`);
            } else {
                try {
                    const r = await judgeOne(client, pair, effort);
                    judged.usage.input += r.usage.input; judged.usage.output += r.usage.output;
                    const verdict = verdictOf(r);
                    judged.items[key] = { ...base, correctness: r.correctness, on_topic: r.on_topic, delivery: r.delivery, verdict, reason: r.reason };
                    console.log(`  ${key.padEnd(6)} ${verdict.padEnd(11)} c=${r.correctness} t=${r.on_topic} d=${r.delivery}  ${r.reason}`);
                } catch (e) {
                    judged.items[key] = { ...base, verdict: 'error', reason: String(e?.message ?? e).slice(0, 200) };
                    console.log(`  ${key.padEnd(6)} error        ${String(e?.message ?? e).slice(0, 120)}`);
                }
            }
            save();
        }
    };
    await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));

    printSummary(judged, out);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().catch((e) => { console.error('JUDGE FAILED', e?.message ?? e); process.exit(1); });
}
