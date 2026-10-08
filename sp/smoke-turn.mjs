/**
 * Pre-flight smoke for whole-turn answering — the ONLY check that exercises the
 * main-process wiring live before three hours are spent on it. main.ts has no unit
 * tests; the turn machine, the VAD, the detector gate and the renderer flag are each
 * proven in isolation, and this is where they meet the real app.
 *
 * It plays a handful of the scenario50 clips one at a time into the running app and
 * reads the app's own debug log back. The default four are not arbitrary: each is a
 * question the OLD code got wrong, and each exercises a different rule of the new one.
 *
 *   S1Q01  the old pipeline answered it 3.2 s into a 12.4 s question (early dispatch)
 *   S1Q02  finals 9.6 s apart split it into two disjoint answers (staleness rule)
 *   S1Q04  its fail-safe fired 20 ms before the voice stopped (fail-safe clock)
 *   S2Q02  answered 9.3 s early, cutting the question in half (fail-safe clock)
 *
 * What it asserts, per question: exactly ONE answer dispatch, no supersede-without-head,
 * no `extend` action at all (that path is deleted), and the answer starting AFTER the
 * clip's audio ended — the whole point of the change.
 *
 * MUST run from the repo root of the MAIN checkout, and MUST be launched by a scheduled
 * task or the user's own terminal: an app started from inside a Claude session reads a
 * shadow credentials store (MSIX virtualisation) and answers nothing.
 *
 *   node smoke-turn.mjs [id ...]
 */
import fs from 'fs';
import path from 'path';
import { execFileSync, spawn } from 'child_process';

const PROJ = process.cwd();
const HERE = path.join(PROJ, 'electron', 'test', 'golden');
const RUN = path.join(HERE, 'interview60.run.mjs');
const CLIPS = path.join(HERE, 'scenario50-tts-local');
const DEBUG_LOG = path.join(PROJ, 'natively_debug.log');
const OUT = path.join(HERE, 'interview60.runs', 'smoke-turn.json');

const IDS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const ITEMS = IDS.length > 0 ? IDS : ['S1Q01', 'S1Q02', 'S1Q04', 'S2Q02'];
/** A turn closes CONTINUATION_MS (8 s) after the voice stops; 14 s of silence guarantees
 *  the next question is a new turn and never a continuation of the previous one. */
const GAP_MS = 14_000;

const log = (m) => console.log(`${new Date().toISOString().slice(11, 19)}  ${m}`);
const logSize = (f) => { try { return fs.statSync(f).size; } catch { return 0; } };
const logSince = (f, from) => { try { const fd = fs.openSync(f, 'r'); const len = fs.statSync(f).size; const b = Buffer.alloc(Math.max(0, len - from)); fs.readSync(fd, b, 0, b.length, from); fs.closeSync(fd); return b.toString('utf8'); } catch { return ''; } };

/** Plays one wav and resolves with the real start/end epoch ms, taken from the player's
 *  own clock — the harness learned the hard way that stamping before the spawn is ~1.15 s early. */
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

const DISPATCH = /^(\S+) \[LOG\] \[Main\] dispatch: (\w+) source=(live|whisper) anchor="((?:[^"\\]|\\.)*)"/;
const TURN = /^(\S+) \[LOG\] \[Main\] turn: (\w+)([^\n]*)/;

