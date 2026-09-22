#!/usr/bin/env node
// No WebGL required: test the actual 3D scene data, hierarchical node-click
// routing, keyboard-equivalent cluster buttons and fallback with a DOM stub.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
const concepts=JSON.parse(await fs.readFile("knowledge-graph/concepts.json","utf8")).concepts;
const navigation=JSON.parse(await fs.readFile("knowledge-graph/navigation.json","utf8"));
const researchSources=JSON.parse(await fs.readFile("knowledge-graph/research-sources.json","utf8")).sources;
const researchQuestions=JSON.parse(await fs.readFile("knowledge-graph/research-questions.json","utf8")).questions;
const diagnosticQuestions=JSON.parse(await fs.readFile("knowledge-graph/diagnostic-questions.json","utf8")).questions;
const links=new Map(navigation.macros.map(m=>[m.id,{macroId:m.id,topicId:null}]));
navigation.topics.forEach(t=>t.conceptIds.forEach(id=>links.set(id,{macroId:t.macroId,topicId:t.id})));
const nodes=new Map();
class Stub{
 constructor(id){this.id=id;this.innerHTML="";this.textContent="";this.hidden=false;this.disabled=false;this.children=[];this.handlers={};this.dataset={};this.style={setProperty(){}};}
 get clientWidth(){return 1100;}get clientHeight(){return 580;}
 addEventListener(type,handler){this.handlers[type]=handler;}
 appendChild(child){this.children.push(child);return child;}
 replaceChildren(...items){this.children=items;}
 setAttribute(){}
 querySelector(selector){return element(selector);}
 querySelectorAll(){return [];}
 scrollIntoView(){}closest(){return null;}
}
const element=id=>{if(!nodes.has(id))nodes.set(id,new Stub(id));return nodes.get(id);};
const document={createElement:tag=>new Stub(tag)};
const window={matchMedia:()=>({matches:true})};
vm.runInNewContext(await fs.readFile("constellation.js","utf8"),{
 window,document,console,URL,setTimeout:fn=>fn()
});
let scene,nodeClick,zooms=0;
const charge={strength(){return charge;}};
const graph=new Proxy({
 graphData(value){if(value){scene=value;return graph;}return scene;},
 onNodeClick(fn){nodeClick=fn;return graph;},
 d3Force(){return charge;},
 zoomToFit(){zooms++;return graph;}
},{get(target,key){return key in target?target[key]:()=>graph;}});
const actions=[],host=new Stub("host");
const ui=window.AtlasConstellation.mount({
 host,macros:navigation.macros,topics:navigation.topics,concepts,locationByConcept:links,
 researchSources,researchQuestions,diagnosticQuestions,
 forceGraph:()=>()=>graph,
 openConcept:id=>actions.push("concept:"+id),
 openLesson:id=>actions.push("lesson:"+id),
 startDrill:id=>actions.push("drill:"+id),
 hasLesson:id=>id==="supernova-kicks"
});
assert.equal(ui.snapshot().stage,"overview");
assert.equal(element("#constellation-choices").children.length,5,"Starts with five groups, not 133 points");
assert.equal(scene,undefined,"3D is lazy: no heavy canvas rendering before opening tab");
ui.initialize();
assert.equal(scene.nodes.length,6,"One central node and five big research clusters");
assert.equal(scene.links.length,5);
assert.ok(scene.nodes.slice(1).every(n=>n.type==="chapter"));
assert.ok(zooms>0,"Camera fits the active cluster");
nodeClick(scene.nodes.find(n=>n.id==="stellar-origins"));
assert.equal(ui.snapshot().stage,"chapter");
assert.equal(Array.from(scene.nodes.slice(1),n=>n.id).join("|"),"stellar-astrophysics|binary-stellar-evolution");
nodeClick(scene.nodes.find(n=>n.id==="binary-stellar-evolution"));
assert.equal(ui.snapshot().stage,"macro");
assert.ok(scene.nodes.slice(1).every(n=>n.type==="topic"));
nodeClick(scene.nodes.find(n=>n.id==="topic-binary-stellar-evolution-compact-binary-formation"));
assert.equal(ui.snapshot().stage,"topic");
assert.ok(scene.nodes.slice(1).every(n=>n.type==="concept"));
nodeClick(scene.nodes.find(n=>n.id==="supernova-kicks"));
assert.equal(ui.snapshot().selectedId,"supernova-kicks");
assert.equal(element("#constellation-detail").hidden,false);
assert.match(element("#constellation-detail").innerHTML,/Supernova Natal Kicks/);
assert.match(element("#constellation-detail").innerHTML,/Necessary background/,"Unit includes prerequisites");
assert.match(element("#constellation-detail").innerHTML,/Research resources/,"Unit includes concept-specific links");
assert.match(element("#constellation-detail").innerHTML,/Try an exercise|Read and practise/,"Unit includes practice");
element("#constellation-lesson").handlers.click();
assert.deepEqual(actions,["lesson:supernova-kicks"],"Authored lesson opens inside graph");
element("#constellation-drill").handlers.click();
assert.deepEqual(actions,["lesson:supernova-kicks","drill:supernova-kicks"],"Practice is launched from the concept unit");
ui.back();assert.equal(ui.snapshot().selectedId,null,"First back closes concept preview");
ui.back();assert.equal(ui.snapshot().stage,"macro","Next back opens containing region");
ui.back();assert.equal(ui.snapshot().stage,"chapter");
ui.back();assert.equal(ui.snapshot().stage,"overview");
ui.showConcept("probability-distributions");
assert.equal(ui.snapshot().macroId,"calculus","Cross-domain concept opens its actual region");
assert.equal(ui.snapshot().selectedId,"probability-distributions");
ui.showConcept("functions");
assert.match(element("#constellation-detail").innerHTML,/Quick conceptual|conceptual check/,"Existing authored one-question check appears in nonpilot unit");
element("#constellation-check").handlers.click();
assert.match(element("#constellation-unit-check").innerHTML,/A function assigns each allowed input/,"Original short conceptual question displays in the graph");

