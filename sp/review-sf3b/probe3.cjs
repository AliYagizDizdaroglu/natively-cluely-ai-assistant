const R = process.argv[2];
for (const v of ['old', 'new']) {
  const F = require(R + '/' + v + '/vsf.cjs');
  (async () => {
    for (const t of ['{} is `x` and **y**.', 'So {} is `x` and **y**.']) {
      let o = ''; for await (const c of F.stripSpokenNotation((async function* () { yield t; })())) o += c;
      console.log(v, JSON.stringify(t), '->', JSON.stringify(o));
    }
  })();
}
