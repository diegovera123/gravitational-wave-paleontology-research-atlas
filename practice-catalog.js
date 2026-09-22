/* Independently authored extended practice catalog; keeps complete lessons separate. */
(function(root){
"use strict";
const COMPONENTS=["conceptual","quantitative","causal","model-critique"];
function reorder(item){
  // Stable per-item rotation avoids all answer keys sharing the same visible slot.
  const shift=[...item.id].reduce((sum,ch)=>sum+ch.charCodeAt(0),0)%item.choices.length;
  return {...item,choices:item.choices.map((_,i)=>item.choices[(i+shift)%item.choices.length]),
    correctIndex:(item.correctIndex-shift+item.choices.length)%item.choices.length};
}
function build(lessons,legacyBank,extended,concepts){
 if(!extended||extended.schemaVersion!==1||!Array.isArray(extended.sets))throw Error("Unsupported extended practice catalog.");
 const conceptsById=new Map(concepts.map(c=>[c.id,c]));
 const units=new Map(lessons.map(unit=>[unit.id,{...unit,practiceOnly:false,
   title:conceptsById.get(unit.id)?.title||unit.id,area:conceptsById.get(unit.id)?.domain||"Foundations",
   conceptId:unit.id,sessionLength:5,cases:[]}]));
 const byConcept=new Map(lessons.map(u=>[u.id,u.id]));
 const ids=new Set(legacyBank.items.map(q=>q.id)),items=legacyBank.items.map(q=>reorder({...q,
   component:q.objectiveId==="compute-derivative"||q.objectiveId==="compose-velocity"?"quantitative":
   q.objectiveId==="avoid-double-counting"?"model-critique":"conceptual"}));
 for(const set of extended.sets){
   if(!set||!set.id||units.has(set.id)||!conceptsById.has(set.conceptId)||byConcept.has(set.conceptId)||
      !set.title||!set.area||!set.summary||!Array.isArray(set.cases)||set.cases.length<2||
      !Array.isArray(set.sources)||!set.sources.length||!Array.isArray(set.objectives)||set.objectives.length<4)
     throw Error("Invalid extended practice set "+set?.id);
   if(set.sources.some(source=>!source.title||!/^https:\/\//.test(source.url)))throw Error("Invalid source "+set.id);
   const objectiveIds=new Set();
   for(const o of set.objectives){
     if(!o.id||objectiveIds.has(o.id)||!COMPONENTS.includes(o.component)||!o.title||!o.evidence||
        !Array.isArray(o.questions)||o.questions.length<3)throw Error("Invalid objective "+set.id+"/"+o?.id);
     objectiveIds.add(o.id);
     for(const q of o.questions){
       const id=set.id+"-"+q.id;
       if(ids.has(id)||!q.prompt||!q.hint||!q.feedback||!Number.isInteger(q.difficulty)||
          q.difficulty<1||q.difficulty>3||!Array.isArray(q.choices)||q.choices.length<3||
          new Set(q.choices).size!==q.choices.length||!Number.isInteger(q.correctIndex)||
          q.correctIndex<0||q.correctIndex>=q.choices.length)
         throw Error("Invalid practice question "+id);
       ids.add(id);items.push(reorder({id,unitId:set.id,objectiveId:o.id,difficulty:q.difficulty,
         prompt:q.prompt,choices:q.choices,correctIndex:q.correctIndex,hint:q.hint,
         feedback:q.feedback,component:o.component}));
     }
   }
   if(set.cases.some(c=>!c.title||!c.scenario||!c.task||!Array.isArray(c.steps)||c.steps.length<2||!c.solution))
     throw Error("Invalid applied case "+set.id);
   const {objectives,...rest}=set;
   units.set(set.id,{...rest,objectives:objectives.map(({questions,...o})=>o),
     practiceOnly:true,sessionLength:Math.min(12,objectives.reduce((n,o)=>n+o.questions.length,0))});
   byConcept.set(set.conceptId,set.id);
 }
 return {units,items,byConcept,components:COMPONENTS};
}
root.AtlasPractice={build,COMPONENTS};
})(typeof window!=="undefined"?window:globalThis);
