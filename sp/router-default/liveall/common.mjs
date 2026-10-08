// liveall/common.mjs: the roster, the timeline, the clips and the registered inputs of the "Live-all" sample. No network. Prints nothing itself.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
export const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
export const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
export const HERE = `${SP}/router-default/liveall`;
export const GOLDEN = `${MAIN}/electron/test/golden`;
export const R1 = `${GOLDEN}/interview60.runs/2026-10-07T00-22-47-router-default-r1`;
export const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
export const INSTRUCTION_SHA256 = 'e29bf3810128854c115214a50205ac7aa992e84bfcf35dd13147340a8cd41f3f';
export const FILTER_SHA_PREFIX = '42d9bc42dbd17870';

export async function loadRoster() {
    const { LIVE40 } = await import(pathToFileURL(`${GOLDEN}/live40.questions.mjs`).href);
    return LIVE40;
}
export const loadTimeline = () => JSON.parse(fs.readFileSync(`${R1}/interview60.timeline.json`, 'utf8'));

export function parseWav(buf) {
    const rate = buf.readUInt32LE(24), ch = buf.readUInt16LE(22), bits = buf.readUInt16LE(34);
    if (bits !== 16 || ch !== 1) throw new Error(`wav: ${bits}-bit ${ch}ch`);
    let off = 12, dataOff = -1, dataLen = 0;
    while (off < buf.length - 8) { const id = buf.toString('ascii', off, off + 4); const len = buf.readUInt32LE(off + 4); if (id === 'data') { dataOff = off + 8; dataLen = len; break; } off += 8 + len; }
    if (dataOff < 0) throw new Error('wav: no data chunk');
    const n = Math.floor(Math.min(dataLen, buf.length - dataOff) / 2);
    const src = new Int16Array(n);
    for (let i = 0; i < n; i++) src[i] = buf.readInt16LE(dataOff + 2 * i);
    return { rate, samples: src };
}
export const clipWav = (id) => parseWav(fs.readFileSync(`${GOLDEN}/live40-tts-local/${id}.wav`));
/** 24 kHz -> 16 kHz by the L20d runner's own nearest-sample decimation (l20d/run.mjs clipPcm16k), mono s16le. */
export function toPcm16k({ rate, samples }) {
    const f = rate / 16000, out = new Int16Array(Math.floor(samples.length / f));
    for (let i = 0; i < out.length; i++) out[i] = samples[Math.floor(i * f)];
    return Buffer.from(out.buffer, out.byteOffset, out.byteLength);
}

let bigWav = null;
const big = () => (bigWav ??= parseWav(fs.readFileSync(`${GOLDEN}/live40.wav`)));

/** Every problem found in the 47 items, as strings ([] = clean). `items` = [{id, parent, startSec, wav}] in play order. */
export function checkItems(items, roster, timeline, { clips = true } = {}) {
    const bad = [];
    const rIds = roster.map((r) => r.id), tIds = timeline.items.map((t) => t.id);
    if (items.length !== 47) bad.push(`item count ${items.length}, need 47`);
    if (JSON.stringify(items.map((i) => i.id)) !== JSON.stringify(rIds)) bad.push('item order/ids differ from the roster');
    if (JSON.stringify(rIds) !== JSON.stringify(tIds)) bad.push('roster order differs from the r1 timeline');
    const seen = new Set();
    items.forEach((it, k) => {
        const r = roster.find((x) => x.id === it.id), t = timeline.items.find((x) => x.id === it.id);
        if (!r || !t) { bad.push(`${it.id}: not in roster/timeline`); return; }
        if ((r.parent ?? null) !== (it.parent ?? null)) bad.push(`${it.id}: parent ${it.parent ?? null} != roster ${r.parent ?? null}`);
        if ((t.chain ?? null) !== (r.parent ?? null)) bad.push(`${it.id}: timeline chain ${t.chain ?? null} != roster parent ${r.parent ?? null}`);
        if (it.parent && !seen.has(it.parent)) bad.push(`${it.id}: parent ${it.parent} is not played before it`);
        if ((r.level === 'followup') !== !!it.parent) bad.push(`${it.id}: follow-up flag disagrees with parent`);
        seen.add(it.id);
        if (Math.abs(it.startSec - t.startSec) > 1e-6) bad.push(`${it.id}: startSec ${it.startSec} != timeline ${t.startSec}`);
        if (clips) {
            const secs = it.wav.samples.length / it.wav.rate;
            if (Math.abs(secs - t.clipSecs) > 0.01) bad.push(`${it.id}: clip ${secs.toFixed(3)} s != timeline clipSecs ${t.clipSecs}`);
            // the clip must be the very audio inside live40.wav at its start time (sample-exact over the whole clip)
            const b = big(), from = Math.round(t.startSec * b.rate), n = it.wav.samples.length;
            let differ = false;
            for (let i = 0; i < n; i++) if (b.samples[from + i] !== it.wav.samples[i]) { differ = true; break; }
            if (differ) bad.push(`${it.id}: clip samples differ from live40.wav at ${t.startSec.toFixed(2)} s`);
        }
    });
    return bad;
}
export async function buildItems({ clips = true } = {}) {
    const roster = await loadRoster(), timeline = loadTimeline();
    const items = roster.map((r) => { const t = timeline.items.find((x) => x.id === r.id); return { id: r.id, parent: r.parent ?? null, startSec: t?.startSec, wav: clips ? clipWav(r.id) : null }; });
    return { roster, timeline, items, bad: checkItems(items, roster, timeline, { clips }) };
}
/** INSTRUCTION + "\n\n" + CONTEXT, the form l20d/run.mjs systemFor() uses; CONTEXT is the registered S1Q02 slice (r40-common's CONTEXT_SHA256). */
export async function buildSystem() {
    const C = await import(pathToFileURL(`${SP}/router40/r40-common.mjs`).href);
    const instr = fs.readFileSync(`${SP}/l20d/instruction.txt`, 'utf8').replace(/\r\n/g, '\n');
    if (sha256(instr) !== INSTRUCTION_SHA256) throw new Error('instruction.txt does not match its registered sha256');
    const cap = C.loadCaptured();
    if (sha256(cap.context) !== C.CONTEXT_SHA256) throw new Error('CONTEXT sha differs from the registered one');
    const system = `${instr}\n\n${cap.context}`;
    return { system, shas: { instruction: sha256(instr).slice(0, 12), context: sha256(cap.context).slice(0, 12), system: sha256(system).slice(0, 12), chars: system.length } };
}
