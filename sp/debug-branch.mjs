const s = '$\\frac{3,000}{9,500}$';
console.log('string:', JSON.stringify(s));

const B3 = /\$\\[A-Za-z]*(?:\{[^{}]{0,40}\}?)*\$?$/;
console.log('branch3 anchored :', JSON.stringify((s.match(B3) || [])[0]));

const B3u = /\$\\[A-Za-z]*(?:\{[^{}]{0,40}\}?)*\$?/;
console.log('branch3 unanchored:', JSON.stringify((s.match(B3u) || [])[0]));

// narrow it down piece by piece
console.log('a:', JSON.stringify((s.match(/\$\\[A-Za-z]*/) || [])[0]));
console.log('b:', JSON.stringify((s.match(/\$\\[A-Za-z]*\{[^{}]{0,40}\}/) || [])[0]));
console.log('c:', JSON.stringify((s.match(/\$\\[A-Za-z]*(?:\{[^{}]{0,40}\})*/) || [])[0]));
console.log('d:', JSON.stringify((s.match(/\$\\[A-Za-z]*(?:\{[^{}]{0,40}\}?)*/) || [])[0]));
