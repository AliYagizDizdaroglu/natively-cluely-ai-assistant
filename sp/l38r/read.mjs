// L38R reader (PREREGISTER-l38r.md "Reported"): per set (simple / hard) over one rep's extracted answers
// (et10/et-extract.mjs output, answerWords 1): routed = a one-line answer (not "hard", not an apology, <= 12 words);
// hard = the word "hard" alone; nothing = no turn; apology = a "system error" line. Simple: the first line carries
// the answer (cue-group/probe-shipped.mjs TERMS); first word p50 / p90 of the routed answers (sinceClipEnd);
// misroutes listed: hard ids that got an answer (beside the pipeline's first cue from the bench's cue rep 1) and
// simple ids that got "hard" or nothing. Also the pipeline's first cue (the probe re-run, 3.5-lite HIGH rep 1) beside
// every routed simple answer, with a crude "shares a content word" flag. Prints answer lines and counts only.
//   node read.mjs runs/l38r-r1.answers.json [runs/l38r-r2.answers.json ...]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TERMS } from '../cue-group/probe-shipped.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SP = path.dirname(HERE);
const WT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn';
const ITEMS = JSON.parse(fs.readFileSync(`${HERE}/items.json`, 'utf8'));
const pct = (a, p) => a[Math.min(a.length - 1, Math.floor(a.length * p))];
const words = (s) => String(s ?? '').trim().split(/\s+/).filter(Boolean).length;
const STOP = new Set(['the', 'a', 'an', 'for', 'and', 'or', 'of', 'to', 'in', 'on', 'is', 'it', 'its', 'with', 'by', 'not', 'no', 'yes']);
const content = (s) => new Set(String(s ?? '').toLowerCase().replace(/[^a-z0-9()\s]/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w)));
const shares = (a, b) => { const A = content(a); for (const w of content(b)) if (A.has(w)) return true; return false; };

export function classify(rec) {
    if (!rec?.played) return 'notPlayed';
    const a = String(rec.answer ?? '').trim();
    if (!a) return 'nothing';
    if (/system error/i.test(a)) return 'apology';
    if (/^\W*hard\W*$/i.test(a)) return 'hard';
    if (words(a) <= 12) return 'routed';
    return 'long';
}

export function readRep(A, pipelineCue = {}) {
    const out = {};
    for (const set of ['simple', 'hard']) {
        const ids = ITEMS[set];
        const cls = Object.fromEntries(ids.map((id) => [id, classify(A[id])]));
        const count = (k) => ids.filter((id) => cls[id] === k).length;
        const routed = ids.filter((id) => cls[id] === 'routed');
        const tt = routed.map((id) => A[id].ttftMs).filter(Number.isFinite).sort((a, b) => a - b);
        const r = { n: ids.length, routed: routed.length, hard: count('hard'), nothing: count('nothing'), apology: count('apology'), long: count('long'), notPlayed: count('notPlayed'),
            firstWordP50: tt.length ? pct(tt, 0.5) : null, firstWordP90: tt.length ? pct(tt, 0.9) : null, wordsP50: routed.length ? pct(routed.map((id) => words(A[id].answer)).sort((a, b) => a - b), 0.5) : null, lines: {} };
        if (set === 'simple') r.carries = routed.filter((id) => TERMS[id]?.test(A[id].answer)).length;
        for (const id of ids) r.lines[id] = { cls: cls[id], answer: cls[id] === 'routed' || cls[id] === 'long' ? A[id].answer : null, ttftMs: A[id]?.ttftMs ?? null, pipelineCue: pipelineCue[id] ?? null, sharesWord: pipelineCue[id] != null && (cls[id] === 'routed' || cls[id] === 'long') ? shares(A[id].answer, pipelineCue[id]) : null };
        out[set] = r;
    }
    return out;
}

/** The pipeline's first cue line per id: the probe re-run's 3.5-lite HIGH rep 1 (simple), the bench's cues rep 1 (hard). */
export function pipelineCues() {
    const cue = {};
    const probeFile = fs.readdirSync(`${SP}/cue-group`).filter((f) => /^probe-shipped-both-2026-10-01T06-31-04/.test(f))[0];
    if (probeFile) for (const row of JSON.parse(fs.readFileSync(`${SP}/cue-group/${probeFile}`, 'utf8'))) if (row.model === '3.5-lite HIGH' && row.rep === 1 && ITEMS.simple.includes(row.id)) cue[row.id] = row.shown?.[0] ?? null;
    const bench = `${WT}/electron/test/golden/interview60.answers.gemini-3.5-flash-lite_cues-r1.json`;
    if (fs.existsSync(bench)) { const B = JSON.parse(fs.readFileSync(bench, 'utf8')); for (const id of ITEMS.hard) cue[id] = B[id]?.cues?.[0] ?? null; }
    return cue;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const files = process.argv.slice(2);
    if (!files.length) { console.log('usage: read.mjs <answers.json> ...'); process.exit(2); }
    const cues = pipelineCues();
    const s = (x) => (Number.isFinite(x) ? `${(x / 1000).toFixed(1)} s` : '-');
    for (const f of files) {
        const A = JSON.parse(fs.readFileSync(f, 'utf8'));
        const R = readRep(A, cues);
        console.log(`\n${path.basename(f)}`);
        for (const set of ['simple', 'hard']) {
            const r = R[set];
            console.log(`  ${set.padEnd(6)} n ${r.n}: routed ${r.routed}, hard ${r.hard}, nothing ${r.nothing}, apology ${r.apology}, long ${r.long}, not played ${r.notPlayed}${set === 'simple' ? `; first line carries the answer ${r.carries}/${r.routed}` : ''}; first word p50 ${s(r.firstWordP50)} p90 ${s(r.firstWordP90)}; words p50 ${r.wordsP50 ?? '-'}`);
            for (const [id, l] of Object.entries(r.lines)) {
                const flag = set === 'simple' ? (l.cls === 'routed' ? (TERMS[id]?.test(l.answer) ? 'carries' : 'MISSES the answer') : l.cls.toUpperCase()) : (l.cls === 'routed' || l.cls === 'long' ? 'MISROUTED (answered a hard one)' : l.cls);
                console.log(`    ${id.padEnd(7)} ${flag.padEnd(32)} ${s(l.ttftMs).padStart(7)}  live: ${JSON.stringify(l.answer)}  pipeline cue: ${JSON.stringify(l.pipelineCue)}${l.sharesWord == null ? '' : l.sharesWord ? '  (shares a word)' : '  (NO shared word)'}`);
            }
        }
    }
}
