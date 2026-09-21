// Research Atlas: strict, curated navigation. Containment is independent of prerequisites.
const DOMAIN_COLORS = {
  Mathematics:"#69a8ff", Physics:"#a587ff", "Stellar Astrophysics":"#65d6e6",
  "Binary Stellar Evolution":"#d58acb", "General Relativity and Gravitational Waves":"#8595ff",
  "Scientific Computing":"#66c6a4", "Population Synthesis and Paleontology":"#d4a667",
  "Research Practice":"#f08fa9"
};
const $ = selector => document.querySelector(selector);
const graphElement = $("#graph"), detailsElement = $("#details");
const searchInput = $("#concept-search"), searchResults = $("#search-results");
const crumbsElement = $("#atlas-crumbs"), choicesElement = $("#atlas-choices");
const mapElement = $("#graph-map"), domainCardsElement = $("#domain-cards");
const questionCardsElement = $("#question-cards"), statsElement = $("#atlas-stats");
let graph, concepts=[], researchSources=[], atlas, macroById, topicById, locationByConcept;
let level="global", macroId=null, topicId=null, selectedId=null, previousLocations=[];
let fitToken=0, displayMode="map", researchQuestions=[], activeQuestionId=null;
let learningUnits=new Map(), openUnitId=null;
const quizSessions=new Map();
let adaptiveItems=[], adaptiveHistory=[], adaptiveStorageAvailable=true;
let activeView="home";
const PROGRESS_KEY="research-atlas-studied-v1";
let studiedIds=new Set(), progressAvailable=true;
const REGION_DESCRIPTIONS = {
  calculus:"The mathematical language behind change, models, and uncertainty.",
  "classical-mechanics":"Motion, gravity, and the orbital dynamics of binary systems.",
  "stellar-astrophysics":"How stars form, evolve, lose mass, and leave compact remnants.",
  "binary-stellar-evolution":"How companion stars interact and reshape each other's futures.",
  "general-relativity":"Spacetime, gravitation, and the geometry of relativistic motion.",
  "gravitational-wave-science":"How compact binaries produce gravitational waves and how we detect them.",
  "scientific-computing":"Programming, numerical methods, simulation, and visualization.",
  "binary-population-synthesis":"From individual simulated binaries to model populations.",
  "gravitational-wave-paleontology":"Using present-day observations to investigate stellar histories.",
  "research-practice":"Find evidence, reproduce results, and develop defensible research."
};
const colorFor = domain => DOMAIN_COLORS[domain] || "#9aa9c7";
const byId = id => concepts.find(concept => concept.id === id);
const html = value => String(value == null ? "" : value).replace(/[&<>"']/g, ch => (
  {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]
));
const safeLink = value => {
  try { const url = new URL(value, window.location.href); return ["https:","http:"].includes(url.protocol) ? url.href : "#"; }
  catch { return "#"; }
};
const lowerMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const activeMacro = () => macroById.get(macroId);
const activeTopic = () => topicById.get(topicId);
const conceptLocation = id => locationByConcept.get(id);
const snapshot = () => ({level,macroId,topicId,selectedId});

function ringNode(id,name,type,domain,index,count,radius) {
  const angle = index * 2*Math.PI/Math.max(count,1)-Math.PI/2;
  const x=Math.cos(angle)*radius, y=Math.sin(angle)*radius, z=Math.sin(angle*2)*12;
  return {id,name,type,domain,x,y,z,fx:x,fy:y,fz:z};
}
function centerNode(id,name,type,domain) {
  return {id,name,type,domain,x:0,y:0,z:0,fx:0,fy:0,fz:0};
}
function currentScene() {
  let nodes=[],links=[];
  if (level==="global") {
    nodes=atlas.macros.map((m,i)=>ringNode(m.id,m.title,"macro",m.domain,i,atlas.macros.length,116));
  } else if (level==="macro") {
    const macro=activeMacro(), topics=atlas.topics.filter(t=>t.macroId===macroId);
    nodes=[centerNode(macro.id,macro.title,"macro",macro.domain)];
    topics.forEach((t,i)=>{
      nodes.push(ringNode(t.id,t.title,"topic",macro.domain,i,topics.length,103));
      links.push({source:macro.id,target:t.id,type:"containment"});
    });
  } else {
    const topic=activeTopic(), macro=activeMacro();
    nodes=[centerNode(topic.id,topic.title,"topic",macro.domain)];
    topic.conceptIds.forEach((id,i)=>{
      const c=byId(id);
      nodes.push(ringNode(c.id,c.title,"concept",c.domain,i,topic.conceptIds.length,topic.conceptIds.length<3?85:112));
      links.push({source:topic.id,target:c.id,type:"containment"});
    });
    if (selectedId && topic.conceptIds.includes(selectedId)) {
      const focus=byId(selectedId), visible=new Set(topic.conceptIds);
      focus.prerequisites.forEach(edge=>{
        if(visible.has(edge.id))links.push({source:edge.id,target:focus.id,type:edge.kind});
      });
      concepts.forEach(c=>c.prerequisites.forEach(edge=>{
        if(edge.id===focus.id && visible.has(c.id))links.push({source:focus.id,target:c.id,type:edge.kind});
      }));
    }
  }
  return {nodes,links};
}
function linkId(endpoint) { return typeof endpoint==="object" ? endpoint.id : endpoint; }

function button(label,action,kind="") {
  const b=document.createElement("button");
  b.type="button"; b.className="atlas-choice "+kind; b.textContent=label; b.addEventListener("click",action);
  return b;
}
function updateCrumbs() {
  crumbsElement.replaceChildren();
  crumbsElement.appendChild(button("Atlas",enterGlobal,level==="global"?"current":""));
  if(macroId) {
    crumbsElement.appendChild(document.createTextNode(" / "));
    crumbsElement.appendChild(button(activeMacro().title,()=>enterMacro(macroId),level==="macro"?"current":""));
  }
  if(topicId) {
    crumbsElement.appendChild(document.createTextNode(" / "));
    crumbsElement.appendChild(button(activeTopic().title,()=>enterTopic(topicId),selectedId?"":"current"));
  }
  if(selectedId && topicId) {
    crumbsElement.appendChild(document.createTextNode(" / "));
    const span=document.createElement("span");span.className="atlas-current";span.textContent=byId(selectedId).title;crumbsElement.appendChild(span);
  }
  $("#parent-view").disabled=level==="global" && !selectedId;
  $("#history-view").disabled=!previousLocations.length;
  $("#global-view").setAttribute("aria-pressed",String(level==="global"));
}
function updateChoices(scene) {
  choicesElement.replaceChildren();
  const hint=document.createElement("span");hint.className="atlas-choice-hint";
  hint.textContent=level==="global"?"SELECT A KNOWLEDGE REGION":level==="macro"?"SELECT A TOPIC":"SELECT A CONCEPT";
  choicesElement.appendChild(hint);
  scene.nodes.filter(n=>level==="global"||n.type!==(level==="macro"?"macro":"topic")).forEach(node=>{
    const action=()=>handleNodeClick(node);
    const b=button(node.name,action,node.id===selectedId?"current":"");
    b.style.setProperty("--choice-color",colorFor(node.domain));
    choicesElement.appendChild(b);
  });
}

