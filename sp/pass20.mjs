/**
 * Throwaway: a graded in-app pass over the 20 scenario50 mains with the 200-word guard,
 * to answer "did the word budget make the weak answers?" with a score instead of a
 * mechanism. Same app, same questions, same frozen grader as flight s50c — the only
 * difference under test is the cut.
 *
 * NOT the flight: clips are played one at a time with a fixed 25 s gap (past the 8 s
 * continuation window and past the 9.6 s worst-case Deepgram final gap seen in the
 * smoke, where 14 s let a trailing clause land in the NEXT turn), and there are no
 * follow-ups. Content grades are comparable with s50c; timing and doubles are not.
 *
 * MUST run from the repo root of the MAIN checkout, launched by a scheduled task —
 * an app started inside a Claude session reads a shadow credentials store.
 *
 *   node pass20.mjs [id ...]
 */
import fs from 'fs';
import path from 'path';
import { execFileSync, spawn } from 'child_process';
import { pathToFileURL } from 'url';

const PROJ = process.cwd();
const HERE = path.join(PROJ, 'electron', 'test', 'golden');
const RUN = path.join(HERE, 'interview60.run.mjs');
const CLIPS = path.join(HERE, 'scenario50-tts-local');
const DEBUG_LOG = path.join(PROJ, 'natively_debug.log');
const OUT = path.join(HERE, 'interview60.runs', 'pass20.json');
const GAP_MS = 25_000;

const log = (m) => console.log(`${new Date().toISOString().slice(11, 19)}  ${m}`);
const logSize = (f) => { try { return fs.statSync(f).size; } catch { return 0; } };
const logSince = (f, from) => {
    try {
        const fd = fs.openSync(f, 'r');
        const len = fs.statSync(f).size;
        const b = Buffer.alloc(Math.max(0, len - from));
        fs.readSync(fd, b, 0, b.length, from);
        fs.closeSync(fd);
        return b.toString('utf8');
    } catch { return ''; }
};

function playWav(wav) {
    return new Promise((resolve, reject) => {
        const script = `$p = New-Object System.Media.SoundPlayer '${wav}'; $p.Load(); Write-Output "PLAYSTART $([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"; $p.PlaySync(); Write-Output "PLAYEND $([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"`;
        const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { stdio: ['ignore', 'pipe', 'pipe'] });
        let out = '';
        child.stdout.on('data', (d) => { out += d.toString(); });
        child.on('error', reject);
        child.on('close', (code) => {
            const s = out.match(/PLAYSTART (\d+)/);
            const e = out.match(/PLAYEND (\d+)/);
            if (code !== 0 || !s || !e) return reject(new Error(`player exit ${code}: ${out.trim().slice(0, 200)}`));
            resolve({ startedMs: Number(s[1]), endedMs: Number(e[1]) });
        });
    });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const words = (s) => (String(s ?? '').match(/\S+/g) ?? []).length;

const main = async () => {
    const { SCENARIO50 } = await import(pathToFileURL(path.join(HERE, 'scenario50.questions.mjs')).href);
    const wanted = process.argv.slice(2).filter((a) => !a.startsWith('--'));
    const mains = SCENARIO50.filter((i) => /^S[12]Q[0-9][0-9]$/.test(i.id) && (wanted.length === 0 || wanted.includes(i.id)));
    log(`PASS20  ${mains.length} questions, gap ${GAP_MS / 1000}s`);

    execFileSync(process.execPath, [RUN, 'app:stop'], { cwd: PROJ, stdio: 'inherit' });
    log('starting the app (this also builds it)…');
    execFileSync(process.execPath, [RUN, 'app:start'], { cwd: PROJ, stdio: 'inherit' });
    await sleep(3000);

    const rows = [];
    for (const item of mains) {
        const wav = path.join(CLIPS, `${item.id}.wav`);
        if (!fs.existsSync(wav)) { log(`  ${item.id} MISSING CLIP`); continue; }
        const from = logSize(DEBUG_LOG);
        log(`playing ${item.id}…`);
        const { endedMs } = await playWav(wav);
        await sleep(GAP_MS);
        const text = logSince(DEBUG_LOG, from);

        const dispatch = [...text.matchAll(/\[Main\] dispatch: answer source=(\w+) anchor="(?:[^"\\]|\\.)*" verdict=\w+ question="((?:[^"\\]|\\.)*)"/g)]
            .map((m) => ({ source: m[1], question: JSON.parse(`"${m[2]}"`) }));
        const budget = [...text.matchAll(/\[Answer\] budget: words=(\d+) cut=(yes|no) allowance=(yes|no)/g)]
            .map((m) => ({ words: Number(m[1]), cut: m[2] === 'yes' }));
        const full = [...text.matchAll(/\[Answer\] full: ("(?:[^"\\]|\\.)*")/g)].map((m) => JSON.parse(m[1]));

        const row = {
            id: item.id,
            level: item.level,
            question: item.q,
            questionWords: words(item.q),
            heard: dispatch[0]?.question ?? null,
            heardWhole: dispatch[0] ? words(dispatch[0].question) >= 0.8 * words(item.q) : false,
            dispatches: dispatch.length,
            answer: full[0] ?? null,
            words: budget[0]?.words ?? (full[0] ? words(full[0]) : 0),
            cut: budget[0]?.cut ?? null,
            playEndedMs: endedMs,
        };
        rows.push(row);
        log(`  ${item.id}  dispatches=${row.dispatches}  heard ${row.heard ? words(row.heard) : 0}/${row.questionWords}w  answer ${row.words}w cut=${row.cut}`);
    }

    execFileSync(process.execPath, [RUN, 'app:stop'], { cwd: PROJ, stdio: 'inherit' });
    fs.writeFileSync(OUT, JSON.stringify({ ranAt: new Date().toISOString(), gapMs: GAP_MS, items: rows }, null, 1));
    const w = rows.map((r) => r.words).sort((a, b) => a - b);
    log(`\nwrote ${OUT}`);
    log(`${rows.length} answers | ${rows.filter((r) => r.answer).length} non-empty | cut ${rows.filter((r) => r.cut).length} | words p50 ${w[Math.floor(w.length / 2)]} max ${w[w.length - 1]}`);
    log(`heard whole: ${rows.filter((r) => r.heardWhole).length}/${rows.length} | single dispatch: ${rows.filter((r) => r.dispatches === 1).length}/${rows.length}`);
};

main().catch((e) => {
    console.error(`FATAL ${e?.stack ?? e}`);
    try { execFileSync(process.execPath, [RUN, 'app:stop'], { cwd: PROJ, stdio: 'inherit' }); } catch { /* best effort */ }
    process.exit(1);
});
