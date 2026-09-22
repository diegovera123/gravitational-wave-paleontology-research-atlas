/* Otto guide: a lightweight, learner-controlled route through the existing prerequisite graph.
 * "Visited" is navigation progress, never mastery or assessment evidence. */
(function(root){
"use strict";
const STORE="research-atlas-otto-visited-v1";
const esc=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const necessary=c=>(c?.prerequisites||[]).filter(e=>e.kind==="necessary").map(e=>e.id);
function plan(concepts,questionPaths,profile,studied=[]){
  const byId=new Map(concepts.map(c=>[c.id,c]));
  const goal=profile?.goal;
  const selected=goal?.goalId&&byId.has(goal.goalId)?goal.goalId:
    byId.has("binary-population-synthesis")?"binary-population-synthesis":concepts[0]?.id;
  if(!selected)return {goalId:null,goalLabel:"Explore the Atlas",steps:[],question:null};
  const question=questionPaths.find(q=>goal?.key==="q:"+q.id)||null;
  const ratings=profile?.ratings||{},checks=profile?.checks||{};
  const visited=new Set(),chain=[];
  const score=id=>{
    const r=ratings[id],q=checks[id],self=Number.isInteger(r?.rating)?r.rating:2;
    return (q&&!q.correct?-10:0)+(self<2?-5:0)+(studied.includes(id)?7:0)+self;
  };
  function walk(id,depth){
    if(depth>=4||visited.has(id)||!byId.has(id))return;
    visited.add(id);
    const deps=necessary(byId.get(id)).filter(x=>byId.has(x)&&!visited.has(x)).sort((a,b)=>score(a)-score(b)||a.localeCompare(b));
    if(deps.length)walk(deps[0],depth+1);
    chain.push(id);
  }
  walk(selected,0);
  // A single *genuine* prerequisite chain is preferable to inventing dependencies between
  // every research concept. Other branches stay available via the full map.
  const steps=[...new Set(chain)].slice(-5).map(id=>({id,title:byId.get(id).title}));
  return {goalId:selected,goalLabel:goal?.label||byId.get(selected).title,steps,question};
}
function mount({host,concepts,questionPaths,getProfile,getStudied,hasLesson,openConcept,openLesson,openDiagnostic,openAtlas,openQuestion}){
  if(!host)throw Error("Otto mission path host missing.");
  let visited=new Set(),storageAvailable=true,activeId=null;
  try{const saved=root.localStorage?.getItem(STORE);if(saved){const items=JSON.parse(saved);if(Array.isArray(items))visited=new Set(items.filter(x=>typeof x==="string"));}}
  catch(e){storageAvailable=false;visited=new Set();}
  function save(){if(!storageAvailable)return;try{root.localStorage?.setItem(STORE,JSON.stringify([...visited]));}catch(e){storageAvailable=false;}}
  function current(){
    const route=plan(concepts,questionPaths,getProfile(),getStudied());
    const next=route.steps.find(x=>!visited.has(x.id))||route.steps.at(-1)||null;
    return {route,next};
  }
  function enter(id){
    if(!concepts.some(c=>c.id===id))return;
    activeId=id;visited.add(id);save();render();
    if(hasLesson(id))openLesson(id);else openConcept(id);
  }
  function render(){
    const {route,next}=current(),count=route.steps.filter(x=>visited.has(x.id)).length;
    const focus=next||route.steps[0],hasProgress=route.steps.length>0;
    host.innerHTML='<div class="otto-welcome" aria-label="Your learning guide">'+
      '<img src="assets/otto-orbit.svg" alt="Otto, a smiling otter astronaut waving to you" class="otto-face" width="130" height="138">'+
      '<div class="otto-speech"><span class="otto-eyebrow">OTTO · YOUR COSMIC GUIDE</span>'+
      '<h1>'+(count?"Welcome back, explorer!":"Ready for a little discovery?")+'</h1>'+
      '<p>'+(hasProgress?"We’ll follow one scientific idea at a time. You can explore any step or take a detour whenever you like.":"Choose a question and I’ll help you find your first step.")+'</p></div></div>'+
      '<section class="otto-route" aria-labelledby="otto-route-title"><div class="otto-route-head">'+
      '<p class="otto-eyebrow">YOUR CURRENT MISSION</p><h2 id="otto-route-title">'+esc(route.goalLabel)+'</h2>'+
      '<p class="otto-qualifier">A suggested route through one branch of necessary prerequisites, not a claim that these are the only concepts you need.</p></div>'+
      '<ol class="otto-steps">'+route.steps.map((step,i)=>{
        const done=visited.has(step.id),isFocus=step.id===focus?.id;
        const state=done?"Visited":isFocus?"Your next stop":"Explore anytime";
        return '<li class="otto-stop '+(done?"was-visited ":"")+(isFocus?"is-next":"")+'">'+
          '<button type="button" class="otto-planet" data-mission-id="'+esc(step.id)+'" aria-label="'+esc("Open "+step.title+"; "+state)+'">'+
          '<span aria-hidden="true">'+(done?"✓":i+1)+'</span></button>'+
          '<div class="otto-stop-label"><span>'+esc(state)+'</span><strong>'+esc(step.title)+'</strong></div></li>';
      }).join("")+'</ol>'+
      '<div class="otto-actions"><button type="button" id="otto-continue" class="otto-primary" '+(!focus?"disabled":"")+'>'+
       (count===route.steps.length?"Revisit a step":"Continue my mission")+' <span aria-hidden="true">→</span></button>'+
      '<button type="button" id="otto-map" class="otto-subtle">Explore the full knowledge map</button></div>'+
      '<div class="otto-footer-links"><button type="button" id="otto-goal">Change mission</button>'+
      (route.question?'<button type="button" id="otto-research">Explore the research question ↗</button>':'')+
      '</div><p class="otto-status">'+count+' of '+route.steps.length+' stops visited · Visiting a stop does not establish mastery.</p></section>';
    host.querySelectorAll("[data-mission-id]").forEach(b=>b.addEventListener("click",()=>enter(b.dataset.missionId)));
    host.querySelector("#otto-continue").addEventListener("click",()=>{if(focus)enter(focus.id);});
    host.querySelector("#otto-map").addEventListener("click",openAtlas);
    host.querySelector("#otto-goal").addEventListener("click",openDiagnostic);
    if(route.question)host.querySelector("#otto-research").addEventListener("click",()=>openQuestion(route.question.id));
  }
  render();
  return {render,plan:()=>plan(concepts,questionPaths,getProfile(),getStudied()),enter,visited:()=>[...visited]};
}
root.AtlasGuide={plan,mount};
})(typeof window!=="undefined"?window:globalThis);