function scrollToExplorer() {
  setActiveView("explore",{scroll:false});
  $("#explorer")?.scrollIntoView?.({behavior:lowerMotion()?"auto":"smooth",block:"start"});
}

const TAB_NAMES=["home","paths","learn","explore","library"];
function setActiveView(view,options={}){
  if(!TAB_NAMES.includes(view))return;
  activeView=view;
  for(const name of TAB_NAMES){
    const panel=$("#"+name+"-panel"),tab=$("#tab-"+name);
    panel.hidden=name!==view;
    tab.setAttribute("aria-selected",String(name===view));
    tab.tabIndex=name===view?0:-1;
  }
  $("#dashboard").hidden=!["home","paths","library"].includes(view);
  if(options.scroll!==false)$("#tab-"+view).scrollIntoView?.({behavior:lowerMotion()?"auto":"smooth",block:"nearest"});
  if(options.focus)$("#tab-"+view).focus();
  if(view==="explore" && graph){
    graph.width(graphElement.clientWidth).height(graphElement.clientHeight);
    draw({frame:displayMode==="3d"});
  }
}
function setActiveViewFromTab(event){
  const target=event.target?.closest?.("[data-atlas-tab]");
  if(target)setActiveView(target.dataset.atlasTab,{focus:true});
}
function tabKeyboard(event){
  if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;
  event.preventDefault();
  const index=TAB_NAMES.indexOf(activeView);
  const next=event.key==="Home"?0:event.key==="End"?TAB_NAMES.length-1:
    (index+(event.key==="ArrowRight"?1:-1)+TAB_NAMES.length)%TAB_NAMES.length;
  setActiveView(TAB_NAMES[next],{focus:true});
}
$("#atlas-tabs").addEventListener("click",setActiveViewFromTab);
$("#atlas-tabs").addEventListener("keydown",tabKeyboard);

function makeCard(title,description,eyebrow,footer,action,color,kind="") {
  const card=button("",action,"explorer-card "+kind);
  card.style.setProperty("--choice-color",color);
  card.innerHTML='<span class="explorer-card-top"><span class="explorer-card-eyebrow">'+html(eyebrow)+'</span><span aria-hidden="true">↗</span></span>'+
    '<span class="explorer-card-title">'+html(title)+'</span>'+
    '<span class="explorer-card-summary">'+html(description)+'</span>'+
    '<span class="explorer-card-footer">'+html(footer)+'</span>';
  return card;
}

function loadLearningProgress(){
  try{
    if(!window.localStorage){progressAvailable=false;studiedIds=new Set();return;}
    const saved=window.localStorage.getItem(PROGRESS_KEY);
    const items=saved?JSON.parse(saved):[];
    studiedIds=new Set(Array.isArray(items)?items.filter(id=>typeof id==="string"&&byId(id)):[]);
  }catch(error){progressAvailable=false;studiedIds=new Set();console.warn("[Research Atlas] Progress is session-only.",error);}
}
function persistProgress(){
  if(!progressAvailable)return;
  try{window.localStorage.setItem(PROGRESS_KEY,JSON.stringify([...studiedIds]));}
  catch(error){progressAvailable=false;console.warn("[Research Atlas] Could not save learning progress.",error);}
}
function missingRequirements(concept){
  return concept.prerequisites.filter(edge=>edge.kind==="necessary" && !studiedIds.has(edge.id));
}
function learningState(concept){
  if(studiedIds.has(concept.id))return "studied";
  return missingRequirements(concept).length?"locked":"ready";
}
function learningStateLabel(concept) {
  const state=learningState(concept);
  return state==="studied"?"✓ Self-marked understood":state==="ready"?"◇ Ready to explore":"🔒 Guided path: prerequisites first";
}
// Find the earliest unstudied necessary dependency, rather than sending someone to a locked node.
function nextReadyRequirement(concept,seen=new Set()){
  if(!concept || seen.has(concept.id))return null;
  seen.add(concept.id);
  for(const edge of missingRequirements(concept)){
    const prerequisite=byId(edge.id);
    const earlier=nextReadyRequirement(prerequisite,seen);
    if(earlier)return earlier;
    if(prerequisite && learningState(prerequisite)==="ready")return prerequisite;
  }
  return null;
}
function currentStudyCount(ids){
  return ids.filter(id=>studiedIds.has(id)).length;
}
function updateLearningStats(){
  $("#learning-progress").textContent=currentStudyCount(concepts.map(c=>c.id))+" / "+concepts.length+" concepts marked understood";
  const next=concepts.find(c=>learningState(c)==="ready" && c.scale!=="macro")||concepts.find(c=>learningState(c)==="ready");
  const b=$("#resume-learning");
  b.disabled=!next;
  b.textContent=next?"Continue: "+next.title+" ↗":"All available concepts self-marked ✓";
}
function markUnderstood(id){
  if(!byId(id))return;
  if(studiedIds.has(id))studiedIds.delete(id);else studiedIds.add(id);
  persistProgress();
  updateLearningStats();
  renderDashboard();
  const detailShown=detailsElement.querySelector("#mark-understood");
  if(selectedId===id || detailShown)showConceptDetails(byId(id));
  draw({frame:false});
}
function renderNetworkPreview(){
  const surface=$("#dashboard-network-map");
  surface.replaceChildren();
  const positions=new Map(atlas.macros.map((m,i)=>[m.id,{x:100+200*(i%5),y:i<5?104:322}]));
  // Aggregate real, direct necessary dependencies only; navigation containment is never a prerequisite.
  const counts=new Map();
  concepts.forEach(target=>{
    const to=locationByConcept.get(target.id)?.macroId;
    if(!to)return;
    target.prerequisites.filter(edge=>edge.kind==="necessary").forEach(edge=>{
      const from=locationByConcept.get(edge.id)?.macroId;
      if(!from||from===to)return;
      const key=from+"→"+to;
      counts.set(key,(counts.get(key)||0)+1);
    });
  });
  const edges=[...counts].sort((a,b)=>b[1]-a[1]).slice(0,12);
  const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
  svg.setAttribute("viewBox","0 0 1000 420");
  svg.setAttribute("preserveAspectRatio","none");
  svg.setAttribute("class","network-edges");
  svg.setAttribute("aria-hidden","true");
  svg.innerHTML='<defs><marker id="knowledge-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#769acb"/></marker></defs>'+
    edges.map(([key,weight])=>{
      const [source,target]=key.split("→"),a=positions.get(source),b=positions.get(target);
      if(!a||!b)return "";
      const angle=Math.atan2(b.y-a.y,b.x-a.x),start=64,end=67;
      const x1=a.x+Math.cos(angle)*start,y1=a.y+Math.sin(angle)*start;
      const x2=b.x-Math.cos(angle)*end,y2=b.y-Math.sin(angle)*end;
      return '<path d="M'+x1.toFixed(1)+' '+y1.toFixed(1)+' L'+x2.toFixed(1)+' '+y2.toFixed(1)+'" stroke="#7595c3" stroke-width="'+Math.min(2.4,.65+weight*.25)+'" stroke-opacity="'+Math.min(.7,.23+weight*.07)+'" fill="none" marker-end="url(#knowledge-arrow)"><title>'+html(byId(source)?.title||source)+' → '+html(byId(target)?.title||target)+': '+weight+' direct necessary links</title></path>';
    }).join("");
  surface.appendChild(svg);
  atlas.macros.forEach((m,i)=>{
    const pos=positions.get(m.id),leafIds=atlas.topics.filter(t=>t.macroId===m.id).flatMap(t=>t.conceptIds);
    const known=currentStudyCount([m.id,...leafIds]),total=leafIds.length+1;
    const b=button("",()=>{enterMacro(m.id);scrollToExplorer();},"network-region");
    b.style.setProperty("--region-color",colorFor(m.domain));
    b.style.left=(pos.x/10)+"%";b.style.top=(pos.y/420*100)+"%";
    b.innerHTML='<span class="network-region-icon" aria-hidden="true"></span><span class="network-region-title">'+html(m.title)+'</span>'+
      '<span class="network-region-progress">'+known+" / "+total+' understood</span>';
    surface.appendChild(b);
  });
}


