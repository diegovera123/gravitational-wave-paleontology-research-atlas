#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
const window={};
vm.runInNewContext(await fs.readFile("concept-figures.js","utf8"),{window,console});
const figures=window.AtlasScientificFigures;
const required=["wave","kick","chirp","selection","transfer","pipeline","binary","cosmic","orbitalEnergy","detector","wind","weights","bayesian"];
for(const name of required){
 const markup=figures.render(name);
 assert.match(markup,/<svg[^>]+role="img" aria-label="[^"]+"/,"Every scientific drawing has a descriptive accessible label");
 assert.match(markup,/<title>[^<]+<\/title><desc>[^<]+<\/desc>/,"Every drawing has a textual title and description");
 assert.match(markup,/Illustrative diagram, not a measurement or numerical simulation/,"Pedagogical figures are never presented as actual observational data");
 assert.ok(!markup.includes("NaN")&&!markup.includes("undefined"),"All SVG shapes have defined coordinates and text");
 assert.ok(markup.length>1100,"Diagrams contain actual drawn geometry, not three interchangeable generic boxes");
}
assert.match(figures.render("wave"),/freely falling test masses/);
assert.match(figures.render("kick"),/vector|kick/);
assert.match(figures.render("chirp"),/Schematic inspiral waveform/);
assert.match(figures.render("selection"),/equal classes/);
assert.match(figures.render("transfer"),/Roche/);
assert.match(figures.render("cosmic"),/propagation/);
assert.match(figures.render("orbitalEnergy"),/semi-major axis/);
assert.match(figures.render("detector"),/laser interferometer/);
assert.match(figures.render("wind"),/Stellar wind|stellar wind/);
assert.match(figures.render("weights"),/sampling weights/);
assert.match(figures.render("bayesian"),/Bayesian/);
const conceptInsight=await fs.readFile("concept-insight.js","utf8");
assert.ok(conceptInsight.includes("AtlasScientificFigures"),"Lesson renderer uses physical diagrams when the drawing module is available");
const index=await fs.readFile("index.html","utf8");
assert.ok(index.indexOf('src="concept-figures.js"')<index.indexOf('src="concept-insight.js"'),"Drawing module loads before the lesson renderer");
const graph=await fs.readFile("constellation.js","utf8");
assert.ok(graph.includes('id="concept-read-progress"'),"Reader shows non-assessment scroll position");
assert.ok(graph.includes('id="concept-back-top"'),"Reader provides navigation back to learning objectives");
assert.ok(!graph.includes("concept-dialog-tabs"),"Reading improvement does not reintroduce content tabs");
console.log("Passed: accessible, explicitly non-empirical physics schematics for 13 illustration routes, module load order, reader progress and back-to-top controls.");
