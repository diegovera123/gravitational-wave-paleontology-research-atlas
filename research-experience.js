/* Research-learning MVP: six curated stages, evidence, authored problems, toy labs and
   browser-local research notebook. Not official lab onboarding or certified mastery. */
(function(root){"use strict";
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const safe=u=>{try{const x=new URL(u);return x.protocol==="https:"?x.href:null;}catch{return null;}};
const fields=["question","hypothesis","inputs","method","evidence","uncertainty","next"];
const labels={question:"Research question",hypothesis:"Testable hypothesis",inputs:"Inputs, provenance and assumptions",method:"Reproducible method and controls",evidence:"Results and interpretation",uncertainty:"Uncertainty, alternatives and limitations",next:"Next investigation"};
const labNames={kick:"Natal-kick orbit",chirp:"Inspiral chirp",envelope:"Common-envelope energy",roche:"Roche-lobe geometry",population:"Toy binary population",selection:"Detection bias"};
const configs={
 kick:[["k","Kick / original orbital speed",0,2,.05,.5],["angle","Kick angle to orbital motion (degrees)",-180,180,15,0],["f","Fraction of initial gravitational mass lost",0,.9,.05,.1]],
 chirp:[["m1","First mass (solar masses)",1,100,1,10],["m2","Second mass (solar masses)",1,100,1,10],["forb","Orbital frequency (Hz)",.1,150,.1,20]],
 envelope:[["released","Released orbital energy (toy units)",0,100,1,15],["required","Envelope binding energy (toy units)",0,100,1,10],["alpha","Usable efficiency α",0,1,.05,.6]],
 roche:[["donor","Donor mass (solar masses)",1,100,1,12],["accretor","Accretor mass (solar masses)",1,100,1,6],["radius","Donor radius (toy distance units)",.1,100,.1,4],["a","Separation (same distance units)",.1,100,.1,10]],
 population:[["n","Number of distinct toy binaries",10,1000,10,100],["seed","Reproducible random seed",1,10000,1,42]],
 selection:[["a","Intrinsic class A count",0,1000,10,100],["b","Intrinsic class B count",0,1000,10,100],["pa","A detection probability",0,1,.05,.8],["pb","B detection probability",0,1,.05,.2]]
};
const defaultLab=Object.fromEntries(Object.entries(configs).map(([k,v])=>[k,Object.fromEntries(v.map(c=>[c[0],c[5]]))]));
const fmt=v=>v==null?"Not determined":typeof v==="boolean"?(v?"Yes":"No"):Number.isFinite(v)?(Math.abs(v)>9999||Math.abs(v)<.001&&v!==0?v.toExponential(3):Number(v.toPrecision(5)).toString()):esc(v);
function validate(data,concepts,sources){
 if(data?.schemaVersion!==1||data.stages?.length!==6||data.problems?.length<6||!Array.isArray(data.relationships))throw Error("Unsupported integrated research pathway.");
 const known=new Set(concepts.map(c=>c.id)),refs=new Map(sources.map(s=>[s.id,s]));
 const ids=new Set();
 for(const s of data.stages){
  if(!s.id||ids.has(s.id)||s.conceptIds.length<3||s.conceptIds.some(id=>!known.has(id))||!known.has(s.practiceConceptId)||!labNames[s.simulation]||s.readingIds.some(id=>!refs.has(id)||!safe(refs.get(id).url))||!s.deliverable)throw Error("Invalid research stage "+s.id);
  if(s.prior&&!ids.has(s.prior))throw Error("Research-stage order invalid "+s.id);ids.add(s.id);
 }
 for(const p of data.problems)if(!known.has(p.conceptId)||p.steps?.length<3||!p.rubric?.length)throw Error("Incomplete authored research problem "+p.id);
 for(const e of data.relationships)if(!known.has(e.from)||!known.has(e.to)||!["causal","application","prerequisite"].includes(e.kind)||!e.why)throw Error("Unverified relation data "+e.from);
 return true;
}
function mount({host,data,concepts,sources,model,openConcept,openPractice,getEvidence,storage}){
 validate(data,concepts,sources);
 if(!host)return null;
 const byConcept=new Map(concepts.map(c=>[c.id,c])),bySource=new Map(sources.map(s=>[s.id,s]));
 const KEY="research-atlas-research-workspace-v1",draft={done:[],notes:{},stage:"orbit",lab:"kick",params:defaultLab};
 try{const p=JSON.parse(storage?.getItem?.(KEY)||"null");if(p&&typeof p==="object"){
  draft.done=Array.isArray(p.done)?p.done.filter(id=>data.stages.some(s=>s.id===id)):[];
  draft.notes=p.notes&&typeof p.notes==="object"?p.notes:{};
  draft.stage=data.stages.some(s=>s.id===p.stage)?p.stage:"orbit";
  draft.lab=labNames[p.lab]?p.lab:data.stages[0].simulation;
  if(p.params&&typeof p.params==="object")for(const key of Object.keys(defaultLab)){
    draft.params[key]={...defaultLab[key],...(p.params[key]||{})};
  }
 }}catch{/* Browser storage may be blocked. Session still works. */}
 let stage=draft.stage,lab=draft.lab;
 const persist=()=>{try{storage?.setItem?.(KEY,JSON.stringify({
  done:draft.done,notes:draft.notes,stage,lab,params:draft.params}));return true;}catch{return false;}};
 const stageData=()=>data.stages.find(s=>s.id===stage);
 function sourceList(s){
  return s.readingIds.map((id,i)=>{const src=bySource.get(id),url=safe(src.url);
   return '<li><a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(src.title)+' ↗</a>'+
    '<span class="research-reading-type">'+(["Background & physical context","Modeling or observational methods","Interpretation and independent follow-up"][i]||"Additional perspective")+'</span>'+
    '<p>'+esc(i===0?"Read the summary and identify the scientific problem before following mathematical details.":
    i===1?"Find assumptions, a reported quantity and which population or data were studied.":"Compare the authors’ stated limits with your own investigation.")+'</p></li>';
  }).join("");
 }
 function stageCards(){
  return data.stages.map((s,i)=>'<button type="button" data-stage="'+esc(s.id)+'" class="research-stage-card'+(stage===s.id?" is-current":"")+'" aria-pressed="'+(stage===s.id)+'">'+
   '<span class="research-stage-number">'+String(i+1).padStart(2,"0")+(draft.done.includes(s.id)?" · explored ✓":"")+'</span>'+
   '<strong>'+esc(s.name.replace(/^\d+ · /,""))+'</strong><small>'+esc(s.question)+'</small></button>').join("");
 }
 function evidenceCard(){
  const score=getEvidence?.()||{};
  return '<div class="research-evidence-grid">'+["conceptual","quantitative","causal","model-critique"].map(k=>{
   const e=score[k]||{attempts:0,correct:0,due:0};
   return '<div class="research-evidence-card"><strong>'+esc(k.replace("-"," "))+'</strong>'+
    '<span>'+(e.attempts?e.correct+" / "+e.attempts+" authored question responses correct":"No scored responses yet")+'</span>'+
    '<small>'+(e.due?e.due+" objective(s) due for review":"No due objective flagged")+'</small></div>';
  }).join("")+'</div><p class="research-caveat">These are counts of responses and a transparent review heuristic, NOT calibrated ability estimates, mastery percentages or eligibility to conduct research. Try problems in Practice to gather relevant evidence.</p>';
 }
 function labControls(){
  const c=configs[lab],values=draft.params[lab];
  return '<div class="research-controls">'+c.map(([key,label,min,max,step])=>
   '<label class="research-control"><span>'+esc(label)+'</span><strong data-value="'+esc(key)+'">'+fmt(+values[key])+'</strong>'+
   '<input type="range" data-lab-input="'+esc(key)+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+esc(values[key])+'"></label>').join("")+'</div>';
 }
 function result(){
  const m=model[lab](draft.params[lab]);if(!m)return "";
  let cells=[];
  if(lab==="kick")cells=[["Specific orbital energy ε",fmt(m.energy)],["Binary bound?",m.bound==null?"At parabolic threshold":m.bound?"Bound":"Unbound"],["Post-event eccentricity",fmt(m.ecc)],["Post-event a (if bound)",fmt(m.a)]];
  if(lab==="chirp")cells=[["Chirp mass (solar masses)",fmt(m.mc)],["Leading quadrupole frequency (Hz)",fmt(m.fgw)],["Formal leading-order inspiral time (s)",fmt(m.tSec)],["Frequency derivative (Hz/s)",fmt(m.fDot)]];
  if(lab==="envelope")cells=[["Usable orbital energy",fmt(m.usable)],["Required envelope energy",fmt(m.required)],["Toy energy inequality met?",m.budgetMet?"Yes":"No"]];
  if(lab==="roche")cells=[["Donor/accretor mass ratio q",fmt(m.q)],["Effective Roche-lobe radius",fmt(m.lobe)],["Roche geometry overflow?",m.overflow?"Yes":"No"]];
  if(lab==="population")cells=[["Distinct sampled binaries",fmt(m.n)],["Toy close bound candidates",fmt(m.candidate)],["Unbound",fmt(m.unbound)],["Other bound / unclassified",fmt(m.wide)],["Toy candidate fraction",fmt(m.p)],["Illustrative binomial standard error",fmt(m.binomialSE)]];
  if(lab==="selection")cells=[["Expected detected A",fmt(m.da)],["Expected detected B",fmt(m.db)],["Intrinsic A fraction",fmt(m.intrinsic)],["Expected detected A fraction",fmt(m.detected)]];
  return '<div class="research-results">'+cells.map(([name,value])=>'<div><span>'+esc(name)+'</span><strong>'+esc(value)+'</strong></div>').join("")+'</div>'+
   '<p class="research-caveat">'+esc(m.caveat)+'</p>'+
   (lab==="population"?'<details><summary>Inspect the first 25 synthetic system records</summary><pre class="research-data">'+
    esc(["id,synthetic_mass_lost,kick,kick_angle_deg,epsilon,toy_candidate",...m.rows.map(r=>[r.id,r.f,r.k,r.angle,r.energy,r.candidate].join(","))].join("\n"))+
    '</pre><p class="research-caveat">These rows were generated in your browser, not imported from COMPAS or a laboratory dataset.</p></details>':"");
 }
 function labView(){
  return '<section class="research-module research-lab"><div class="research-section-head"><span class="lesson-kicker">INTERACTIVE PHYSICS LAB</span><h3>Change an assumption. Inspect the consequence.</h3></div>'+
   '<label for="research-lab-select">Select a model</label><select id="research-lab-select">'+Object.entries(labNames).map(([id,name])=>
    '<option value="'+id+'"'+(lab===id?" selected":"")+'>'+esc(name)+'</option>').join("")+'</select>'+
   '<div id="research-lab-controls">'+labControls()+'</div><div id="research-lab-output" aria-live="polite">'+result()+'</div></section>';
 }
 function problemView(){
  const matches=data.problems.filter(p=>stageData().conceptIds.includes(p.conceptId));
  return '<section class="research-module"><div class="research-section-head"><span class="lesson-kicker">AUTHORED RESEARCH REASONING</span><h3>Show the actual reasoning</h3></div>'+
   (matches.length?matches.map(p=>'<article class="research-problem"><span>'+esc(p.component)+'</span><h4>'+esc(p.title)+'</h4>'+
    '<p>'+esc(p.scenario)+'</p><strong>'+esc(p.task)+'</strong>'+
    '<label for="research-problem-'+esc(p.id)+'">Work it out (scratchpad not stored)</label>'+
    '<textarea id="research-problem-'+esc(p.id)+'" rows="4" placeholder="Show your assumptions, algebra, units and conclusion."></textarea>'+
    '<details><summary>Reveal an authored worked solution and self-check rubric</summary><ol>'+p.steps.map(x=>'<li>'+esc(x)+'</li>').join("")+
    '</ol><h5>Check your reasoning</h5><ul>'+p.rubric.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul></details></article>').join(""):
    '<p>Use the connected concept’s authored assessment. Additional derivation problems are still being written for this stage.</p>')+'</section>';
 }
 function notebook(){
  const values=draft.notes[stage]||{};
  return '<section class="research-module research-notebook"><div class="research-section-head"><span class="lesson-kicker">BROWSER-LOCAL RESEARCH WORKSPACE</span><h3>Document a defensible investigation</h3></div>'+
   '<p>This notebook starts with your own hypothesis, method and evidence. It does not execute COMPAS, retrieve private lab data, grade scientific claims or submit work to anyone.</p>'+
   fields.map(k=>'<label for="research-note-'+k+'">'+esc(labels[k])+'</label>'+
    '<textarea id="research-note-'+k+'" rows="'+(k==="method"||k==="evidence"?4:3)+'" data-note="'+k+'" maxlength="10000" placeholder="'+
    esc(k==="question"?stageData().question:k==="hypothesis"?"Write what result would support or challenge your claim.":k==="inputs"?"Name every source and distinguish toy inputs from real datasets.":k==="method"?"Specify code version, seed, unit convention and controlled comparison.":k==="evidence"?"Record results, plots or links and how they were obtained.":k==="uncertainty"?"Separate sampling, measurement, model and selection uncertainties.":"What would you test next?")+'">'+esc(values[k]||"")+'</textarea>').join("")+
   '<div class="research-notebook-actions"><span id="research-save-status" role="status">Notes stay on this device when browser storage is available.</span>'+
   '<button type="button" data-action="export">Export notes (.md) ↓</button></div></section>';
 }
 function render(){
  const s=stageData(),prior=s.prior&&!draft.done.includes(s.prior);
  host.innerHTML='<div class="research-experience"><header class="research-experience-hero"><span class="lesson-kicker">FIELD-TO-RESEARCH PATHWAY · PILOT</span>'+
   '<h2>Follow one binary from its birth to a detected gravitational wave.</h2>'+
   '<p>Six connected stages, real mapped concepts, original toy physics labs, authored derivation checks and a research notebook. This is independent self-study material, not official RAKIURA onboarding or validated scientific training.</p>'+
   '<span>'+draft.done.length+' of 6 stages self-marked explored · You can open any stage</span></header>'+
   '<nav class="research-stage-grid" aria-label="Six-step research pathway">'+stageCards()+'</nav>'+
   '<section class="research-module research-stage-detail"><span class="lesson-kicker">CURRENT STAGE</span><h3>'+esc(s.name)+'</h3>'+
    '<p class="research-stage-question">'+esc(s.question)+'</p>'+
    (prior?'<p class="research-caveat">Suggested earlier stage: '+esc(data.stages.find(x=>x.id===s.prior).name)+'. This is guidance, not a prerequisite lock.</p>':"")+
    '<div class="research-concept-chips">'+s.conceptIds.map(id=>'<button type="button" data-concept="'+esc(id)+'">'+esc(byConcept.get(id).title)+' ↗</button>').join("")+'</div>'+
    '<p><strong>Investigation:</strong> '+esc(s.researchTask)+'</p><p><strong>Suggested artifact:</strong> '+esc(s.deliverable)+'</p>'+
    '<div class="research-stage-actions"><button type="button" data-action="practice">Open linked Practice →</button>'+
    '<button type="button" data-action="done">'+(draft.done.includes(stage)?"Marked explored ✓ (toggle)":"Mark stage explored (self-report)")+'</button></div></section>'+
   '<section class="research-module"><span class="lesson-kicker">EVIDENCE FROM ACTUAL AUTHORED QUESTION RESPONSES</span><h3>What have I demonstrated so far?</h3>'+evidenceCard()+'</section>'+
   labView()+problemView()+
   '<section class="research-module research-reading"><span class="lesson-kicker">CURATED READING SEQUENCE</span><h3>Read with a purpose</h3>'+
    '<p>These are real references already listed in the Atlas. The annotations are broad reading guidance, not verified page/section claims or a list of 1,000 hand-reviewed papers.</p>'+
    '<ol>'+sourceList(s)+'</ol></section>'+notebook()+'</div>';
 }
 function updateModel(){
  const output=host.querySelector("#research-lab-output");if(output)output.innerHTML=result();
 }
 host.addEventListener("click",event=>{
  const t=event.target.closest?.("[data-stage],[data-concept],[data-action]");if(!t)return;
  if(t.dataset.stage){stage=t.dataset.stage;lab=stageData().simulation;persist();render();}
  else if(t.dataset.concept){openConcept?.(t.dataset.concept);}
  else if(t.dataset.action==="practice"){openPractice?.(stageData().practiceConceptId);}
  else if(t.dataset.action==="done"){draft.done=draft.done.includes(stage)?draft.done.filter(id=>id!==stage):[...draft.done,stage];persist();render();}
  else if(t.dataset.action==="export"){
   const lines=["# Research investigation · "+stageData().name,"","Educational self-study notes; not validated research data.",""];
   for(const k of fields)lines.push("## "+labels[k],"",draft.notes[stage]?.[k]||"Not recorded.","");
   try{const url=URL.createObjectURL(new Blob([lines.join("\n")],{type:"text/markdown;charset=utf-8"}));
    const a=document.createElement("a");a.href=url;a.download="research-atlas-"+stage+"-notes.md";a.click();URL.revokeObjectURL(url);
   }catch{const status=host.querySelector("#research-save-status");if(status)status.textContent="Export unavailable in this browser. Copy your notes manually.";}
  }
 });
 host.addEventListener("change",event=>{
  if(event.target.id==="research-lab-select"&&labNames[event.target.value]){lab=event.target.value;persist();render();}
 });
 host.addEventListener("input",event=>{
  const el=event.target;
  if(el.dataset?.labInput){draft.params[lab][el.dataset.labInput]=+el.value;
   const number=host.querySelector('[data-value="'+el.dataset.labInput+'"]');if(number)number.textContent=fmt(+el.value);
   persist();updateModel();
  }else if(el.dataset?.note&&fields.includes(el.dataset.note)){
   (draft.notes[stage]??={})[el.dataset.note]=String(el.value).slice(0,10000);
   const saved=persist(),status=host.querySelector("#research-save-status");if(status)status.textContent=saved?"Saved locally in this browser.":"Session-only: browser storage unavailable.";
  }
 });
 render();
 return {selectStage:id=>{if(data.stages.some(s=>s.id===id)){stage=id;lab=stageData().simulation;persist();render();}},refresh:render,snapshot:()=>({stage,lab,done:[...draft.done],notes:draft.notes})};
}
root.AtlasResearchExperience={mount,validate,configs,labNames};
})(typeof window!=="undefined"?window:globalThis);
