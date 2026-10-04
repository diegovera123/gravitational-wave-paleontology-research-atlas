#!/usr/bin/env node
// Cross-module smoke test. Browser/WebGL visual QA remains separate.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
const read=path=>fs.readFile(path,"utf8").then(JSON.parse);
const [curriculum,sources,navigation,questions,learningUnits,adaptiveBank,extendedPractice,deepExplanations,journeyData,diagnosticBank,coreManifest,indexHtml]=await Promise.all([
 read("knowledge-graph/concepts.json"),read("knowledge-graph/research-sources.json"),read("knowledge-graph/navigation.json"),read("knowledge-graph/research-questions.json"),read("knowledge-graph/learning-units.json"),read("knowledge-graph/adaptive-items.json"),read("knowledge-graph/practice-sets.json"),read("knowledge-graph/deep-explanations.json"),read("knowledge-graph/research-journey.json"),read("knowledge-graph/diagnostic-questions.json"),read("knowledge-graph/gw-core-concepts.json"),fs.readFile("index.html","utf8")
]);
const elements=new Map();
class ElementStub{
 constructor(id=""){this.id=id;this.clientWidth=1100;this.clientHeight=580;this.innerHTML="";this.textContent="";this.hidden=false;this.disabled=false;this.value="";this.children=[];this.childNodes=[];this.handlers={};this.dataset={};this.parentNode=null;this.scrollTop=0;this.scrollHeight=500;this.style={setProperty(){}};const set=new Set();this.classList={add:x=>set.add(x),remove:x=>set.delete(x),contains:x=>set.has(x),toggle:(x,on)=>{if(on===undefined)on=!set.has(x);if(on)set.add(x);else set.delete(x);return on;}};}
 addEventListener(type,fn){this.handlers[type]=fn;}setAttribute(name,value){this[name]=value;}appendChild(child){this.children.push(child);this.childNodes.push(child);child.parentNode=this;return child;}append(...items){items.forEach(x=>this.appendChild(x));}replaceChildren(...items){this.children=[...items];this.childNodes=[...items];items.forEach(x=>x.parentNode=this);}querySelector(selector){return elements.get(selector)||new ElementStub(selector);}querySelectorAll(){return [];}closest(){return null;}contains(){return false;}focus(){}scrollIntoView(){}scrollTo(){}
}
const selectors=[
 "#graph","#details","#concept-search","#search-results","#atlas-crumbs","#atlas-choices","#global-view","#parent-view","#history-view","#reset-view","#study-macro","#graph-map","#domain-cards","#question-cards","#atlas-stats","#view-map","#view-3d","#explorer","#explorer-title","#back-to-question","#dashboard-network-map","#open-full-3d","#learning-progress","#resume-learning","#mark-understood","#next-required","#pilot-cards","#learning-studio","#learning-studio-title","#lesson-content","#close-learning-studio","#open-learning-unit","#lesson-submit","#lesson-concept-back","#atlas-tabs","#dashboard","#home-panel","#diagnostic-panel","#paths-panel","#library-panel","#explore-panel","#learn-panel","#tab-diagnostic","#home-continue","#home-learn","#home-research","#otto-guide","#legacy-home","#otto-coach-title","#otto-coach-line","#brand-home","#focus-home","#focus-domains","#focus-concepts","#focus-detail","#focus-quiz","#focus-graph-toggle","#focus-concept-title","#focus-domain-description","#focus-show-more","#focus-open-region","#focus-change-goal","#focus-full-map","#focus-research","#focus-all-practice","#focus-library","#focus-big-picture","#focus-back-chapters","#focus-concept-section","#focus-topics","#simple-home","#simple-home-graph","#simple-home-research","#simple-home-diagnostic","#home-research-workspace","#home-research-close","#otto-helper-message","#otto-helper-text","#otto-helper-button","#otto-helper-close","#constellation-research","#constellation-research-questions","#constellation-shell","#constellation-canvas","#constellation-fallback","#constellation-location","#constellation-prompt","#constellation-choices","#constellation-detail","#constellation-detail-shade","#constellation-home","#constellation-back","#constellation-reset","#constellation-context-v2","#constellation-context-learn","#constellation-context-practice","#constellation-context-topic","#constellation-search","#constellation-search-results","#constellation-filter-prerequisite","#constellation-filter-causal","#constellation-filter-application","#constellation-filter-useful","#constellation-breadcrumbs-v2","#constellation-v2-controls","#constellation-minimap-v2","#constellation-fit","#constellation-center-selected","#constellation-zoom-in","#constellation-zoom-out","#tab-home","#tab-paths","#tab-explore","#tab-practice","#practice-panel","#practice-active","#practice-unit-cards","#practice-selected-title","#practice-return-graph","#tab-learn","#tab-library","#learn-hub","#learn-hub-cards","#due-practice","#research-experience","#practice-summary","#practice-area-filter","#practice-search","#practice-concept-picker","#practice-open-concept","#practice-case-studies","#practice-guided-prompts","#practice-due-summary","#adaptive-panel","#practice-start","#practice-next","#practice-again","#practice-review","#practice-back"
];
for(const id of selectors)elements.set(id,new ElementStub(id));
for(const id of ["#learning-studio","#diagnostic-panel","#explore-panel","#practice-panel","#practice-active","#constellation-shell","#constellation-research","#paths-panel","#library-panel","#learn-panel","#home-research-workspace","#constellation-context-v2","#constellation-detail","#constellation-detail-shade"])elements.get(id).hidden=true;
const document={activeElement:null,body:new ElementStub("body"),querySelector:s=>elements.get(s)||new ElementStub(s),createElement:tag=>new ElementStub(tag),createElementNS:(ns,tag)=>new ElementStub(tag),createTextNode:text=>({textContent:text}),addEventListener(){}};
let scene=null,clickNode=null,cameraFits=0;
const charge={strength(){return charge;}};
const graph=new Proxy({graphData(value){if(value){scene=value;return graph;}return scene;},d3Force(){return charge;},onNodeClick(fn){clickNode=fn;return graph;},zoomToFit(){cameraFits++;return graph;},cameraPosition(){return {x:0,y:0,z:400};}},{get(target,key){return key in target?target[key]:()=>graph;}});
const responseData={"knowledge-graph/concepts.json":curriculum,"knowledge-graph/research-sources.json":sources,"knowledge-graph/navigation.json":navigation,"knowledge-graph/research-questions.json":questions,"knowledge-graph/learning-units.json":learningUnits,"knowledge-graph/adaptive-items.json":adaptiveBank,"knowledge-graph/practice-sets.json":extendedPractice,"knowledge-graph/deep-explanations.json":deepExplanations,"knowledge-graph/research-journey.json":journeyData,"knowledge-graph/diagnostic-questions.json":diagnosticBank,"knowledge-graph/gw-core-concepts.json":coreManifest};
const stored=new Map();
const context=vm.createContext({document,URL,console,window:{location:{href:"https://example.org/research-atlas/"},matchMedia:()=>({matches:true}),addEventListener(){},localStorage:{getItem:key=>stored.get(key)||null,setItem:(key,value)=>stored.set(key,value)}},ForceGraph3D:()=>()=>graph,fetch:async path=>({ok:Boolean(responseData[path]),json:async()=>responseData[path]}),setTimeout:fn=>fn()});
for(const file of ["adaptive.js","practice-catalog.js","guided-practice.js","literature-search.js","concept-figures.js","concept-insight.js","guide.js","focus-home.js","constellation.js","research-models.js","research-experience.js","app.js"])vm.runInContext(await fs.readFile(file,"utf8"),context);
await new Promise(resolve=>setImmediate(resolve));
const run=expression=>vm.runInContext(expression,context);
assert.equal(run("TAB_NAMES.length"),3,"Home, Knowledge Graph and Practice remain the three main destinations");
assert.ok(indexHtml.indexOf('id="research-experience"')<indexHtml.indexOf('id="practice-panel"'),"Research questions remain on Home rather than crowding Practice");
const practiceMarkup=indexHtml.slice(indexHtml.indexOf('<section id="practice-panel"'),indexHtml.indexOf('<section id="learn-panel"'));
assert.doesNotMatch(practiceMarkup,/KNOWLEDGE COMPONENTS|learning components|practice-objectives|practice-literature/i,"Practice stays questions-only on the learner-facing surface");
assert.match(elements.get("#practice-summary").textContent,/15 question sets · 168 authored questions/);
assert.equal(scene,null,"3D graph stays lazy until Knowledge Graph is opened");
run('setActiveView("explore",{scroll:false})');
assert.ok(scene&&scene.nodes.length===6,"Opening Knowledge Graph initializes the five-landmark semantic overview");
assert.ok(cameraFits>0);
clickNode(scene.nodes.find(n=>n.id==="stellar-origins"));assert.equal(run("constellation.snapshot().stage"),"chapter");
clickNode(scene.nodes.find(n=>n.id==="binary-stellar-evolution"));assert.equal(run("constellation.snapshot().stage"),"macro");
clickNode(scene.nodes.find(n=>n.id==="topic-binary-stellar-evolution-compact-binary-formation"));assert.equal(run("constellation.snapshot().stage"),"topic");
clickNode(scene.nodes.find(n=>n.id==="supernova-kicks"));
assert.equal(run("constellation.snapshot().selectedId"),"supernova-kicks","Clicking a concept focuses its graph neighbourhood first");
assert.equal(elements.get("#constellation-detail").hidden,true,"Long reader does not automatically obscure the graph");
assert.equal(elements.get("#constellation-context-v2").hidden,false,"Compact concept context appears beside the graph");
assert.match(elements.get("#constellation-context-v2").innerHTML,/Supernova Natal Kicks/);
assert.ok(scene.nodes.length<=13&&scene.nodes[0].id==="supernova-kicks","Focused graph limits attention to the selected concept and immediate neighbours");
run('constellation.openReader("supernova-kicks")');
assert.equal(elements.get("#constellation-detail").hidden,false,"Full learning unit opens explicitly from the focused concept");
assert.match(elements.get("#constellation-detail").innerHTML,/Learning objectives/);assert.match(elements.get("#constellation-detail").innerHTML,/Understand the idea/);assert.match(elements.get("#constellation-detail").innerHTML,/Research resources/);assert.match(elements.get("#constellation-detail").innerHTML,/data-deep-explanation="supernova-kicks"/);assert.doesNotMatch(elements.get("#constellation-detail").innerHTML,/guided-working|Try an exercise/);
run('constellation.back()');assert.equal(elements.get("#constellation-detail").hidden,true,"First Back closes the reader but preserves graph focus");assert.equal(run("constellation.snapshot().selectedId"),"supernova-kicks");
run('constellation.back()');assert.equal(run("constellation.snapshot().selectedId"),null,"Second Back exits focused neighbourhood");
run('constellation.back()');assert.equal(run("constellation.snapshot().stage"),"macro","Next Back climbs the hierarchy");
run('constellation.showConcept("core-effective-spin-chi-eff")');assert.equal(run("constellation.snapshot().selectedId"),"core-effective-spin-chi-eff","Requested core orientation concepts are navigable in the live graph");
run('openQuestion("binary-survival");scrollToExplorer()');assert.match(elements.get("#constellation-detail").innerHTML,/What determines whether a massive binary survives/,"Research-question deep links still open in Knowledge Graph");
assert.equal(run("concepts.length"),263,"Exact 171 core coverage is live in the app graph");
assert.ok(run('constellation.snapshot().breadcrumbs.length>=1'),"Breadcrumb orientation is available throughout graph navigation");
console.log("Passed: three-destination app, questions-only Practice, semantic graph landmarks, focus-before-reader navigation, live 263-concept coverage, research links and lazy 3D initialization.");
