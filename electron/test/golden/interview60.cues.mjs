/**
 * Screenshot cues for an unattended flight. The cue sentences ("take a look at this
 * problem on screen") used to be operator-only; hands-free there was nothing on
 * screen and the app answered them from the transcript (after8, 2026-09-07). Now
 * each cue has a golden coding problem (interview60.questions.mjs `problem`) whose
 * page is shown on the primary display while the cue plays, and the app captures
 * the screen when the interviewer points at it (main.ts answerDetection).
 *
 *   node interview60.cues.mjs render                 → interview60.cues/<PYn>.png for every cue problem
 *   node interview60.cues.mjs schedule <timeline>    → spawned detached by run.mjs before playback:
 *                                                      shows each cue's page from its playedAt for the
 *                                                      cue's clip + gap − 5 s. Writes interview60.cues.log
 *                                                      and interview60.cues.pid next to the timeline
 *                                                      (app:stop kills the pid; the display windows are
 *                                                      electron.exe of this checkout and die with the app).
 *   node interview60.cues.mjs show <PYn> <ms> [log]  → show one page now (manual check / chain test)
 *
 * Every failure is a log line: a render error, a display that could not spawn, an
 * image that did not load (the display reports it) — an hour with nothing on screen
 * must never be silent.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { CODING } from './problems.coding.mjs';
import { INTERVIEW } from './interview60.questions.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// Resolved from the project root like harness.mjs does, so this can live anywhere in the tree.
const require = createRequire(path.join(HERE, '..', '..', '..', 'package.json'));
const OUT = path.join(HERE, 'interview60.cues');
const DISPLAY = path.join(HERE, 'interview60.cue-display.cjs');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * One page with every shot of the problem in TWO columns (the golden renderer's look,
 * harness.mjs renderShot, at page scale): a single tall column shrinks to ~60 % on a
 * 1040 px work area and the vision model reads ~12 px text; two 1100 px columns fit
 * the work area's aspect and keep the text near native size.
 */
export async function renderProblemPage(problemId) {
    const sharp = require('sharp');
    const p = CODING.find((c) => c.id === problemId);
    if (!p) throw new Error(`unknown problem ${problemId}`);
    fs.mkdirSync(OUT, { recursive: true });
    const colWidth = 1100, colGap = 60, lh = 30, gap = 26, top = 40;
    const columns = [p.shots.slice(0, Math.ceil(p.shots.length / 2)), p.shots.slice(Math.ceil(p.shots.length / 2))];
    const blocks = [];
    let pageH = 0;
    columns.forEach((shots, ci) => {
        const x = 50 + ci * (colWidth + colGap);
        let y = top;
        for (const s of shots) {
            const font = s.mono ? "Consolas, 'DejaVu Sans Mono', monospace" : 'Segoe UI, DejaVu Sans, Arial, sans-serif';
            if (s.title) { y += 30; blocks.push(`<text x="${x}" y="${y}" font-family="Segoe UI, DejaVu Sans, Arial, sans-serif" font-size="26" font-weight="700" fill="#0b0c0f">${esc(s.title)}</text>`); y += 14; }
            for (const l of s.lines) {
                y += lh;
                const bold = l.startsWith('**');
                blocks.push(`<text x="${x}" y="${y}" font-family="${font}" font-size="${s.mono ? 19 : 20}" font-weight="${bold ? 700 : 400}" fill="#16181d">${esc(bold ? l.replace(/\*\*/g, '') : l)}</text>`);
            }
            y += gap;
        }
        pageH = Math.max(pageH, y);
    });
    const width = 50 + columns.length * colWidth + (columns.length - 1) * colGap, height = pageH + 30;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#ffffff"/><rect width="100%" height="8" fill="#2f6feb"/>${blocks.join('\n')}</svg>`;
    const file = path.join(OUT, `${problemId}.png`);
    await sharp(Buffer.from(svg)).png().toFile(file);
    return { file, width, height };
}

function showPage(png, ms, log, logFile) {
    const electron = require('electron'); // the binary path when required from node
    log(`show ${path.basename(png)} for ${Math.round(ms / 1000)} s`);
    const child = spawn(electron, [DISPLAY, png, String(ms), ...(logFile ? [logFile] : [])], { detached: true, stdio: 'ignore' });
    child.on('error', (e) => log(`DISPLAY FAILED to spawn: ${e.message}`));
    child.unref();
}

const cueProblems = () => [...new Set(INTERVIEW.filter((i) => i.kind === 'screenshot' && i.problem).map((i) => i.problem))];

const [cmd, a, b, c] = process.argv.slice(2);
if (cmd === 'render') {
    for (const id of cueProblems()) { const r = await renderProblemPage(id); console.log(`wrote ${r.file} ${r.width}x${r.height}`); }
} else if (cmd === 'show') {
    const r = await renderProblemPage(a);
    showPage(r.file, Number(b ?? 20000), console.log, c);
} else if (cmd === 'schedule') {
    const dir = path.dirname(a);
    const logFile = path.join(dir, 'interview60.cues.log');
    fs.writeFileSync(logFile, ''); // one run per log: run.mjs snapshots it by mtime
    const log = (m) => fs.appendFileSync(logFile, `${new Date().toISOString()} ${m}\n`);
    fs.writeFileSync(path.join(dir, 'interview60.cues.pid'), String(process.pid));
    const timeline = JSON.parse(fs.readFileSync(a, 'utf8'));
    const cues = timeline.items.filter((i) => i.kind === 'screenshot' && i.problem);
    log(`scheduler pid ${process.pid}: ${cues.length} cues ${cues.map((x) => `${x.id}=${x.problem}@${new Date(x.playedAt).toISOString().slice(11, 19)}`).join(' ')}`);
    const pages = {};
    try {
        for (const id of cueProblems()) { const r = await renderProblemPage(id); pages[id] = r.file; log(`rendered ${path.basename(r.file)} ${r.width}x${r.height}`); }
    } catch (e) {
        log(`RENDER FAILED: ${e.message} — nothing will be shown`);
        process.exit(1);
    }
    if (!cues.length) { log('no cues with a problem in the timeline — exiting'); process.exit(0); }
    let pending = cues.length;
    for (const x of cues) {
        const item = INTERVIEW.find((i) => i.id === x.id);
        const ms = Math.round(x.clipSecs * 1000) + (item?.gapMs ?? 150000) - 5000;
        setTimeout(() => { showPage(pages[x.problem], ms, log, logFile); if (--pending === 0) setTimeout(() => process.exit(0), 1000); }, Math.max(0, x.playedAt - Date.now()));
    }
} else {
    console.error('usage: interview60.cues.mjs render | schedule <timeline.json> | show <PYn> <ms> [log]');
    process.exit(2);
}