function renderFeaturedUnits(){
  for(const selector of ["#pilot-cards","#learn-hub-cards"]){
    const host=$(selector);host.replaceChildren();
    for(const unit of learningUnits.values()){
      const concept=byId(unit.id);
      host.appendChild(makeCard(concept.title,unit.summary,unit.level,unit.duration+" · Read, practise, review",
        ()=>openLearningUnit(unit.id),colorFor(concept.domain),"pilot-card"));
    }
  }
}
function openLearningUnit(id){
  if(!learningUnits.has(id))return;
  openUnitId=id;openConcept(id,true);
  setActiveView("learn",{scroll:false});
  $("#learn-hub").hidden=true;
  const area=$("#learning-studio");area.hidden=false;
  renderLearningUnit();
  area.scrollIntoView?.({behavior:lowerMotion()?"auto":"smooth",block:"start"});
  area.focus?.();
}
function closeLearningUnit(){
  openUnitId=null;$("#learning-studio").hidden=true;
  $("#learn-hub").hidden=false;
  setActiveView("learn");
}
function returnFromLearningToGraph(){
  openUnitId=null;$("#learning-studio").hidden=true;
  $("#learn-hub").hidden=false;
  scrollToExplorer();
}

const ADAPTIVE_KEY="research-atlas-adaptive-evidence-v1";
function loadAdaptiveHistory(){
  try{
    const raw=window.localStorage?.getItem(ADAPTIVE_KEY);
    adaptiveHistory=window.AtlasAdaptive.safeHistory(raw?JSON.parse(raw):[]);
  }catch(error){adaptiveStorageAvailable=false;adaptiveHistory=[];console.warn("[Atlas] Adaptive practice history will last only this session.",error);}
}
function saveAdaptiveHistory(){
  adaptiveHistory=window.AtlasAdaptive.safeHistory(adaptiveHistory);
  if(!adaptiveStorageAvailable)return;
  try{window.localStorage?.setItem(ADAPTIVE_KEY,JSON.stringify(adaptiveHistory));}
  catch(error){adaptiveStorageAvailable=false;console.warn("[Atlas] Could not save local practice history.",error);}
}
function updateReviewBadge(){
  const all=[...learningUnits.values()];
  const due=window.AtlasAdaptive.dueObjectives(all,adaptiveHistory);
  const host=$("#due-practice");host.replaceChildren();
  const p=document.createElement("p");
  p.className="adaptive-due-info";
  p.textContent=due.length?due.length+" learning objective"+(due.length===1?" is":"s are")+" ready for another review.":"No reviews due right now. Try a learning unit to get started.";
  host.appendChild(p);
  const shown=new Set();
  for(const x of due){
    if(shown.has(x.unitId))continue;shown.add(x.unitId);
    const b=button("Review "+byId(x.unitId).title+" ↗",()=>{
      openLearningUnit(x.unitId);startAdaptiveQuiz("review");
    },"adaptive-due-button");
    host.appendChild(b);
  }
  const hint=$("#practice-due-summary");
  if(hint)hint.textContent=due.length?due.length+" objective"+(due.length===1?"":"s")+" due for review":"Adaptive practice · 3 pilot lessons";
}
function startAdaptiveQuiz(mode="practice"){
  const unit=learningUnits.get(openUnitId);if(!unit)return;
  const session={unitId:unit.id,mode,results:[],current:null,choice:null,answered:false,done:false};
  quizSessions.set(unit.id,session);
  advanceAdaptiveQuiz();
  renderAdaptivePanel();
}
function advanceAdaptiveQuiz(){
  const unit=learningUnits.get(openUnitId),session=quizSessions.get(openUnitId);
  if(!session||!unit)return;
  if(session.results.length>=5){session.done=true;session.current=null;return;}
  // Each result is already in the lifetime history. Exclude this session's records before
  // passing them separately to the selector, avoiding double-counted evidence.
  const lifetime=adaptiveHistory.filter(r=>!session.results.includes(r));
  session.current=window.AtlasAdaptive.chooseNext(adaptiveItems,unit,lifetime,session.results);
  session.choice=null;session.answered=false;
  if(!session.current)session.done=true;
}
function answerAdaptiveQuiz(choice){
  const s=quizSessions.get(openUnitId);
  if(!s||!s.current||s.answered||!Number.isInteger(choice)||choice<0||choice>=s.current.choices.length)return;
  s.choice=choice;s.answered=true;
  const item=s.current;
  const record={unitId:s.unitId,itemId:item.id,objectiveId:item.objectiveId,difficulty:item.difficulty,
    correct:choice===item.correctIndex,at:Date.now()};
  s.results.push(record);adaptiveHistory.push(record);
  saveAdaptiveHistory();updateReviewBadge();renderAdaptivePanel();
}
function renderAdaptivePanel(){
  const host=$("#adaptive-panel");if(!host||!openUnitId)return;
  const unit=learningUnits.get(openUnitId),session=quizSessions.get(openUnitId);
  const due=unit.objectives.map(o=>({objective:o,...window.AtlasAdaptive.objectiveStats(unit.id,o.id,adaptiveHistory)}));
  if(!session){
    host.innerHTML='<span class="lesson-kicker">PERSONALIZED PRACTICE · PILOT</span>'+
      '<h3>Check your understanding, one question at a time.</h3>'+
      '<p>A short five-question session adjusts its objective and authored difficulty based on your previous answers. Hints and explanatory feedback are available; no calibrated mastery score or certificate is issued.</p>'+
      '<p class="practice-readiness">'+due.map(x=>html(x.objective.title)+': '+x.attempts+" past responses"+(x.due?" · review due":"")).join(" · ")+'</p>'+
      '<button id="practice-start" type="button" class="lesson-submit">Start adaptive practice →</button>'+
      (due.some(x=>x.due)?'<button id="practice-review" type="button" class="lesson-back">Review due objectives →</button>':'')+
      '<small class="practice-privacy">Answers remain in this browser when local storage is available. No account, server analysis, or automated grading of written work.</small>';
    $("#practice-start").addEventListener("click",()=>startAdaptiveQuiz("practice"));
    if(due.some(x=>x.due))$("#practice-review").addEventListener("click",()=>startAdaptiveQuiz("review"));
    return;
  }
  if(session.done){
    const correct=session.results.filter(r=>r.correct).length;
    const summary=unit.objectives.map(o=>{
      const rows=session.results.filter(r=>r.objectiveId===o.id);
      return '<li>'+html(o.title)+': '+rows.filter(r=>r.correct).length+' / '+rows.length+' correct in this session</li>';
    }).join("");
    host.innerHTML='<span class="lesson-kicker">SESSION COMPLETE · FORMATIVE EVIDENCE</span>'+
      '<h3>'+correct+" / "+session.results.length+' questions answered correctly</h3>'+
      '<p>This brief check describes this attempt only. It does not certify proficiency or automatically unlock a level. Review the worked example before retrying if needed.</p>'+
      '<ul class="practice-outcomes">'+summary+'</ul>'+
      '<button id="practice-again" type="button" class="lesson-submit">Practise again with a new route →</button>'+
      '<button id="practice-back" type="button" class="lesson-back">Back to learning units</button>';
    $("#practice-again").addEventListener("click",()=>startAdaptiveQuiz("practice"));
    $("#practice-back").addEventListener("click",closeLearningUnit);
    return;
  }
  const item=session.current;
  const objective=unit.objectives.find(o=>o.id===item.objectiveId);
  const progress=session.results.length+(session.answered?0:1);
  const options=item.choices.map((choice,index)=>{
    const selected=session.choice===index;
    const css=session.answered?(index===item.correctIndex?" correct":selected?" incorrect":""):"";
    return '<button type="button" class="lesson-option'+css+(selected?" selected":"")+
      '" data-adaptive-choice="'+index+'" '+(session.answered?"disabled":"")+' aria-pressed="'+selected+'">'+html(choice)+'</button>';
  }).join("");
  const feedback=session.answered?'<div class="practice-feedback" role="status"><strong>'+
    (session.choice===item.correctIndex?"Correct.":"Review this distinction.")+'</strong><p>'+html(item.feedback)+'</p>'+
    '<p>Answer: '+html(item.choices[item.correctIndex])+'</p></div>':"";
  host.innerHTML='<span class="lesson-kicker">'+(session.mode==="review"?"REVIEW SESSION":"ADAPTIVE PRACTICE")+' · '+progress+' / 5</span>'+
    '<div class="practice-progress-track"><span style="width:'+(Math.min(progress,5)/5*100)+'%"></span></div>'+
    '<p class="practice-objective">Objective: '+html(objective.title)+' · Authored difficulty '+item.difficulty+' / 3</p>'+
    '<h3>'+html(item.prompt)+'</h3><div class="practice-choices">'+options+'</div>'+
    (session.answered?feedback:'<details class="practice-hint"><summary>Need a hint?</summary><p>'+html(item.hint)+'</p></details>')+
    (session.answered?'<button id="practice-next" class="lesson-submit" type="button">'+
       (session.results.length>=5?"Finish this session":"Next question →")+'</button>':'')+
    '<p class="practice-privacy">The next item is selected using objective coverage, recent answers and author-set difficulty; it is not a calibrated ability estimate.</p>';
  if(session.answered){
    $("#practice-next").addEventListener("click",()=>{advanceAdaptiveQuiz();renderAdaptivePanel();});
  }else{
    host.querySelectorAll("[data-adaptive-choice]").forEach(b=>b.addEventListener("click",()=>answerAdaptiveQuiz(Number(b.dataset.adaptiveChoice))));
  }
}

