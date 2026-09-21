/* Concept Discovery Diagnostic: transparent self-assessment + sampled conceptual checks.
   This module does not infer mastery or psychometric ability. */
(function(root){
"use strict";
function indexConcepts(concepts){return new Map(concepts.map(c=>[c.id,c]));}
function necessaryIds(concept){return (concept?.prerequisites||[]).filter(e=>e.kind==="necessary").map(e=>e.id);}
function prerequisiteClosure(goalIds,concepts){
  const byId=indexConcepts(concepts),seen=new Set(),stack=[...goalIds];
  while(stack.length){
    const id=stack.pop();if(seen.has(id)||!byId.has(id))continue;seen.add(id);
    necessaryIds(byId.get(id)).forEach(p=>stack.push(p));
  }
  return [...seen];
}
function distanceFromGoals(goalIds,concepts){
  const byId=indexConcepts(concepts),dist=new Map(),queue=goalIds.map(id=>[id,0]);
  while(queue.length){
    const [id,d]=queue.shift();if(!byId.has(id))continue;
    if(dist.has(id)&&dist.get(id)<=d)continue;dist.set(id,d);
    necessaryIds(byId.get(id)).forEach(p=>queue.push([p,d+1]));
  }
  return dist;
}
function initialQueue(goalIds,concepts){
  const dist=distanceFromGoals(goalIds,concepts);
  return [...dist.entries()].sort((a,b)=>a[1]-b[1]||a[0].localeCompare(b[0])).map(([id])=>id);
}
function nextConcept(state,concepts){
  const byId=indexConcepts(concepts),rated=new Set(Object.keys(state.ratings||{})),relevant=new Set(state.relevantIds||[]);
  const directPriority=(state.priorityIds||[]).filter(id=>relevant.has(id)&&byId.has(id)&&!rated.has(id));
  if(directPriority.length)return directPriority[0];
  const queue=(state.queue||[]).filter(id=>relevant.has(id)&&byId.has(id)&&!rated.has(id));
  return queue[0]||null;
}
function recordRating(state,concepts,conceptId,rating,confidence){
  const byId=indexConcepts(concepts),concept=byId.get(conceptId);
  if(!concept)throw Error("Unknown diagnostic concept "+conceptId);
  const next=JSON.parse(JSON.stringify(state));
  next.ratings=next.ratings||{};
  next.ratings[conceptId]={rating,confidence,at:Date.now()};
  next.sequence=next.sequence||[];if(!next.sequence.includes(conceptId))next.sequence.push(conceptId);
  next.priorityIds=(next.priorityIds||[]).filter(id=>id!==conceptId);
  next.queue=(next.queue||[]).filter(id=>id!==conceptId);
  const prereqs=necessaryIds(concept).filter(id=>(next.relevantIds||[]).includes(id)&&!next.ratings[id]);
  // Low self-ratings descend through prerequisites immediately. Higher ratings still sample prerequisites,
  // but do not force every ancestor to be rated before moving on.
  if(rating<=1)next.priorityIds=[...prereqs,...next.priorityIds];
  else if(rating===2&&prereqs.length)next.priorityIds=[prereqs[0],...next.priorityIds,...prereqs.slice(1)];
  else if(rating>=3&&confidence>=2&&prereqs.length)next.queue.push(...prereqs.filter(id=>!next.queue.includes(id)));
  return next;
}
function chooseVerification(ratings,items,max=3){
  const itemByConcept=new Map(items.map(item=>[item.conceptId,item]));
  const candidates=Object.entries(ratings||{}).filter(([id,r])=>r.rating>=2&&itemByConcept.has(id))
    .sort((a,b)=>{
      const ra=a[1],rb=b[1];
      const sa=ra.rating*3+ra.confidence*2,sb=rb.rating*3+rb.confidence*2;
      return sb-sa || a[0].localeCompare(b[0]);
    });
  return candidates.slice(0,max).map(([id])=>itemByConcept.get(id));
}
function classifyEvidence(rating,verification){
  if(!rating)return "unassessed";
  if(!verification)return rating.rating>=3?"self-rated-high":rating.rating===2?"developing":"review";
  if(verification.correct){
    if(rating.rating>=3&&verification.confidence>=2)return "supported";
    if(verification.confidence===1)return "supported-low-confidence";
    return "developing";
  }
  if(rating.rating>=3&&verification.confidence>=2)return "calibration-gap";
  return "review";
}
function summarize(profile){
  const counts={supported:0,"supported-low-confidence":0,"calibration-gap":0,review:0,developing:0,"self-rated-high":0,unassessed:0};
  for(const [id,rating] of Object.entries(profile.ratings||{})){
    const status=classifyEvidence(rating,(profile.verifications||{})[id]);
    counts[status]=(counts[status]||0)+1;
  }
  return counts;
}
function recommendedConcepts(profile,concepts,limit=5){
  const byId=indexConcepts(concepts),relevant=new Set(profile.relevantIds||[]),ratings=profile.ratings||{},ver=profile.verifications||{};
  const candidates=[...relevant].map(id=>byId.get(id)).filter(Boolean).filter(c=>{
    const status=classifyEvidence(ratings[c.id],ver[c.id]);
    return ["review","calibration-gap","developing"].includes(status)||!ratings[c.id];
  });
  const ready=candidates.filter(c=>necessaryIds(c).every(pid=>{
    if(!relevant.has(pid))return true;
    const status=classifyEvidence(ratings[pid],ver[pid]);
    return ["supported","supported-low-confidence","self-rated-high"].includes(status);
  }));
  const pool=ready.length?ready:candidates;
  const dist=distanceFromGoals(profile.goalConceptIds||[],concepts);
  return pool.sort((a,b)=>(dist.get(b.id)||0)-(dist.get(a.id)||0)||a.title.localeCompare(b.title)).slice(0,limit).map(c=>c.id);
}
root.AtlasDiagnostic={prerequisiteClosure,distanceFromGoals,initialQueue,nextConcept,recordRating,chooseVerification,classifyEvidence,summarize,recommendedConcepts};
})(typeof window!=="undefined"?window:globalThis);
