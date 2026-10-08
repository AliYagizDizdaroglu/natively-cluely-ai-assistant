/**
 * Live smoke for NATIVELY_EARLIER_QUESTION (plan 2026-10-04-turn-followup-build.md, Task 10). A copy of
 * SP\smoke-turn.mjs with four changes: items are `id` or `id:+<seconds>` (wait that long after this
 * clip instead of GAP_MS); the output is smoke-eq.json = { ranAt, played } only (check-smoke-eq.mjs
 * reads the app's own log back, this script asserts nothing); a clip is looked up in the roster folder
 * first, then in `clips\` beside this script (the invented WHY clip); app:stop -> app:start (which
 * rebuilds from MAIN's tree) -> play -> app:stop is unchanged.
 *
 * MUST run from the repo root of the MAIN checkout, and MUST be launched by a scheduled
 * task or the user's own terminal: an app started from inside a Claude session reads a
 * shadow credentials store (MSIX virtualisation) and answers nothing.
 *
 *   node smoke-eq.mjs S1Q04:+150 S1Q04F S1Q06:+150 S1Q06F:+30 WHY
 */
import fs from 'fs';
import path from 'path';
import { execFileSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';

const PROJ = process.cwd();
const HERE = path.join(PROJ, 'electron', 'test', 'golden');
const RUN = path.join(HERE, 'interview60.run.mjs');
const CLIPS = path.join(HERE, 'scenario50-tts-local');
const OWN_CLIPS = path.join(path.dirname(fileURLToPath(import.meta.url)), 'clips');
const clipOf = (id) => [CLIPS, OWN_CLIPS].map((d) => path.join(d, `${id}.wav`)).find((p) => fs.existsSync(p));
const OUT = path.join(HERE, 'interview60.runs', 'smoke-eq.json');

/** A turn closes CONTINUATION_MS (8 s) after the voice stops; 14 s of silence guarantees
 *  the next question is a new turn and never a continuation of the previous one. */
const GAP_MS = 14_000;
const ARGS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (ARGS.length === 0) { console.error('usage: node smoke-eq.mjs <id[:+seconds]> ...  e.g. S1Q04:+150 S1Q04F'); process.exit(2); }
const ITEMS = ARGS.map((item) => {
    const [id, plus] = item.split(':+');
    const waitMs = plus ? Number(plus) * 1000 : GAP_MS;
    if (!id || !Number.isFinite(waitMs) || waitMs < 0) { console.error(`ABORT bad item "${item}" (want id or id:+<seconds>)`); process.exit(2); }
    return { id, waitMs };
});

const log = (m) => console.log(`${new Date().toISOString().slice(11, 19)}  ${m}`);

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

async function main() {
    for (const { id } of ITEMS) {
        if (!clipOf(id)) { console.error(`ABORT ${id}.wav not found under ${CLIPS} or ${OWN_CLIPS}`); process.exit(2); }
    }
    if (!fs.existsSync(path.join(PROJ, 'electron', 'services', 'interviewerTurn.ts'))) {
        console.error('ABORT whole-turn code is not in this checkout — merge feat/whole-turn-answers first'); process.exit(2);
    }

    log(`SMOKE  ${ITEMS.length} clips: ${ITEMS.map((i) => `${i.id}:+${i.waitMs / 1000}`).join(' ')}`);
    execFileSync(process.execPath, [RUN, 'app:stop'], { cwd: PROJ, stdio: 'inherit' });
    log('starting the app (this also builds it)…');
    execFileSync(process.execPath, [RUN, 'app:start'], { cwd: PROJ, stdio: 'inherit' });

    const played = [];
    for (const [i, { id, waitMs }] of ITEMS.entries()) {
        log(`playing ${id}…`);
        const t = await playWav(clipOf(id));
        played.push({ id, ...t });
        log(`  ${id} audio ended; waiting ${waitMs / 1000}s for the turn to answer and close`);
        if (i < ITEMS.length - 1) await new Promise((r) => setTimeout(r, waitMs));
    }
    // The last clip still needs its answer plus its continuation window.
    await new Promise((r) => setTimeout(r, ITEMS[ITEMS.length - 1].waitMs));

    execFileSync(process.execPath, [RUN, 'app:stop'], { cwd: PROJ, stdio: 'inherit' });

    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify({ ranAt: new Date().toISOString(), played }, null, 1));
    console.log(`\nwrote ${path.relative(PROJ, OUT)} (${played.length} clips played; the checker reads the app log)`);
}

main().catch((e) => { console.error(`FATAL ${e?.stack ?? e}`); try { execFileSync(process.execPath, [RUN, 'app:stop'], { cwd: PROJ, stdio: 'inherit' }); } catch { /* best effort */ } process.exit(1); });