function renderLearningUnit(){
  const unit=learningUnits.get(openUnitId);if(!unit)return;
  const host=$("#lesson-content"),concept=byId(unit.id);
  $("#learning-studio-title").textContent=concept.title;
  const para=text=>'<p>'+html(text)+'</p>';
  const objectives=unit.objectives.map((obj,i)=>'<div class="lesson-objective"><b>'+String(i+1).padStart(2,"0")+' · '+html(obj.title)+'</b>'+para("Evidence: "+obj.evidence)+
    '<small>Necessary: '+(obj.necessaryIds.map(id=>html(byId(id).title)).join(", ")||"None mapped")+
    (obj.usefulIds.length?' · Useful: '+obj.usefulIds.map(id=>html(byId(id).title)).join(", "):"")+'</small></div>').join("");
  const sections=unit.sections.map((section,i)=>'<section class="lesson-section"><span class="lesson-kicker">'+String(i+1).padStart(2,"0")+' · EXPLAIN</span><h3>'+html(section.heading)+'</h3>'+para(section.body)+'</section>').join("");
  const example=unit.workedExample;
  const worked='<section class="lesson-worked"><span class="lesson-kicker">WORKED EXAMPLE</span><h3>'+html(example.title)+'</h3>'+para(example.setup)+
    '<ol>'+example.steps.map(step=>'<li>'+html(step)+'</li>').join("")+'</ol><p class="lesson-takeaway">'+html(example.takeaway)+'</p></section>';
  const activity='<section class="lesson-worked"><span class="lesson-kicker">TRY IT YOURSELF</span><h3>Predict before checking</h3>'+
    para(unit.activity.prompt)+'<details><summary>Show a hint</summary>'+para(unit.activity.hint)+'</details>'+
    '<details><summary>Show the worked solution</summary>'+para(unit.activity.solution)+'</details></section>';
  const refs=unit.sources.map(s=>'<li><a href="'+html(safeLink(s.url))+'" target="_blank" rel="noopener noreferrer">'+html(s.title)+' ↗</a>'+
    para(s.role)+'<small>'+html(s.license)+'</small></li>').join("");
  host.innerHTML='<div class="lesson-intro"><span class="lesson-kicker">'+html(unit.level)+' · '+html(unit.duration)+'</span><h3>'+html(unit.summary)+'</h3>'+
    '<p>Original Atlas explanations and illustrative examples. Public sources are linked for further verification; external textbook and paper texts are not reproduced.</p>'+
    '<button type="button" id="lesson-concept-back" class="lesson-back">View this concept in the graph ↗</button></div>'+
    '<div class="lesson-grid"><div><section class="lesson-objectives"><span class="lesson-kicker">LEARNING OBJECTIVES</span>'+objectives+'</section>'+
    sections+worked+activity+'<section class="lesson-assessment" id="adaptive-panel"><p>Preparing practice…</p></section></div>'+
    '<aside class="lesson-research"><section><span class="lesson-kicker">RESEARCH APPLICATION</span>'+para(unit.researchConnection)+'</section>'+
    '<section><span class="lesson-kicker">PUBLIC SOURCES & PROVENANCE</span><ul>'+refs+'</ul></section>'+
    '<section><span class="lesson-kicker">ABOUT YOUR PROGRESS</span><p>Adaptive practice provides formative evidence and suggested review, not a verified proficiency estimate. Your self-reported understanding marker stays separate from practice history.</p></section></aside></div>';
  renderAdaptivePanel();
  $("#lesson-concept-back").addEventListener("click",returnFromLearningToGraph);
}

