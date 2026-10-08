import path from 'path';

const PROJ = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\.claude\\worktrees\\whole-turn';
console.log('PROJ =', PROJ);

const needle = PROJ.replace(/\\/g, '\\\\');
const notWorktree = '\\\\.claude\\\\worktrees\\\\';
console.log('needle regex-source      =', needle);
console.log('notWorktree regex-source =', notWorktree);

const reNeedle = new RegExp(needle);
const reNotWorktree = new RegExp(notWorktree);

const sampleCmdLine = `"${PROJ}\\node_modules\\electron\\dist\\electron.exe" .`;
console.log('sample command line =', sampleCmdLine);
console.log('matches needle?      ', reNeedle.test(sampleCmdLine));
console.log('matches notWorktree? ', reNotWorktree.test(sampleCmdLine));
console.log('would be swept (needle && !notWorktree)?', reNeedle.test(sampleCmdLine) && !reNotWorktree.test(sampleCmdLine));

// Also check a MAIN-checkout PROJ for comparison (no .claude\worktrees\ in it)
const PROJ_MAIN = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant';
const needleMain = PROJ_MAIN.replace(/\\/g, '\\\\');
const reNeedleMain = new RegExp(needleMain);
const sampleCmdLineMain = `"${PROJ_MAIN}\\node_modules\\electron\\dist\\electron.exe" .`;
console.log('\n--- main checkout comparison ---');
console.log('matches needle (main)?      ', reNeedleMain.test(sampleCmdLineMain));
console.log('matches notWorktree (main)? ', reNotWorktree.test(sampleCmdLineMain));
console.log('would be swept (main)?', reNeedleMain.test(sampleCmdLineMain) && !reNotWorktree.test(sampleCmdLineMain));
