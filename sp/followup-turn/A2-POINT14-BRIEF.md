# Point 14 brief (controller, 23:45) — from PREP-REVIEW-3 (READY WITH FIXES: I-1, I-2, M-a)

I-1 (Important): point 10's code rule only inspects code that names `fs`/`require` directly; a loader reached through a
name built at run time and looked up on a global object (e.g. globalThis['req'+'uire']) passes. Fix = an ALLOWLIST for
the `node -e "<code>"` text, replacing the banned-word list (strictly tighter; point 10's "never loosened" holds):
- Identifiers: only from a FIXED set frozen in audit-graders.mjs before data = the union of the identifiers in the 8
  real design-2 s50l validation commands and the pilot's command (sha12 b271cca9e127), PLUS this declared validation
  vocabulary: JSON parse stringify Object keys values entries length every some filter map forEach reduce includes
  indexOf push join split trim Array isArray Number isInteger isFinite String Set size has add console log error
  typeof undefined null true false const let var function return if else for of in new throw Error process argv exit
  stdout stderr write require readFileSync existsSync fs o v k x i n e r ok bad missing err. (Print the frozen set into
  R\audit-graders.point14.out.txt.)
- Banned anywhere in the code: `this`, `globalThis`, `global`, `window`, `self`, `constructor`, `prototype`,
  `__proto__`, `Reflect`, `Proxy`, `Function`, `eval`, `import`, `module`, `exports`, `Buffer`, `fromCharCode`, regex
  literals, template literals, backticks, `$`.
- Computed member access `x[...]` only as `process.argv[<digit>]` or with a numeric literal / single identifier index
  from the allowlist (e.g. o[k] where k is a loop variable over Object.keys — allowed only if the receiver is not
  `process`, `require`, `fs` or a global name).
- `require(...)` only as `require('fs')` (literal).
- String literals: the own verdicts / own pairs file names, 'fs', 'utf8', 'utf-8', and message strings that contain none
  of `.` `/` `\` `:` and are at most 40 characters.
- Arguments: point 13's rule unchanged.
Calibration (R\audit-graders.point14.out.txt): the 8 real s50l commands + the pilot command clean; FLAGGED for each of:
globalThis['req'+'uire'], global[k], this.constructor, ({}).constructor.constructor('…'), Function('…'),
require(['f','s'].join('')), process['mainModule'], a regex literal, a template literal, require('fs/promises'),
require('child_process'), fs.readFileSync(v) with v a variable, a string literal 'keyhold/key.json'.

I-2: implement point 13 (A2-POINT13-BRIEF.md) together with I-1: the argument path uses the same norm() as the
allowlist, maps /c/… to C:/… before resolving, rejects any `..` segment before normalising.

M-a (Minor, accepted as residual): `--add-dir <blind dir>` lets a grader read any file in R/blind without a permission
prompt (other pairs files, other graders' verdicts, launches.jsonl); the audit still flags those reads. Residual named in
point 11; the controller launches each file's g1 and g2 together in the same round (max 2 at once), so no grader can
read a sibling's finished verdicts before writing its own.

Then: re-run every changed self-check + fill-section2; a scoped Opus re-check (PREP-REVIEW-4.md) before gate (g);
pilot --attempt 2 must read clean for gate (f).
