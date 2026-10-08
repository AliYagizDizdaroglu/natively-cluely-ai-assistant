import fs from 'node:fs';
const LAB = 'C:\\Users\\sotka\\OneDrive\\Masa\u00fcst\u00fc\\natively-lab\\sp\\router-default';
const DIST = 'C:\\Users\\sotka\\OneDrive\\Masa\u00fcst\u00fc\\natively-cluely-ai-assistant\\.claude\\worktrees\\live-router-a\\dist-electron';
const arg = `/c ""C:\\Program Files\\nodejs\\node.exe" "${LAB}\\live-probe.mjs" --dist "${DIST}" > "${LAB}\\live-probe.out.txt" 2>&1"`;
const plan = process.argv[2] === 'plan' ? ' -Plan' : '';
const ps = `& "${LAB}\\register-once.ps1" -Name Natively-router-probe -InMinutes 3 -Execute cmd.exe -Argument '${arg}' -WorkingDirectory "${LAB}" -LimitMinutes 10${plan}\r\n`;
fs.writeFileSync(`${LAB}\\build\\reg-probe.ps1`, '\ufeff' + ps);
console.log('written' + plan);