function renderDashboard() {
  statsElement.innerHTML='<span><strong>'+concepts.length+'</strong> concepts</span>'+
    '<span><strong>'+atlas.macros.length+'</strong> regions</span>'+
    '<span><strong>'+researchQuestions.length+'</strong> research pathways</span>';
  updateLearningStats();
  renderNetworkPreview();
  domainCardsElement.replaceChildren();
  atlas.macros.forEach((macro,i)=>{
    const count=atlas.topics.filter(t=>t.macroId===macro.id).length;
    domainCardsElement.appendChild(makeCard(macro.title,REGION_DESCRIPTIONS[macro.id]||"Explore this field.",
      'REGION '+String(i+1).padStart(2,"0"),count+' topic groups · Open region',()=>{
        enterMacro(macro.id);scrollToExplorer();
      },colorFor(macro.domain),"domain-card"));
  });
  questionCardsElement.replaceChildren();
  researchQuestions.forEach((q,i)=>{
    questionCardsElement.appendChild(makeCard(q.title,q.summary,q.eyebrow,
      q.conceptIds.length+' linked concepts · Explore question',()=>{
        openQuestion(q.id);scrollToExplorer();
      },colorFor(byId(q.conceptIds[0]).domain),"question-card"));
  });
}

function renderLearningPathway(container){
  if(!selectedId || level!=="meso")return;
  const concept=byId(selectedId);if(!concept)return;
  const required=concept.prerequisites.filter(e=>e.kind==="necessary").map(e=>byId(e.id)).filter(Boolean);
  const downstream=concepts.filter(c=>c.prerequisites.some(e=>e.kind==="necessary"&&e.id===concept.id)).slice(0,4);
  const pathway=document.createElement("section");pathway.className="map-pathway";
  const heading=document.createElement("div");heading.className="map-pathway-heading";
  heading.innerHTML='<p class="eyebrow">Guided path · '+html(learningStateLabel(concept))+'</p>'+
    '<h4>Build on what you know.</h4><p>Arrows show necessary knowledge dependencies, not the topic containment hierarchy. Other subjects can appear as prerequisites.</p>';
  pathway.appendChild(heading);
  const stages=document.createElement("div");stages.className="map-pathway-stages";
  const groups=[
    {label:"LEARN FIRST",concepts:required,empty:"No direct necessary prerequisites"},
    {label:"CURRENT LEVEL",concepts:[concept],empty:""},
    {label:"UNLOCKS NEXT",concepts:downstream,empty:"No downstream concepts mapped"}
  ];
  groups.forEach((group,index)=>{
    if(index){const arrow=document.createElement("span");arrow.className="map-path-arrow";arrow.textContent="→";arrow.setAttribute("aria-hidden","true");stages.appendChild(arrow);}
    const col=document.createElement("div");col.className="map-path-column";
    const name=document.createElement("span");name.className="map-path-label";name.textContent=group.label;col.appendChild(name);
    if(!group.concepts.length){const none=document.createElement("p");none.className="map-path-empty";none.textContent=group.empty;col.appendChild(none);}
    group.concepts.forEach(target=>{
      const b=button(target.title+" · "+learningStateLabel(target),()=>openConcept(target.id,true),
        "map-path-node is-"+learningState(target)+(target.id===selectedId?" current":""));
      b.style.setProperty("--choice-color",colorFor(target.domain));col.appendChild(b);
    });
    stages.appendChild(col);
  });
  pathway.appendChild(stages);container.appendChild(pathway);
}

