#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";

const concepts=JSON.parse(await fs.readFile("knowledge-graph/concepts.json","utf8")).concepts;
const items=JSON.parse(await fs.readFile("knowledge-graph/diagnostic-items.json","utf8")).items;
const window={};
vm.runInNewContext(await fs.readFile("diagnostic.js","utf8"),{window});
const d=window.AtlasDiagnostic;

const goal=["binary-population-synthesis"];
const relevant=d.prerequisiteClosure(goal,concepts);
assert.ok(relevant.includes("binary-population-synthesis"));
assert.ok(relevant.length>1,"Goal should expose necessary prerequisite closure");
let state={ratings:{},relevantIds:relevant,queue:d.initialQueue(goal,concepts),priorityIds:[],sequence:[]};
const first=d.nextConcept(state,concepts);
assert.equal(first,"binary-population-synthesis","Diagnostic begins near the learner's chosen goal");
state=d.recordRating(state,concepts,first,0,3);
const second=d.nextConcept(state,concepts);
const firstConcept=concepts.find(c=>c.id===first);
const direct=firstConcept.prerequisites.filter(e=>e.kind==="necessary").map(e=>e.id);
assert.ok(direct.includes(second),"Low self-rating descends to a necessary prerequisite");

const ratings={
  derivatives:{rating:4,confidence:3},
  "probability-distributions":{rating:2,confidence:2},
  "binary-population-synthesis":{rating:1,confidence:3}
};
const selected=d.chooseVerification(ratings,items,3);
assert.ok(selected.some(item=>item.conceptId==="derivatives"),"High positive self-rating is sampled when a concept check exists");
assert.equal(d.classifyEvidence(ratings.derivatives,{correct:true,confidence:3}),"supported");
assert.equal(d.classifyEvidence(ratings.derivatives,{correct:false,confidence:3}),"calibration-gap");
assert.equal(d.classifyEvidence({rating:2,confidence:2},{correct:true,confidence:1}),"supported-low-confidence");

const profile={
  goalConceptIds:["binary-population-synthesis"],
  relevantIds:d.prerequisiteClosure(["binary-population-synthesis"],concepts),
  ratings:{
    "probability-distributions":{rating:3,confidence:3},
    "monte-carlo-methods":{rating:1,confidence:2}
  },
  verifications:{
    "probability-distributions":{correct:true,confidence:3}
  }
};
const recommendations=d.recommendedConcepts(profile,concepts,5);
assert.ok(recommendations.length>0,"Profile yields at least one provisional next concept");
assert.ok(recommendations.every(id=>profile.relevantIds.includes(id)),"Recommendations remain on the selected prerequisite pathway");

console.log("Passed: goal-centered traversal, low-rating prerequisite descent, verification sampling, calibration labels and pathway-bound recommendations.");
