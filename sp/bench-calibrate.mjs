// THROWAWAY — prove bench-pairs + bench-score unblind correctly on a case whose answer is
// known: a fake arm that is a copy of scaffold rep1, hand-written verdicts that make the
// scaffold side acceptable and the fake side weak, then the reverse. The scorer must report
// exactly that, both times, regardless of which side the coin gave the plain key.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const HERE = path.dirname(new URL(import.meta.url).pathname.slice(1));
const OUT = path.join(HERE, 'bench');
const node = process.execPath;
fs.copyFileSync(path.join(OUT, 'scaffold.rep1.json'), path.join(OUT, 'fakeX.rep1.json'));

for (const half of [1, 2]) {
    console.log(execFileSync(node, [path.join(HERE, 'bench-pairs.mjs'), '--a', 'scaffold', '--arep', '1', '--b', 'fakeX', '--brep', '1', '--half', String(half)], { encoding: 'utf8' }).trim());
}

const run = (label, scaffoldGood) => {
    for (const half of [1, 2]) {
        const tag = `scaffoldr1-vs-fakeXr1.h${half}`;
        const key = JSON.parse(fs.readFileSync(path.join(OUT, `pairs.${tag}.key.json`), 'utf8'));
        const verdicts = {};
        for (const [k, meta] of Object.entries(key)) {
            const good = (meta.arm === 'scaffold') === scaffoldGood;
            verdicts[k] = good ? { correctness: 2, on_topic: 2, delivery: 1, reason: 'x' } : { correctness: 1, on_topic: 2, delivery: 1, reason: 'x' };
        }
        fs.writeFileSync(path.join(OUT, `verdicts.${tag}.json`), JSON.stringify(verdicts, null, 1));
        console.log(`  ${tag}: plain key went to ${Object.entries(key).find(([k]) => !k.includes('#'))[1].arm}`);
    }
    console.log(`\n--- ${label}`);
    console.log(execFileSync(node, [path.join(HERE, 'bench-score.mjs'), '--a', 'scaffold', '--b', 'fakeX'], { encoding: 'utf8' }));
};
run('EXPECT: A ok 2, B ok 0, down 2 (axis c)', true);
run('EXPECT: A ok 0, B ok 2, up 2', false);

for (const f of fs.readdirSync(OUT)) if (f.includes('fakeX')) fs.unlinkSync(path.join(OUT, f));
console.log('fake files removed');
