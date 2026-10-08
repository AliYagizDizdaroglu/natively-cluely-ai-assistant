const fs = require('fs');
const path = require('path');

const target = path.resolve(
    'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\services\\questionReconcile.ts'
);

let src = fs.readFileSync(target, 'utf8');

// --- 1. import line ---
const oldImport = "import { isFragment } from './questionShape';";
const newImport = "import { looksFragmentary } from './questionShape';";
const importCount = src.split(oldImport).length - 1;
if (importCount !== 1) {
    console.error('FAIL: expected exactly 1 occurrence of old import, found', importCount);
    process.exit(1);
}
src = src.split(oldImport).join(newImport);

// --- 2. comment + guard block ---
const oldBlock = [
    '    // A fragment ("?", "Um.") is no evidence of what was said: it must not replace a',
    '    // substantive Live question (2026-09-03 Live-only hour, W04 lost that way).',
    "    if (isFragment(latest.text)) return { text: liveText, anchor: null, verdict: 'unverifiable', score: bestScore };",
].join('\n');

const newBlock = [
    '    // A fragment is no evidence of what was said: it must not replace a substantive Live',
    '    // question. The first guard was isFragment (< 4 words; 2026-09-03 Live-only hour, W04',
    '    // lost to "?"). The 2026-09-04 after5 hour had Whisper hallucinating exactly four words',
    '    // ("I\'m going to go.") on a channel that never went silent; that passed the guard and',
    '    // replaced correct Live claims three times (W02 and M19 were answered as phantoms).',
    '    // looksFragmentary — the fragment hold\'s own predicate — refuses those too, and over',
    '    // the nine replaced verdicts in eight flight hours it changes only the phantom cases',
    '    // (spec 2026-09-05 §2).',
    "    if (looksFragmentary(latest.text)) return { text: liveText, anchor: null, verdict: 'unverifiable', score: bestScore };",
].join('\n');

const blockCount = src.split(oldBlock).length - 1;
if (blockCount !== 1) {
    console.error('FAIL: expected exactly 1 occurrence of old guard block, found', blockCount);
    process.exit(1);
}
src = src.split(oldBlock).join(newBlock);

fs.writeFileSync(target, src, 'utf8');
console.log('OK: import and guard block replaced');
