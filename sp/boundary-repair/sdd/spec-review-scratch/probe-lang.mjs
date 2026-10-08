// Spec-review scratch: the reference on non-English text (the app offers es/fr/de/pt/it/tr/id/ru/uk/ja/ko/zh and 'multi').
import { createRepair, tok } from '../../rule-v3.mjs';
const rawTok = (s) => String(s).replace(/(\d),(\d)/g, '$1$2').match(/[A-Za-z0-9']+/g) ?? [];
const run = (label, I, F1, F2, gap = 2000) => {
    const r = createRepair();
    r.onTranscript(I, false, 0); r.onTranscript(F1, true, 100);
    const out = r.onTranscript(F2, true, 100 + gap);
    console.log(`${label.padEnd(30)} -> ${out.restored ? `RESTORED ${JSON.stringify(out.restored)}: ` : 'unchanged: '}${JSON.stringify(out.text)}`);
};
// Spanish: a real loss of "migración" — restored as fragments
run('es: lost "migración"', 'Cuéntame sobre la migración de datos que hiciste', 'Cuéntame sobre la', 'de datos que hiciste?');
// Turkish: tok vs rawTok alignment on the dotted capital I
for (const s of ['İstanbul ofisinde', 'Istanbul ofisinde']) console.log(`tok ${JSON.stringify(tok(s))} rawTok ${JSON.stringify(rawTok(s))}`);
run('tr: İ shifts Traw', 'Peki İzmir projesinde hangi veritabanını seçtiniz', 'Peki', 'projesinde hangi veritabanını seçtiniz?');
// Russian with Latin product names: only the Latin tokens are compared
run('ru: Latin-only tokens', 'Мы используем Kafka, для кэша Redis и S3 для файлов', 'Мы используем Kafka, для кэша', 'Редис и S3 для файлов.');
