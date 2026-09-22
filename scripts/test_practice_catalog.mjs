#!/usr/bin/env node
// Structural and routing checks are not a psychometric validation of the practice bank.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
const read=async path=>JSON.parse(await fs.readFile(path,"utf8"));
const [lessons,legacy,extended,curriculum]=await Promise.all([
 read("knowledge-graph/learning-units.json"),read("knowledge-graph/adaptive-items.json"),
 read("knowledge-graph/practice-sets.json"),read("knowledge-graph/concepts.json")]);
const window={};
vm.runInNewContext(await fs.readFile("adaptive.js","utf8"),{window});
vm.runInNewContext(await fs.readFile("practice-catalog.js","utf8"),{window});
const a=window.AtlasAdaptive,catalog=window.AtlasPractice.build(lessons.units,legacy,extended,curriculum.concepts);
assert.equal(extended.sets.length,12);
assert.equal(catalog.units.size,15,"Preserve all three full pilot lessons and add twelve separate deep practice tracks");
assert.equal(catalog.items.length,168,"Twenty-four pilot items plus 144 new authored questions");
assert.equal(extended.sets.reduce((n,u)=>n+u.cases.length,0),24,"Two worked scenarios per added track");
assert.equal(catalog.byConcept.size,15,"Each assessed set has a real navigable graph concept");
assert.equal(a.validateBank({schemaVersion:1,items:catalog.items},[...catalog.units.values()]),true);
assert.deepEqual(new Set(extended.sets.flatMap(s=>s.objectives.map(o=>o.component))),
 new Set(["conceptual","quantitative","causal","model-critique"]));
const itemIds=new Set(),keySlots=new Set();
for(const q of catalog.items){
 assert.ok(!itemIds.has(q.id),"Unique item IDs across legacy and new banks");
 itemIds.add(q.id);keySlots.add(q.correctIndex);
}
assert.equal(keySlots.size,3,"Answer keys are distributed across all three displayed option positions");
for(const source of extended.sets){
 const u=catalog.units.get(source.id);
 assert.ok(u.practiceOnly,"A deep practice track is not mislabeled as a fully authored lesson");
 assert.equal(u.objectives.length,4);
 assert.equal(u.sessionLength,12);
 assert.equal(source.objectives.reduce((n,o)=>n+o.questions.length,0),12);
 const authored=source.objectives.flatMap(o=>o.questions.map(q=>({o,q})));
 for(const {o,q} of authored){
  const after=catalog.items.find(item=>item.id===source.id+"-"+q.id);
  assert.ok(after);
  assert.equal(after.choices[after.correctIndex],q.choices[q.correctIndex],
   "Shuffling options preserves the correct answer");
  assert.equal(after.objectiveId,o.id);
 }
 // A normal 12-question assessment samples all 4 distinct objectives with no repeats.
 const seen=[],results=[];
 for(let i=0;i<12;i++){
   const item=a.chooseNext(catalog.items,u,[],results,1_700_000_000_000);
   assert.ok(item,"12 questions remain available within this track");
   assert.ok(!seen.includes(item.id),"No item is repeated in the same session");
   seen.push(item.id);
   results.push({unitId:u.id,itemId:item.id,objectiveId:item.objectiveId,
     difficulty:item.difficulty,correct:false,at:1_700_000_000_000+i});
 }
 assert.equal(new Set(results.map(r=>r.objectiveId)).size,4,"Every component is assessed in the complete set");
 assert.ok(u.objectives.every(o=>results.filter(r=>r.objectiveId===o.id).length===3),
   "Three unique questions assess each component in the full set");
 const target=u.objectives[2].id;
 for(let i=0;i<3;i++){
   const restricted=a.chooseNext(catalog.items,u,[],results.slice(0,i),1_700_000_000_000,[],[target]);
   if(restricted)assert.equal(restricted.objectiveId,target,"Targeted check stays in its selected component");
 }
}
const z=extended.sets.find(s=>s.id==="cosmic-history");
assert.ok(z.objectives.some(o=>o.questions.some(q=>q.prompt.includes("source-frame"))));
assert.ok(extended.sets.some(s=>s.id==="detection-selection"));
assert.ok(extended.sets.some(s=>s.id==="reproduce-a-result"));
console.log("Passed: 15 practice tracks, 168 questions, 48 new components, 24 self-checked applied cases, shuffled correct keys, full and targeted assessment coverage.");
