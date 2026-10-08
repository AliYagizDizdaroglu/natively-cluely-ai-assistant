import fs from 'node:fs';
const LAB = 'C:\\Users\\sotka\\OneDrive\\Masa\u00fcst\u00fc\\natively-lab\\sp\\router-default';
const MAIN = 'C:\\Users\\sotka\\OneDrive\\Masa\u00fcst\u00fc\\natively-cluely-ai-assistant';
const arg = `/c ""${LAB}\\launch-router-smoke.cmd""`;
const plan = process.argv[2] === 'plan' ? ' -Plan' : '';
const ps = `& "${LAB}\\register-once.ps1" -Name Natively-router-smoke -InMinutes 3 -Execute cmd.exe -Argument '${arg}' -WorkingDirectory "${MAIN}" -LimitMinutes 50${plan}\r\n`;
fs.writeFileSync(`${LAB}\\build\\reg-smoke.ps1`, '\ufeff' + ps);
console.log('written' + plan);
