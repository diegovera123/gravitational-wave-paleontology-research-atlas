#!/usr/bin/env node
// Mission-route logic and lightweight UI tests; not a substitute for browser visual QA.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
const concepts=JSON.parse(await fs.readFile("knowledge-graph/concepts.json","utf8")).concepts;
const questionPaths=JSON.parse(await fs.readFile("knowledge-graph/research-questions.json","utf8")).questions;
const storage=new Map();
const window={localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,val)=>storage.set(key,val)}};
vm.runInNewContext(await fs.readFile("guide.js","utf8"),{window});
const guide=window.AtlasGuide,conceptMap=new Map(concepts.map(c=>[c.id,c]));
for(const profile of [
  {},
  {goal:{key:"q:binary-survival",goalId:"compact-binary-formation",label:"Binary survival"}},
  {goal:{key:"c:supernova-kicks",goalId:"supernova-kicks",label:"Natal kicks"},ratings:{"core-collapse-supernovae":{rating:0}}}
]){
  const path=guide.plan(concepts,questionPaths,profile,[]);
  assert.ok(path.steps.length>=2 && path.steps.length<=5,"A mission has a compact number of stops");
  assert.equal(path.steps.at(-1).id,path.goalId,"Selected goal is the destination");
  for(let i=1;i<path.steps.length;i++){
    assert.ok(conceptMap.get(path.steps[i].id).prerequisites.some(e=>
      e.kind==="necessary"&&e.id===path.steps[i-1].id),"Every adjacent step is a real necessary-prerequisite relationship");
  }
}
class ElementStub{
  constructor(){this.innerHTML="";this.dataset={};this.listeners={};}
  querySelector(){return new ElementStub();}
  querySelectorAll(){return [];}
  addEventListener(name,handler){this.listeners[name]=handler;}
}
const host=new ElementStub(),actions=[];
const instance=guide.mount({
  host,concepts,questionPaths,
  getProfile:()=>({goal:{key:"q:binary-survival",goalId:"compact-binary-formation",label:"Binary survival"}}),
  getStudied:()=>[],
  hasLesson:id=>id==="derivatives",
  openConcept:id=>actions.push("concept:"+id),
  openLesson:id=>actions.push("lesson:"+id),
  openDiagnostic:()=>actions.push("diagnostic"),
  openAtlas:()=>actions.push("atlas"),
  openQuestion:id=>actions.push("question:"+id)
});
assert.match(host.innerHTML,/OTTO · YOUR COSMIC GUIDE/);
assert.match(host.innerHTML,/Continue my mission/);
const first=instance.plan().steps[0].id;
instance.enter(first);
assert.ok(JSON.parse(storage.get("research-atlas-otto-visited-v1")).includes(first),
  "Visiting a mission step persists only a visited marker");
assert.ok(actions.includes("concept:"+first),"A mission stop opens actual Atlas content");
assert.match(host.innerHTML,/Visiting a stop does not establish mastery/);
console.log("Passed: three genuine prerequisite paths, mascot-led route rendering, actionable stops, and separate visited-only progress.");
