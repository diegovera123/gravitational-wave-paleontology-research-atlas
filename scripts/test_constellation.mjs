#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
const concepts=JSON.parse(await fs.readFile("knowledge-graph/concepts.json","utf8")).concepts;
const navigation=JSON.parse(await fs.readFile("knowledge-graph/navigation.json","utf8"));
const coreManifest=JSON.parse(await fs.readFile("knowledge-graph/gw-core-concepts.json","utf8"));
const researchSources=JSON.parse(await fs.readFile("knowledge-graph/research-sources.json","utf8")).sources;
const researchQuestions=JSON.parse(await fs.readFile("knowledge-graph/research-questions.json","utf8")).questions;
const diagnosticQuestions=JSON.parse(await fs.readFile("knowledge-graph/diagnostic-questions.json","utf8")).questions;
const journey=JSON.parse(await fs.readFile("knowledge-graph/research-journey.json","utf8"));
const links=new Map(navigation.macros.map(m=>[m.id,{macroId:m.id,topicId:null}]));
navigation.topics.forEach(t=>t.conceptIds.forEach(id=>links.set(id,{macroId:t.macroId,topicId:t.id})));
const nodes=new Map();
class Stub{
 constructor(id){this.id=id;this.innerHTML="";this.textContent="";this.hidden=false;this.disabled=false;this.children=[];this.handlers={};this.dataset={};this.parentNode=null;this.childNodes=[];this.value="";this.style={setProperty(){}};const classes=new Set();this.classList={add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle:x=>{if(classes.has(x)){classes.delete(x);return false;}classes.add(x);return true;}};}
 get clientWidth(){return 1100;}get clientHeight(){return 580;}
 addEventListener(type,handler){this.handlers[type]=handler;}
 appendChild(child){this.children.push(child);this.childNodes.push(child);child.parentNode=this;return child;}
 replaceChildren(...items){this.children=items;this.childNodes=items;}
 setAttribute(name,value){this[name]=value;}
 querySelector(selector){return element(selector);}
 querySelectorAll(){return [];}
 scrollIntoView(){}closest(){return null;}focus(){}
}
const element=id=>{if(!nodes.has(id))nodes.set(id,new Stub(id));return nodes.get(id);};
const document={createElement:tag=>new Stub(tag),activeElement:null,addEventListener(){}};
const window={matchMedia:()=>({matches:true}),location:{href:"https://example.org/atlas/"}};
const fetch=async path=>path==="knowledge-graph/gw-core-concepts.json"?{ok:true,json:async()=>coreManifest}:{ok:false,json:async()=>({})};
vm.runInNewContext(await fs.readFile("concept-figures.js","utf8"),{window,document,console,URL});
vm.runInNewContext(await fs.readFile("concept-insight.js","utf8"),{window,document,console,URL});
vm.runInNewContext(await fs.readFile("constellation.js","utf8"),{window,document,console,URL,fetch,setTimeout:fn=>fn()});
let scene,nodeClick,zooms=0;
const charge={strength(){return charge;}};
const graph=new Proxy({graphData(value){if(value){scene=value;return graph;}return scene;},onNodeClick(fn){nodeClick=fn;return graph;},d3Force(){return charge;},zoomToFit(){zooms++;return graph;},cameraPosition(){return {x:0,y:0,z:400};}},{get(target,key){return key in target?target[key]:()=>graph;}});
const actions=[],host=new Stub("host");
const ui=window.AtlasConstellation.mount({host,macros:navigation.macros,topics:navigation.topics,concepts,locationByConcept:links,researchSources,researchQuestions,diagnosticQuestions,relationData:journey.relationships,forceGraph:()=>()=>graph,openConcept:id=>actions.push("concept:"+id),openLesson:id=>actions.push("lesson:"+id),startDrill:id=>actions.push("drill:"+id),hasLesson:id=>id==="supernova-kicks",startPractice:id=>actions.push("practice:"+id)});
await new Promise(resolve=>setImmediate(resolve));
assert.equal(concepts.length,263,"Exact 171-concept coverage is expanded into the live graph, not only an offline test");
assert.equal(ui.snapshot().stage,"overview");
assert.equal(element("#constellation-choices").children.length,5,"Overview starts with five large research landmarks");
assert.deepEqual(ui.snapshot().breadcrumbs,["Atlas"]);
assert.equal(scene,undefined,"3D remains lazy until the Graph tab is initialized");
ui.initialize();
assert.equal(scene.nodes.length,6);assert.equal(scene.links.length,5);assert.ok(zooms>0);
nodeClick(scene.nodes.find(n=>n.id==="stellar-origins"));
assert.equal(ui.snapshot().stage,"chapter");assert.deepEqual(ui.snapshot().breadcrumbs,["Atlas","Lives of stars"]);
nodeClick(scene.nodes.find(n=>n.id==="binary-stellar-evolution"));
assert.equal(ui.snapshot().stage,"macro");
nodeClick(scene.nodes.find(n=>n.id==="topic-binary-stellar-evolution-compact-binary-formation"));
assert.equal(ui.snapshot().stage,"topic");
assert.ok(scene.nodes.slice(1).every(n=>n.type==="concept"));
nodeClick(scene.nodes.find(n=>n.id==="supernova-kicks"));
assert.equal(ui.snapshot().selectedId,"supernova-kicks","Concept selection enters focused-neighbourhood mode");
assert.equal(element("#constellation-detail").hidden,true,"Selecting a concept no longer throws a long reader over the graph");
assert.equal(element("#constellation-context-v2").hidden,false,"A compact context surface opens beside the graph");
assert.match(element("#constellation-context-v2").innerHTML,/Supernova Natal Kicks/);
assert.match(element("#constellation-context-v2").innerHTML,/Immediate connections/);
assert.equal(scene.nodes[0].id,"supernova-kicks");assert.equal(scene.nodes[0].type,"selected");
assert.ok(scene.nodes.length<=13,"Focused neighbourhood limits attention to the selected concept plus at most twelve immediate neighbours");
assert.ok(scene.links.every(l=>["prerequisite","causal","application","useful"].includes(l.type)),"Focused scene contains scientific relationships rather than hierarchy spokes");
assert.ok(ui.snapshot().breadcrumbs.at(-1).includes("Supernova"));
const beforeLinks=scene.links.length;ui.toggleFilter("prerequisite");assert.equal(ui.snapshot().filters.prerequisite,false);assert.ok(scene.links.length<=beforeLinks);assert.ok(scene.links.every(l=>l.type!=="prerequisite"));ui.toggleFilter("prerequisite");
ui.search("effective spin");await new Promise(resolve=>setImmediate(resolve));assert.equal(element("#constellation-search-results").hidden,false,"Search exposes matching concepts without leaving the graph");
ui.focusConcept("core-effective-spin-chi-eff");assert.equal(ui.snapshot().selectedId,"core-effective-spin-chi-eff","Exact requested coverage concepts can be focused directly");
assert.equal(ui.snapshot().stage,"topic");
ui.focusConcept("supernova-kicks");element("#constellation-context-learn").handlers.click();
assert.equal(element("#constellation-detail").hidden,false,"Full reading unit opens only when explicitly requested");
assert.match(element("#constellation-detail").innerHTML,/Learning objectives/);assert.match(element("#constellation-detail").innerHTML,/Understand the idea/);assert.match(element("#constellation-detail").innerHTML,/Research resources/);assert.doesNotMatch(element("#constellation-detail").innerHTML,/guided-working|Quick conceptual check/);
element("#constellation-open-practice").handlers.click();assert.deepEqual(actions,["practice:supernova-kicks"]);
ui.focusConcept("supernova-kicks");ui.back();assert.equal(ui.snapshot().selectedId,null,"Back exits focus mode before leaving the topic");ui.back();assert.equal(ui.snapshot().stage,"macro");
ui.showQuestion({title:"Research question",summary:"Test",activity:"Try it",conceptIds:["supernova-kicks"]});assert.match(element("#constellation-detail").innerHTML,/Research question/);
const page=await fs.readFile("index.html","utf8");assert.equal((page.match(/data-atlas-tab=/g)||[]).length,3);assert.ok(page.includes('id="legacy-explorer" hidden'));
const fallback=window.AtlasConstellation.mount({host:new Stub("fallback"),macros:navigation.macros,topics:navigation.topics,concepts,locationByConcept:links,forceGraph:()=>null,openConcept:()=>{},openLesson:()=>{},startDrill:()=>{},hasLesson:()=>false});fallback.initialize();assert.equal(fallback.snapshot().has3D,false);assert.equal(element("#constellation-fallback").hidden,false);assert.equal(fallback.scene().items.length,5);
console.log("Passed: semantic zoom, 263 live concepts, breadcrumbs, search, focused neighbourhoods, typed filters, compact context, explicit full reader and no-WebGL fallback.");
