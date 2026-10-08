// Throwaway: merge the grading agents' verdict files into judge files with the WORKTREE judge
// (no key needed on the --verdicts path), in-app first, then every arm. Skips a missing file.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
const wt = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\.claude\\worktrees\\whole-turn';
const main = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant';
const run = main + '\\electron\\test\\golden\\interview60.runs\\2026-09-15T08-22-29-s50f';
const judge = wt + '\\electron\\test\\golden\\interview60.judge.mjs';
const tags = ['', '.gemini-3.1-flash-lite', '.gemini-3.5-flash-lite', '.qwen_qwen3.8-27b', '.openai_gpt-oss-120b', '.gemini-3.8-flash', '.gemini-3.7-flash', '.gemini-3.6-flash', '.gemini-3.5-flash'];
for (const tag of tags) {
    const verdicts = `${run}\\interview60.judge.verdicts${tag}.json`;
    if (!fs.existsSync(verdicts)) { console.log(`SKIP ${tag || '(in-app)'}: no verdicts file`); continue; }
    const args = [judge, run];
    if (tag) args.push('--answers', `${run}\\interview60.answers${tag}.json`);
    args.push('--verdicts', verdicts);
    console.log(`=== merge ${tag || '(in-app)'}`);
    const r = spawnSync(process.execPath, args, { cwd: wt, stdio: 'inherit' });
    console.log(`EXIT ${r.status ?? r.error?.message}`);
}
