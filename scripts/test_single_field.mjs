#!/usr/bin/env node
/* Progressive single-field home regression tests; does not replace real-browser QA. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
const concepts=JSON.parse(await fs.readFile("knowledge-graph/concepts.json","utf8")).concepts;
const navigation=JSON.parse(await fs.readFile("knowledge-graph/navigation.json","utf8"));
const questions=JSON.parse(await fs.readFile("knowledge-graph/diagnostic-questions.json","utf8")).questions;
const learningUnits=JSON.parse(await fs.readFile("knowledge-graph/learning-units.json","utf8")).units;
class Stub {
 constructor(name){this.name=name;this.hidden=false;this.innerHTML="";this.textContent="";this.children=[];this.dataset={};this.events={};this.disabled=false;}
 addEventListener(event,callback){this.events[event]=callback;}
 setAttribute(k,v){this[k]=v;}
 appendChild(node){this.children.push(node);return node;}
 replaceChildren(...nodes){this.children=nodes;}
 querySelector(key){return get(this.name+" "+key);}
 querySelectorAll(key){if(key==="[data-focus-answer]")return [...this.innerHTML.matchAll(/data-focus-answer="(\d+)"/g)].map(m=>{const e=new Stub("choice");e.dataset.focusAnswer=m[1];return e;});return [];}
 scrollIntoView(){}
}
const nodes=new Map();function get(key){if(!nodes.has(key))nodes.set(key,new Stub(key));return nodes.get(key);}
const document={createElement:tag=>new Stub(tag)};
const window={};vm.runInNewContext(await fs.readFile("focus-home.js","utf8"),{window,document});
const locationByConcept=new Map(navigation.macros.map(m=>[m.id,{macroId:m.id,topicId:null}]));
navigation.topics.forEach(t=>t.conceptIds.forEach(id=>locationByConcept.set(id,{macroId:t.macroId,topicId:t.id})));
const actions=[],host=new Stub("home");
const home=window.AtlasFocusedHome.mount({host,macros:navigation.macros,topics:navigation.topics,
 concepts,questions,learningUnits,locationByConcept,getProfile:()=>({}),getStudied:()=>[],
 openConcept:id=>actions.push("concept:"+id),openLesson:id=>actions.push("lesson:"+id),
 startDrill:id=>actions.push("drill:"+id),openDiagnostic:()=>actions.push("diagnostic"),
 openMap:()=>actions.push("map"),openRegion:id=>actions.push("region:"+id),
 openResearch:()=>actions.push("research"),openAllPractice:()=>actions.push("practice"),
 openLibrary:()=>actions.push("library")});
assert.equal(get("home #focus-domains").children.length,5,"One field has five connected parts, not ten competing fields");
assert.equal(home.chapter(),null,"No topic wall shown on initial load");
assert.equal(get("home #focus-concept-section").hidden,true,"Concepts are progressively disclosed");
home.selectChapter("cosmic-record");
assert.equal(home.chapter(),"cosmic-record");
assert.equal(get("home #focus-topics").children.length,3,"One chapter opens three actual curriculum topics");
assert.equal(get("home #focus-concepts").children.length,0,"Concepts are not shown until a topic is selected");
home.selectTopic("topic-gravitational-wave-paleontology-cosmic-evolution-and-rates");
assert.equal(get("home #focus-concepts").children.length,4,"Topic selection shows the four genuine concepts, not an unrelated sorted list");
home.selectConcept("cosmic-merger-rates");
assert.match(get("home #focus-detail").innerHTML,/Delay-Time Distributions/);
assert.match(get("home #focus-detail").innerHTML,/Useful background|Where this leads/);
home.selectConcept("supernova-kicks");
assert.equal(home.chapter(),"stellar-origins","Cross-part prerequisite navigation opens its actual chapter");
assert.equal(home.topic(),"topic-binary-stellar-evolution-compact-binary-formation");
assert.match(get("home #focus-detail").innerHTML,/Linear Momentum/);
assert.match(get("home #focus-detail").innerHTML,/Start 5-question drill/);
get("home #focus-detail #focus-start-drill").events.click();
assert.ok(actions.includes("drill:supernova-kicks"));
home.selectConcept("functions");
assert.equal(home.chapter(),"research-tools");
assert.match(get("home #focus-detail").innerHTML,/Try a quick conceptual check/);
get("home #focus-detail #focus-start-drill").events.click();
assert.equal(get("home #focus-quiz").hidden,false);
assert.match(get("home #focus-quiz").innerHTML,/ONE-QUESTION CONCEPT CHECK/);
home.selectConcept("gravitational-wave-paleontology");
assert.equal(home.chapter(),"cosmic-record","The entire Atlas has one explicit central concept");
assert.match(get("home #focus-detail").innerHTML,/Gravitational-Wave Paleontology/);
const mapped=new Set([...navigation.macros.map(m=>m.id),...navigation.topics.flatMap(t=>t.conceptIds)]);
assert.ok(concepts.every(c=>mapped.has(c.id)),"All 133 existing concepts remain reachable through parts, topics or their macro overview");
const page=await fs.readFile("index.html","utf8");
assert.equal((page.match(/data-atlas-tab=/g)||[]).length,3,"The app exposes Home, Knowledge Graph and Practice");
assert.ok(page.includes('id="simple-home-graph"')&&page.includes('id="constellation-shell"')&&page.includes('id="legacy-explorer" hidden'),"Home opens the 3D constellation and never shows the old two-column explorer");
assert.ok(page.indexOf('id="diagnostic-panel"')>page.indexOf('id="home-panel"'),"The optional diagnostic lives within Home");
assert.ok(page.indexOf('id="learning-studio"')>page.indexOf('id="explore-panel"'),"Full authored learning units remain within Knowledge Graph");
assert.ok(page.includes('id="practice-panel"')&&page.includes('id="practice-unit-cards"')&&page.includes('id="due-practice"'),"Practice has its own panel, real sets and review queue");
assert.equal((page.match(/id="adaptive-panel"/g)||[]).length,1,"Adaptive quiz belongs to the dedicated Practice panel only");
assert.ok(!page.includes("Pick a field. Explore an idea."));
console.log("Passed: one-field curriculum with 133 concepts, progressive graph, three top-level sections, Home diagnostic, Graph lessons and separate Practice.");
