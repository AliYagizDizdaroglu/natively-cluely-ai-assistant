import fs from 'node:fs';
const a=fs.readFileSync(process.argv[2],'utf8'), b=fs.readFileSync(process.argv[3],'utf8');
console.log(a.length,b.length,a===b, a.replace(/\r/g,'')===b.replace(/\r/g,''), a.charCodeAt(0), b.charCodeAt(0));
