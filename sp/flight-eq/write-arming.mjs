// Step 14 (A4/A5/A6): writes E\ARMING-flight-eq.md.tmp, then renames it into place in one step. The last line is
// "ARMING COMPLETE <stamp>" (local ISO, +03:00); refuses if the stamp is later than T - 10 min.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const E = path.dirname(fileURLToPath(import.meta.url));
const T = '2026-10-06 03:00';
const tMs = Date.parse('2026-10-06T03:00:00+03:00');
const now = new Date();
if (now.getTime() > tMs - 10 * 60000) { console.log('REFUSED: past T - 10 min'); process.exit(2); }
// eq-precheck.ps1:118 accepts exactly yyyy-MM-ddTHH:mm:ss+03 (no fraction, no ':00'); the 23:08 record failed on this.
const local = (d) => new Date(d.getTime() + 3 * 3600000).toISOString().slice(0, 19) + '+03';
const GATE = /^ARMING COMPLETE (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\+03$/;
if (!GATE.test(`ARMING COMPLETE ${local(now)}`)) { console.log('REFUSED: stamp does not match the precheck gate'); process.exit(2); }
// A7 I1: the gate pattern is read from the precheck itself, then proved on two known answers before anything is written.
const pre = fs.readFileSync(path.join(E, 'eq-precheck.ps1'), 'utf8').match(/'(\^ARMING COMPLETE [^']+)'/);
if (!pre) { console.log('REFUSED: gate pattern not found in eq-precheck.ps1'); process.exit(2); }
const PGATE = new RegExp(pre[1]);
if (PGATE.test('ARMING COMPLETE 2026-10-05T23:08:17.455+03:00') || !PGATE.test('ARMING COMPLETE 2026-10-06T02:41:07+03')) { console.log('REFUSED: precheck pattern known answers'); process.exit(2); }
const body = fs.readFileSync(path.join(E, 'arming-body.md'), 'utf8').replace(/\r\n/g, '\n').replace(/\n+$/, '');
if ((body.match(/^T: /gm) ?? []).length !== 1) { console.log('REFUSED: body must hold exactly one T: line'); process.exit(2); }
if (!new RegExp(`^T: ${T}$`, 'm').test(body)) { console.log(`REFUSED: body T: line is not ${T}`); process.exit(2); }
// A7 re-check R1: a body not refreshed for 03:00 still names the 00:00 arming; require A7's seal and the 02:54 precheck.
for (const need of ['91f252b376967119fb1f4c0344a33186395fe31cbc7875e366adfc67a67349a4', 'at 2026-10-06 02:54 (-At)']) {
  if (!body.includes(need)) { console.log(`REFUSED: body lacks ${need}`); process.exit(2); }
}
const text = `${body}\n\nARMING COMPLETE ${local(now)}\n`;
const tmp = path.join(E, 'ARMING-flight-eq.md.tmp');
fs.writeFileSync(tmp, text);
fs.renameSync(tmp, path.join(E, 'ARMING-flight-eq.md'));
const last = fs.readFileSync(path.join(E, 'ARMING-flight-eq.md'), 'utf8').replace(/\n+$/, '').split('\n').pop();
if (!PGATE.test(last)) { console.log(`REFUSED: written last line fails the precheck pattern: ${last} -- fix before the precheck`); process.exit(2); }
console.log(`WROTE ARMING-flight-eq.md (${text.length} bytes), T ${T}, last line: ARMING COMPLETE ${local(now)}`);
