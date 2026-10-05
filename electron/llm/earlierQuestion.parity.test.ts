import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { execFileSync } from 'child_process';
import { createHash } from 'crypto';
import { buildEarlierQuestion, interviewerLinesBefore } from './earlierQuestion';

// Build gate c1 (PREREGISTER-turn-followup.md §9): the app reproduces every parity-fixture entry of the
// replay that PASSED. The fixtures carry captured prompts with the user's profile: local only, read from
// NATIVELY_EQ_PARITY_DIR at run time, never committed, never printed. Skipped when absent.
// NATIVELY_EQ_PARITY_BREAK=1 corrupts every ledger's newest text before building, to prove the check
// can fail (rule 8); that run must FAIL.
const DIR = process.env.NATIVELY_EQ_PARITY_DIR;
const FILES = DIR && fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => /^turn-parity-.+\.json$/.test(f)).sort() : [];
const BREAK = process.env.NATIVELY_EQ_PARITY_BREAK === '1';
// The reference itself sits one folder up from R\ (F\earlierQuestion.ref.mjs): when present, every entry is
// ALSO run through it, so `why` (which the fixture does not store) is compared as well.
const REF_PATH = DIR ? path.join(DIR, '..', 'earlierQuestion.ref.mjs') : '';
// The reference runs in a plain node child, not through vite-node: vite-node percent-encodes a non-ASCII
// path (the Masaüstü folder) and cannot load it, and a vm-context dynamic import has no callback. The child
// reads the inputs as JSON on stdin and writes the reference's results as JSON on stdout (never printed).
const REF_RUNNER = 'const u=process.argv[1];const m=await import(u);let s="";for await(const c of process.stdin)s+=c;process.stdout.write(JSON.stringify(JSON.parse(s).map(i=>{const r=m.buildEarlierQuestion(i);return{block:r.block,cue:r.cue,why:r.why};})))';
function runReference(inputs: unknown[]): Array<{ block: string; cue: string; why: string }> {
    const out = execFileSync(process.execPath, ['--input-type=module', '-e', REF_RUNNER, pathToFileURL(REF_PATH).href], { input: JSON.stringify(inputs), maxBuffer: 64 * 1024 * 1024 });
    return JSON.parse(out.toString('utf8'));
}

describe.skipIf(FILES.length === 0)('parity with the replay reference (local fixtures)', () => {
    it('three hours are present, and the reference is beside them', () => {
        expect(FILES).toEqual(['turn-parity-s50k.json', 'turn-parity-s50l.json', 'turn-parity-s50m.json']);
        expect(fs.existsSync(REF_PATH)).toBe(true);
    });
    for (const f of FILES) {
        it(`${f}: every entry reproduces its (cue, block, sha256) and the reference's (cue, why, block)`, () => {
            const fx = JSON.parse(fs.readFileSync(path.join(DIR!, f), 'utf8')) as Record<string, any>;
            const keys = Object.keys(fx);
            expect(keys).toHaveLength(42);
            // the reference always sees the recorded inputs (BREAK corrupts only the app's copy)
            const refs = runReference(keys.map((k) => ({ question: fx[k].question, turnId: fx[k].turnId, supersede: fx[k].supersede, ledger: fx[k].ledger, promptLines: fx[k].promptLines })));
            const bad: string[] = [];
            let withBlock = 0;
            for (const [i, key] of keys.entries()) {
                const e = fx[key];
                const ledger = BREAK && e.ledger.length ? [...e.ledger.slice(0, -1), { ...e.ledger[e.ledger.length - 1], text: `${e.ledger[e.ledger.length - 1].text} extra` }] : e.ledger;
                const input = { question: e.question, turnId: e.turnId, supersede: e.supersede, ledger, promptLines: e.promptLines };
                const r = buildEarlierQuestion(input);
                const x = refs[i];
                const sha = createHash('sha256').update(r.block).digest('hex');
                if (r.block) withBlock++;
                if (r.block !== e.expectedBlock || r.cue !== e.expectedCue || sha !== e.expectedSha256 || sha.slice(0, 12) !== e.expectedSha) {
                    bad.push(`${key}: cue ${r.cue}/${e.expectedCue} chars ${r.block.length}/${e.expectedBlock.length} sha ${sha.slice(0, 12)}/${e.expectedSha}`);
                }
                if (r.block !== x.block || r.cue !== x.cue || r.why !== x.why) bad.push(`${key}: vs reference cue ${r.cue}/${x.cue} why ${r.why}/${x.why} chars ${r.block.length}/${x.block.length}`);
            }
            expect(bad).toEqual([]);
            expect(withBlock).toBe(7);   // 4 roster + 3 D-cases per hour (PREREGISTER §3)
        });
    }
});

