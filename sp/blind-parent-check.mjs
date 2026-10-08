// Throwaway: rule-8 calibration check for the flash-h40b-blind-pairs.mjs fix (h40c Task 2).
// A blind pairs item for a follow-up question (its id is a `chain` item in the run's
// timeline) must carry the parent it leans on in its `question` text — the h40b finding was
// that without the parent, a rank-one answer to a follow-up graded acceptable ×3 blind but
// wrong ×3 standard (the blind grader had no idea it was a follow-up at all).
//
//   node blind-parent-check.mjs <blind-dir> <timeline.json>
//
// Prints "follow-ups N, with parent M" and exits 1 if M < N (a follow-up id is present but at
// least one of its items' `question` lacks the marker questionForGrader() would have added).
import fs from 'node:fs';
import path from 'node:path';

const [, , blindDir, timelinePath] = process.argv;
if (!blindDir || !timelinePath) {
    console.error('usage: node blind-parent-check.mjs <blind-dir> <timeline.json>');
    process.exit(2);
}

const timeline = JSON.parse(fs.readFileSync(timelinePath, 'utf8'));
const chainIds = new Set(timeline.items.filter((i) => i.chain).map((i) => i.id));

const MARKER_A = '[Follow-up to: ';
const MARKER_B = '[Follow-up on the problem';
const hasParentMarker = (q) => typeof q === 'string' && (q.includes(MARKER_A) || q.includes(MARKER_B));

const files = fs.readdirSync(blindDir).filter((f) => /^pairs\.blind-.*\.json$/.test(f));
if (!files.length) {
    console.error(`no pairs.blind-*.json under ${blindDir}`);
    process.exit(2);
}

// id -> whether every item seen for that id (across all blind files) carries the marker
const seen = new Map();
for (const f of files) {
    const doc = JSON.parse(fs.readFileSync(path.join(blindDir, f), 'utf8'));
    for (const item of doc.items) {
        if (!chainIds.has(item.id)) continue;
        const ok = hasParentMarker(item.question);
        seen.set(item.id, (seen.get(item.id) ?? true) && ok);
    }
}

const N = seen.size;
const M = [...seen.values()].filter(Boolean).length;
console.log(`follow-ups ${N}, with parent ${M}`);
if (M < N) {
    console.log(`FAIL: ${[...seen.entries()].filter(([, ok]) => !ok).map(([id]) => id).join(', ')} missing the parent marker`);
    process.exit(1);
}
console.log(`PASS ${M} of ${N}`);
