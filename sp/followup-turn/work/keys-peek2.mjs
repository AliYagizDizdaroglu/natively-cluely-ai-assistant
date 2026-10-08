import fs from 'node:fs';
const j = JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const o=j['s50m:S1Q04F']; const seen=new Map();
for (const f of ['system','userA']) for (const l of o[f].split('\n')) { const m=l.trim().match(/^(<\/?[A-Za-z_]+>|[A-Z][A-Z0-9 _:\-\[\]\/]{3,40}:?|\[[A-Za-z _\-]{3,40}\]|#+ [A-Za-z ]{3,40})$/); if(m) seen.set(f+': '+m[1],1); }
console.log([...seen.keys()].join('\n'));
