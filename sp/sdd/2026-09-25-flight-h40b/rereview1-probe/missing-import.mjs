// What a guard does when its sibling predicate module is absent: a static import of a missing file.
import fs from 'node:fs';
console.log('check 1 would run here');
import { r09Missing } from './guard-r09-absent.mjs';
console.log('unreachable', typeof r09Missing, typeof fs);