function renderMap(scene) {
  mapElement.replaceChildren();
  const lead=document.createElement("div");
  lead.className="structured-map-intro";
  const summary=level==="global"
    ?{eyebrow:"01 / Global Atlas",title:"The knowledge landscape",text:"Choose a region to reveal its topics. Individual concepts remain hidden until you open their containing topic."}
    :level==="macro"
      ?{eyebrow:"02 / Knowledge region",title:activeMacro().title,text:REGION_DESCRIPTIONS[macroId]||"Choose a topic to continue."}
      :{eyebrow:"03 / Topic explorer",title:activeTopic().title,text:"Select a concept to inspect its prerequisites, learning objectives, and research links."};
  lead.innerHTML='<p class="eyebrow">'+html(summary.eyebrow)+'</p><h3>'+html(summary.title)+'</h3><p>'+html(summary.text)+'</p>';
  mapElement.appendChild(lead);
  renderLearningPathway(mapElement);
  const container=document.createElement("div");
  container.className="structured-map-grid "+(level==="global"?"macro-grid":"");
  const childNodes=scene.nodes.filter(n=>level==="global"||n.type!==(level==="macro"?"macro":"topic"));
  childNodes.forEach((node,i)=>{
    const concept=byId(node.id);
    const count=node.type==="macro"?atlas.topics.filter(t=>t.macroId===node.id).length:
      node.type==="topic"?activeTopicFor(node.id).conceptIds.length:null;
    const description=node.type==="macro"?REGION_DESCRIPTIONS[node.id]||"Explore the field.":
      node.type==="topic"?"A focused collection of concepts within "+activeMacro().title+".":
      concept.whyItMatters||concept.researchApplication||"Explore this scientific concept.";
    const footer=node.type==="macro"?count+" topics · "+currentStudyCount([node.id,...atlas.topics.filter(t=>t.macroId===node.id).flatMap(t=>t.conceptIds)])+" studied · Enter region":
      node.type==="topic"?count+" concepts · "+currentStudyCount(activeTopicFor(node.id).conceptIds)+" studied · Open topic":
      learningStateLabel(concept)+" · "+missingRequirements(concept).length+" unfulfilled prerequisites";
    container.appendChild(makeCard(node.name,description,
      node.type==="macro"?"KNOWLEDGE REGION "+String(i+1).padStart(2,"0"):
      node.type==="topic"?"TOPIC "+String(i+1).padStart(2,"0"):"CONCEPT "+String(i+1).padStart(2,"0"),
      footer,()=>handleNodeClick(node),colorFor(node.domain),
      "map-card "+(node.id===selectedId?"selected ":"")+(node.type==="concept"?"is-"+learningState(concept):"")));
  });
  mapElement.appendChild(container);
}
function activeTopicFor(id) {return topicById.get(id);}
function applyDisplayMode() {
  const use3d=displayMode==="3d" && !!graph;
  graphElement.hidden=!use3d;
  mapElement.hidden=use3d;
  $("#view-map").setAttribute("aria-pressed",String(!use3d));
  $("#view-3d").setAttribute("aria-pressed",String(use3d));
  $("#view-map").className="view-button"+(!use3d?" current":"");
  $("#view-3d").className="view-button"+(use3d?" current":"");
  if(use3d)graph.width(graphElement.clientWidth).height(graphElement.clientHeight);
}
function setDisplayMode(mode) {
  if(mode!=="map" && mode!=="3d")return;
  if(mode==="3d" && !graph)return;
  displayMode=mode;draw();
}
function openQuestion(id) {
  const question=researchQuestions.find(q=>q.id===id);if(!question)return;
  enterGlobal();
  activeQuestionId=id;
  showQuestionDetails(question);
}
function showQuestionDetails(q) {
  detailsElement.innerHTML='<div class="research-detail"><span class="question-eyebrow">'+html(q.eyebrow)+'</span>'+
    '<h2>'+html(q.title)+'</h2><p class="question-summary">'+html(q.summary)+'</p>'+
    '<div class="why"><h3>Try investigating</h3><p>'+html(q.activity)+'</p></div>'+
    '<h3 class="question-section-title">Explore the connected concepts</h3>'+
    '<div class="question-concept-list">'+q.conceptIds.map((id,i)=>{
      const concept=byId(id);
      return '<button type="button" class="question-concept" data-question-concept="'+html(id)+'"><span class="question-number">'+String(i+1).padStart(2,"0")+'</span><span>'+html(concept.title)+'<small>'+html(concept.domain)+'</small></span><span aria-hidden="true">↗</span></button>';
    }).join("")+'</div>'+
    '<h3 class="question-section-title">Related public resources</h3>'+
    '<div class="source-list">'+q.sourceIds.map(id=>{
      const s=researchSources.find(item=>item.id===id);
      return s.url?'<a href="'+html(safeLink(s.url))+'" target="_blank" rel="noopener"><span>'+html(s.citation)+'</span><small>'+html(s.title)+'</small></a>':'';
    }).join("")+'</div>'+
    '<p class="research-disclaimer">These are independent exploratory learning prompts, not claims about the lab’s active research agenda. Listed resources provide background, not a predetermined answer.</p></div>';
  detailsElement.querySelectorAll("[data-question-concept]").forEach(b=>
    b.addEventListener("click",()=>openConcept(b.dataset.questionConcept,true)));
}

