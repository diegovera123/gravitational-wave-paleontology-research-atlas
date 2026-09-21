#!/usr/bin/env node
// Transparent heuristics: deterministic unit tests, not a validation of learning outcomes.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
const units=JSON.parse(await fs.readFile("knowledge-graph/learning-units.json","utf8")).units;
const bank=JSON.parse(await fs.readFile("knowledge-graph/adaptive-items.json","utf8"));
const window={};
vm.runInNewContext(await fs.readFile("adaptive.js","utf8"),{window});
const a=window.AtlasAdaptive;
assert.equal(a.validateBank(bank,units),true);
assert.equal(bank.items.length,24);
assert.equal(new Set(bank.items.map(item=>item.id)).size,24);
const unit=units.find(u=>u.id==="derivatives");
const base=1_700_000_000_000;
const first=a.chooseNext(bank.items,unit,[],[],base);
assert.equal(first.objectiveId,unit.objectives[0].id,"Start with an uncovered learning objective");
assert.equal(first.difficulty,1,"Start from accessible author-defined difficulty");
const firstResult={unitId:unit.id,itemId:first.id,objectiveId:first.objectiveId,
  correct:true,difficulty:first.difficulty,at:base};
const second=a.chooseNext(bank.items,unit,[],[firstResult],base);
assert.notEqual(second.objectiveId,first.objectiveId,"Next cover the other objective");
assert.notEqual(second.id,first.id,"Do not repeat a question within a short session");
const secondResult={unitId:unit.id,itemId:second.id,objectiveId:second.objectiveId,
  correct:false,difficulty:second.difficulty,at:base+1};
const third=a.chooseNext(bank.items,unit,[],[firstResult,secondResult],base+2);
assert.notEqual(third.id,first.id);
assert.notEqual(third.id,second.id);
assert.equal(a.objectiveStats(unit.id,first.objectiveId,[firstResult],base).due,false);
assert.equal(a.objectiveStats(unit.id,first.objectiveId,[firstResult],base+a.DAY+1).due,true,
  "First success schedules a due review after a day (heuristic)");
const afterError=a.objectiveStats(unit.id,second.objectiveId,[secondResult],base+a.DAY+1);
assert.equal(afterError.due,true,"Incorrect evidence also triggers a review recommendation");
const fakeUnit={id:"fake",objectives:[{id:"skill"}]};
const fakeItem=(id,difficulty)=>({id,unitId:"fake",objectiveId:"skill",difficulty});
const fakeBank=[fakeItem("one",1),fakeItem("two",1),fakeItem("three",2),fakeItem("four",3)];
const good=(id,at)=>({unitId:"fake",itemId:id,objectiveId:"skill",difficulty:1,correct:true,at});
assert.equal(a.chooseNext(fakeBank,fakeUnit,[good("one",base),good("two",base+1)],[],base+2).difficulty,2,
  "After two successes, prefer intermediate authored difficulty when new items remain");
assert.equal(a.dueObjectives([unit],[firstResult],base+a.DAY+1).length,1);
assert.equal(a.dueObjectives([unit],[firstResult],base).length,0);
console.log("Passed: item bank integrity, objective coverage, no in-session repetition, responsive difficulty, and explicit due-review heuristics.");