// Review I5: the app's own seam, interviewerLinesBefore(preparedTranscript), against the replay's
// derivation (gate-report-turn.mjs interviewerLines) on the captured prompts of the same three hours.
// The prompts carry the user's profile: read from NATIVELY_EQ_RUNS_DIR (MAIN's gitignored
// interview60.runs) at run time, never printed. The D-cases' prompts are rebuilt by the replay, not
// captured, so they are skipped: 39 roster entries per hour.
const RUNS = process.env.NATIVELY_EQ_RUNS_DIR;
const RUN_OF: Record<string, string> = { s50m: '2026-09-22T08-22-50-s50m', s50l: '2026-09-21T08-22-34-s50l', s50k: '2026-09-20T11-22-43-s50k' };
const BEFORE_MARKER = 'INTERVIEWER JUST SAID:\n';
const AFTER_MARKERS = ['\n\nTHE LIVE LISTENER', '\n\nYOUR RESPONSE'];
/** The transcript block of a captured user turn, cut exactly as the replay's splitUser cuts it. */
function transcriptBlock(user: string): string {
    const mi = user.indexOf(BEFORE_MARKER);
    if (mi < 0) throw new Error('no INTERVIEWER JUST SAID marker');
    const rest = user.slice(mi + BEFORE_MARKER.length);
    const hits = AFTER_MARKERS.map((m) => rest.indexOf(m)).filter((i) => i >= 0);
    if (!hits.length) throw new Error('no end marker after INTERVIEWER JUST SAID');
    return rest.slice(0, Math.min(...hits));
}
const h12 = (a: readonly string[]) => createHash('sha256').update(JSON.stringify(a)).digest('hex').slice(0, 12);

describe.skipIf(FILES.length === 0 || !RUNS || !fs.existsSync(RUNS))('interviewerLinesBefore against the replay\'s prompt lines (local captured prompts)', () => {
    for (const f of FILES) {
        const hour = f.replace(/^turn-parity-(.+)\.json$/, '$1');
        it(`${f}: every roster entry's promptLines and question are what the seam derives from the captured user turn`, () => {
            const fx = JSON.parse(fs.readFileSync(path.join(DIR!, f), 'utf8')) as Record<string, any>;
            const prompts = JSON.parse(fs.readFileSync(path.join(RUNS!, RUN_OF[hour], 'interview60.prompts.json'), 'utf8')) as Record<string, { user: string }>;
            const bad: string[] = [];
            let n = 0;
            for (const [key, e] of Object.entries(fx)) {
                if (/^D\d$/.test(e.id)) continue;
                const user = prompts[e.id]?.user;
                if (!user) { bad.push(`${key}: no captured prompt`); continue; }
                n++;
                const block = transcriptBlock(user);
                const current = block.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => /^\[INTERVIEWER\]:\s*(.*)$/.exec(l)?.[1]).filter(Boolean).at(-1);
                const mine = interviewerLinesBefore(block);
                if (JSON.stringify(mine) !== JSON.stringify(e.promptLines)) bad.push(`${key}: promptLines ${mine.length}/${e.promptLines.length} sha ${h12(mine)}/${h12(e.promptLines)}`);
                if (current !== e.question) bad.push(`${key}: current line ${(current ?? '').length}/${e.question.length} chars`);
            }
            expect(bad).toEqual([]);
            expect(n).toBe(39);
        });
    }
});
