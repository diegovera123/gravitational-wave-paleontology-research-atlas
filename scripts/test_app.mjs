#!/usr/bin/env node
// Logic-only smoke tests. A real WebGL/browser visual check is still required.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";

const curriculum = JSON.parse(await fs.readFile("knowledge-graph/concepts.json","utf8"));
const sources = JSON.parse(await fs.readFile("knowledge-graph/research-sources.json","utf8"));
const navigation = JSON.parse(await fs.readFile("knowledge-graph/navigation.json","utf8"));

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
}
const selectors=[
  "#graph","#details","#concept-search","#search-results","#atlas-crumbs","#atlas-choices",
  "#global-view","#parent-view","#history-view","#reset-view","#study-macro"
];
const elements=new Map(selectors.map(s=>[s,new ElementStub()]));
const document={
  activeElement:null,
  querySelector:selector=>elements.get(selector)||new ElementStub(),
  createElement:()=>new ElementStub(),
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
  "knowledge-graph/navigation.json":navigation
};
const context=vm.createContext({
  document,URL,console,
  window:{location:{href:"https://example.org/research-atlas/"},matchMedia:()=>({matches:true}),addEventListener(){}},
  ForceGraph3D:()=>()=>graph,
  fetch:async path=>({ok:true,json:async()=>responseData[path]}),
  setTimeout:fn=>fn()
});
vm.runInContext(await fs.readFile("app.js","utf8"),context);
await new Promise(resolve=>setImmediate(resolve));
const run=expression=>vm.runInContext(expression,context);

assert.equal(scene.nodes.length,navigation.macros.length,"Global view shows only macro regions");
assert.ok(scene.nodes.every(node=>node.type==="macro"),"No meso/micro content leaks into global view");

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
assert.ok(cameraFits>0,"The view-framing function was invoked");

console.log("Passed: curated hierarchy, macro-only overview, topic drill-down, concept details, cross-domain jumps, back navigation, and camera framing (mocked DOM/WebGL).");
