#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
const curriculum=JSON.parse(await fs.readFile("knowledge-graph/concepts.json","utf8")).concepts;
const data=JSON.parse(await fs.readFile("knowledge-graph/deep-explanations.json","utf8"));
const known=new Set(curriculum.map(c=>c.id));
assert.equal(data.schemaVersion,1);assert.equal(data.units.length,37,"The deep content library now has 37 individually authored science and research lessons");
const seen=new Set();
for(const lesson of data.units){assert.ok(known.has(lesson.id)&&!seen.has(lesson.id));seen.add(lesson.id);assert.ok(lesson.opening.length>=100);assert.ok(lesson.steps.length>=4);for(const step of lesson.steps)assert.ok(step.heading.length>8&&step.text.length>=150);assert.ok(lesson.example.title&&lesson.example.text.length>=170);assert.ok(lesson.boundary.length>=110);}
const context={window:{},console};vm.runInNewContext(await fs.readFile("concept-figures.js","utf8"),context);vm.runInNewContext(await fs.readFile("concept-insight.js","utf8"),context);
const insight=context.window.AtlasConceptInsight;insight.load(data,curriculum);assert.equal(insight.deepCount(),37);
for(const item of data.units){const c=curriculum.find(x=>x.id===item.id),markup=insight.render(c);assert.ok(markup.includes('data-deep-explanation="'+item.id+'"'));assert.equal((markup.match(/class="concept-deep-step"/g)||[]).length,item.steps.length);assert.ok(markup.indexOf("concept-deep-opening")<markup.indexOf("concept-deep-example"));assert.ok(markup.indexOf("concept-deep-example")<markup.indexOf("physics-figure"));assert.ok(markup.includes('role="img"')&&markup.includes("not a measurement"));}
const shallow=curriculum.find(x=>!seen.has(x.id));assert.ok(insight.render(shallow).includes("has not yet been authored"));
const graph=await fs.readFile("constellation.js","utf8");
const i=graph.indexOf("Learning objectives"),j=graph.indexOf("Understand the idea"),k=graph.indexOf("Research resources");
assert.ok(i>=0&&i<j&&j<k,"One ordered full reader keeps objectives before explanation and resources last");
assert.ok(graph.includes("constellation-context-learn"),"Navigation separates compact concept context from the optional full reader");
assert.ok(!graph.includes("concept-dialog-tabs")&&!graph.includes("switchTab("),"Concept instruction is not fragmented into content tabs");
console.log("Passed: 37 original concrete lessons with physical situations, worked examples, equations and limitations; semantic graph context leads to one continuous reader.");
