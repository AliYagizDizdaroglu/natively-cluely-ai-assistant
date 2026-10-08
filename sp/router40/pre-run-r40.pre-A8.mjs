// P9: the router40 pre-run guard (A2.2-A2.4, A3.3-A3.5). Pure checks over injected inputs, plus real readers (scheduled tasks, processes, the quota ledger).
// It makes no network or model call. A real run (no --calibration) exits 2 when ANY stub input is set (A3.4 guard 7).
//   node pre-run-r40.mjs --arm R|L|grade [--only C02] [--est-s N] [--calibration <stubs>]
// Prints PASS/FAIL lines (names and counts only; no argv, no prompt text). Exit 0 all PASS, 1 any FAIL, 2 usage / stub in a real run.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MAIN, SP, R40, L40, E, GATE_START, TONIGHT_START, TONIGHT_END, TONIGHT_QUOTA_START_ISO, TONIGHT_LINE, sha256, readJson, loadCaptured, CONTEXT_SHA256, CAPTURED_SYSTEM_SHA256, stubsSet, argOf, loadItems } from './r40-common.mjs';

const WT = `${MAIN}/.claude/worktrees/whole-turn`;
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const FILTER_SHA16 = '28d6c47b9da4fba6';
export const JUDGE_VERSION = '8564ba96369a';
export const FILTER_PATH = `${MAIN}/dist-electron/electron/llm/verbalStreamFilter.js`;
export const JUDGE_PATH = `${MAIN}/electron/test/golden/interview60.judge.mjs`;
const ALL = ['R', 'L', 'grade'];
// registration section 0 (sha256, first 16 hex); `arms` = the arms whose start re-checks it (A2.4 guard 6, A3.4 m5: R re-checks its own inputs).
export const REGISTRY = [
    { label: 'live40/items.json', path: `${L40}/items.json`, sha16: 'e531772bdc6e9c23', arms: ALL },
    { label: 'live40/clips/manifest.json', path: `${L40}/clips/manifest.json`, sha16: 'fec8977176325add', arms: ALL },
    { label: 'live40/runs/live40-r1.answers.json', path: `${L40}/runs/live40-r1.answers.json`, sha16: '060cb1e14e596064', arms: ['L', 'grade'] },
    { label: 'live40/runs/live40-r1.json', path: `${L40}/runs/live40-r1.json`, sha16: '4d5fd6d85d14f6f5', arms: ['L', 'grade'] },
    { label: 'live40/grade/blind/pairs.blind-1.json', path: `${L40}/grade/blind/pairs.blind-1.json`, sha16: 'b252ac7d317e5576', arms: ['grade'] },
    { label: 'live40/grade/keyhold/key.json', path: `${L40}/grade/keyhold/key.json`, sha16: 'b4bd1d4839a765e9', arms: ['grade'] },
    { label: 'live40/run.mjs', path: `${L40}/run.mjs`, sha16: 'cd042cb3a6d2c42a', arms: ALL },
    { label: 'live40/mock-session.mjs', path: `${L40}/mock-session.mjs`, sha16: 'a465c185e571d292', arms: ALL },
    { label: 'live40/dry-check.mjs', path: `${L40}/dry-check.mjs`, sha16: '1d11d463a3b56191', arms: ALL },
    { label: 'l38r/run.mjs', path: `${SP}/l38r/run.mjs`, sha16: '227e1a4d3a23234e', arms: ALL },
    { label: 'l38r/read.mjs', path: `${SP}/l38r/read.mjs`, sha16: '662346115943ab80', arms: ALL },
    { label: 'l38m/pipeline.mjs', path: `${SP}/l38m/pipeline.mjs`, sha16: '682322cff0eac761', arms: ['L', 'grade'] },
    { label: 'router40/turns-for-classifiers.json', path: `${R40}/turns-for-classifiers.json`, sha16: '54d9084757c4e114', arms: ['grade'] },
    { label: 'router40/keyhold/key.json', path: `${R40}/keyhold/key.json`, sha16: '42e1b04f1f60283f', arms: ['grade'] },
    { label: 'router40/SET-draft.md', path: `${R40}/SET-draft.md`, sha16: 'a01cbd21c020f28d', arms: ALL },
    { label: 'l38base/PREREGISTER-base-rate.md', path: `${SP}/l38base/PREREGISTER-base-rate.md`, sha16: 'c6c731de0d848981', arms: ['grade'] },
    { label: 'l38base/blind/cal-blind.json', path: `${SP}/l38base/blind/cal-blind.json`, sha16: '4ea9be1dce1424c7', arms: ['grade'] },
    { label: 'l38base/keyhold/cal-key.json', path: `${SP}/l38base/keyhold/cal-key.json`, sha16: '79c53e532e01527f', arms: ['grade'] },
    { label: 'l20d/instruction.txt', path: `${SP}/l20d/instruction.txt`, sha16: 'e29bf3810128854c', arms: ALL },
    { label: 'followup-turn/R/launch-grader.mjs', path: `${SP}/followup-turn/R/launch-grader.mjs`, sha16: '2f096c38016161ed', arms: ['grade'] },
    { label: 'followup-turn/R/check-grader-memory.mjs', path: `${SP}/followup-turn/R/check-grader-memory.mjs`, sha16: '119ea78a433ba47d', arms: ['grade'] },
    { label: 'followup-turn/R/h40d-grader-models.mjs', path: `${SP}/followup-turn/R/h40d-grader-models.mjs`, sha16: '3626e263f3fac5ba', arms: ['grade'] },
    { label: 'followup-turn/R/audit-graders.mjs', path: `${SP}/followup-turn/R/audit-graders.mjs`, sha16: '07833cf41bcc1c6e', arms: ['grade'] },
    { label: 'quota-ledger-today.mjs', path: `${SP}/quota-ledger-today.mjs`, sha16: '77fc722c36da1a68', arms: ['L'] },
    { label: 'MAIN dist verbalStreamFilter.js', path: FILTER_PATH, sha16: FILTER_SHA16, arms: ['L', 'grade'] },
];

