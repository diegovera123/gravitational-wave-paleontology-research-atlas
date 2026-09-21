/* Concept Discovery Diagnostic: transparent self-assessment + sparse conceptual checks.
 * No inferred mastery, no hidden profile, no automatic prerequisite certification. */
(function (root) {
  "use strict";
  const MAX_STEPS=10, MAX_CHECKS=5;
  const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
  const necessary=concept=>(concept.prerequisites||[]).filter(e=>e.kind==="necessary").map(e=>e.id);
  const byId=(concepts)=>new Map(concepts.map(c=>[c.id,c]));
  function validateQuestions(data,concepts){
    if(!data||data.schemaVersion!==1||!Array.isArray(data.questions))throw Error("Invalid concept diagnostic bank.");
    const ids=new Set(concepts.map(c=>c.id)),seen=new Set();
    for(const q of data.questions){
      if(!ids.has(q.conceptId)||seen.has(q.id)||!q.prompt||!q.feedback||
        !Array.isArray(q.choices)||q.choices.length<3||
        new Set(q.choices).size!==q.choices.length||
        !Number.isInteger(q.correctIndex)||q.correctIndex<0||q.correctIndex>=q.choices.length)
        throw Error("Invalid diagnostic check: "+q.id);
      seen.add(q.id);
    }
    return true;
  }
  function buildScope(concepts,goalId,seedIds){
    const m=byId(concepts);
    if(!m.has(goalId))throw Error("Unknown diagnostic goal.");
    const seeds=[goalId,...seedIds].filter((id,i,arr)=>m.has(id)&&arr.indexOf(id)===i);
    const scope=new Set(seeds),queue=seeds.map(id=>({id,depth:0}));
    for(let i=0;i<queue.length;i++){
      const {id,depth}=queue[i];
      if(depth>=3)continue;
      for(const pre of necessary(m.get(id))){
        if(m.has(pre)&&!scope.has(pre)&&scope.size<90){
          scope.add(pre);queue.push({id:pre,depth:depth+1});
        }
      }
    }
    return {seeds,scope:[...scope]};
  }
  function start(concepts,goalId,seedIds=[],maxSteps=MAX_STEPS){
    const scope=buildScope(concepts,goalId,seedIds);
    return {schemaVersion:1,goalId,seedIds:scope.seeds,scopeIds:scope.scope,
      maxSteps:Math.min(MAX_STEPS,Math.max(1,maxSteps)),maxChecks:MAX_CHECKS,
      currentId:goalId,stepIds:[],ratings:{},checks:{},pending:[],
      branchStreak:0,finished:false,startedAt:Date.now()};
  }
  function rate(session,conceptId,rating,certainty=0){
    if(session.finished||session.currentId!==conceptId||!Number.isInteger(rating)||rating<0||rating>4||
      !Number.isInteger(certainty)||certainty<0||certainty>3)throw Error("Invalid concept self-rating.");
    session.ratings[conceptId]={rating,certainty,at:Date.now()};
    return session;
  }
  function recordCheck(session,conceptId,question,choice,answerConfidence){
    if(session.currentId!==conceptId||!own(session.ratings,conceptId)||
      question.conceptId!==conceptId||!Number.isInteger(choice)||choice<0||choice>=question.choices.length||
      !Number.isInteger(answerConfidence)||answerConfidence<1||answerConfidence>3 ||
      own(session.checks,conceptId))throw Error("Invalid concept-check response.");
    session.checks[conceptId]={questionId:question.id,choice,correct:choice===question.correctIndex,
      answerConfidence,at:Date.now()};
    return session.checks[conceptId];
  }
  function resultStatus(ratingRecord,checkRecord){
    if(!ratingRecord)return "unassessed";
    if(ratingRecord.skipped)return "skipped";
    if(checkRecord&&!checkRecord.correct)return checkRecord.answerConfidence===3?"review-confident":"review";
    if(checkRecord&&checkRecord.correct){
      return checkRecord.answerConfidence===1?"supported-uncertain":"supported";
    }
    return ratingRecord.rating<=1?"self-reported-gap":"self-reported";
  }
  function advance(session,concepts){
    if(session.finished)return null;
    const id=session.currentId;
    if(id&&!session.stepIds.includes(id))session.stepIds.push(id);
    if(session.stepIds.length>=session.maxSteps){
      session.finished=true;session.currentId=null;return null;
    }
    const m=byId(concepts),seen=new Set(session.stepIds);
    const current=id&&m.get(id),rating=session.ratings[id]?.rating;
    const check=session.checks[id],needsBasics=(rating!==undefined&&rating<=2)||check?.correct===false;
    if(needsBasics&&session.branchStreak<2&&current){
      for(const pre of necessary(current).filter(p=>session.scopeIds.includes(p)).reverse()){
        if(!seen.has(pre)&&!session.pending.includes(pre))session.pending.unshift(pre);
      }
    }
    const unvisitedSeeds=session.seedIds.filter(x=>!seen.has(x));
    let next=null;
    if(session.branchStreak>=2&&unvisitedSeeds.length){
      next=unvisitedSeeds[0];session.branchStreak=0;
    }else{
      while(session.pending.length&&!next){
        const candidate=session.pending.shift();
        if(!seen.has(candidate))next=candidate;
      }
      if(next)session.branchStreak++;
    }
    if(!next&&unvisitedSeeds.length){next=unvisitedSeeds[0];session.branchStreak=0;}
    if(!next){next=session.scopeIds.find(x=>!seen.has(x))||null;session.branchStreak=0;}
    session.currentId=next;session.finished=!next;
    return next;
  }
  function skip(session,concepts){
    if(!session.currentId)throw Error("No concept available to skip.");
    session.ratings[session.currentId]={skipped:true,at:Date.now()};
    return advance(session,concepts);
  }
  function canCheck(session,questions,conceptId){
    return !own(session.checks,conceptId)&&Object.keys(session.checks).length<session.maxChecks&&
      questions.some(q=>q.conceptId===conceptId);
  }
  function statusForId(session,id){
    return resultStatus(session?.ratings?.[id],session?.checks?.[id]);
  }
  function summary(session,concepts){
    const m=byId(concepts),assessed=session.stepIds.filter(id=>session.ratings[id]&&!session.ratings[id].skipped);
    const checks=assessed.filter(id=>session.checks[id]);
    const flagged=assessed.filter(id=>["review","review-confident","self-reported-gap","supported-uncertain"].includes(statusForId(session,id)));
    // Recommendations are about where to explore, not about inferred mastery or ability.
    const ids=[...flagged,...session.seedIds,...session.scopeIds].filter((id,i,arr)=>m.has(id)&&arr.indexOf(id)===i);
    const rank=id=>{const state=statusForId(session,id);return state==="review-confident"?0:
      state==="review"?1:state==="self-reported-gap"?2:state==="supported-uncertain"?3:
      state==="unassessed"&&session.seedIds.includes(id)?4:
      state==="unassessed"?5:7;};
    const picks=ids.sort((a,b)=>rank(a)-rank(b)).filter(id=>rank(id)<7).slice(0,5);
    return {rated:assessed.length,checked:checks.length,correct:checks.filter(id=>session.checks[id].correct).length,
      flagged,checkedIds:checks,recommendations:picks.map(id=>({id,title:m.get(id).title,status:statusForId(session,id)}))};
  }
  root.AtlasDiagnostic={MAX_STEPS,MAX_CHECKS,necessary,validateQuestions,buildScope,start,rate,recordCheck,
    resultStatus,advance,skip,canCheck,statusForId,summary};
})(typeof window!=="undefined"?window:globalThis);
