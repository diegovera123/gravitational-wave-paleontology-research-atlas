#!/usr/bin/env node
// Logic-only smoke tests. A real WebGL/browser visual check is still required.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";

const curriculum = JSON.parse(await fs.readFile("knowledge-graph/concepts.json","utf8"));
const sources = JSON.parse(await fs.readFile("knowledge-graph/research-sources.json","utf8"));
const navigation = JSON.parse(await fs.readFile("knowledge-graph/navigation.json","utf8"));
const questions = JSON.parse(await fs.readFile("knowledge-graph/research-questions.json","utf8"));

class ElementStub {
  constructor() {
    this.clientWidth=1100;this.clientHeight=500;this.innerHTML="";this.hidden=false;
    this.value="";this.disabled=false;this.children=[];this.dataset={};this.handlers={};
    this.style={setProperty() {}};
  }
  addEventListener(name,fn){this.handlers[name]=fn;}
  setAttribute(name,value){this[name]=value;}
  appendChild(child){this.children.push(child);return child;}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=children;}
  querySelectorAll(){return [];}
  querySelector(){return null;}
  closest(){return null;}
  focus(){}
  scrollIntoView(){}
}
const selectors=[
  "#graph","#details","#concept-search","#search-results","#atlas-crumbs","#atlas-choices",
  "#global-view","#parent-view","#history-view","#reset-view","#study-macro",
  "#graph-map","#domain-cards","#question-cards","#atlas-stats","#view-map","#view-3d","#explorer","#explorer-title","#back-to-question",
  "#dashboard-network-map","#open-full-3d","#learning-progress","#resume-learning","#mark-understood","#next-required"
];
const elements=new Map(selectors.map(s=>[s,new ElementStub()]));
const document={
  activeElement:null,
  querySelector:selector=>elements.get(selector)||new ElementStub(),
  createElement:()=>new ElementStub(),
  createElementNS:()=>new ElementStub(),
  createTextNode:text=>({textContent:text}),
  addEventListener(){}
};
let scene=null, clickNode=null, cameraFits=0;
const charge={strength(){return charge;}};
const graph=new Proxy({
  graphData(value){if(value){scene=value;return graph;}return scene;},
  d3Force(){return charge;},
  onNodeClick(fn){clickNode=fn;return graph;},
  zoomToFit(){cameraFits++;return graph;}
},{get(target,key){return key in target?target[key]:()=>graph;}});
const responseData={
  "knowledge-graph/concepts.json":curriculum,
  "knowledge-graph/research-sources.json":sources,
  "knowledge-graph/navigation.json":navigation,
  "knowledge-graph/research-questions.json":questions
};
const stored=new Map();
const context=vm.createContext({
  document,URL,console,
  window:{location:{href:"https://example.org/research-atlas/"},matchMedia:()=>({matches:true}),addEventListener(){},
    localStorage:{getItem:key=>stored.get(key)||null,setItem:(key,value)=>stored.set(key,value)}},
  ForceGraph3D:()=>()=>graph,
  fetch:async path=>({ok:true,json:async()=>responseData[path]}),
  setTimeout:fn=>fn()
});
vm.runInContext(await fs.readFile("app.js","utf8"),context);
await new Promise(resolve=>setImmediate(resolve));
const run=expression=>vm.runInContext(expression,context);

assert.equal(scene.nodes.length,navigation.macros.length,"Global view shows only macro regions");
assert.ok(scene.nodes.every(node=>node.type==="macro"),"No meso/micro content leaks into global view");
assert.equal(elements.get("#graph").hidden,true,"Structured map is displayed by default");
assert.equal(elements.get("#graph-map").hidden,false,"Structured map is available");
assert.equal(elements.get("#domain-cards").children.length,navigation.macros.length,"Dashboard renders region cards");
assert.equal(elements.get("#dashboard-network-map").children.length,navigation.macros.length+1,"Visible graph includes directional edge layer and macro nodes");
assert.ok(elements.get("#learning-progress").textContent.includes("0 / "+curriculum.concepts.length),"Initial self-reported progress is empty");
run('openConcept("limits",true)');
assert.equal(elements.get("#graph-map").children.length,3,"Selected concept displays a prerequisite → concept → downstream learning path");
assert.match(elements.get("#details").innerHTML,/Guided path:/,"Necessary prerequisites lock the guided path without hiding content");
assert.match(elements.get("#details").innerHTML,/Go to next recommended prerequisite/,"Locked concept links to a ready prerequisite");
run('markUnderstood("functions")');
assert.ok(stored.get("research-atlas-studied-v1").includes("functions"),"Study markers are saved locally");
run('openConcept("limits",true)');
assert.match(elements.get("#details").innerHTML,/Ready for guided study/,"Marking a necessary prerequisite unlocks the recommended next concept");
run('markUnderstood("limits")');
assert.ok(stored.get("research-atlas-studied-v1").includes("limits"),"Self-reported completed concept is persisted");

assert.equal(elements.get("#question-cards").children.length,questions.questions.length,"Dashboard renders research questions");
run('openQuestion("binary-survival")');
assert.match(elements.get("#details").innerHTML,/What determines whether a massive binary survives/);
run('openConcept("supernova-kicks",true)');
assert.match(elements.get("#details").innerHTML,/Back to research question/);
run('setDisplayMode("3d")');
assert.equal(elements.get("#graph").hidden,false,"3D mode is available on demand");
assert.equal(elements.get("#graph-map").hidden,true,"Map is hidden when switching to 3D");


run('enterMacro("calculus")');
assert.equal(scene.nodes[0].type,"macro");
assert.ok(scene.nodes.slice(1).every(node=>node.type==="topic"),"Macro view contains only topic groups");
const mathTopic=navigation.topics.find(t=>t.macroId==="calculus");
run('enterTopic('+JSON.stringify(mathTopic.id)+')');
assert.equal(scene.nodes[0].type,"topic");
assert.ok(scene.nodes.slice(1).every(node=>node.type==="concept"),"Topic reveals only its immediate concepts");

run('openConcept("supernova-kicks",true)');
assert.equal(run('snapshot().macroId'),"binary-stellar-evolution");
assert.ok(elements.get("#details").innerHTML.includes("Supernova Natal Kicks"));
assert.ok(scene.nodes.every(node=>node.type!=="macro"),"Cross-domain concept jump does not expose global nodes");

run('openConcept("linear-momentum",true)');
assert.equal(run('snapshot().macroId'),"classical-mechanics");
assert.ok(run('snapshot().topicId'));
const prevTopic=navigation.topics.find(t=>t.conceptIds.includes("supernova-kicks")).id;
run('restoreLocation({level:"meso",macroId:"binary-stellar-evolution",topicId:'+JSON.stringify(prevTopic)+',selectedId:"supernova-kicks"})');
assert.equal(run('snapshot().selectedId'),"supernova-kicks");
run("goParent()");
assert.equal(run("snapshot().selectedId"),null);
assert.equal(run("snapshot().level"),"meso");
run('setDisplayMode("map")');
assert.equal(elements.get("#graph").hidden,true,"Returning to structured mode hides 3D");
assert.equal(elements.get("#graph-map").hidden,false,"Returning to structured mode shows the map");
assert.ok(cameraFits>0,"3D camera framing was invoked");

console.log("Passed: dashboard graph, saved guided prerequisites, research-question pathways, map/3D toggle, macro-only overview, topic drill-down, concept details, cross-domain jumps, back navigation, and camera framing (mocked DOM/WebGL).");