const NATIVELY = /^Natively-/i;
const F_RX = /^F 2026-10-06: (\d+) — G sitting: (done|none today|pending from (?:[01]\d|2[0-3]):[0-5]\d) — (.+)$/;
const TOLD_RX = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} TST CONTROLLER: the user was told .*2026-10-06/;
const LEDGER_OK_RX = /^LEDGER-OK 2026-10-06 (.+?) — (.+)$/;
const MIN30 = 30 * 60 * 1000;
export const CAP_MAX = 60, TONIGHT_CAP = 60; // A5.4: CAP' is fixed at 60 tonight; the ledger is recorded, not a gate

const fmt = (d) => (d instanceof Date && !Number.isNaN(+d) ? d.toISOString() : String(d));
const localDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** The latest 07:00Z at or before `now` (the lite quota day's start). */
export function quotaStartFor(now) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 7, 0, 0));
    if (d > now) d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().replace(/\.000Z$/, '.000Z');
}
const normPath = (p) => String(p).replace(/\\/g, '/').toLowerCase().trim();

// ---------- real readers ----------
function ps(script) {
    const r = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { encoding: 'utf8', timeout: 90000, windowsHide: true, maxBuffer: 64 << 20 });
    if (r.status !== 0) throw new Error(`powershell exit ${r.status}`);
    return r.stdout;
}
/** Natively-* scheduled tasks: names, states, next run times only. Throws if unreadable (the guard then FAILs: fail closed). */
export function readTasks() {
    const out = ps("$o=@(); foreach($t in @(Get-ScheduledTask -TaskName 'Natively-*' -ErrorAction SilentlyContinue)){ $i=Get-ScheduledTaskInfo -TaskName $t.TaskName -TaskPath $t.TaskPath -ErrorAction SilentlyContinue; $n=$null; if($i -and $i.NextRunTime -and $i.NextRunTime.Year -gt 2000){$n=$i.NextRunTime.ToUniversalTime().ToString('o')}; $o+=[pscustomobject]@{name=[string]$t.TaskName;state=[string]$t.State;next=$n} }; ConvertTo-Json -InputObject @($o) -Compress");
    const j = JSON.parse(out.trim() || '[]');
    return (Array.isArray(j) ? j : [j]).map((t) => ({ name: t.name, state: t.state, nextRun: t.next ? new Date(t.next) : null }));
}
/** Processes: name, pid, command line (kept in memory only; callers print booleans). */
export function readProcs() {
    const out = ps('Get-CimInstance Win32_Process | Select-Object Name,ProcessId,CommandLine | ConvertTo-Json -Compress');
    const j = JSON.parse(out.trim() || '[]');
    return (Array.isArray(j) ? j : [j]).map((p) => ({ name: p.Name, pid: p.ProcessId, cmd: p.CommandLine ?? '' }));
}
export function runLedger(startIso) {
    const r = spawnSync(process.execPath, [`${SP}/quota-ledger-today.mjs`, startIso], { encoding: 'utf8', timeout: 120000, maxBuffer: 64 << 20 });
    return { exit: r.status, text: r.stdout ?? '' };
}

