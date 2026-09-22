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
    const classes=new Set();this.classList={add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle:(x,on)=>{if(on===undefined)on=!classes.has(x);if(on)classes.add(x);else classes.delete(x);return on;}};
  }
  addEventListener(name,fn){this.handlers[name]=fn;}
  setAttribute(name,value){this[name]=value;}
  appendChild(child){this.children.push(child);return child;}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=children;}
  querySelectorAll(){return [];}
  querySelector(selector){return elements.get(selector)||new ElementStub();}
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
  "#atlas-tabs","#dashboard","#home-panel","#diagnostic-panel","#paths-panel","#library-panel","#explore-panel","#learn-panel",
  "#tab-diagnostic","#home-continue","#home-learn","#home-research",
  "#otto-guide","#legacy-home","#otto-coach-title","#otto-coach-line","#brand-home",
  "#focus-home","#focus-domains","#focus-concepts","#focus-detail","#focus-quiz","#focus-graph-toggle","#focus-concept-title","#focus-domain-description","#focus-show-more","#focus-open-region","#focus-change-goal","#focus-full-map","#focus-research","#focus-all-practice","#focus-library",
  "#focus-big-picture","#focus-back-chapters","#focus-concept-section","#focus-topics",
  "#constellation-shell","#constellation-canvas","#constellation-fallback","#constellation-location","#constellation-prompt","#constellation-choices","#constellation-detail","#constellation-home","#constellation-back","#constellation-reset",
  "#tab-home","#tab-paths","#tab-explore","#tab-learn","#tab-library","#learn-hub","#learn-hub-cards","#due-practice",
  "#practice-due-summary","#adaptive-panel","#practice-start","#practice-next","#practice-again","#practice-review","#practice-back"
];
const elements=new Map(selectors.map(s=>[s,new ElementStub()]));
const document={
  activeElement:null,body:new ElementStub(),
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
const stored=new Map();
const context=vm.createContext({
  document,URL,console,
  window:{location:{href:"https://example.org/research-atlas/"},matchMedia:()=>({matches:true}),addEventListener(){},
    localStorage:{getItem:key=>stored.get(key)||null,setItem:(key,value)=>stored.set(key,value)}},
  ForceGraph3D:()=>()=>graph,
  fetch:async path=>({ok:true,json:async()=>responseData[path]}),
  setTimeout:fn=>fn()
});
vm.runInContext(await fs.readFile("adaptive.js","utf8"),context);
vm.runInContext(await fs.readFile("guide.js","utf8"),context);
vm.runInContext(await fs.readFile("focus-home.js","utf8"),context);
vm.runInContext(await fs.readFile("constellation.js","utf8"),context);
vm.runInContext(await fs.readFile("app.js","utf8"),context);
await new Promise(resolve=>setImmediate(resolve));
const run=expression=>vm.runInContext(expression,context);

assert.equal(scene,null,"Graph is lazy and does not render while the main Learn page is open");
assert.ok(elements.get("#home-panel").classList.contains("guide-ready"),"Otto mission fallback remains mounted");
assert.ok(elements.get("#home-panel").classList.contains("focus-ready"),"Domain-first homepage replaces guide as the default");
assert.equal(elements.get("#focus-domains").children.length,5,"One-field homepage shows five connected research parts");
assert.equal(elements.get("#focus-concepts").children.length,0,"Concepts hidden until a chapter and topic are selected");
assert.equal(elements.get("#focus-concept-section").hidden,true,"The chapter view is collapsed on initial load");
run('focusedHome.selectChapter("cosmic-record")');
assert.equal(elements.get("#focus-topics").children.length,3,"Cosmic-record chapter reveals three curated topics");
run('focusedHome.selectTopic("topic-gravitational-wave-paleontology-cosmic-evolution-and-rates")');
assert.equal(elements.get("#focus-concepts").children.length,4,"Only the selected topic's real concepts appear");
assert.match(elements.get("#otto-guide").innerHTML,/OTTO · YOUR COSMIC GUIDE/,"The mascot is visible in the primary home experience");
assert.match(elements.get("#otto-guide").innerHTML,/Continue my mission/,"A single primary learning action is shown");
const route=run('guideController.plan()');
assert.ok(route.steps.length>=2 && route.steps.length<=5,"Mission path has a compact number of real concept stops");
for(let i=1;i<route.steps.length;i++){
  const target=curriculum.concepts.find(c=>c.id===route.steps[i].id);
  assert.ok(target.prerequisites.some(e=>e.kind==="necessary"&&e.id===route.steps[i-1].id),"Adjacent mission stops are actual necessary dependencies");
}
run('guideController.enter(guideController.plan().steps[0].id)');
assert.ok(JSON.parse(stored.get("research-atlas-otto-visited-v1")).includes(route.steps[0].id),"Visited navigation progress is persisted separately from mastery");
assert.match(elements.get("#otto-guide").innerHTML,/Visiting a stop does not establish mastery/,"Mission progress is never claimed as mastery");

// Exercise the first-run router independently of the module-unavailable fallback used by this mock.
stored.delete("research-atlas-onboarding-seen-v1");
run('diagnosticController={hasCompleted:()=>false,hasRatings:()=>false,open:()=>setActiveView("diagnostic",{scroll:false})};firstRunLanding()');
assert.equal(elements.get("#diagnostic-panel").hidden,false,"A true first visit opens the starting-point diagnostic first");
assert.equal(elements.get("#dashboard").hidden,true,"The main dashboard stays out of the way during first-run onboarding");
run('markOnboardingSeen();setActiveView("home",{scroll:false})');
assert.equal(elements.get("#dashboard").hidden,false,"Completing or skipping onboarding reveals the map-first home");
assert.equal(elements.get("#paths-panel").hidden,true,"Non-active pathways remain hidden");
run('setActiveView("paths",{scroll:false})');
assert.equal(elements.get("#paths-panel").hidden,false,"Pathways tab opens");
run('setActiveView("explore",{scroll:false})');
assert.equal(elements.get("#explore-panel").hidden,false,"Knowledge atlas tab opens");

assert.equal(scene.nodes.length,6,"New full-screen 3D scene starts with one central node and five research clusters");
assert.ok(scene.nodes.slice(1).every(node=>node.type==="chapter"),"Only macro clusters appear at first, not all 133 concepts");
assert.equal(elements.get("#constellation-choices").children.length,5,"Accessible equivalent shows five cluster choices");
assert.equal(elements.get("#domain-cards").children.length,navigation.macros.length,"Supporting research area cards remain present in Research");
assert.ok(elements.get("#learning-progress").textContent.includes("0 / "+curriculum.concepts.length),"Initial self-reported progress is empty");
run('openConcept("limits",true)');
run('markUnderstood("functions")');
assert.ok(stored.get("research-atlas-studied-v1").includes("functions"),"Study markers are saved locally");
run('markUnderstood("limits")');
assert.ok(stored.get("research-atlas-studied-v1").includes("limits"),"Self-reported study marker is persisted");

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
run('setActiveView("explore",{scroll:false})');
clickNode(scene.nodes.find(node=>node.id==="stellar-origins"));
assert.equal(run('constellation.snapshot().stage'),"chapter","Clicking a large 3D cluster opens its scientific parts");
assert.ok(scene.nodes.slice(1).every(node=>node.type==="macro"),"Chapter reveals only actual macro regions");
clickNode(scene.nodes.find(node=>node.id==="binary-stellar-evolution"));
assert.equal(run('constellation.snapshot().stage'),"macro");
assert.ok(scene.nodes.slice(1).every(node=>node.type==="topic"),"Region opens only its own curated topics");
clickNode(scene.nodes.find(node=>node.id==="topic-binary-stellar-evolution-compact-binary-formation"));
assert.equal(run('constellation.snapshot().stage'),"topic");
assert.ok(scene.nodes.slice(1).every(node=>node.type==="concept"),"Topic reveals its own concepts, not the complete graph");
clickNode(scene.nodes.find(node=>node.id==="supernova-kicks"));
assert.match(elements.get("#constellation-detail").innerHTML,/Supernova Natal Kicks/,"Concept opens small preview rather than old sidebar");
run('constellation.back()');
assert.equal(run('constellation.snapshot().selectedId'),null,"Back closes current concept");
run('constellation.back()');
assert.equal(run('constellation.snapshot().stage'),"macro","Back moves one level up the cluster hierarchy");
run('openQuestion("binary-survival");scrollToExplorer()');
assert.match(elements.get("#constellation-detail").innerHTML,/What determines whether a massive binary survives/,"Research questions still open in the visible constellation");
run('openConcept("linear-momentum",true);scrollToExplorer()');
assert.equal(run('constellation.snapshot().macroId'),"classical-mechanics","Cross-domain deep links reveal the real containing cluster");
assert.ok(cameraFits>0,"3D camera framing is invoked");

console.log("Passed: single-field GWP journey, lazy 3D-only graph with 5 clusters and progressive navigation, diagnostic-first onboarding, adaptive drills, research deep links and mocked WebGL navigation.");
