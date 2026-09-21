#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";

const concepts=JSON.parse(await fs.readFile("knowledge-graph/concepts.json","utf8")).concepts;
const bank=JSON.parse(await fs.readFile("knowledge-graph/diagnostic-questions.json","utf8"));
const context={window:{}};
vm.runInNewContext(await fs.readFile("diagnostic.js","utf8"),context);
const d=context.window.AtlasDiagnostic;

assert.equal(d.validateQuestions(bank,concepts),true);
assert.equal(bank.questions.length,22);
assert.equal(new Set(bank.questions.map(q=>q.id)).size,22);

const goal="binary-population-synthesis";
const seedIds=["binary-population-synthesis","probability-distributions","monte-carlo-methods"];
const scope=d.buildScope(concepts,goal,seedIds);
assert.ok(scope.scope.includes(goal));
assert.ok(scope.scope.includes("probability-distributions"));
assert.ok(scope.scope.length>seedIds.length,"Scope includes prerequisite ancestors");

const s=d.start(concepts,goal,seedIds,10);
assert.equal(s.currentId,goal);
d.rate(s,goal,1,3);
const q=bank.questions.find(x=>x.conceptId===goal);
assert.ok(q,"Goal has a conceptual check");
const wrong=q.choices.findIndex((_,i)=>i!==q.correctIndex);
const record=d.recordCheck(s,goal,q,wrong,3);
assert.equal(record.correct,false);
assert.equal(d.statusForId(s,goal),"review-confident");
const next=d.advance(s,concepts);
assert.ok(next && next!==goal,"Low/incorrect evidence moves into another relevant concept");
const nextConcept=concepts.find(c=>c.id===next);
assert.ok(nextConcept,"Advanced-to concept exists");
const necessary=new Set(concepts.find(c=>c.id===goal).prerequisites.filter(e=>e.kind==="necessary").map(e=>e.id));
assert.ok(necessary.has(next)||seedIds.includes(next)||scope.scope.includes(next),
  "Next concept remains inside goal scope/prerequisites");

// Correct-but-unsure must remain distinguishable from confident evidence.
const s2=d.start(concepts,"derivatives",["derivatives"],4);
d.rate(s2,"derivatives",3,2);
const dq=bank.questions.find(x=>x.conceptId==="derivatives");
d.recordCheck(s2,"derivatives",dq,dq.correctIndex,1);
assert.equal(d.statusForId(s2,"derivatives"),"supported-uncertain");

// Self-rating alone is explicitly not mastery evidence.
const s3=d.start(concepts,"limits",["limits"],3);
d.rate(s3,"limits",4,3);
assert.equal(d.statusForId(s3,"limits"),"self-reported");

// Completing a short sample produces recommendations but never a mastery score.
d.advance(s2,concepts);
s2.finished=true;
const summary=d.summary(s2,concepts);
assert.ok(Number.isInteger(summary.rated));
assert.ok(Array.isArray(summary.recommendations));
assert.equal(Object.prototype.hasOwnProperty.call(summary,"mastery"),false);
assert.equal(Object.prototype.hasOwnProperty.call(summary,"score"),false);

console.log("Passed: diagnostic bank validation, goal-scoped traversal, prerequisite branching, confidence/performance calibration states, and no inferred mastery score.");