// ---------- parsers ----------
/** The 3.1-lite request upper bound from the ledger text, or an error. Section 1 prints `lite mentions {...}` per app log; sum the 3.1 counts. */
export function parseLedgerCount(text) {
    const lines = text.split(/\r?\n/).filter((l) => /lite mentions /.test(l));
    if (!lines.length) return { error: 'no `lite mentions` count line in the ledger text' };
    let n = 0;
    for (const l of lines) {
        let obj;
        try { obj = JSON.parse(l.slice(l.indexOf('lite mentions ') + 'lite mentions '.length)); } catch { return { error: 'a `lite mentions` count is not JSON' }; }
        const v = obj['gemini-3.1-flash-lite'] ?? 0;
        if (!Number.isInteger(v) || v < 0) return { error: 'the 3.1-lite count is not a non-negative integer' };
        n += v;
    }
    return { count: n };
}
/** The 3.1-lite and 3.5-lite mention counts of the ledger text (recorded tonight, A5.4); null when no count line. */
export function ledgerMentions(text) {
    const lines = String(text).split(/\r?\n/).filter((l) => /lite mentions /.test(l));
    if (!lines.length) return null;
    let n31 = 0, n35 = 0;
    for (const l of lines) { try { const o = JSON.parse(l.slice(l.indexOf('lite mentions ') + 14)); n31 += o['gemini-3.1-flash-lite'] ?? 0; n35 += o['gemini-3.5-flash-lite'] ?? 0; } catch { return null; } }
    return { n31, n35, files: parseLedgerFiles(text).length };
}
/** Files listed in section 2 of the ledger: [{ short, iso, size }]. */
export function parseLedgerFiles(text) {
    const out = [];
    for (const l of text.split(/\r?\n/)) { const m = /^\s+(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s+(\d+)\s+(.+)$/.exec(l); if (m) out.push({ iso: m[1], size: Number(m[2]), short: m[3].trim() }); }
    return out;
}
export const realPathOf = (short) => short.replace(/^SP\//, `${SP}/`).replace(/^WT\//, `${WT}/`).replace(/^MAIN\//, `${MAIN}/`);
/** An answers file's 3.1-lite entry count; { error } when an entry has no model at entry or file level. */
export function countAnswersFile(text) {
    let j; try { j = JSON.parse(text); } catch { return { error: 'unparsable' }; }
    const fileModel = typeof j?.model === 'string' ? j.model : undefined;
    const entries = Array.isArray(j) ? j : j?.answers && typeof j.answers === 'object' ? Object.values(j.answers) : Object.values(j ?? {}).filter((v) => v && typeof v === 'object');
    let n = 0;
    for (const e of entries) {
        const m = typeof e?.model === 'string' ? e.model : fileModel;
        if (m === undefined) return { error: 'an entry has no model at entry or file level' };
        if (/gemini-3\.1-flash-lite/.test(m)) n++;
    }
    return { count: n, entries: entries.length };
}
export function parseRulings(text) {
    const lines = String(text).split(/\r?\n/);
    const fLines = lines.map((l) => l.trim()).filter((l) => l.startsWith('F '));
    const bad = fLines.filter((l) => !F_RX.test(l));
    const good = fLines.filter((l) => F_RX.test(l));
    const m = good.length === 1 ? F_RX.exec(good[0]) : null;
    return {
        fCount: fLines.length, badCount: bad.length, goodCount: good.length,
        F: m ? Number(m[1]) : null, gState: m ? m[2] : null,
        told: lines.some((l) => TOLD_RX.test(l.trim())),
        tonightCount: lines.filter((l) => l.trim() === TONIGHT_LINE).length,
        tonightNear: lines.filter((l) => l.trim().startsWith('TONIGHT ') && l.trim() !== TONIGHT_LINE).length,
        ledgerOk: new Set(lines.map((l) => LEDGER_OK_RX.exec(l.trim())).filter(Boolean).map((x) => normPath(x[1]))),
    };
}
/** STEP names with a start and no matching end in a gsitting.log text (format as described by A2-RECHECK; the real one was not read). */
export function openSteps(text) {
    const open = new Map();
    for (const line of String(text).split(/\r?\n/)) {
        const m = /\bSTEP\s+(.+?)\s+(start|end)\b/i.exec(line);
        if (!m) continue;
        const k = m[1].trim().toLowerCase();
        if (m[2].toLowerCase() === 'start') open.set(k, (open.get(k) ?? 0) + 1); else open.set(k, Math.max(0, (open.get(k) ?? 0) - 1));
    }
    return [...open].filter(([, v]) => v > 0).map(([k]) => k);
}
/** deadline = min(T_any, T_G) - 30 min; Infinity when neither exists. T_any: the earliest FUTURE NextRunTime of any Natively-* task. */
export function computeDeadline({ now, tasks, gState, cap = null }) {
    const nexts = tasks.filter((t) => NATIVELY.test(t.name) && t.nextRun && t.nextRun > now).map((t) => +t.nextRun);
    let tg = null;
    const m = /^pending from (\d\d):(\d\d)$/.exec(gState ?? '');
    if (m) tg = +new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(m[1]), Number(m[2]), 0);
    const all = [...nexts, ...(tg == null ? [] : [tg])];
    const bound = Math.min(all.length ? Math.min(...all) - MIN30 : Infinity, cap ?? Infinity);
    return { deadline: bound, tAny: nexts.length ? Math.min(...nexts) : null, tG: tg };
}
/** A clip's seconds from its WAV header (the manifest path). */
export function clipSeconds(file) {
    const wav = fs.readFileSync(file);
    const rate = wav.readUInt32LE(24), ch = wav.readUInt16LE(22);
    let off = 12;
    while (off < wav.length - 8) { const id = wav.toString('ascii', off, off + 4), len = wav.readUInt32LE(off + 4); if (id === 'data') return Math.min(len, wav.length - off - 8) / 2 / ch / rate; off += 8 + len; }
    throw new Error(`${file}: no data chunk`);
}
/** A3 / A2.4: an R chain's est = its clips' seconds + 90 s per turn + 10 s per gap + 10 s (ms). */
export const chainEstMs = (clipSecs) => Math.round((clipSecs.reduce((a, b) => a + b, 0) + 90 * clipSecs.length + 10 * (clipSecs.length - 1) + 10) * 1000);
/** A5.2: a chain's realistic est = clips' seconds + 25 s per turn + 10 s per gap + 2 s (ms). */
export const chainRealMs = (clipSecs) => Math.round((clipSecs.reduce((a, b) => a + b, 0) + 25 * clipSecs.length + 10 * (clipSecs.length - 1) + 2) * 1000);
/** A5.2: R's remaining estimate before chain i of a list: its worst-case est + every later chain's realistic est. */
export const remainingR = (ests, i) => ests[i].estMs + ests.slice(i + 1).reduce((a, c) => a + c.realMs, 0);
/** A5.2: L's remaining estimate: 120 s for the current item + 40 s for each later (unprocessed) item. */
export const remainingL = (laterItems) => 290000 + 40000 * laterItems; // A7 m1: 290 s for the current item (3 x 90 s abort + 2 x 8 s backoff), 40 s per later item
/** A7 m5: grading's est tonight = every launch still to make (10 in all) x 25 min; tomorrow a launch is 25 min. */
export const gradeEstMs = (launchesLeft) => launchesLeft * 25 * 60 * 1000;
export function allChainEsts(chains = null) {
    const { chains: C } = loadItems();
    const man = readJson(`${L40}/clips/manifest.json`).clips;
    return (chains ?? C).map((c) => { const secs = c.items.map((id) => clipSeconds(man[id].path)); return { chain: c.chain, estMs: chainEstMs(secs), realMs: chainRealMs(secs) }; });
}

/** Are router40-R and router40-L complete (the files P5 would accept)? */
export function readArmsComplete() {
    const r = (f) => { try { return readJson(f); } catch { return null; } };
    const R = r(`${R40}/runs/router40-R.json`), L = r(`${R40}/runs/router40-L.answers.json`);
    return { R: R?.complete === true && R?.name === 'router40-R', L: L?.complete === true };
}
// ---------- the evaluation ----------
async function defaultJudgeVersion() {
    const J = await import(pathToFileURL(JUDGE_PATH).href);
    return J.graderPromptVersion();
}
/**
 * ctx: { arm: 'R'|'L'|'grade', now: Date, estMs, scope: { drift, ledger }, ownPid,
 *        rulingsText?, tasks?, procs?, gsittingText? (string | null = missing), ledger? { exit, text }, registry?, judgeVersion?, readAnswers? (short -> text) }
 * Returns { checks: [{ name, ok, detail }], ok, capPrime, deadline, quotaStart, U, F }.
 */
export async function evaluate(ctx) {
    const checks = [];
    const add = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });
    const arm = ctx.arm, now = ctx.now ?? new Date(), estMs = ctx.estMs ?? 120000;
    const scope = ctx.scope ?? { drift: true, ledger: true };
    const res = { checks, capPrime: null, deadline: null, quotaStart: quotaStartFor(now), U: null, F: null };

    // The rule set is chosen HERE and nowhere else: R and L run in the tonight window (A5.1); `grade` runs tonight under A5.5 or from 2026-10-06 10:00 under A2/A3.
    const inTonight = now >= TONIGHT_START && now < TONIGHT_END;
    const tonightArm = arm === 'R' || arm === 'L' || (arm === 'grade' && inTonight);
    res.mode = tonightArm ? 'tonight' : 'tomorrow'; res.info = [];

    // 1. the date gate
    if (!ALL.includes(arm)) add('arm', false, `unknown arm ${arm}`);
    if (arm === 'R' || arm === 'L') add(`date gate (${arm}: tonight window 2026-10-05 21:45 <= now < 23:15 local)`, inTonight, `now ${fmt(now)}`);
    else add('date gate (grade: tonight window, or now >= 2026-10-06 10:00 local)', inTonight || now >= GATE_START, `now ${fmt(now)}`);
    if (arm === 'L') add('quota window is 2026-10-05T07:00Z (recorded)', res.quotaStart === TONIGHT_QUOTA_START_ISO, `window ${res.quotaStart}`);

    // 2. the controller's lines: tonight line (A5.3) for R, L and tonight's grading; the F line (A2.3, A3.3) for tomorrow's grading
    let rl = null;
    try { rl = parseRulings(ctx.rulingsText ?? fs.readFileSync(`${R40}/USER-RULINGS.txt`, 'utf8')); } catch (e) { add('USER-RULINGS readable', false, e.message); }
    let gState = null;
    if (rl) {
        if (tonightArm) {
            add('tonight line: exactly one exact TONIGHT line', rl.tonightCount === 1, `${rl.tonightCount} exact`);
            add('tonight line: no near-miss TONIGHT line', rl.tonightNear === 0, `${rl.tonightNear} near-miss`);
            gState = 'none today';
        } else {
            add('F lines: every `F ` line matches the pattern', rl.badCount === 0, `${rl.badCount} malformed`);
            add('F lines: exactly one valid F line', rl.goodCount === 1, `${rl.goodCount} valid`);
            add('F value in 0..500', rl.F != null && rl.F >= 0 && rl.F <= 500, `F ${rl.F}`);
            gState = rl.gState; res.F = rl.F;
        }
    }
    if (arm === 'grade' && tonightArm) { const ac = ctx.armsComplete ?? readArmsComplete(); add('both arms complete (router40-R and router40-L) before tonight\'s grading', ac.R && ac.L, `R ${ac.R}, L ${ac.L}`); }

    // 3. machine state (A2.4 guards 2-3, A3.4)
    let tasks = null, procs = null;
    try { tasks = ctx.tasks ?? readTasks(); } catch (e) { add('scheduled tasks readable', false, e.message); }
    try { procs = ctx.procs ?? readProcs(); } catch (e) { add('process list readable', false, e.message); }
    if (tasks) {
        const running = tasks.filter((t) => NATIVELY.test(t.name) && /^running$/i.test(t.state)).length;
        add('no Natively-* task Running', running === 0, `${running} running`);
    }
    if (procs) {
        const own = ctx.ownPid ?? process.pid;
        const isNode = (p) => /^node(\.exe)?$/i.test(p.name), isPs = (p) => /^(powershell|pwsh)(\.exe)?$/i.test(p.name);
        const has = (p, s) => String(p.cmd ?? '').includes(s);
        add('no electron.exe', !procs.some((p) => /^electron\.exe$/i.test(p.name)));
        add('no tail.exe', !procs.some((p) => /^tail\.exe$/i.test(p.name)));
        const rx = (n) => new RegExp(`(^|[\\\\/\\s"'])${n}\\.mjs`);
        const pieces = ['run-r', 'lite-l', 'launch-grader-r40']; // A7 m4: sequential, never concurrent: any other router40 harness process refuses (A3.4 m6 restored)
        const harness = procs.filter((p) => isNode(p) && p.pid !== own && pieces.some((n) => rx(n).test(String(p.cmd ?? '')))).length;
        add('no other router40 harness process', harness === 0, `${harness} found`);
        const gs = procs.filter((p) => (isNode(p) && (has(p, 'interview60.answers.mjs') || has(p, 'eq-gsitting'))) || (isPs(p) && has(p, 'eq-gsitting'))).length;
        add('G sitting not running (process argv check, booleans only)', gs === 0, `${gs} matching`);
    }
    // G-sitting log: missing/unreadable is a FAIL when F says done or pending (A3.6)
    let gtext = ctx.gsittingText;
    if (gtext === undefined) { try { gtext = fs.readFileSync(`${E}/gsitting.log`, 'utf8'); } catch { gtext = null; } }
    if (gState && gState !== 'none today' && gtext === null) add('gsitting.log readable (F says done/pending)', false, 'missing or unreadable');
    if (gtext != null) { const o = openSteps(gtext); add('gsitting.log: no STEP without its end', o.length === 0, `${o.length} open`); }

    // 4. the deadline (A2.4 guard 4)
    if (tasks) {
        const d = computeDeadline({ now, tasks, gState, cap: tonightArm ? +TONIGHT_END : null });
        res.deadline = d.deadline;
        add(tonightArm ? 'now + est < deadline (min(23:15, T_any - 30 min))' : 'now + est < deadline (min(T_any, T_G) - 30 min)', +now + estMs < d.deadline, `est ${Math.round(estMs / 1000)} s, deadline ${Number.isFinite(d.deadline) ? new Date(d.deadline).toISOString() : 'none'}`);
    }

    // 5. input drift (guard 6): hashes at each arm's start
    if (scope.drift) {
        for (const r of ctx.registry ?? REGISTRY) {
            if (!r.arms.includes(arm)) continue;
            let h = null; try { h = sha256(fs.readFileSync(r.path)).slice(0, 16); } catch { /* missing */ }
            add(`hash ${r.label}`, h === r.sha16, h == null ? 'unreadable' : `${h.slice(0, 8)} vs ${r.sha16.slice(0, 8)}`);
        }
        try {
            const cap = loadCaptured();
            add('profile CONTEXT sha (captured S1Q02)', sha256(cap.context) === CONTEXT_SHA256);
            add('captured system prompt sha', sha256(cap.system) === CAPTURED_SYSTEM_SHA256);
        } catch (e) { add('captured prompt readable', false, e.message); }
        if (arm === 'L' || arm === 'grade') {
            let jv = null; try { jv = ctx.judgeVersion ?? await defaultJudgeVersion(); } catch (e) { jv = `error: ${e.message}`; }
            add('judge instrument graderPromptVersion', jv === JUDGE_VERSION, `${String(jv).slice(0, 14)} vs ${JUDGE_VERSION}`);
        }
    }

    // 6. the ledger: recorded, gates nothing (A5.4); CAP' is fixed at 60 tonight
    if (scope.ledger && arm === 'L') {
        let led; try { led = ctx.ledger ?? runLedger(res.quotaStart); } catch (e) { led = { exit: -1, text: '' }; }
        const m = ledgerMentions(led.text ?? '');
        res.info.push(`ledger (recorded, gates nothing): exit ${led.exit}; ${m ? `3.1-lite mentions ${m.n31}, 3.5-lite mentions ${m.n35}, listed files ${m.files}` : 'no count line'}${led.exit === 0 ? '' : ' [the ledger read FAILED, recorded]'}`);
        res.ledger = { exit: led.exit, ...(m ?? {}) };
        res.capPrime = TONIGHT_CAP;
    }
    res.ok = checks.every((c) => c.ok);
    return res;
}
export const printChecks = (res, say = console.log) => { for (const c of res.checks) say(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.ok || !c.detail ? '' : `  [${c.detail}]`}`); for (const i of res.info ?? []) say(`INFO  ${i}`); };

/** The guard the runners call before every chain attempt / item / launch (scope: machine + date + lines + deadline; drift only at an arm's start). */
export async function guard({ arm, estMs, scope, stubs = {}, now }) {
    const ctx = { arm, estMs, scope: scope ?? { drift: false, ledger: false }, now: now ?? stubs.now ?? new Date(), ...stubs };
    const res = await evaluate(ctx);
    return { ok: res.ok, failed: res.checks.filter((c) => !c.ok).map((c) => c.name), res };
}

/** The calibration stub bundle named on an argv (--now, --stub-tasks/-procs/-rulings/-gsitting/-ledger/-registry/-files); undefined entries mean "read the real thing". */
export function stubBundleFromArgs(argv) {
    const rd = (f) => fs.readFileSync(f, 'utf8');
    const a = (k) => argOf(argv, k);
    const b = {};
    if (a('--now')) b.now = new Date(a('--now'));
    if (a('--stub-tasks')) b.tasks = JSON.parse(rd(a('--stub-tasks'))).map((t) => ({ ...t, nextRun: t.nextRun ? new Date(t.nextRun) : null }));
    if (a('--stub-procs')) b.procs = JSON.parse(rd(a('--stub-procs')));
    if (a('--stub-rulings')) b.rulingsText = rd(a('--stub-rulings'));
    if (a('--stub-gsitting')) { const p = a('--stub-gsitting'); b.gsittingText = fs.existsSync(p) ? rd(p) : null; }
    if (a('--stub-ledger')) b.ledger = { exit: Number(a('--stub-ledger-exit') ?? 0), text: rd(a('--stub-ledger')) };
    if (a('--stub-registry')) b.registry = JSON.parse(rd(a('--stub-registry')));
    if (a('--stub-arms')) b.armsComplete = { R: a('--stub-arms').split(',').includes('R'), L: a('--stub-arms').split(',').includes('L') };
    return b;
}

// ---------- CLI ----------
async function main() {
    const argv = process.argv.slice(2);
    const arm = argOf(argv, '--arm');
    const cal = argv.includes('--calibration');
    const stubs = stubsSet(argv);
    if (!ALL.includes(arm)) { console.log('usage: node pre-run-r40.mjs --arm R|L|grade [--only C02] [--est-s N] [--calibration <stubs>]'); process.exit(2); }
    if (stubs.length && !cal) { console.log(`REFUSED (exit 2): stub input(s) set in a real run: ${stubs.join(', ')}`); process.exit(2); }
    const ctx = { arm, scope: { drift: true, ledger: true } };
    const rd = (f) => fs.readFileSync(f, 'utf8');
    if (argOf(argv, '--now')) ctx.now = new Date(argOf(argv, '--now'));
    if (argOf(argv, '--stub-tasks')) ctx.tasks = JSON.parse(rd(argOf(argv, '--stub-tasks'))).map((t) => ({ ...t, nextRun: t.nextRun ? new Date(t.nextRun) : null }));
    if (argOf(argv, '--stub-procs')) ctx.procs = JSON.parse(rd(argOf(argv, '--stub-procs')));
    if (argOf(argv, '--stub-rulings')) ctx.rulingsText = rd(argOf(argv, '--stub-rulings'));
    if (argOf(argv, '--stub-gsitting')) { const p = argOf(argv, '--stub-gsitting'); ctx.gsittingText = fs.existsSync(p) ? rd(p) : null; }
    if (argOf(argv, '--stub-ledger')) ctx.ledger = { exit: Number(argOf(argv, '--stub-ledger-exit') ?? 0), text: rd(argOf(argv, '--stub-ledger')) };
    if (argOf(argv, '--stub-registry')) ctx.registry = JSON.parse(rd(argOf(argv, '--stub-registry')));
    if (argOf(argv, '--stub-arms') != null) { const l = argOf(argv, '--stub-arms').split(','); ctx.armsComplete = { R: l.includes('R'), L: l.includes('L') }; }
    if (argOf(argv, '--stub-files')) { const m = JSON.parse(rd(argOf(argv, '--stub-files'))); ctx.readAnswers = (s) => { if (!(s in m)) throw new Error('no stub'); return m[s]; }; }
    const estS = argOf(argv, '--est-s');
    const only = argOf(argv, '--only');
    try {
        if (estS) ctx.estMs = Number(estS) * 1000;
        else if (arm === 'R') { const { chains } = loadItems(); const sel = only ? chains.filter((c) => only.split(',').includes(c.chain)) : chains; ctx.estMs = remainingR(allChainEsts(sel), 0); }
        else if (arm === 'grade') ctx.estMs = gradeEstMs(+(ctx.now ?? new Date()) >= +TONIGHT_START && +(ctx.now ?? new Date()) < +TONIGHT_END ? 10 : 1);
        else ctx.estMs = remainingL(loadItems().items.length - 1);
    } catch (e) { console.log(`FAIL  estimate: ${e.message}`); process.exit(1); }
    const res = await evaluate(ctx);
    printChecks(res);
    console.log(`P9 ${arm}: ${res.ok ? 'PASS' : 'FAIL'}${res.capPrime != null ? `  CAP' ${res.capPrime}` : ''}  (est ${Math.round(ctx.estMs / 1000)} s)`);
    process.exit(res.ok ? 0 : 1);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
