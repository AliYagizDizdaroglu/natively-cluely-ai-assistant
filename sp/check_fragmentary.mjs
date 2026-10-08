import { looksFragmentary } from 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/services/questionShape.ts';

const HEAD = 'How would you design a pipeline that';
const CONTROL = 'How would you design a pipeline that retrains?';

console.log('HEAD    :', JSON.stringify(HEAD), '-> looksFragmentary =', looksFragmentary(HEAD));
console.log('CONTROL :', JSON.stringify(CONTROL), '-> looksFragmentary =', looksFragmentary(CONTROL));
