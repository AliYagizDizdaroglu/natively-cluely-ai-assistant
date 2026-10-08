import fs from 'node:fs';
const it=JSON.parse(fs.readFileSync('items.json','utf8'));
const r=JSON.parse(fs.readFileSync('runs/live40-r1.answers.json','utf8'));
const a=r.answers;
const ids=Object.keys(a);
console.log(ids.length, 'items', it.items.length);
console.log('missing from answers:', it.items.filter(i=>!a[i.id]).map(i=>i.id));
console.log('extra in answers:', ids.filter(k=>!it.items.some(i=>i.id===k)));
for (const i of it.items){ const x=a[i.id]; if(!x) continue; if(!x.text||!x.text.trim()||!x.heard) console.log('empty text/heard', i.id, JSON.stringify({t:(x.text||'').length,h:(x.heard||'').length,b:(x.textBeforeClipEnd||'').length})); }
console.log(Object.keys(a[ids[0]]), 'same k as id?', ids.every(k=>a[k].k===k));
console.log('route match', it.items.every(i=>!a[i.id]||a[i.id].route===i.route));
console.log('parents exist', it.items.filter(i=>i.parent).every(i=>it.items.some(p=>p.id===i.parent)));
console.log('lens', ids.map(k=>a[k].text.length).sort((x,y)=>x-y).join(','));
console.log(JSON.stringify(Object.keys(a[ids[0]].turnWords||{})));
