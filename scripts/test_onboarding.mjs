#!/usr/bin/env node
// Guided-first-visit smoke test. DOM/WebGL are mocked; visually test the deployed site separately.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
const paths=[
  "knowledge-graph/concepts.json","knowledge-graph/research-sources.json",
  "knowledge-graph/navigation.json","knowledge-graph/research-questions.json",
  "knowledge-graph/learning-units.json","knowledge-graph/adaptive-items.json",
  "knowledge-graph/diagnostic-questions.json"
];
const responseData=Object.fromEntries(await Promise.all(paths.map(async path=>
  [path,JSON.parse(await fs.readFile(path,"utf8"))])));
const adaptive=await fs.readFile("adaptive.js","utf8");
const diagnostic=await fs.readFile("diagnostic.js","utf8");
const application=await fs.readFile("app.js","utf8");
const data=await fs.readFile("index.html","utf8");

assert.match(data,/<section id="diagnostic-panel"/);
assert.match(data,/<nav id="atlas-tabs"[^>]*hidden>/);
assert.match(data,/<section id="dashboard"[^>]*hidden>/);
assert.ok(data.indexOf('id="dashboard-network-map"')<data.indexOf('id="guided-route"'),
  "The knowledge graph should precede recommendations on the homepage.");

class ElementStub{
  constructor(id="dynamic"){
    this.id=id;this.hidden=["atlas-tabs","site-intro","dashboard","paths-panel",
      "learn-panel","explore-panel","library-panel","graph-map"].includes(id);
    this.innerHTML="";this.textContent="";this.value="";this.disabled=false;
    this.children=[];this.dataset={};this.handlers={};this.style={setProperty(){}};
    this.clientWidth=1100;this.clientHeight=520;this.tabIndex=0;
  }
  addEventListener(name,fn){this.handlers[name]=fn;}
  setAttribute(name,value){this[name]=value;}
  appendChild(child){this.children.push(child);return child;}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=children;}
  querySelector(){return new ElementStub();}
  querySelectorAll(){return [];}
  closest(){return null;}
  focus(){}
  scrollIntoView(){}
}
async function createEnvironment({completed=false,skipped=false}={}){
  const elements=new Map();
  const get=selector=>{
    if(!elements.has(selector))elements.set(selector,new ElementStub(selector.replace(/^#/,"")));
    return elements.get(selector);
  };
  const document={
    querySelector:get,createElement:name=>new ElementStub(name),
    createElementNS:()=>new ElementStub("svg"),
    createTextNode:text=>({textContent:text}),addEventListener(){},activeElement:null
  };
  const storage=new Map(skipped?[["research-atlas-onboarding-v1","skipped"]]:[]);
  const window={
    location:{href:"https://example.org/research-atlas/"},
    matchMedia:()=>({matches:true}),addEventListener(){},
    localStorage:{getItem:key=>storage.get(key)||null,
      setItem:(key,value)=>storage.set(key,value)}
  };
  const profile={
    goal:completed?{goalId:"supernova-kicks",label:"Natal kicks"}:null,
    ratings:completed?{"supernova-kicks":{rating:1,certainty:2,at:Date.now()}}:{},
    checks:{},completedAt:completed?Date.now():null
  };
  let hooks,openCount=0,scene;
  const errors=[];
  window.AtlasDiagnosticUI={mount(args){
    hooks=args;
    return {
      snapshot:()=>profile,renderOverview(){},
      status:id=>profile.ratings[id]?
        (profile.ratings[id].rating<=1?"self-reported-gap":"self-reported"):"unassessed",
      labelFor:()=>"Revisit this concept",
      hasRatings:()=>Object.keys(profile.ratings).length>0,
      open(){openCount++;args.navigate("diagnostic");}
    };
  }};
  const force={strength(){return force;}};
  const graph=new Proxy({
    graphData(value){if(value){scene=value;return graph;}return scene;},
    d3Force(){return force;}
  },{get:(target,key)=>key in target?target[key]:()=>graph});
  const context=vm.createContext({
    document,window,URL,console:{
      info(){},warn(){},error(...args){errors.push(args.join(" "));}
    },
    ForceGraph3D:()=>()=>graph,
    fetch:async path=>({ok:!!responseData[path],json:async()=>responseData[path]}),
    setTimeout:callback=>callback()
  });
  vm.runInContext(adaptive,context);
  vm.runInContext(diagnostic,context);
  vm.runInContext(application,context);
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(errors,[],"Application should initialize without errors");
  return {get,storage,profile,scene:()=>scene,hooks:()=>hooks,openCount:()=>openCount,
    run:code=>vm.runInContext(code,context)};
}

const first=await createEnvironment();
assert.equal(first.get("#atlas-tabs").hidden,true,"No navigation wall before assessment");
assert.equal(first.get("#dashboard").hidden,true,"Graph is initially hidden behind quiz");
assert.equal(first.get("#diagnostic-panel").hidden,false,"Quiz is the first visible panel");
assert.ok(first.openCount()>0,"Concept goal chooser opens automatically");
assert.equal(first.scene().nodes.length,10,"Knowledge graph still initializes");
first.get("#skip-onboarding").handlers.click();
assert.equal(first.get("#dashboard").hidden,false,"Skip reveals complete knowledge map");
assert.equal(first.get("#atlas-tabs").hidden,false);
assert.equal(first.storage.get("research-atlas-onboarding-v1"),"skipped");

const returning=await createEnvironment({completed:true});
assert.equal(returning.get("#dashboard").hidden,false,"Completed profile returns directly to map");
assert.equal(returning.get("#diagnostic-panel").hidden,true);
assert.ok(returning.get("#guided-route-cards").children.length>0,
  "Completed profile renders provisional next-step concepts");

const completed=await createEnvironment();
completed.profile.goal={goalId:"supernova-kicks",label:"Natal kicks"};
completed.profile.ratings["supernova-kicks"]={rating:1,certainty:3,at:Date.now()};
completed.profile.completedAt=Date.now();
completed.hooks().onProfileChange();
completed.hooks().onComplete();
assert.equal(completed.get("#dashboard").hidden,false,"Finishing quiz opens map automatically");
assert.equal(completed.get("#quiz-first-banner").hidden,true,"Onboarding chrome is removed");
assert.ok(completed.get("#guided-route-cards").children.length>0);
console.log("Passed: quiz-first landing, graph initialization, skip/persistence, returning-user map, and completion-to-personalized-map handoff (mocked DOM/WebGL).");
