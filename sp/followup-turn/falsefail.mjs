// P(Binom_B > Binom_A) for n pairs, per-pair wrong rate p, A and B independent, no effect.
const binom=(n,p)=>{const a=[];let c=1;for(let k=0;k<=n;k++){if(k>0)c=c*(n-k+1)/k;a.push(c*p**k*(1-p)**(n-k));}return a;};
const pgt=(n,p)=>{const b=binom(n,p);let s=0;for(let i=0;i<=n;i++)for(let j=i+1;j<=n;j++)s+=b[i]*b[j];return s;};
// calibration: p=0.5,n=1 -> 0.25 ; p=0 -> 0
console.log('calib n=1 p=.5', pgt(1,.5).toFixed(4), 'p=0', pgt(10,0));
for (const p of [0.005,0.0075,0.01]) {
  const f70=pgt(70,p), b24=pgt(24,p), f42=pgt(42,p), p94=pgt(94,p);
  const either=1-(1-f70)*(1-b24);
  console.log(`p=${p}: n42 ${(f42*100).toFixed(1)}%  n70 ${(f70*100).toFixed(1)}%  n24 ${(b24*100).toFixed(1)}%  either(70,24) ${(either*100).toFixed(1)}%  pooled94 ${(p94*100).toFixed(1)}%`);
}