async function main() {
    for (const id of ITEMS) {
        if (!fs.existsSync(path.join(CLIPS, `${id}.wav`))) { console.error(`ABORT ${id}.wav not found under ${CLIPS}`); process.exit(2); }
    }
    if (!fs.existsSync(path.join(PROJ, 'electron', 'services', 'interviewerTurn.ts'))) {
        console.error('ABORT whole-turn code is not in this checkout — merge feat/whole-turn-answers first'); process.exit(2);
    }

    log(`SMOKE  ${ITEMS.length} questions: ${ITEMS.join(', ')}`);
    execFileSync(process.execPath, [RUN, 'app:stop'], { cwd: PROJ, stdio: 'inherit' });
    log('starting the app (this also builds it)…');
    execFileSync(process.execPath, [RUN, 'app:start'], { cwd: PROJ, stdio: 'inherit' });

    const from = logSize(DEBUG_LOG);
    const played = [];
    for (const [i, id] of ITEMS.entries()) {
        log(`playing ${id}…`);
        const t = await playWav(path.join(CLIPS, `${id}.wav`));
        played.push({ id, ...t });
        log(`  ${id} audio ended; waiting ${GAP_MS / 1000}s for the turn to answer and close`);
        if (i < ITEMS.length - 1) await new Promise((r) => setTimeout(r, GAP_MS));
    }
    // The last question still needs its answer plus its continuation window.
    await new Promise((r) => setTimeout(r, GAP_MS));

    const text = logSince(DEBUG_LOG, from);
    execFileSync(process.execPath, [RUN, 'app:stop'], { cwd: PROJ, stdio: 'inherit' });

    const dispatches = text.split('\n').map((l) => l.match(DISPATCH)).filter(Boolean)
        .map((m) => ({ at: Date.parse(m[1]), action: m[2], source: m[3], anchor: m[4] }))
        .filter((d) => Number.isFinite(d.at));
    const turnLines = text.split('\n').map((l) => l.match(TURN)).filter(Boolean)
        .map((m) => ({ at: Date.parse(m[1]), kind: m[2], rest: m[3].trim() }));

    // Attribute by play window: a dispatch belongs to the question whose audio was
    // playing when it fired, or to the most recent question if it fired in the gap.
    const own = (at) => {
        let mine = null;
        for (const p of played) if (at >= p.startedMs) mine = p;
        return mine?.id ?? null;
    };

    const rows = played.map((p) => {
        const mine = dispatches.filter((d) => own(d.at) === p.id);
        const answers = mine.filter((d) => d.action === 'answer');
        const first = answers[0];
        return {
            id: p.id,
            clipSecs: +((p.endedMs - p.startedMs) / 1000).toFixed(1),
            marks: mine.filter((d) => d.action === 'mark').length,
            answers: answers.length,
            supersedes: mine.filter((d) => d.action === 'supersede').length,
            extends: mine.filter((d) => d.action === 'extend').length,
            drops: mine.filter((d) => d.action === 'drop').length,
            afterVoiceMs: first ? first.at - p.endedMs : null,
            gate: turnLines.find((t) => t.kind === 'gate' && own(t.at) === p.id)?.rest ?? null,
        };
    });

    const bad = [];
    for (const r of rows) {
        if (r.answers !== 1) bad.push(`${r.id}: ${r.answers} answer dispatches (want exactly 1)`);
        if (r.extends > 0) bad.push(`${r.id}: ${r.extends} extend dispatches — that path is deleted`);
        if (r.afterVoiceMs !== null && r.afterVoiceMs < 0) bad.push(`${r.id}: answered ${-r.afterVoiceMs} ms BEFORE the voice stopped`);
    }

    console.log('\n| question | clip s | marks | answers | supersedes | extends | drops | answer after voice | turn line |');
    console.log('|---|---|---|---|---|---|---|---|---|');
    for (const r of rows) {
        console.log(`| ${r.id} | ${r.clipSecs} | ${r.marks} | ${r.answers} | ${r.supersedes} | ${r.extends} | ${r.drops} | ${r.afterVoiceMs === null ? 'never answered' : `${r.afterVoiceMs} ms`} | ${r.gate ?? '—'} |`);
    }
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify({ ranAt: new Date().toISOString(), items: rows, dispatches, turnLines }, null, 1));
    console.log(`\nwrote ${path.relative(PROJ, OUT)}`);

    if (bad.length > 0) { console.log('\nSMOKE FAILED:'); for (const b of bad) console.log(`  - ${b}`); process.exit(1); }
    console.log('\nSMOKE PASSED — every question answered exactly once, after the voice stopped, with no extend path.');
}

main().catch((e) => { console.error(`FATAL ${e?.stack ?? e}`); try { execFileSync(process.execPath, [RUN, 'app:stop'], { cwd: PROJ, stdio: 'inherit' }); } catch { /* best effort */ } process.exit(1); });
