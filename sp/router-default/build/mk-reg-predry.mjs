import fs from 'node:fs';
const LAB = 'C:\\Users\\sotka\\OneDrive\\Masa\u00fcst\u00fc\\natively-lab\\sp\\router-default';
const MAIN = 'C:\\Users\\sotka\\OneDrive\\Masa\u00fcst\u00fc\\natively-cluely-ai-assistant';
const arg = `/c ""${LAB}\\flight\\launch-rd-dry.cmd""`;
const ps = `& "${LAB}\\register-once.ps1" -Name Natively-rd-predry -InMinutes 2 -Execute cmd.exe -Argument '${arg}' -WorkingDirectory "${MAIN}" -LimitMinutes 30\r\n`;
fs.writeFileSync(`${LAB}\\build\\reg-predry.ps1`, '\ufeff' + ps);
console.log('written');
