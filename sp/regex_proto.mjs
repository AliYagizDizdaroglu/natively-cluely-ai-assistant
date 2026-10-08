// Prototype: verify the appStop regex-escaping chain (JS -> PowerShell -> .NET regex)
// before committing it into interview60.run.mjs. Throwaway script per rule 2.

const PROJ = String.raw`C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant`;
const needle = PROJ.replace(/\\/g, '\\\\');
const notWorktree = '\\\\.claude\\\\worktrees\\\\';

console.log('PROJ            :', JSON.stringify(PROJ));
console.log('needle JS value :', JSON.stringify(needle));
console.log('notWorktree val :', JSON.stringify(notWorktree));

const cmd = `Get-CimInstance Win32_Process | Where-Object { $_.Name -match '^electron\\.exe$' -and $_.CommandLine -match '${needle}' -and $_.CommandLine -notmatch '${notWorktree}' }`;
console.log('--- final powershell command text (what ps() would receive) ---');
console.log(cmd);

// Now simulate what PowerShell's regex engine (.NET) would actually see as the
// pattern source for -notmatch: everything between the outer single quotes,
// taken VERBATIM (PowerShell single-quoted strings do no escape processing).
const dotnetPatternSource = notWorktree; // verbatim, since single-quoted in PS
console.log('--- .NET regex pattern source PowerShell would use ---');
console.log(JSON.stringify(dotnetPatternSource));

// Approximate .NET regex semantics with JS RegExp (backslash-escaping rules
// for \\ and \. are identical between the two engines) to sanity check it
// actually matches a real worktree path and does NOT match the main checkout.
const jsPattern = new RegExp(dotnetPatternSource);
const worktreePath = String.raw`C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant\.claude\worktrees\nifty-lederberg-49681a\electron\electron.exe`;
const mainPath = String.raw`C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant\node_modules\electron\dist\electron.exe`;
console.log('matches worktree path (should be true) :', jsPattern.test(worktreePath));
console.log('matches main checkout path (should be false):', jsPattern.test(mainPath));

const needlePattern = new RegExp(needle);
console.log('needle matches main checkout path (should be true):', needlePattern.test(mainPath));
console.log('needle matches worktree path (should be true, since worktree path contains the same prefix):', needlePattern.test(worktreePath));
