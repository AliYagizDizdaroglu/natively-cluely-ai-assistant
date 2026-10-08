// Which notation characters the twin cue lines carry, and whether the app's trimCues/cleaner would change them.
// Prints ids, the matched character classes and changed/unchanged only; never the cue text.
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const RUN = `${MAIN}/electron/test/golden/interview60.runs/2026-10-02T11-39-41-h40d`;
const req = createRequire(`${MAIN}/package.json`);
let trim = null, where = '';
for (const rel of ['dist-electron/electron/llm/verbalStreamFilter.js', 'dist-electron/electron/llm/cues.js', 'dist-electron/electron/IntelligenceEngine.js']) {
  try { const m = req(`${MAIN}/${rel}`); for (const k of Object.keys(m)) if (/trimCues/i.test(k)) { trim = m[k]; where = `${rel}#${k}`; } if (trim) break; } catch (e) { /* next */ }
}
console.log('trimCues in dist:', trim ? where : 'NOT FOUND in the probed files');
const files = ['gemini-3.5-flash-lite_captured-high', 'gemini-3.5-flash-lite_captured-high-r2', 'gemini-3.5-flash-lite_captured-high-r3', 'gemini-3.1-flash-lite_captured-low'];
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(path.join(RUN, `interview60.answers.${f}.json`), 'utf8'));
  for (const [id, x] of Object.entries(j)) {
    const ls = (x.cues ?? []).slice(0, 3);
    const kinds = new Set();
    for (const l of ls) { if (/\$/.test(l)) kinds.add('dollar'); if (/\\[a-zA-Z]+/.test(l)) kinds.add('backslash-cmd'); if (/\^/.test(l)) kinds.add('caret'); if (/_/.test(l)) kinds.add('underscore'); if (/[{}]/.test(l)) kinds.add('brace'); }
    if (!kinds.size) continue;
    let changed = '?';
    if (trim) { try { const out = trim(x.cues ?? []); const arr = Array.isArray(out) ? out : (out.cues ?? out.lines ?? out.kept); changed = JSON.stringify(arr) === JSON.stringify(ls) ? 'unchanged-by-trim' : 'changed-by-trim'; } catch (e) { changed = 'trim threw ' + e.message.slice(0, 60); } }
    console.log(f.replace('gemini-', ''), id, [...kinds].join('+'), changed);
  }
}