assert.ok(concepts.every(c=>links.has(c.id)),"Every existing concept stays navigable");
ui.showQuestion({title:"Research question",summary:"Test",activity:"Try it",conceptIds:["supernova-kicks"]});
assert.match(element("#constellation-detail").innerHTML,/Research question/);
const page=await fs.readFile("index.html","utf8");
assert.ok(page.includes('id="constellation-shell"'));
assert.ok(page.includes('id="legacy-explorer" hidden'));
assert.ok(!page.includes('<details id="focus-graph-toggle"'));
assert.equal((page.match(/data-atlas-tab=/g)||[]).length,3,"Home, Knowledge Graph and Practice are the three top-level tabs");
assert.ok(page.includes('id="diagnostic-panel"')&&page.indexOf('id="diagnostic-panel"')>page.indexOf('id="home-panel"'),"Diagnostic lives inside Home");
assert.ok(page.includes('id="learning-studio"')&&page.indexOf('id="learning-studio"')>page.indexOf('id="explore-panel"'),"Full unit lives in Graph");
assert.ok(page.includes('id="otto-helper"'),"Otto follows the learner across all destinations");
// Fresh view with no 3D dependency.
const fallback=window.AtlasConstellation.mount({
 host:new Stub("fallback"),macros:navigation.macros,topics:navigation.topics,concepts,locationByConcept:links,
 forceGraph:()=>null,openConcept:()=>{},openLesson:()=>{},startDrill:()=>{},hasLesson:()=>false
});
fallback.initialize();
assert.equal(fallback.snapshot().has3D,false);
assert.equal(element("#constellation-fallback").hidden,false);
assert.equal(fallback.scene().items.length,5,"No-WebGL fallback still exposes every research cluster");
console.log("Passed: three-tab Atlas, lazy 3D hierarchy, concept context with standalone pilot-practice links and in-graph short checks, research links and accessible no-WebGL fallback.");
