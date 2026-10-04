#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
const [conceptData,sourceData,journey]=await Promise.all([
 "knowledge-graph/concepts.json","knowledge-graph/research-sources.json","knowledge-graph/research-journey.json"
].map(async p=>JSON.parse(await fs.readFile(p,"utf8"))));
const win={};const context=vm.createContext({window:win,URL,console});
vm.runInContext(await fs.readFile("research-models.js","utf8"),context);
vm.runInContext(await fs.readFile("research-experience.js","utf8"),context);
const M=win.AtlasResearchModels,X=win.AtlasResearchExperience;
assert.equal(X.validate(journey,conceptData.concepts,sourceData.sources),true);
assert.equal(journey.stages.length,6);assert.equal(journey.inquiries.length,18);assert.equal(journey.problems.length,30);
for(const s of journey.stages){assert.equal(journey.inquiries.filter(q=>q.stageId===s.id).length,3);assert.equal(journey.problems.filter(p=>s.conceptIds.includes(p.conceptId)).length,5);}
assert.ok(journey.relationships.some(e=>e.kind==="causal")&&journey.relationships.some(e=>e.kind==="application")&&journey.relationships.some(e=>e.kind==="prerequisite"));
let r=M.kick({k:0,f:0,angle:0});assert.equal(r.bound,true);assert.ok(Math.abs(r.energy+.5)<1e-12);assert.ok(Math.abs(r.ecc)<1e-10);assert.ok(Math.abs(r.a-1)<1e-10);
assert.equal(M.kick({k:0,f:.5}).bound,null);assert.equal(M.kick({k:.5,angle:0,f:0}).bound,false);assert.equal(M.kick({k:.5,angle:180,f:0}).bound,true);
const chirp=M.chirp({m1:10,m2:10,forb:20});assert.ok(chirp.mc>8&&chirp.mc<9);assert.equal(chirp.fgw,40);assert.ok(chirp.tSec>0&&chirp.fDot>0);
assert.equal(M.envelope({released:15,required:10,alpha:.6}).budgetMet,false);assert.ok(Math.abs(M.roche({donor:10,accretor:10,radius:1,a:10}).lobe/10-.37892)<.002);
const selection=M.selection({a:100,b:100,pa:.8,pb:.2});assert.equal(selection.da,80);assert.equal(selection.db,20);assert.ok(Math.abs(selection.detected-.8)<1e-12);
const delay=M.delays({t1:2,t2:5,delay:3,mass1:1000,mass2:2000,yieldPer1000:1});assert.equal(delay.merge1,5);assert.equal(delay.merge2,8);
const pop=M.population({n:100,seed:42}),pop2=M.population({n:100,seed:42});assert.deepEqual(JSON.parse(JSON.stringify(pop.rows)),JSON.parse(JSON.stringify(pop2.rows)));assert.equal(pop.rows.length,100);
const units=[{id:"unit",objectives:[{id:"a",component:"conceptual"},{id:"b",component:"quantitative"}]}],now=1_000_000_000;
const evidence=M.evidence([{unitId:"unit",objectiveId:"a",correct:false,at:now-2*86400000},{unitId:"unit",objectiveId:"b",correct:true,at:now}],units,now);assert.equal(evidence.conceptual.due,1);assert.equal(evidence.quantitative.correct,1);
const handlers={};const host={innerHTML:"",addEventListener:(name,fn)=>handlers[name]=fn,querySelector:()=>null};
const saved=new Map(),storage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)};let selectedConcept="",openedPractice="";
const instance=X.mount({host,data:journey,concepts:conceptData.concepts,sources:sourceData.sources,model:M,storage,getEvidence:()=>evidence,openConcept:id=>selectedConcept=id,openPractice:id=>openedPractice=id});
assert.match(host.innerHTML,/Choose a research question to explore/);assert.equal(instance.snapshot().stage,null);assert.equal((host.innerHTML.match(/data-stage="/g)||[]).length,6);assert.doesNotMatch(host.innerHTML,/CURRENT STAGE|Suggested earlier stage/);
handlers.click({target:{closest:()=>({dataset:{stage:"inference"}})}});assert.equal(instance.snapshot().stage,"inference");assert.equal((host.innerHTML.match(/data-inquiry="/g)||[]).length,3);
handlers.click({target:{closest:()=>({dataset:{inquiry:"inference-bias"}})}});assert.equal(instance.snapshot().selectedInquiry,"inference-bias");assert.match(host.innerHTML,/QUESTION TO INVESTIGATE/);
handlers.click({target:{closest:()=>({dataset:{action:"use-inquiry"}})}});assert.equal(instance.snapshot().notes.inference.question,journey.inquiries.find(q=>q.id==="inference-bias").question);
handlers.click({target:{closest:()=>({dataset:{action:"practice"}})}});assert.equal(openedPractice,"detector-selection-effects");
handlers.click({target:{closest:()=>({dataset:{concept:"cosmic-merger-rates"}})}});assert.equal(selectedConcept,"cosmic-merger-rates");
const before=await fs.readFile("index.html","utf8");assert.ok(before.indexOf('id="research-experience"')<before.indexOf('id="practice-panel"'));assert.equal((before.match(/data-atlas-tab=/g)||[]).length,3);
const graph=await fs.readFile("constellation.js","utf8");
assert.ok(graph.includes("RELATION_LABELS")&&graph.includes("focusSceneData")&&graph.includes("relationData"),"Graph distinguishes scientific relation types from hierarchy containment and builds a focused relation scene");
assert.ok(graph.includes('prerequisite:"Prerequisite"')&&graph.includes('causal:"Physical influence"')&&graph.includes('application:"Application"'));
console.log("Passed: research questions remain non-linear and separate from Practice; toy models, safe notebook handoff and typed semantic graph integration remain intact.");
