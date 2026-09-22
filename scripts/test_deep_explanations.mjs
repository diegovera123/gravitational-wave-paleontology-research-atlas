#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
const curriculum=JSON.parse(await fs.readFile("knowledge-graph/concepts.json","utf8")).concepts;
const data=JSON.parse(await fs.readFile("knowledge-graph/deep-explanations.json","utf8"));
const known=new Set(curriculum.map(c=>c.id));
assert.equal(data.schemaVersion,1);
assert.equal(data.units.length,12,"Twelve concrete science explanations are authored in this batch");
const seen=new Set();
for(const lesson of data.units){
 assert.ok(known.has(lesson.id)&&!seen.has(lesson.id),"Every lesson maps uniquely to an existing graph concept");
 seen.add(lesson.id);
 assert.ok(lesson.opening.length>=100,"Start from a concrete situation");
 assert.ok(lesson.steps.length>=4,"The reasoning proceeds step by step");
 for(const step of lesson.steps){
  assert.ok(step.heading.length>8&&step.text.length>=150,"Each step contains an explanatory mechanism, not a label or empty generality");
 }
 assert.ok(lesson.example.title&&lesson.example.text.length>=170,"An independently written illustrative example is required");
 assert.ok(lesson.boundary.length>=110,"State where the model fails or becomes conditional");
}
const context={window:{},console};
vm.runInNewContext(await fs.readFile("concept-figures.js","utf8"),context);
vm.runInNewContext(await fs.readFile("concept-insight.js","utf8"),context);
const insight=context.window.AtlasConceptInsight;
insight.load(data,curriculum);assert.equal(insight.deepCount(),12);
for(const item of data.units){
 const c=curriculum.find(x=>x.id===item.id),markup=insight.render(c);
 assert.ok(markup.includes('data-deep-explanation="'+item.id+'"'),"Deep content used rather than generic orientation");
 assert.equal((markup.match(/class="concept-deep-step"/g)||[]).length,item.steps.length);
 assert.ok(markup.indexOf("concept-deep-opening")<markup.indexOf("concept-deep-example"),"Scenario precedes worked example");
 assert.ok(markup.indexOf("concept-deep-example")<markup.indexOf("physics-figure"),"Topic-specific physical diagram follows the worked example");
 assert.ok(markup.includes('role="img"')&&markup.includes("not a measurement"),"Diagram uses accessible SVG and explicitly disclaims empirical status");
}
const shallow=curriculum.find(x=>!seen.has(x.id));
assert.ok(insight.render(shallow).includes("has not yet been authored"),"Unfinished topics are labeled rather than given invented deep instruction");
const graph=await fs.readFile("constellation.js","utf8");
const i=graph.indexOf("concept-learning-goals-title"),j=graph.indexOf("concept-explanation-title"),
 k=graph.indexOf("concept-resources-title");
assert.ok(i>=0&&i<j&&j<k,"One ordered learning unit has objectives, explanation, and bottom resources");
assert.ok(!graph.includes("concept-dialog-tabs")&&!graph.includes("switchTab("),"Concept instruction is not fragmented into four tabs");
console.log("Passed: 12 detailed concrete lessons, four-step mechanistic narratives, worked examples and limitations; one scrolling unit with goals first and resources last.");
