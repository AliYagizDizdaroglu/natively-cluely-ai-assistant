// THROWAWAY. Print every transcript / detector / dispatch log line around one roster item,
// with times relative to the item's clip end, so a single replay decision can be inspected.
// usage: node item-trace.mjs <run-dir> <item-id> [beforeSec=12] [afterSec=8]
import fs from 'node:fs';
import path from 'node:path';

const [runDir, id, beforeArg, afterArg] = process.argv.slice(2);
if (!runDir || !id) { console.error('usage: node item-trace.mjs <run-dir> <item-id> [beforeSec] [afterSec]'); process.exit(2); }
const before = Number(beforeArg ?? 12) * 1000;
const after = Number(afterArg ?? 8) * 1000;

const tl = JSON.parse(fs.readFileSync(path.join(runDir, 'interview60.timeline.json'), 'utf8'));
const item = tl.items.find((i) => i.id === id);
if (!item) { console.error(`no item ${id} in timeline (${tl.items.length} items)`); process.exit(2); }
const playedAt = item.playedAt ?? (tl.startedMs + item.startSec * 1000);
const end = playedAt + item.clipSecs * 1000;
console.log(`${id} (${item.level}) clip ${item.clipSecs.toFixed(1)} s, played ${new Date(playedAt).toISOString()} → ends ${new Date(end).toISOString()}`);
console.log(`  q: ${item.q}`);

const dbg = fs.readFileSync(path.join(runDir, 'natively_debug.log'), 'utf8');
const keep = /Transcript event|dispatch:|Finaliz|speech|Speech|VAD|vad|SystemAudio|question-detected|Live.*(question|claim|caption)|reconcile|fragment|hold|QuestionDetector|\[Detect/i;
for (const line of dbg.split('\n')) {
    const sp = line.indexOf(' ');
    if (sp < 0) continue;
    const at = Date.parse(line.slice(0, sp));
    if (!Number.isFinite(at) || at < end - before || at > end + after) continue;
    if (!keep.test(line)) continue;
    const rel = ((at - end) / 1000).toFixed(2).padStart(7);
    console.log(`${rel}s  ${line.slice(sp + 1, sp + 1 + 200).replace(/\s+/g, ' ')}`);
}
