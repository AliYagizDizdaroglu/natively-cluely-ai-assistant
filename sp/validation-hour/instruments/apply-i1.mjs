// Applies REVIEW-instruments.md I1 (2026-10-01): the launcher source clears every NATIVELY_* name the app reads, and
// guard 10a's .env scan covers them. Exact-match edits; refuses if an anchor is missing or already applied.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const IN = path.dirname(fileURLToPath(import.meta.url));
const VH = path.dirname(IN);
const src = path.join(IN, 'launch-h40d-src.txt');
let s = fs.readFileSync(src, 'utf8');
const eol = s.includes('\r\n') ? '\r\n' : '\n';
const anchor = `set NATIVELY_FOLLOWUP_PARENT=${eol}`;
if (s.split(anchor).length !== 2) throw new Error('launcher anchor not found exactly once');
if (s.includes('set NATIVELY_LIVE_MODEL=')) throw new Error('already applied');
const add = ['NATIVELY_LIVE_MODEL', 'NATIVELY_LIVE_MODE', 'NATIVELY_AUTOSTART_MEETING', 'NATIVELY_CAPTURE_PROMPTS', 'NATIVELY_QUESTION_DETECTION_MODEL',
    'NATIVELY_FIRST_TOKEN_TIMEOUT_MS', 'NATIVELY_TURN_GATE_MS', 'NATIVELY_TURN_SETTLE_MS', 'NATIVELY_TURN_UNFINISHED_HOLD_MS', 'NATIVELY_TURN_CONTINUATION_MS',
    'NATIVELY_TURN_MAX_HOLD_MS', 'NATIVELY_TURN_WORDLESS_GRACE_MS', 'NATIVELY_DETECTOR_CALIBRATE', 'NATIVELY_DETECTOR_CHAIN_TEST', 'NATIVELY_DETECTOR_CHAIN_TEST_QUESTIONS',
    'NATIVELY_GEMMA_TTFT_MS', 'NATIVELY_GEMMA_MAX_ATTEMPTS', 'NATIVELY_GEMMA_VISION_TTFT_MS', 'NATIVELY_GEMMA_VISION_TTFT_BASE_MS', 'NATIVELY_GEMMA_VISION_TTFT_PER_IMAGE_MS',
    'NATIVELY_GEMMA_VISION_MAX_ATTEMPTS', 'NATIVELY_API_URL', 'NATIVELY_BUILD_ALL_MAC_ARCHES', 'I60_PROBE_DEADLINE_MIN'];
const already = add.filter((n) => s.includes(`set ${n}=`));
const toAdd = add.filter((n) => !already.includes(n));
s = s.replace(anchor, anchor + toAdd.map((n) => `set ${n}=${eol}`).join(''));
fs.writeFileSync(src, s);
console.log(`launcher source: +${toAdd.length} set lines${already.length ? `; already present: ${already.join(',')}` : ''}`);

const g = path.join(VH, 'guard-h40d.mjs');
let gs = fs.readFileSync(g, 'utf8');
const OLD = "const ENV_NAMES_GUARDED = ['NATIVELY_VERBAL_HEDGE', 'NATIVELY_VERBAL_HEDGE_TRIGGER_MS', 'NATIVELY_FOLLOWUP_PARENT', 'NATIVELY_VERBAL_PRIMARY_MODEL', 'NATIVELY_GEMINI_THINKING_LEVEL', 'NATIVELY_QUESTION_DETECTION_MODEL'];";
const NEW = "const ENV_NAMES_GUARDED = ['NATIVELY_VERBAL_HEDGE', 'NATIVELY_VERBAL_HEDGE_TRIGGER_MS', 'NATIVELY_FOLLOWUP_PARENT', 'NATIVELY_VERBAL_PRIMARY_MODEL', 'NATIVELY_GEMINI_THINKING_LEVEL', 'NATIVELY_QUESTION_DETECTION_MODEL', 'NATIVELY_LIVE_MODEL', 'NATIVELY_FIRST_TOKEN_TIMEOUT_MS', 'NATIVELY_TURN_GATE_MS', 'NATIVELY_TURN_SETTLE_MS', 'NATIVELY_TURN_UNFINISHED_HOLD_MS', 'NATIVELY_TURN_CONTINUATION_MS', 'NATIVELY_TURN_MAX_HOLD_MS', 'NATIVELY_TURN_WORDLESS_GRACE_MS', 'NATIVELY_DETECTOR_CALIBRATE', 'NATIVELY_DETECTOR_CHAIN_TEST', 'NATIVELY_DETECTOR_CHAIN_TEST_QUESTIONS', 'NATIVELY_GEMMA_TTFT_MS', 'NATIVELY_GEMMA_MAX_ATTEMPTS', 'NATIVELY_GEMMA_VISION_TTFT_MS', 'NATIVELY_GEMMA_VISION_TTFT_BASE_MS', 'NATIVELY_GEMMA_VISION_TTFT_PER_IMAGE_MS', 'NATIVELY_GEMMA_VISION_MAX_ATTEMPTS', 'NATIVELY_STT_PROVIDER', 'NATIVELY_ROSTER', 'NATIVELY_SCENARIOS'];";
if (gs.split(OLD).length !== 2) throw new Error('guard line not found exactly once');
fs.writeFileSync(g, gs.replace(OLD, NEW));
console.log('guard: ENV_NAMES_GUARDED 6 -> 26 names');
