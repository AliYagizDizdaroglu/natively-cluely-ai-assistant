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
 *                                                      cue's clip + gap; log next to the timeline
 *   node interview60.cues.mjs show <PYn> <ms>        → show one page now (manual check / chain test)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { CODING } from './problems.coding.mjs';
import { INTERVIEW } from './interview60.questions.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const OUT = path.join(HERE, 'interview60.cues');
const DISPLAY = path.join(HERE, 'interview60.cue-display.cjs');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** One page with every shot of the problem, top to bottom, in the golden renderer's look. */
export async function renderProblemPage(problemId) {
    const sharp = require('sharp');
    const p = CODING.find((c) => c.id === problemId);
    if (!p) throw new Error(`unknown problem ${problemId}`);
    fs.mkdirSync(OUT, { recursive: true });
    const width = 1100, lh = 30, gap = 26;
    const blocks = [];
    let y = 40;
    for (const s of p.shots) {
        const font = s.mono ? "Consolas, 'DejaVu Sans Mono', monospace" : 'Segoe UI, DejaVu Sans, Arial, sans-serif';
        if (s.title) { y += 30; blocks.push(`<text x="50" y="${y}" font-family="Segoe UI, DejaVu Sans, Arial, sans-serif" font-size="26" font-weight="700" fill="#0b0c0f">${esc(s.title)}</text>`); y += 14; }
        for (const l of s.lines) {
            y += lh;
            const bold = l.startsWith('**');
            blocks.push(`<text x="50" y="${y}" font-family="${font}" font-size="${s.mono ? 19 : 20}" font-weight="${bold ? 700 : 400}" fill="#16181d">${esc(bold ? l.replace(/\*\*/g, '') : l)}</text>`);
        }
        y += gap;
    }
    const h = y + 30;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${h}"><rect width="100%" height="100%" fill="#ffffff"/><rect width="100%" height="8" fill="#2f6feb"/>${blocks.join('\n')}</svg>`;
    const file = path.join(OUT, `${problemId}.png`);
    await sharp(Buffer.from(svg)).png().toFile(file);
    return file;
}

function showPage(png, ms, log) {
    const electron = require('electron'); // the binary path when required from node
    log(`show ${path.basename(png)} for ${Math.round(ms / 1000)} s`);
    return spawn(electron, [DISPLAY, png, String(ms)], { detached: true, stdio: 'ignore' }).unref();
}

const cueProblems = () => [...new Set(INTERVIEW.filter((i) => i.kind === 'screenshot' && i.problem).map((i) => i.problem))];

const [cmd, a, b] = process.argv.slice(2);
if (cmd === 'render') {
    for (const id of cueProblems()) console.log('wrote', await renderProblemPage(id));
} else if (cmd === 'show') {
    showPage(await renderProblemPage(a), Number(b ?? 20000), console.log);
} else if (cmd === 'schedule') {
    const timeline = JSON.parse(fs.readFileSync(a, 'utf8'));
    const logFile = path.join(path.dirname(a), 'interview60.cues.log');
    const log = (m) => fs.appendFileSync(logFile, `${new Date().toISOString()} ${m}\n`);
    const pages = {};
    for (const id of cueProblems()) pages[id] = await renderProblemPage(id);
    const cues = timeline.items.filter((i) => i.kind === 'screenshot' && i.problem);
    log(`scheduled ${cues.length} cues: ${cues.map((c) => `${c.id}=${c.problem}@${new Date(c.playedAt).toISOString().slice(11, 19)}`).join(' ')}`);
    let pending = cues.length;
    for (const c of cues) {
        const item = INTERVIEW.find((i) => i.id === c.id);
        const ms = Math.round(c.clipSecs * 1000) + (item?.gapMs ?? 150000) - 5000;
        setTimeout(() => { showPage(pages[c.problem], ms, log); if (--pending === 0) setTimeout(() => process.exit(0), 1000); }, Math.max(0, c.playedAt - Date.now()));
    }
} else {
    console.error('usage: interview60.cues.mjs render | schedule <timeline.json> | show <PYn> <ms>');
    process.exit(2);
}
