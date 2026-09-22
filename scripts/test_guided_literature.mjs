#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
const concepts=JSON.parse(await fs.readFile("knowledge-graph/concepts.json","utf8")).concepts;
const window={};
const ctx=vm.createContext({window,URL,console});
vm.runInContext(await fs.readFile("guided-practice.js","utf8"),ctx);
vm.runInContext(await fs.readFile("literature-search.js","utf8"),ctx);
const g=window.AtlasGuidedPractice,l=window.AtlasLiterature;
assert.equal(g.TIERS.length,10);assert.equal(g.TASKS.length,10);
assert.equal(concepts.length,133);
for(const c of concepts){
 const prompts=Array.from({length:100},(_,i)=>g.promptFor(c,i,new Map(concepts.map(item=>[item.id,item]))));
 assert.equal(prompts.length,100);
 assert.equal(new Set(prompts.map(p=>p.tier+"-"+p.taskName)).size,100,"100 separately addressable progression steps per concept");
 assert.equal(prompts[0].tier,1);assert.equal(prompts[99].tier,10);
 assert.ok(prompts.every(p=>p.prompt.includes(c.title)&&p.checks.length===3),"Concept-specific scientific focus and self-checks");
}
const kick=concepts.find(c=>c.id==="supernova-kicks");
assert.ok(g.promptFor(kick,99).prompt.includes("model assumption"));
assert.match(l.queryFor(kick),/Supernova Natal Kicks/);
const url=new URL(l.buildUrl(kick,50));
assert.equal(url.host,"api.openalex.org");
assert.equal(url.searchParams.get("page"),"50");
assert.equal(url.searchParams.get("per_page"),"20");
assert.throws(()=>l.buildUrl(kick,51));
const paper=l.normalize({title:"A real title",doi:"https://doi.org/10.1234/abc",
 publication_year:2020,authorships:[{author:{display_name:"A Scientist"}}]});
assert.equal(paper.url,"https://doi.org/10.1234/abc");
assert.equal(paper.year,2020);
assert.equal(l.normalize({title:"No link",doi:"javascript:alert(1)"}),null,"Never render unsafe links");
const page=await fs.readFile("index.html","utf8");
assert.match(page,/src="guided-practice.js"/);
assert.match(page,/src="literature-search.js"/);
assert.equal((page.match(/<summary>Research questions<\/summary>/g)||[]).length,1,"One consolidated visible research question section");
const constellation=await fs.readFile("constellation.js","utf8");
assert.ok(!constellation.includes("Connected research questions"),"No redundant second research question group");
assert.ok(constellation.includes("What you will learn")&&constellation.includes("concept-panel-objectives"),"Learning objectives have their own drawer tab");
assert.ok(!constellation.includes("constellation-guided-practice"),"The 100-step trainer must never mount in the Knowledge Graph");
assert.ok(constellation.includes("constellation-open-practice"),"Graph directs all guided work to Practice");
assert.ok(constellation.includes("constellation-literature"));
console.log("Passed: 13,300 concept-specific guided self-check steps with explicit ten-tier progression; safe, paginated live research metadata; unique research-question section.");
