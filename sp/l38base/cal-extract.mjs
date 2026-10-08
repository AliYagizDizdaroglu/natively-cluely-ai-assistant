// Calibration of the EASY definition (rule 8): the 22 L38R items whose class is known (12 simple that Live answered
// right in 33/36 tries; 10 hard scenario50 items). Blind file + key; the grader must call >= 10/12 simple EASY and 10/10 hard HARD.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const L38R = path.join(HERE, '..', 'l38r');
const items = JSON.parse(fs.readFileSync(path.join(L38R, 'items.json'), 'utf8'));
const roster = new Map(JSON.parse(fs.readFileSync(path.join(HERE, 'items.json'), 'utf8')).map((x) => [x.id, x]));
const list = [];
for (const id of items.simple) list.push({ id, cls: 'simple', text: fs.readFileSync(path.join(L38R, 'clips', `${id}.txt`), 'utf8').trim(), parent: null });
for (const id of items.hard) { const r = roster.get(id); if (!r) throw new Error(`no roster text for ${id}`); list.push({ id, cls: 'hard', text: r.text, parent: r.parentText }); }
let s = 7; const rnd = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
const blind = [], key = {};
list.forEach((x, n) => { const k = `C${String(n + 1).padStart(2, '0')}`; key[k] = { id: x.id, cls: x.cls }; blind.push({ key: k, question: x.text, earlierQuestion: x.parent }); });
fs.writeFileSync(path.join(HERE, 'blind', 'cal-blind.json'), JSON.stringify(blind, null, 1));
fs.writeFileSync(path.join(HERE, 'keyhold', 'cal-key.json'), JSON.stringify(key, null, 1));
console.log(`wrote ${blind.length} calibration items`);
