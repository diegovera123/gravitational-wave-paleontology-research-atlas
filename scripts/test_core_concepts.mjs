#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";

const [curriculum,navigation,manifest,moduleSource]=await Promise.all([
 fs.readFile("knowledge-graph/concepts.json","utf8").then(JSON.parse),
 fs.readFile("knowledge-graph/navigation.json","utf8").then(JSON.parse),
 fs.readFile("knowledge-graph/gw-core-concepts.json","utf8").then(JSON.parse),
 fs.readFile("gw-core-coverage.js","utf8")
]);
const window={};vm.runInNewContext(moduleSource,{window,globalThis:window});
const core=window.AtlasCoreCoverage;
assert.ok(core,"Core coverage module exports its expansion API");
assert.equal(manifest.labels.length,171,"The exact requested list contains 171 concepts");
assert.equal(new Set(manifest.labels).size,171,"Every requested label is unique");
core.validate(manifest,curriculum.concepts,navigation);
const expanded=core.expand(manifest,curriculum.concepts,navigation);
assert.equal(expanded.coverage.length,171);
assert.equal(expanded.generated,130,"130 requested concepts require new orientation nodes in the current curriculum");
assert.equal(expanded.aliasesAdded,41,"41 requested concepts reuse an existing semantically equivalent Atlas node");
assert.equal(expanded.concepts.length,curriculum.concepts.length+130);
assert.equal(new Set(expanded.coverage.map(x=>x.conceptId)).size,171,"Each requested item has a distinct canonical concept node");

const byId=new Map(expanded.concepts.map(c=>[c.id,c]));
const macroIds=new Set(expanded.navigation.macros.map(m=>m.id));
const memberships=new Map();
for(const topic of expanded.navigation.topics){
 const macro=byId.get(topic.macroId);assert.ok(macro,"Every topic has a real macro");
 for(const id of topic.conceptIds){
  assert.ok(byId.has(id),"Every navigation concept exists: "+id);
  assert.equal(byId.get(id).domain,macro.domain,"Topic membership stays within its scientific domain: "+id);
  memberships.set(id,(memberships.get(id)||0)+1);
 }
}
for(const row of expanded.coverage){
 const concept=byId.get(row.conceptId);assert.ok(concept,"Requested concept resolves: "+row.label);
 assert.ok(concept.title===row.label||(concept.aliases||[]).includes(row.label),"Exact requested label is represented: "+row.label);
 assert.ok([concept.title,...(concept.tags||[]),...(concept.aliases||[])].join(" ").toLowerCase().includes(row.label.toLowerCase()),"Exact label is searchable: "+row.label);
 if(!macroIds.has(concept.id))assert.equal(memberships.get(concept.id),1,"Requested concept is navigable exactly once: "+row.label);
 if(!row.reused){
  assert.ok((concept.tags||[]).includes("coverage-orientation"),"New coverage nodes explicitly identify their introductory status");
  assert.equal(concept.learningObjectives.length,2);
  assert.match(concept.masteryAssessment,/assumption or limitation/i);
 }
}
for(const label of [
 "Gravitational-wave strain","Black holes","Effective spin χ_eff","Matched filtering","LIGO","Nested sampling",
 "FLRW cosmology","Pair-instability supernovae","AGN disks","Injection campaigns","Gaussian processes",
 "Progenitor reconstruction","Stochastic gravitational-wave background","Standard sirens","Cosmic archaeology"
])assert.ok(expanded.coverage.some(x=>x.label===label),"Cross-section sentinel present: "+label);

console.log(`Passed: exact 171-concept GW paleontology manifest; ${expanded.generated} new navigable orientation nodes + ${expanded.aliasesAdded} exact aliases; ${expanded.concepts.length} live Atlas concepts after expansion.`);