function draw({frame=true}={}) {
  if(!atlas)return;
  const scene=currentScene();
  if(graph)graph.graphData(scene);
  updateChoices(scene);updateCrumbs();renderMap(scene);applyDisplayMode();
  $("#explorer-title").textContent=level==="global"?"Knowledge landscape":
    level==="macro"?activeMacro().title:activeTopic().title;
  if(frame && displayMode==="3d" && graph) {
    const current=++fitToken;
    setTimeout(()=>{if(graph && displayMode==="3d" && current===fitToken)graph.zoomToFit(lowerMotion()?0:550,72);},220);
  }
}
function globalDetails() {
  detailsElement.innerHTML='<div class="atlas-welcome"><p class="eyebrow">Global Atlas</p><h2>Choose a knowledge region</h2><p>Start with a major field. Its topics and individual concepts remain hidden until you open it.</p><p class="atlas-subtle">'+atlas.macros.length+' regions · '+concepts.length+' learning concepts · one interconnected curriculum.</p></div>';
}
function macroDetails() {
  const m=activeMacro(),groups=atlas.topics.filter(t=>t.macroId===macroId);
  detailsElement.innerHTML='<div class="atlas-welcome"><p class="eyebrow">Knowledge region</p><h2>'+html(m.title)+'</h2><p>'+groups.length+' topics. Choose one in the structured map or switch to the 3D constellation.</p><button class="atlas-primary" id="study-macro" type="button">Open '+html(m.title)+' learning unit</button></div>';
  $("#study-macro").addEventListener("click",()=>showConceptDetails(byId(m.id)));
}
function topicDetails() {
  const t=activeTopic();
  detailsElement.innerHTML='<div class="atlas-welcome"><p class="eyebrow">Learning topic</p><h2>'+html(t.title)+'</h2><p>'+t.conceptIds.length+' learning concepts. Select a concept to see its prerequisites, mastery assessment and research applications.</p><p class="atlas-subtle">Necessary prerequisites and useful connections may lead to other regions; these links will take you directly to the appropriate containing topic.</p></div>';
}
function enterGlobal() {
  activeQuestionId=null;
  level="global";macroId=null;topicId=null;selectedId=null;
  globalDetails();draw();
}
function enterMacro(id) {
  if(!macroById.has(id))return;
  activeQuestionId=null;
  level="macro";macroId=id;topicId=null;selectedId=null;
  macroDetails();draw();
}
function enterTopic(id) {
  const t=topicById.get(id);if(!t)return;
  activeQuestionId=null;
  level="meso";macroId=t.macroId;topicId=id;selectedId=null;
  topicDetails();draw();
}
function relationCard(concept,edge) {
  return '<button class="relationship-card '+html(edge.kind)+'" type="button" data-concept="'+html(concept.id)+'"><span>'+html(concept.title)+'</span><small>'+html(edge.note)+'</small>'+(edge.appliesTo?'<em>Applies to: '+html(edge.appliesTo)+'</em>':'')+'</button>';
}
function detailGroup(title,items,empty,open=false) {
  return '<details class="detail-group"'+(open?' open':'')+'><summary>'+html(title)+'<span>'+items.length+'</span></summary><div class="relationship-list">'+(items.length?items.map(item=>relationCard(item.concept,item.edge)).join(""):'<p class="none">'+html(empty)+'</p>')+'</div></details>';
}
function showConceptDetails(concept) {
  if(!concept)return;
  const required=concept.prerequisites.filter(e=>e.kind==="necessary").map(edge=>({concept:byId(edge.id),edge})).filter(x=>x.concept);
  const useful=concept.prerequisites.filter(e=>e.kind==="useful").map(edge=>({concept:byId(edge.id),edge})).filter(x=>x.concept);
  const next=concepts.flatMap(c=>c.prerequisites.filter(e=>e.id===concept.id).map(edge=>({concept:c,edge})));
  const refs=concept.researchReferences.map(id=>researchSources.find(s=>s.id===id)).filter(Boolean);
  const resource=safeLink(concept.resource);
  const state=learningState(concept),missing=missingRequirements(concept);
  const readyStep=nextReadyRequirement(concept);
  const badge=state==="studied"?"✓ Self-marked understood":state==="ready"?"◇ Ready for guided study":"🔒 Guided path: "+missing.length+" prerequisites to mark understood";
  const action=state==="studied"?"Undo self-mark":state==="locked"?"I already know this (skip prerequisites)":"Mark as understood";
  const lessonStatus='<div class="lesson-progress is-'+html(state)+'"><div class="lesson-progress-row"><span class="lesson-progress-badge">'+html(badge)+'</span><button class="lesson-mark" id="mark-understood" type="button">'+html(action)+'</button></div>'+
    '<p>'+(state==="locked"?"You can preview this concept now; the guided path recommends its necessary prerequisites first.":state==="studied"?"This is your own study marker, not a graded or verified mastery certificate.":"The necessary prerequisites have been self-marked. Explore the objectives and assess your understanding.")+'</p>'+
    (readyStep?'<button id="next-required" class="next-required" type="button">Go to next recommended prerequisite: '+html(readyStep.title)+' ↗</button>':'')+
    '<small>Progress is stored in this browser only. This self-report does not verify mastery.</small></div>';
  detailsElement.innerHTML=(activeQuestionId?'<button id="back-to-question" class="back-to-question" type="button">← Back to research question</button>':'')+'<div class="detail-top"><span class="domain-pill" style="--domain-color:'+colorFor(concept.domain)+'"><i></i>'+html(concept.domain)+'</span><span class="scale-badge '+html(concept.scale)+'">'+html(concept.scale)+' scale</span></div>'+
    '<h2>'+html(concept.title)+'</h2><p class="unit">'+html(concept.unit)+'</p>'+
    lessonStatus+
    (learningUnits.has(concept.id)?'<button type="button" id="open-learning-unit" class="lesson-entry">Open full learning unit · Explanations, worked example, practice ↗</button>':'<p class="lesson-coming">Full lesson in development. The curriculum map and external resources remain available.</p>')+
    '<div class="why"><h3>Why this matters</h3><p>'+html(concept.whyItMatters||concept.researchApplication)+'</p></div>'+
    detailGroup("Necessary prerequisites",required,"No necessary prerequisites are mapped.",true)+
    detailGroup("Useful supporting knowledge",useful,"No useful connections are mapped.")+
    '<details class="detail-group" open><summary>Learning objectives<span>'+concept.learningObjectives.length+'</span></summary><ul class="objectives">'+concept.learningObjectives.map(x=>'<li>'+html(x)+'</li>').join("")+'</ul></details>'+
    '<details class="detail-group"><summary>Mastery assessment</summary><div class="assessment">'+html(concept.masteryAssessment)+'</div></details>'+
    detailGroup("Downstream directions",next,"No downstream concepts are mapped.")+
    '<details class="detail-group"><summary>Research and resources<span>'+refs.length+'</span></summary><p class="research-application">'+html(concept.researchApplication)+'</p>'+
    (resource==="#"?'<p class="none">No public resource link available.</p>':'<a class="resource-link" href="'+html(resource)+'" target="_blank" rel="noopener">Open learning resource ↗</a>')+
    '<div class="source-list">'+refs.map(s=>s.url?'<a href="'+html(safeLink(s.url))+'" target="_blank" rel="noopener"><span>'+html(s.citation)+'</span><small>'+html(s.title)+'</small></a>':'<div><span>'+html(s.citation)+'</span><small>'+html(s.verificationNote)+'</small></div>').join("")+'</div></details>';
  detailsElement.querySelectorAll("[data-concept]").forEach(b=>b.addEventListener("click",()=>openConcept(b.dataset.concept,true)));
  $("#mark-understood").addEventListener("click",()=>markUnderstood(concept.id));
  if(learningUnits.has(concept.id))$("#open-learning-unit").addEventListener("click",()=>openLearningUnit(concept.id));
  if(readyStep)$("#next-required").addEventListener("click",()=>openConcept(readyStep.id,true));
  if(activeQuestionId)$("#back-to-question").addEventListener("click",()=>openQuestion(activeQuestionId));
}
function openConcept(id,record=false) {
  const concept=byId(id);if(!concept)return;
  if(record && selectedId!==id)previousLocations.push(snapshot());
  const loc=conceptLocation(id);
  if(!loc)return;
  macroId=loc.macroId;
  topicId=loc.topicId||null;
  level=topicId?"meso":"macro";
  selectedId=id;
  showConceptDetails(concept);draw();
  searchInput.value="";searchResults.hidden=true;
}
function restoreLocation(loc) {
  if(!loc || !loc.level)return enterGlobal();
  if(loc.level==="global")return enterGlobal();
  if(loc.selectedId)return openConcept(loc.selectedId,false);
  if(loc.topicId)return enterTopic(loc.topicId);
  if(loc.macroId)return enterMacro(loc.macroId);
  enterGlobal();
}
function goParent() {
  if(selectedId) {
    selectedId=null;
    if(topicId)return enterTopic(topicId);
    return enterMacro(macroId);
  }
  if(topicId)return enterMacro(macroId);
  if(macroId)return enterGlobal();
}
function handleNodeClick(node) {
  if(node.type==="macro")enterMacro(node.id);
  else if(node.type==="topic")enterTopic(node.id);
  else openConcept(node.id);
}
function renderSearch(query) {
  const q=query.trim().toLowerCase();
  if(!q){searchResults.hidden=true;return;}
  const matches=concepts.filter(c=>(c.title+" "+c.domain+" "+c.unit+" "+(c.tags||[]).join(" ")).toLowerCase().includes(q)).slice(0,18);
  searchResults.replaceChildren();
  if(!matches.length){const p=document.createElement("p");p.className="search-empty";p.textContent="No concepts found.";searchResults.appendChild(p);}
  matches.forEach(c=>{
    const b=button(c.title+" · "+c.domain,()=>openConcept(c.id,true),"search-result");
    searchResults.appendChild(b);
  });
  searchResults.hidden=false;
}
function showGraphError(title,error) {
  console.error("[Research Atlas] "+title,error);
  graphElement.replaceChildren();
  const box=document.createElement("div");box.className="graph-error";box.setAttribute("role","alert");
  const heading=document.createElement("strong");heading.textContent=title;
  const note=document.createElement("span");note.textContent=error?.message||String(error);
  const small=document.createElement("small");small.textContent="The curriculum is still available. Try refreshing or enabling WebGL.";
  box.append(heading,note,small);graphElement.appendChild(box);
}
function validateNavigation() {
  const ids=new Set(concepts.map(c=>c.id)),used=new Set();
  const macroIds=new Set(atlas.macros.map(m=>m.id)),topicIds=new Set();
  if(macroIds.size!==atlas.macros.length)throw Error("Duplicate macro ID");
  atlas.macros.forEach(m=>{if(!ids.has(m.id)||byId(m.id).scale!=="macro")throw Error("Invalid macro "+m.id);});
  atlas.topics.forEach(t=>{
    if(!macroIds.has(t.macroId)||topicIds.has(t.id))throw Error("Invalid topic "+t.id);
    topicIds.add(t.id);
    t.conceptIds.forEach(id=>{
      if(!ids.has(id)||macroIds.has(id)||used.has(id))throw Error("Invalid or duplicate membership "+id);
      if(byId(id).domain!==byId(t.macroId).domain)throw Error("Cross-domain membership "+id);
      used.add(id);
      locationByConcept.set(id,{macroId:t.macroId,topicId:t.id});
    });
  });
  concepts.forEach(c=>{if(!macroIds.has(c.id)&&!used.has(c.id))throw Error("Concept not navigable: "+c.id);});
  atlas.macros.forEach(m=>locationByConcept.set(m.id,{macroId:m.id,topicId:null}));
}
async function initialise() {
  try {
    const responses=await Promise.all([
      fetch("knowledge-graph/concepts.json"),
      fetch("knowledge-graph/research-sources.json"),
      fetch("knowledge-graph/navigation.json"),
      fetch("knowledge-graph/research-questions.json"),
      fetch("knowledge-graph/learning-units.json"),
      fetch("knowledge-graph/adaptive-items.json")
    ]);
    if(responses.some(r=>!r.ok))throw Error("A curriculum or navigation file failed to load.");
    const [curriculum,sources,navigation,questionsData,unitsData,adaptiveData]=await Promise.all(responses.map(r=>r.json()));
    if(curriculum.schemaVersion!==4 || navigation.schemaVersion!==1)throw Error("Unsupported curriculum/navigation schema.");
    concepts=curriculum.concepts; researchSources=sources.sources||[];atlas=navigation;
    if(questionsData.schemaVersion!==1 || !Array.isArray(questionsData.questions))throw Error("Unsupported research question data.");
    researchQuestions=questionsData.questions;
    if(unitsData.schemaVersion!==1||!Array.isArray(unitsData.units))throw Error("Unsupported learning units.");
    learningUnits=new Map(unitsData.units.map(unit=>[unit.id,unit]));
    if(!window.AtlasAdaptive)throw Error("The adaptive-practice module did not load.");
    window.AtlasAdaptive.validateBank(adaptiveData,unitsData.units);
    adaptiveItems=adaptiveData.items;
    loadAdaptiveHistory();
    const conceptIds=new Set(concepts.map(c=>c.id)),sourceIds=new Set(researchSources.map(s=>s.id));
    for(const q of researchQuestions) {
      if(!q.title || !q.conceptIds.length || q.conceptIds.some(id=>!conceptIds.has(id)) ||
        q.sourceIds.some(id=>!sourceIds.has(id)))throw Error("Invalid research question: "+q.id);
    }
    macroById=new Map(atlas.macros.map(m=>[m.id,m]));
    topicById=new Map(atlas.topics.map(t=>[t.id,t]));
    locationByConcept=new Map();validateNavigation();loadLearningProgress();renderDashboard();renderFeaturedUnits();updateReviewBadge();setActiveView("home",{scroll:false});
    if(typeof ForceGraph3D!=="function") {
      console.warn("[Research Atlas] Optional 3D graph is unavailable. The structured map remains functional.");
      $("#view-3d").disabled=true;enterGlobal();return;
    }
    if(!graphElement.clientWidth||!graphElement.clientHeight)throw Error("The graph container has no size.");
    graphElement.replaceChildren();
    graph=ForceGraph3D()(graphElement)
      .width(graphElement.clientWidth).height(graphElement.clientHeight).backgroundColor("rgba(0,0,0,0)")
      .nodeColor(n=>n.id===selectedId?"#ffffff":colorFor(n.domain))
      .nodeVal(n=>n.type==="macro"?64:n.type==="topic"?26:9).nodeLabel(n=>n.name)
      .linkColor(l=>l.type==="containment"?"rgba(132,156,201,.26)":l.type==="useful"?"rgba(165,135,255,.55)":"rgba(105,168,255,.85)")
      .linkWidth(l=>l.type==="containment"?.7:l.type==="useful"?1:1.5)
      .linkDirectionalArrowLength(l=>l.type==="necessary"?4:0)
      .linkDirectionalArrowRelPos(.84)
      .onNodeClick(handleNodeClick)
      .onNodeHover(n=>{graphElement.style.cursor=n?"pointer":"grab";});
    // No custom Three.js objects or optional CDN labels; readable HTML topic buttons remain available.
    graph.d3Force("charge").strength(0);
    enterGlobal();
    console.info("[Research Atlas] Loaded "+concepts.length+" concepts across "+atlas.macros.length+" regions and "+atlas.topics.length+" curated topics.");
  }catch(error){showGraphError("Unable to render the knowledge graph.",error);}
}
searchInput.addEventListener("input",event=>renderSearch(event.target.value));
searchInput.addEventListener("keydown",event=>{
  if(event.key==="Escape"){searchInput.value="";searchResults.hidden=true;}
  if(event.key==="Enter")searchResults.querySelector("button")?.click();
});
document.addEventListener("keydown",event=>{
  if(event.key==="/" && document.activeElement!==searchInput){event.preventDefault();searchInput.focus();}
  if(event.key==="Escape" && searchResults.hidden)goParent();
});
document.addEventListener("click",event=>{if(!event.target.closest(".graph-toolbar"))searchResults.hidden=true;});
$("#global-view").addEventListener("click",enterGlobal);
$("#parent-view").addEventListener("click",goParent);
$("#history-view").addEventListener("click",()=>{const prior=previousLocations.pop();if(prior)restoreLocation(prior);});
$("#open-full-3d").addEventListener("click",()=>{setDisplayMode("3d");scrollToExplorer();});
$("#resume-learning").addEventListener("click",()=>{
  const next=concepts.find(c=>learningState(c)==="ready" && c.scale!=="macro")||concepts.find(c=>learningState(c)==="ready");
  if(next){openConcept(next.id,true);scrollToExplorer();}
});
$("#close-learning-studio").addEventListener("click",closeLearningUnit);
$("#view-map").addEventListener("click",()=>setDisplayMode("map"));
$("#view-3d").addEventListener("click",()=>setDisplayMode("3d"));
$("#reset-view").addEventListener("click",()=>{if(displayMode==="3d")graph?.zoomToFit(lowerMotion()?0:700,72);});
window.addEventListener("resize",()=>{
  if(graph && displayMode==="3d")graph.width(graphElement.clientWidth).height(graphElement.clientHeight);
  draw({frame:false});
});
initialise();
