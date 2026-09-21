/* Small transparent adaptive-routing prototype. Not calibrated IRT, BKT, FSRS or a mastery classifier. */
(function(root){
"use strict";
const DAY=24*60*60*1000;
const safeHistory=history=>Array.isArray(history)?history.filter(r=>
  r&&typeof r.unitId==="string"&&typeof r.itemId==="string"&&typeof r.objectiveId==="string"&&
  typeof r.correct==="boolean"&&Number.isFinite(r.at)&&Number.isInteger(r.difficulty)&&r.difficulty>=1&&r.difficulty<=3).slice(-500):[];
function objectiveStats(unitId,objectiveId,history,now=Date.now()){
  const hits=safeHistory(history).filter(r=>r.unitId===unitId&&r.objectiveId===objectiveId);
  const recent=hits.slice(-3),last=hits.at(-1);
  const streak=[...hits].reverse().findIndex(r=>!r.correct);
  const successes=streak<0?hits.length:streak;
  // Scheduling is a simple transparent heuristic, not a fitted forgetting curve.
  const days=last?(last.correct?(successes>=3?7:successes>=2?3:1):1):0;
  const dueAt=last?last.at+days*DAY:null;
  return {attempts:hits.length,correct:hits.filter(r=>r.correct).length,recentSuccess:recent.filter(r=>r.correct).length,
    successes,lastAt:last?.at||null,dueAt,due:dueAt!==null&&dueAt<=now};
}
function targetDifficulty(stats){
  if(!stats.attempts)return 1;
  if(stats.recentSuccess===0)return 1;
  if(stats.recentSuccess>=3&&stats.attempts>=3)return 3;
  if(stats.recentSuccess>=2)return 2;
  return 1;
}
function chooseNext(items,unit,history,session=[],now=Date.now(),preferredObjectiveIds=[]){
  const previous=safeHistory(history).concat(safeHistory(session));
  const seen=new Set(session.map(r=>r.itemId));
  const options=items.filter(q=>q.unitId===unit.id&&!seen.has(q.id));
  if(!options.length)return null;
  const objectives=unit.objectives.map(o=>o.id);
  const stats=Object.fromEntries(objectives.map(id=>[id,objectiveStats(unit.id,id,previous,now)]));
  const sessionCounts=Object.fromEntries(objectives.map(id=>[id,session.filter(r=>r.objectiveId===id).length]));
  let viable=objectives.filter(id=>options.some(q=>q.objectiveId===id));
  // In an explicit review session, cover each due objective before adding broader practice.
  const dueUncovered=viable.filter(id=>preferredObjectiveIds.includes(id)&&sessionCounts[id]===0);
  if(dueUncovered.length)viable=dueUncovered;
  viable.sort((a,b)=>{
    const sa=stats[a],sb=stats[b],ca=sessionCounts[a],cb=sessionCounts[b];
    // Cover both objectives in a session, revisit weaker objectives, then prefer less-practised.
    const pa=ca*4+(sa.recentSuccess>=2?1:0)+(sa.due?-1:0);
    const pb=cb*4+(sb.recentSuccess>=2?1:0)+(sb.due?-1:0);
    return pa-pb || sa.attempts-sb.attempts || objectives.indexOf(a)-objectives.indexOf(b);
  });
  const id=viable[0],target=targetDifficulty(stats[id]);
  const bank=options.filter(q=>q.objectiveId===id);
  const lifetime=new Map();
  previous.forEach(r=>lifetime.set(r.itemId,(lifetime.get(r.itemId)||0)+1));
  bank.sort((a,b)=>{
    const ua=lifetime.get(a.id)||0,ub=lifetime.get(b.id)||0;
    return ua-ub || Math.abs(a.difficulty-target)-Math.abs(b.difficulty-target) ||
      a.difficulty-b.difficulty || a.id.localeCompare(b.id);
  });
  return bank[0]||null;
}
function dueObjectives(units,history,now=Date.now()){
  return units.flatMap(unit=>unit.objectives.map(o=>({unitId:unit.id,objectiveId:o.id,
    ...objectiveStats(unit.id,o.id,history,now)}))).filter(x=>x.attempts>0&&x.due);
}
function validateBank(bank,units){
  if(!bank||bank.schemaVersion!==1||!Array.isArray(bank.items))throw Error("Unsupported adaptive item bank");
  const keys=new Set(),unitMap=new Map(units.map(u=>[u.id,u]));
  for(const item of bank.items){
    const unit=unitMap.get(item.unitId);
    if(!unit||keys.has(item.id)||!unit.objectives.some(o=>o.id===item.objectiveId)||
      !Number.isInteger(item.difficulty)||item.difficulty<1||item.difficulty>3||
      !Array.isArray(item.choices)||item.choices.length<3||!Number.isInteger(item.correctIndex)||
      item.correctIndex<0||item.correctIndex>=item.choices.length||!item.prompt||!item.hint||!item.feedback)
      throw Error("Invalid adaptive item "+item.id);
    keys.add(item.id);
  }
  for(const unit of units)for(const obj of unit.objectives){
    if(bank.items.filter(q=>q.unitId===unit.id&&q.objectiveId===obj.id).length<3)
      throw Error("Insufficient practice coverage: "+unit.id+" / "+obj.id);
  }
  return true;
}
root.AtlasAdaptive={DAY,safeHistory,objectiveStats,targetDifficulty,chooseNext,dueObjectives,validateBank};
})(typeof window!=="undefined"?window:globalThis);
