#!/usr/bin/env node
// Logic-only smoke tests. A real WebGL/browser visual check is still required.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";

const curriculum = JSON.parse(await fs.readFile("knowledge-graph/concepts.json","utf8"));
const sources = JSON.parse(await fs.readFile("knowledge-graph/research-sources.json","utf8"));
const navigation = JSON.parse(await fs.readFile("knowledge-graph/navigation.json","utf8"));
const questions = JSON.parse(await fs.readFile("knowledge-graph/research-questions.json","utf8"));
const learningUnits = JSON.parse(await fs.readFile("knowledge-graph/learning-units.json","utf8"));
const adaptiveBank = JSON.parse(await fs.readFile("knowledge-graph/adaptive-items.json","utf8"));

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
  "#dashboard-network-map","#open-full-3d","#learning-progress","#resume-learning","#mark-understood","#next-required",
  "#pilot-cards","#learning-studio","#learning-studio-title","#lesson-content","#close-learning-studio","#open-learning-unit","#lesson-submit","#lesson-concept-back",
  "#atlas-tabs","#dashboard","#home-panel","#paths-panel","#library-panel","#explore-panel","#learn-panel",
  "#tab-home","#tab-paths","#tab-explore","#tab-learn","#tab-library","#learn-hub","#learn-hub-cards","#due-practice",
  "#practice-due-summary","#adaptive-panel","#practice-start","#practice-next","#practice-again","#practice-review","#practice-back"
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
  "knowledge-graph/research-questions.json":questions,
  "knowledge-graph/learning-units.json":learningUnits,
  "knowledge-graph/adaptive-items.json":adaptiveBank
};
const stored=new Map([["research-atlas-onboarding-v1","skipped"]]); // Returning/opted-out visitor: retain existing Atlas smoke checks.
const context=vm.createContext({
  document,URL,console,
  window:{location:{href:"https://example.org/research-atlas/"},matchMedia:()=>({matches:true}),addEventListener(){},
    localStorage:{getItem:key=>stored.get(key)||null,setItem:(key,value)=>stored.set(key,value)}},
  ForceGraph3D:()=>()=>graph,
  fetch:async path=>({ok:true,json:async()=>responseData[path]}),
  setTimeout:fn=>fn()
});
vm.runInContext(await fs.readFile("adaptive.js","utf8"),context);
vm.runInContext(await fs.readFile("app.js","utf8"),context);
await new Promise(resolve=>setImmediate(resolve));
const run=expression=>vm.runInContext(expression,context);

assert.equal(scene.nodes.length,navigation.macros.length,"Global view shows only macro regions");
assert.equal(elements.get("#dashboard").hidden,false,"Overview is the starting view");
assert.equal(elements.get("#paths-panel").hidden,true,"Non-active pathways remain hidden");
run('setActiveView("paths",{scroll:false})');
assert.equal(elements.get("#paths-panel").hidden,false,"Pathways tab opens");
run('setActiveView("explore",{scroll:false})');
assert.equal(elements.get("#explore-panel").hidden,false,"Knowledge atlas tab opens");

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
assert.equal(elements.get("#pilot-cards").children.length,3,"Dashboard renders three source-linked pilot learning units");
assert.equal(elements.get("#learn-hub-cards").children.length,3,"Learning hub renders all three pilot units");
run('openConcept("derivatives",true)');
assert.match(elements.get("#details").innerHTML,/Open full learning unit/,"Pilot concept offers a full lesson");
run('openLearningUnit("derivatives")');
assert.equal(elements.get("#learning-studio").hidden,false,"Learning studio opens");
assert.equal(elements.get("#learn-panel").hidden,false,"Lesson activates learning tab");
assert.match(elements.get("#adaptive-panel").innerHTML,/Start adaptive practice/,"Adaptive practice offers a clear entry point");
run('startAdaptiveQuiz()');
assert.match(elements.get("#adaptive-panel").innerHTML,/1 \/ 5/,"Adaptive quiz starts with an accessible item");
run('answerAdaptiveQuiz(quizSessions.get("derivatives").current.correctIndex)');
assert.match(elements.get("#adaptive-panel").innerHTML,/Next question/,"Immediate corrective feedback and next step are shown");
assert.ok(stored.get("research-atlas-adaptive-evidence-v1"),"Adaptive evidence remains in browser storage");
for(let i=1;i<5;i++){
  run('advanceAdaptiveQuiz();renderAdaptivePanel()');
  run('answerAdaptiveQuiz(quizSessions.get("derivatives").current.correctIndex)');
}
run('advanceAdaptiveQuiz();renderAdaptivePanel()');
assert.match(elements.get("#adaptive-panel").innerHTML,/SESSION COMPLETE/,"Five-question quiz ends with session-level formative evidence");

assert.match(elements.get("#lesson-content").innerHTML,/From position to velocity/,"Worked example is rendered");
assert.match(elements.get("#lesson-content").innerHTML,/Defining the Derivative/,"Source and provenance are displayed");
run('closeLearningUnit()');
assert.equal(elements.get("#learning-studio").hidden,true,"Learning studio closes without removing atlas");
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

console.log("Passed: focused tab navigation, objective-responsive five-item practice, browser-local evidence, immediate feedback, three learning units, 3D and structured map, graph navigation, cross-domain jumps, and mocked camera framing.");
