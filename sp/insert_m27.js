const fs = require('fs');
const p = 'C:/Users/sotka/OneDrive/Masa\u00fcst\u00fc/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-04T08-09-38-after4/interview60.judge.verdicts.json';
const before = fs.readFileSync(p, 'utf8');
const lines = before.split('\n');
const i = lines.findIndex(l => l.includes('"M26"'));
if (i < 0) throw new Error('M26 line not found');
if (before.includes('"M27"')) throw new Error('M27 already present');
const entry = '  "M27": { "correctness": 0, "on_topic": 0, "delivery": 2, "reason": "Answers when to avoid an event-driven deletion design; asked about service meshes. Speakable but wrong question." },';
lines.splice(i + 1, 0, entry);
const after = lines.join('\n');
fs.writeFileSync(p, after, 'utf8');

// verify
const v = JSON.parse(after);
const keys = Object.keys(v);
const old = JSON.parse(before);
const changed = Object.keys(old).filter(k => JSON.stringify(old[k]) !== JSON.stringify(v[k]));
const bad = keys.filter(k => ![0, 1, 2].includes(v[k].correctness) || ![0, 1, 2].includes(v[k].on_topic) || ![0, 1, 2].includes(v[k].delivery) || v[k].reason.trim().split(/\s+/).length > 25);
console.log('keys:', keys.length);
console.log('M27:', JSON.stringify(v.M27));
console.log('M27 reason words:', v.M27.reason.trim().split(/\s+/).length);
console.log('pre-existing entries changed:', changed.length);
console.log('out-of-spec entries:', bad.join(',') || 'none');
console.log('order around M27:', keys.slice(keys.indexOf('M26') - 1, keys.indexOf('M28') + 1).join(' '));
