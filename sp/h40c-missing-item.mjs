// Throwaway, read-only: which played holdout40 item has no captured in-app prompt this hour (the
// flight printed "44 spoken items have a replayable prompt"), and the shape of the two files, so
// the answer is read from the data rather than guessed (R05 was the missed item on h40b).
import fs from 'node:fs';
import path from 'node:path';

const run = process.argv[2];
const tl = JSON.parse(fs.readFileSync(path.join(run, 'interview60.timeline.json'), 'utf8'));
const pr = JSON.parse(fs.readFileSync(path.join(run, 'interview60.prompts.json'), 'utf8'));
console.log('timeline top-level keys:', Object.keys(tl).join(', '));
console.log('prompts top-level keys:', Array.isArray(pr) ? `array[${pr.length}]` : Object.keys(pr).slice(0, 12).join(', '));
const items = tl.items || tl.timeline || [];
const played = items.map((i) => i.id || i.key).filter(Boolean);
console.log('played ids:', played.length);
// prompts.json is keyed by roster id (first run showed keys R01, R02, R02F, ...).
const withPrompt = new Set(Array.isArray(pr) ? pr.map((p) => p.id || p.key).filter(Boolean) : Object.keys(pr));
console.log('ids with a prompt:', withPrompt.size);
console.log('played but no prompt:', JSON.stringify(played.filter((id) => !withPrompt.has(id))));
