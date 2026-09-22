/* Guided self-check prompts are structured study scaffolds, not authored numerical quiz items. */
(function(root){
"use strict";
const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const TIERS=[
 ["Recognition","Identify the relevant terms and distinguish the central scientific claim from its everyday meaning."],
 ["Explanation","Explain the concept in your own words and connect the representations used to describe it."],
 ["Translation","Translate between qualitative descriptions, symbols, diagrams, models and units where appropriate."],
 ["Application","Apply the idea to a concrete illustrative scenario and document the assumptions."],
 ["Calculation or worked reasoning","Carry out a worked example when a numerical model is available; otherwise construct a stepwise qualitative argument."],
 ["Causal variation","Vary one input, trace plausible consequences, and separate a prediction from an assumption."],
 ["Connection","Connect this concept to prerequisites, downstream science and contrasting explanations."],
 ["Uncertainty","Test boundaries, uncertainty, measurement and sensitivity to modeling choices."],
 ["Research critique","Evaluate claims, methods, datasets, missing evidence and possible alternative interpretations."],
 ["Synthesis","Design and defend a small research investigation integrating this idea with broader gravitational-wave paleontology."]
];
const TASKS=[
 ["Define and delimit","Write a precise definition, state its scope, then give one counterexample to an overbroad interpretation."],
 ["Explain to a peer","Write a short teaching explanation and anticipate a common misconception."],
 ["Compare and contrast","Compare this idea with a necessary prerequisite or neighboring concept; name at least two differences."],
 ["Translate representations","Express the same claim as prose and an equation, diagram or labeled flow; note when a mathematical representation is unavailable."],
 ["Construct an example","Construct an illustrative example, give each variable a meaning, and state which values are assumed rather than observed."],
 ["Vary an assumption","Change one assumption or parameter and predict how your conclusion may change, citing the rule used."],
 ["Test an edge case","Find a limit or special case, and explain what it does and does not establish."],
 ["Connect to a paper","Find a relevant research source, identify its question and method, then explain how the concept enters its argument."],
 ["Diagnose an error","Invent a plausible incorrect conclusion, identify its hidden assumption and correct the reasoning."],
 ["Build a mini investigation","Specify inputs, a reproducible method, a comparison, expected outputs and a limitation or falsification check."]
];
const promptFor=(concept,index,known=new Map())=>{
 if(!concept||!Array.isArray(concept.learningObjectives)||!concept.learningObjectives.length)throw Error("Concept objectives required");
 if(!Number.isInteger(index)||index<0||index>=100)throw Error("Guided prompt index must be 0–99");
 const tier=Math.floor(index/10),kind=index%10;
 const objective=concept.learningObjectives[(tier+kind)%concept.learningObjectives.length];
 const pre=(concept.prerequisites||[]).filter(x=>x.kind==="necessary");
 const focus=pre.length?known.get(pre[(tier+kind)%pre.length].id)?.title||pre[(tier+kind)%pre.length].id:"the foundational assumptions";
 return {number:index+1,tier:tier+1,tierName:TIERS[tier][0],taskName:TASKS[kind][0],
  prompt:TIERS[tier][1]+" "+TASKS[kind][1]+
   " Scientific focus: "+objective+" Concept: "+concept.title+". Research connection: "+
   (concept.researchApplication||concept.whyItMatters||"gravitational-wave paleontology")+". "+
   (tier>=3?"Use "+focus+" as context where relevant. ":"")+
   (tier>=6?"Explicitly distinguish an established result, a model assumption, and your inference. ":"")+
   (tier>=8?"Document a public source and explain uncertainty and an alternative interpretation.":""),
  checks:[
   "Have I addressed the precise learning objective and defined the physical quantities or terms?",
   "Are my steps, assumptions and units explicit where they apply?",
   "Have I separated model predictions, observations, uncertainties and claims that require verification?"
  ]};
};
function mount({host,concept,concepts=[]}){
 if(!host||!concept)return null;
 const known=new Map(concepts.map(c=>[c.id,c]));
 let current=0,completed=new Set();
 function render(){
  const p=promptFor(concept,current,known);
  host.innerHTML='<div class="guided-head"><div><span class="lesson-kicker">100 PROGRESSIVE GUIDED RESEARCH PROMPTS · SELF-CHECKED</span>'+
   '<h4>'+esc(concept.title)+'</h4><p>These are structured study and research tasks generated from this concept’s actual learning objectives. They are not 100 independently authored or automatically graded numerical problems.</p></div>'+
   '<span class="guided-count">'+p.number+' / 100</span></div>'+
   '<div class="guided-tier"><strong>Tier '+p.tier+' · '+esc(p.tierName)+'</strong> · '+esc(p.taskName)+'</div>'+
   '<p class="guided-prompt">'+esc(p.prompt)+'</p>'+
   '<label class="guided-label" for="guided-working">Work through this prompt (unsaved scratchpad)</label>'+
   '<textarea id="guided-working" rows="5" placeholder="Record your reasoning, assumptions, calculations, source links and questions..."></textarea>'+
   '<details class="guided-check"><summary>Self-check your reasoning</summary><ul>'+
   p.checks.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul>'+
   '<p>For numerical or paper-specific exercises, compare your work to a verified source or discuss it with a domain expert; these generic checks are not an answer key.</p></details>'+
   '<div class="guided-actions"><button type="button" data-guide="previous"'+(current===0?" disabled":"")+'>← Previous</button>'+
   '<button type="button" data-guide="completed">'+(completed.has(current)?"Marked as attempted ✓":"Mark attempted")+'</button>'+
   '<button type="button" data-guide="next"'+(current===99?" disabled":"")+'>Next prompt →</button></div>'+
   '<p class="guided-progress">'+completed.size+' / 100 marked attempted in this open session · Level '+p.tier+' of 10</p>';
  const previous=host.querySelector('[data-guide="previous"]'),next=host.querySelector('[data-guide="next"]'),
   marked=host.querySelector('[data-guide="completed"]');
  previous?.addEventListener("click",()=>{if(current>0){current--;render();}});
  next?.addEventListener("click",()=>{if(current<99){current++;render();}});
  marked?.addEventListener("click",()=>{completed.add(current);if(current<99)current++;render();});
 }
 render();return {show:index=>{current=Math.max(0,Math.min(99,index));render();},count:()=>100};
}
root.AtlasGuidedPractice={TIERS,TASKS,promptFor,mount};
})(typeof window!=="undefined"?window:globalThis);
