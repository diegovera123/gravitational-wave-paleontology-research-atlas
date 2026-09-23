/* Transparent educational models, not astrophysical rate forecasts or detector data. */
(function(root){"use strict";
const num=(v,lo,hi)=>Number.isFinite(+v)?Math.min(hi,Math.max(lo,+v)):lo;
function kick(x={}){
 const k=num(x.k,0,2.5),angle=num(x.angle,-180,180)*Math.PI/180,f=num(x.f,0,.95),mu=1-f;
 const vx=k*Math.sin(angle),vy=1+k*Math.cos(angle),energy=(vx*vx+vy*vy)/2-mu;
 const ecc=Math.sqrt(Math.max(0,1+2*energy*vy*vy/(mu*mu)));
 return {k,angle:angle*180/Math.PI,f,mu,vx,vy,energy,ecc,bound:energy< -1e-10?true:energy>1e-10?false:null,a:energy< -1e-10?-mu/(2*energy):null,
 caveat:"Toy instantaneous Newtonian impulse: initially circular relative orbit r=(1,0), v=(0,1), GM_before=1. Kick direction measured from initial tangential motion. Ignores ejecta interaction, collision, and nonimpulsive mass loss."};
}
function chirp(x={}){
 const m1=num(x.m1,1,100),m2=num(x.m2,1,100),forb=num(x.forb,.01,1000);
 const mc=(m1*m2)**.6/(m1+m2)**.2,fgw=2*forb,tau=mc*4.92549095e-6;
 return {m1,m2,forb,mc,fgw,tSec:5/256*tau**(-5/3)*(Math.PI*fgw)**(-8/3),
 fDot:96/5*Math.PI**(8/3)*tau**(5/3)*fgw**(11/3),
 caveat:"Leading-order quasi-circular point-mass source-frame relation at negligible redshift; time is extrapolated to the formal coalescence limit, not a numerical merger forecast."};
}
function envelope(x={}){
 const released=num(x.released,0,100),required=num(x.required,0,100),alpha=num(x.alpha,0,1);
 return {released,required,alpha,usable:released*alpha,budgetMet:released*alpha>=required,
 caveat:"Only the toy inequality αΔE_orb≥E_bind. A satisfied energy ledger does not prove ejection, post-envelope survival, or merger time."};
}
function roche(x={}){
 const donor=num(x.donor,1,100),accretor=num(x.accretor,1,100),radius=num(x.radius,.01,100),a=num(x.a,.01,100);
 const q=donor/accretor,t=Math.cbrt(q),lobeOverA=.49*t*t/(.6*t*t+Math.log(1+t)),lobe=a*lobeOverA;
 return {donor,accretor,radius,a,q,lobe,overflow:radius>=lobe,
 caveat:"Eggleton Roche-lobe approximation for a circular synchronized binary. Overflow onset alone cannot establish mass-transfer stability."};
}
function selection(x={}){
 const a=num(x.a,0,100000),b=num(x.b,0,100000),pa=num(x.pa,0,1),pb=num(x.pb,0,1);
 const da=a*pa,db=b*pb;
 return {a,b,pa,pb,da,db,intrinsic:a+b?a/(a+b):null,detected:da+db?da/(da+db):null,
 caveat:"Expected toy counts, not actual detections. Real inference requires detection efficiency, exposure, redshift, measurement uncertainty and a population likelihood."};
}
function population(x={}){
 const n=Math.round(num(x.n,10,1000)),seed=Math.round(num(x.seed,1,2147483646));let state=seed;
 const rand=()=>{state=state*48271%2147483647;return state/2147483647;};
 let candidate=0,unbound=0,wide=0;const rows=[];
 for(let id=1;id<=n;id++){
  const f=.05+.45*rand(),k=1.25*rand(),angle=360*rand()-180,res=kick({f,k,angle});
  const yes=res.bound===true&&res.a<=2;
  if(res.bound===false)unbound++;else if(yes)candidate++;else wide++;
  if(id<=25)rows.push({id,f:Number(f.toFixed(3)),k:Number(k.toFixed(3)),angle:Number(angle.toFixed(1)),energy:Number(res.energy.toFixed(3)),candidate:yes});
 }
 const p=candidate/n;
 return {n,seed,candidate,unbound,wide,p,binomialSE:Math.sqrt(p*(1-p)/n),rows,
 caveat:"Seeded toy 2-body impulse simulation with arbitrarily chosen unitless birth distributions; 'candidate' means bound with post-event a≤2 only. Not a physical formation efficiency, merger forecast, COMPAS run or real research dataset."};
}
function evidence(history=[],units=[],now=Date.now()){
 const out=Object.fromEntries(["conceptual","quantitative","causal","model-critique"].map(k=>[k,{attempts:0,correct:0,due:0}]));
 const unitMap=new Map(units.map(u=>[u.id,u]));
 for(const r of history){
  const objective=unitMap.get(r?.unitId)?.objectives?.find(o=>o.id===r.objectiveId),v=out[objective?.component];
  if(!v||typeof r?.correct!=="boolean")continue;
  v.attempts++;if(r.correct)v.correct++;
 }
 for(const u of units)for(const o of u.objectives){
  if(!out[o.component])continue;
  const rows=history.filter(r=>r.unitId===u.id&&r.objectiveId===o.id&&typeof r.correct==="boolean");
  if(!rows.length)continue;
  const last=rows.at(-1),index=[...rows].reverse().findIndex(r=>!r.correct);
  const successes=index<0?rows.length:index,days=last.correct?(successes>=3?7:successes>=2?3:1):1;
  if(Number.isFinite(last.at)&&last.at+days*86400000<=now)out[o.component].due++;
 }
 return out;
}
root.AtlasResearchModels={kick,chirp,envelope,roche,selection,population,evidence};
})(typeof window!=="undefined"?window:globalThis);
