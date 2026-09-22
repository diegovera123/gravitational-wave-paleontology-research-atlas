#!/usr/bin/env node
// Tests the domain / concept / prerequisite / exercise home with a lightweight DOM stub.
// Browser visual and keyboard checks remain separate.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
const concepts=JSON.parse(await fs.readFile("knowledge-graph/concepts.json","utf8")).concepts;
const navigation=JSON.parse(await fs.readFile("knowledge-graph/navigation.json","utf8"));
const questions=JSON.parse(await fs.readFile("knowledge-graph/diagnostic-questions.json","utf8")).questions;
const learningUnits=JSON.parse(await fs.readFile("knowledge-graph/learning-units.json","utf8")).units;
const refs=new Map();
class Stub{
  constructor(id){this.id=id;this.hidden=false;this.innerHTML="";this.textContent="";this.children=[];this.dataset={};this.events={};this.disabled=false;this.classList={add(){},remove(){}};}
  addEventListener(event,callback){this.events[event]=callback;}
  setAttribute(key,value){this[key]=value;}
  appendChild(element){this.children.push(element);return element;}
  replaceChildren(...elements){this.children=elements;}
  querySelector(key){const id=this.id+" "+key;if(!refs.has(id))refs.set(id,new Stub(id));return refs.get(id);}
  querySelectorAll(key){
    if(key==="[data-focus-answer]"){
      const matches=[...this.innerHTML.matchAll(/data-focus-answer="(\d+)"/g)];
      return matches.map(match=>{const button=new Stub("choice"+match[1]);button.dataset.focusAnswer=match[1];return button;});
    }
    return [];
  }
  scrollIntoView(){}
}
const document={createElement:tag=>new Stub(tag)};
const root={};
vm.runInNewContext(await fs.readFile("focus-home.js","utf8"),{window:root,document});
const locator=new Map(navigation.macros.map(m=>[m.id,{macroId:m.id,topicId:null}]));
navigation.topics.forEach(t=>t.conceptIds.forEach(id=>locator.set(id,{macroId:t.macroId,topicId:t.id})));
const actions=[],host=new Stub("home");
const home=root.AtlasFocusedHome.mount({
  host,macros:navigation.macros,topics:navigation.topics,concepts,questions,learningUnits,
  locationByConcept:locator,getProfile:()=>({goal:{goalId:"supernova-kicks"}}),getStudied:()=>[],
  openConcept:id=>actions.push("concept:"+id),openLesson:id=>actions.push("lesson:"+id),
  startDrill:id=>actions.push("drill:"+id),openDiagnostic:()=>actions.push("diagnostic"),
  openMap:()=>actions.push("map"),openRegion:id=>actions.push("region:"+id),
  openResearch:()=>actions.push("research"),openAllPractice:()=>actions.push("practice"),
  openLibrary:()=>actions.push("library")
});
assert.equal(home.domain(),"binary-stellar-evolution","Diagnostic goal selects relevant domain");
assert.equal(host.querySelector("#focus-domains").children.length,navigation.macros.length,"All domains are selectable");
assert.equal(host.querySelector("#focus-concepts").children.length,6,"Default concept list remains short");
home.selectConcept("supernova-kicks");
const detail=host.querySelector("#focus-detail");
assert.match(detail.innerHTML,/Linear Momentum/,"Necessary prerequisites are explained via real concept links");
assert.match(detail.innerHTML,/Probability Distributions/,"Prerequisites can belong to other domains");
assert.match(detail.innerHTML,/Builds toward/,"Concepts show downstream scientific connections");
assert.match(detail.innerHTML,/Start 5-question drill/,"Complete lesson has a real practice route");
detail.querySelector("#focus-start-drill").events.click();
assert.ok(actions.includes("drill:supernova-kicks"));
home.selectConcept("functions");
assert.equal(home.domain(),"calculus","Cross-domain prerequisite navigation updates domain");
assert.match(detail.innerHTML,/Try a quick conceptual check/,"Conceptual check appears only for authored questions");
detail.querySelector("#focus-start-drill").events.click();
assert.match(host.querySelector("#focus-quiz").innerHTML,/ONE-QUESTION CONCEPT CHECK/,"One short question appears on demand");
assert.equal(host.querySelector("#focus-quiz").hidden,false);
home.selectConcept("binary-population-synthesis");
assert.match(detail.innerHTML,/Exercise idea/,"Ungraded practice prompt is still available when no authored bank item exists");
assert.ok(!detail.innerHTML.includes("Start 5-question drill"),"Does not promise non-existent adaptive drills");
const markup=await fs.readFile("index.html","utf8");
assert.ok(markup.includes('<details id="focus-graph-toggle"')&&markup.split('id="dashboard-network-map"').length===2,
  "The optional graph appears once in a native disclosure element");
console.log("Passed: goal-related domains, compact cards, typed prerequisites, downstream links, real drills, one-question checks, and no invented practice.");
