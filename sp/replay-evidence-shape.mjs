// Throwaway: what do the replay's evidence files hold? Keys and sizes only, plus whether any carries a
// system prompt / resume-context block (those stay out of the repo). Prints no answer text.
import fs from 'node:fs';
const R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/followup-replay';
const files = [...fs.readdirSync(R).filter((f) => f.endsWith('.json')).map((f) => `${R}/${f}`), ...fs.readdirSync(`${R}/blind`).map((f) => `${R}/blind/${f}`)];
const MARKERS = [/system_?instruction/i, /"system"\s*:/, /resume|résumé|curriculum/i, /CANDIDATE PROFILE|KNOWLEDGE|job description/i];
for (const f of files) {
    const t = fs.readFileSync(f, 'utf8');
    const j = JSON.parse(t);
    const top = Array.isArray(j) ? `array[${j.length}]` : Object.keys(j).slice(0, 6).join(',');
    const first = Array.isArray(j) ? j[0] : Object.values(j).find((v) => v && typeof v === 'object');
    const inner = first && typeof first === 'object' ? Object.keys(first).slice(0, 12).join(',') : '';
    const hits = MARKERS.map((m) => (m.test(t) ? m.source.slice(0, 18) : null)).filter(Boolean);
    console.log(`${f.split('/followup-replay/')[1].padEnd(62)} ${String(t.length).padStart(7)} B  top[${top}]  item[${inner}]  markers[${hits.join(' | ')}]`);
}
