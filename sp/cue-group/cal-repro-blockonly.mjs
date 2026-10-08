// Rule-8 calibration of repro-blockonly.mjs's two pure readers (shape, stages) on made-up replies with known answers.
// It also shows which reply shapes give the re-smoke's signature (a reported block, nothing shown): both a block
// followed only by offers and a block followed only by a code fence do, so the log alone cannot tell them apart.
import { shape, stages } from './repro-blockonly.mjs';

let ok = true;
const check = (name, got, want) => {
    const good = JSON.stringify(got) === JSON.stringify(want);
    if (!good) ok = false;
    console.log(`${good ? 'OK ' : 'BAD'} ${name}: ${JSON.stringify(got)}${good ? '' : ` (want ${JSON.stringify(want)})`}`);
};
const BLOCK = '__CUES__\n1| KEDA with custom metrics\n2| Scale from zero\n';
const PROSE = 'I would scale on queue depth with KEDA and keep a warm floor of replicas.';   // 15 words
const OFFERS = '__MORE__\n1| cold start mitigation\n2| GPU node pools\n';
const FENCE = '```yaml\napiVersion: keda.sh/v1alpha1\nkind: ScaledObject\n```';

const cases = {
    'a block and a spoken answer': BLOCK + PROSE,
    'a block, a spoken answer, offers': `${BLOCK}${PROSE}\n${OFFERS}`,
    'a block and ONLY offers (no spoken answer)': BLOCK + OFFERS,
    'a block and ONLY a code fence that ends the reply': BLOCK + FENCE,
    'a block and nothing': BLOCK,
    'no block, a spoken answer': PROSE,
};
const want = {
    'a block and a spoken answer': { shape: 'CUES cue(4w) cue(3w) prose(15w)', shown: 15, cues: 2, offers: 0 },
    'a block, a spoken answer, offers': { shape: 'CUES cue(4w) cue(3w) prose(15w) MORE offer(3w) offer(3w) blank', shown: 15, cues: 2, offers: 2 },
    'a block and ONLY offers (no spoken answer)': { shape: 'CUES cue(4w) cue(3w) MORE offer(3w) offer(3w) blank', shown: 0, cues: 2, offers: 2 },
    'a block and ONLY a code fence that ends the reply': { shape: 'CUES cue(4w) cue(3w) FENCE(```yaml) code(2w) code(2w) FENCE(```)', shown: 0, cues: 2, offers: 0 },
    'a block and nothing': { shape: 'CUES cue(4w) cue(3w) blank', shown: 0, cues: 2, offers: 0 },
    'no block, a spoken answer': { shape: 'prose(15w)', shown: 15, cues: 0, offers: 0 },
};
for (const [name, raw] of Object.entries(cases)) {
    const st = await stages(raw);
    check(name, { shape: shape(raw).join(' '), shown: st.w[5], cues: (st.cues ?? []).length, offers: st.offers.length }, want[name]);
    console.log(`     words raw ${st.w[0]} -> cue-strip ${st.w[1]} -> fences ${st.w[2]} -> line filter ${st.w[3]} -> offers ${st.w[4]} -> notation ${st.w[5]}`);
}
console.log(ok ? 'REPRO CALIBRATION OK' : 'REPRO CALIBRATION FAILED');
process.exit(ok ? 0 : 1);
