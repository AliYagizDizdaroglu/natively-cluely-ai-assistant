// Throwaway: grade s50f (in-app + every arm) with the WORKTREE judge, sequentially.
// The key stays in main's .env (read in-process by --env-file, never printed).
import { spawnSync } from 'node:child_process';
const wt = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\.claude\\worktrees\\whole-turn';
const main = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant';
const run = main + '\\electron\\test\\golden\\interview60.runs\\2026-09-15T08-22-29-s50f';
const judge = wt + '\\electron\\test\\golden\\interview60.judge.mjs';
const arms = [
    'interview60.answers.json',
    'interview60.answers.gemini-3.5-flash-lite.json',
    'interview60.answers.qwen_qwen3.8-27b.json',
    'interview60.answers.openai_gpt-oss-120b.json',
    'interview60.answers.gemini-3.8-flash.json',
    'interview60.answers.gemini-3.7-flash.json',
    'interview60.answers.gemini-3.6-flash.json',
    'interview60.answers.gemini-3.5-flash.json',
];
const jobs = [[run], ...arms.map((a) => [run, '--answers', run + '\\' + a])];
for (const args of jobs) {
    console.log(`=== ${new Date().toISOString()} judge ${args.slice(1).join(' ') || '(in-app)'}`);
    const r = spawnSync(process.execPath, ['--env-file=' + main + '\\.env', judge, ...args, '--concurrency', '2'], { cwd: wt, stdio: 'inherit' });
    console.log(`EXIT ${r.status ?? r.error?.message}`);
}
console.log(`=== ${new Date().toISOString()} ALL DONE`);
