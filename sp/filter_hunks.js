// Read a unified diff for ONE file from stdin, drop any hunk that contains
// `excludeMarker` on one of its lines, and print the remaining header+hunks
// to stdout as a patch suitable for `git apply --cached`.
const marker = process.argv[2];
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  const lines = input.split('\n');
  const hunkStart = lines.findIndex((l) => l.startsWith('@@'));
  if (hunkStart === -1) {
    process.stderr.write('No hunks found in input.\n');
    process.exit(1);
  }
  const header = lines.slice(0, hunkStart);
  const body = lines.slice(hunkStart);

  const hunks = [];
  let current = [];
  for (const l of body) {
    if (l.startsWith('@@') && current.length) {
      hunks.push(current);
      current = [];
    }
    current.push(l);
  }
  if (current.length) hunks.push(current);

  const kept = hunks.filter((h) => !h.some((l) => l.includes(marker)));
  const dropped = hunks.length - kept.length;
  process.stderr.write(`Hunks total=${hunks.length} kept=${kept.length} dropped=${dropped}\n`);

  const out = [...header, ...kept.flat()].join('\n');
  process.stdout.write(out);
});
