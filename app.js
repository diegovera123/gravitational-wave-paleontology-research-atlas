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
let learningUnits=new Map(), practiceUnits=new Map(), practiceByConcept=new Map(), openUnitId=null,practiceConceptId=null;
let practiceArea="all",practiceQuery="";
const quizSessions=new Map();
let adaptiveItems=[], adaptiveHistory=[], adaptiveStorageAvailable=true;
let activeView="home", diagnosticController=null, guideController=null, focusedHome=null, constellation=null, researchController=null;
const PROGRESS_KEY="research-atlas-studied-v1";
const ONBOARDING_KEY="research-atlas-onboarding-seen-v1";
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
const diagnosticColorFor = node => {
  if(node.id===selectedId)return "#ffffff";
  if(node.type!=="concept"||!diagnosticController)return colorFor(node.domain);
  const state=diagnosticController.status(node.id);
  if(["review","review-confident","self-reported-gap"].includes(state))return "#e2a260";
  if(state==="supported")return "#6bd6ad";
  if(state==="supported-uncertain")return "#9fb6ff";
  return colorFor(node.domain);
};
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
  if(selectedId)constellation?.showConcept(selectedId);
  else if(activeQuestionId)constellation?.showQuestion(researchQuestions.find(q=>q.id===activeQuestionId));
  $("#constellation-shell")?.scrollIntoView?.({behavior:lowerMotion()?"auto":"smooth",block:"start"});
}

const TAB_NAMES=["home","explore","practice"];
let homeDiagnosticVisible=false;

function onboardingSeen(){
  try{return window.localStorage?.getItem(ONBOARDING_KEY)==="1";}catch{return false;}
}
function markOnboardingSeen(){
  try{window.localStorage?.setItem(ONBOARDING_KEY,"1");}catch{}
  document.body?.classList?.remove("onboarding-first");
}

function mountMissionGuide(){
  if(!window.AtlasGuide){console.warn("[Research Atlas] Optional mission guide unavailable; classic home remains.");return;}
  try{
    guideController=window.AtlasGuide.mount({
      host:$("#otto-guide"),
      concepts,questionPaths:researchQuestions,
      getProfile:()=>diagnosticController?.snapshot?.()||{},
      getStudied:()=>[...studiedIds],
      hasLesson:id=>learningUnits.has(id),
      openConcept:id=>{openConcept(id,true);scrollToExplorer();},
      openLesson:id=>openLearningUnit(id),
      openDiagnostic:()=>diagnosticController?.open(),
      openAtlas:()=>scrollToExplorer(),
      openQuestion:id=>{openQuestion(id);scrollToExplorer();}
    });
    $("#otto-guide").hidden=false;
    $("#home-panel").classList.add("guide-ready");
  }catch(e){guideController=null;console.error("[Research Atlas] Guide unavailable; showing classic map-first home.",e);}
}


function mountFocusedHome(diagnosticQuestions){
  if(!window.AtlasFocusedHome){
    console.warn("[Research Atlas] Focused home unavailable; retaining guided fallback.");
    return;
  }
  try{
    focusedHome=window.AtlasFocusedHome.mount({
      host:$("#focus-home"),macros:atlas.macros,topics:atlas.topics,
      concepts,questions:diagnosticQuestions,learningUnits:[...learningUnits.values()],
      locationByConcept,getProfile:()=>diagnosticController?.snapshot?.()||{},
      getStudied:()=>[...studiedIds],
      openConcept:id=>{openConcept(id,true);scrollToExplorer();},
      openLesson:id=>openLearningUnit(id),
      startDrill:id=>openPracticeUnit(id,"practice"),
      openDiagnostic:()=>diagnosticController?.open(),
      openMap:()=>{constellation?.openOverview();setActiveView("explore");$("#constellation-shell")?.scrollIntoView?.({behavior:lowerMotion()?"auto":"smooth",block:"start"});},
      openRegion:id=>{constellation?.openMacro(id);setActiveView("explore");},
      openResearch:()=>{setActiveView("explore");$("#constellation-research").open=true;},
      openAllPractice:()=>setActiveView("practice"),
      openLibrary:()=>setActiveView("explore")
    });
    $("#home-panel").classList.add("focus-ready");
  }catch(error){
    focusedHome=null;
    console.error("[Research Atlas] Focused home unavailable; retaining guided fallback.",error);
  }
}

function updateOtto(){
 const target=$("#otto-helper-text");if(!target)return;
 const lesson=openUnitId?byId(openUnitId)?.title:null;
 const selected=constellation?.snapshot?.()?.selectedId;
 if(activeView==="home")target.textContent=homeDiagnosticVisible?
   "Rate what you can explain today. A quick check is only a starting point.":
   "Open the graph to explore the field. The starting-point diagnostic is optional.";
 else if(activeView==="practice")target.textContent="Choose a research track for authored adaptive questions or work through its 100 progressive self-checked prompts. Answers to written prompts are not graded.";
 else if(lesson)target.textContent="Studying "+lesson+"? Read the explanation, try the worked example, then practise when ready.";
 else if(selected)target.textContent="This concept's background, explanations, sources and practice are all here. Follow a prerequisite whenever you need it.";
 else target.textContent="Click a large cluster to see its topics, then open a concept. Use Back to zoom out.";
}
function renderGraphResearchQuestions(conceptId=null){
 const host=$("#constellation-research-questions");if(!host)return;host.replaceChildren();
 // One consolidated research-question area. Select a concept to show its related
 // questions; when no direct match exists, retain the full research index.
 const matched=conceptId?researchQuestions.filter(q=>q.conceptIds?.includes(conceptId)):[];
 const shown=matched.length?matched:researchQuestions;
 for(const q of shown){
   host.appendChild(button(q.title,()=>{setActiveView("explore");constellation?.showQuestion(q);},"constellation-choice"));
 }
}
function firstRunLanding(){
  const done=diagnosticController?.hasCompleted?.()||onboardingSeen();
  if(done){
    markOnboardingSeen();
    setActiveView("home",{scroll:false});
    return;
  }
  document.body?.classList?.add("onboarding-first");
  setActiveView("diagnostic",{scroll:false});
  diagnosticController?.open();
}

function setActiveView(view,options={}){
  if(view==="diagnostic")homeDiagnosticVisible=true;
  else if(view==="home")homeDiagnosticVisible=false;
  if(["paths","library"].includes(view))view="explore";
  if(view==="learn")view="practice";
  if(view==="diagnostic")view="home";
  if(!TAB_NAMES.includes(view))return;
  activeView=view;
  if(view!=="explore")$("#learning-studio").hidden=true;
  document.body?.classList?.toggle?.("mission-home",view==="home");
  document.body?.classList?.toggle?.("constellation-mode",view==="explore");
  for(const name of TAB_NAMES){
    const panel=$("#"+name+"-panel"),tab=$("#tab-"+name);
    panel.hidden=name!==view;tab.setAttribute("aria-selected",String(name===view));
    tab.tabIndex=name===view?0:-1;
  }
  $("#dashboard").hidden=view!=="home";
  if(view==="practice"&&practiceUnits.size)renderPracticeHub();
  $("#diagnostic-panel").hidden=view!=="home"||!homeDiagnosticVisible;
  $("#simple-home").hidden=view!=="home"||homeDiagnosticVisible;
  $("#focus-home").hidden=true;
  $("#constellation-shell").hidden=view!=="explore"||!$("#learning-studio").hidden;
  $("#constellation-research").hidden=view!=="explore"||!$("#learning-studio").hidden;
  if(view==="home"&&!homeDiagnosticVisible)focusedHome?.refresh();
  updateOtto();
  if(options.scroll!==false)$("#tab-"+view).scrollIntoView?.({behavior:lowerMotion()?"auto":"smooth",block:"nearest"});
  if(options.focus)$("#tab-"+view).focus();
  if(view==="explore"&&$("#learning-studio").hidden){constellation?.initialize();constellation?.ensureVisible();}
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
  guideController?.render();
  focusedHome?.refresh();
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
    const profile=diagnosticController?.snapshot();
    const rated=[m.id,...leafIds].filter(id=>profile?.ratings?.[id]).length;
    const b=button("",()=>{enterMacro(m.id);scrollToExplorer();},"network-region");
    b.style.setProperty("--region-color",colorFor(m.domain));
    b.style.left=(pos.x/10)+"%";b.style.top=(pos.y/420*100)+"%";
    b.innerHTML='<span class="network-region-icon" aria-hidden="true"></span><span class="network-region-title">'+html(m.title)+'</span>'+
      '<span class="network-region-progress">'+known+" / "+total+' understood'+(rated?' · '+rated+' assessed':'')+'</span>';
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
function renderPracticeFilters(){
  const chooser=$("#practice-concept-picker");
  if(chooser){chooser.innerHTML='<option value="">Choose a concept…</option>'+
    [...concepts].sort((a,b)=>a.title.localeCompare(b.title)).map(concept=>
      '<option value="'+html(concept.id)+'">'+html(concept.title)+'</option>').join("");
    $("#practice-open-concept").addEventListener("click",()=>{
      if(chooser.value)openConceptPractice(chooser.value);
    });
  }
  const select=$("#practice-area-filter");if(!select)return;
  const areas=[...new Set([...practiceUnits.values()].map(u=>u.area))].sort();
  select.innerHTML='<option value="all">All research areas</option>'+
    areas.map(area=>'<option value="'+html(area)+'">'+html(area)+'</option>').join("");
  select.addEventListener("change",event=>{practiceArea=event.target.value;renderPracticeHub();});
  $("#practice-search")?.addEventListener("input",event=>{practiceQuery=event.target.value.trim().toLowerCase();renderPracticeHub();});
  const count=adaptiveItems.length,cases=[...practiceUnits.values()].reduce((n,u)=>n+(u.cases?.length||0),0);
  $("#practice-summary").textContent=practiceUnits.size+" research tracks · "+count+
    " authored questions · "+cases+" self-checked applied cases";
}
function renderPracticeHub(){
  const host=$("#practice-unit-cards");if(!host)return;
  host.replaceChildren();
  for(const unit of practiceUnits.values()){
    if(practiceArea!=="all"&&unit.area!==practiceArea)continue;
    if(practiceQuery&&!([unit.title,unit.area,unit.summary,...unit.objectives.map(o=>o.title)].join(" ").toLowerCase().includes(practiceQuery)))continue;
    const attempted=unit.objectives.reduce((sum,o)=>sum+window.AtlasAdaptive.objectiveStats(unit.id,o.id,adaptiveHistory).attempts,0);
    const items=adaptiveItems.filter(q=>q.unitId===unit.id).length;
    const card=button("",()=>openPracticeUnit(unit.id),"practice-unit-card"+(unit.id===openUnitId?" is-selected":""));
    card.setAttribute("aria-pressed",String(unit.id===openUnitId));
    card.innerHTML='<span class="practice-card-kicker">'+html(unit.area)+' · '+items+' authored questions</span>'+
      '<strong>'+html(unit.title)+'</strong><span>'+html(unit.summary)+'</span>'+
      '<span class="practice-card-components">'+unit.objectives.length+" learning components"+(unit.cases?.length?" · "+unit.cases.length+" applied cases":" · full explanatory lesson")+'</span>'+
      '<small>'+(attempted?attempted+" prior responses":"Not attempted yet")+' · Open assessment ↗</small>';
    host.appendChild(card);
  }
  if(!host.children.length){
    const p=document.createElement("p");p.className="practice-empty";
    p.textContent="No tracks match these filters. Try another research area or search term.";host.appendChild(p);
  }
}
function renderPracticeCases(unit){
 const host=$("#practice-case-studies");if(!host)return;
 const cases=unit.cases||[];host.hidden=!cases.length;
 if(!cases.length){host.replaceChildren();return;}
 const para=value=>'<p>'+html(value)+'</p>';
 host.innerHTML='<div class="practice-section-heading"><h3>Apply it to a research scenario</h3><span>Work through the reasoning before revealing the solution · not graded</span></div>'+
  cases.map((c,i)=>'<article class="practice-case"><span class="practice-card-kicker">CASE '+String(i+1).padStart(2,"0")+'</span>'+
   '<h4>'+html(c.title)+'</h4>'+para(c.scenario)+'<p class="practice-case-task">'+html(c.task)+'</p>'+
   '<label for="practice-case-answer-'+i+'">Your working (optional; not saved)</label>'+
   '<textarea id="practice-case-answer-'+i+'" rows="4" placeholder="Write your assumptions, intermediate reasoning and conclusion..."></textarea>'+
   '<details><summary>Reveal a worked solution for self-check</summary><ol>'+c.steps.map(step=>'<li>'+html(step)+'</li>').join("")+
   '</ol>'+para(c.solution)+'</details></article>').join("")+
   '<div class="practice-sources"><span class="lesson-kicker">PUBLIC READING · CHECK ORIGINAL SOURCES</span>'+
   (unit.sources||[]).map(s=>'<a target="_blank" rel="noopener noreferrer" href="'+html(safeLink(s.url))+'">'+html(s.title)+' ↗</a>').join("")+'</div>';
}
function openConceptPractice(conceptId){
  const concept=byId(conceptId);if(!concept)return;
  if(practiceByConcept.has(conceptId)){openPracticeUnit(practiceByConcept.get(conceptId));return;}
  openUnitId=null;practiceConceptId=conceptId;
  $("#learning-studio").hidden=true;
  setActiveView("practice",{scroll:false});
  $("#practice-active").hidden=false;
  $("#practice-selected-title").textContent=concept.title;
  renderPracticeHub();
  $("#practice-objectives").innerHTML='<span class="lesson-kicker">LEARNING OBJECTIVES</span><ol class="constellation-objectives">'+
    (concept.learningObjectives||[]).map(obj=>"<li>"+html(obj)+"</li>").join("")+"</ol>";
  $("#adaptive-panel").innerHTML='<p>This concept has a 100-step guided, self-checked practice progression below. A separate authored, automatically scored question bank has not been added for this concept yet.</p>';
  $("#practice-case-studies").hidden=true;
  window.AtlasGuidedPractice?.mount({host:$("#practice-guided-prompts"),concept,concepts});
  window.AtlasLiterature?.mount({host:$("#practice-literature"),concept});
  $("#practice-active").scrollIntoView?.({behavior:lowerMotion()?"auto":"smooth",block:"start"});
}
function openPracticeUnit(id,mode=null){
  if(!practiceUnits.has(id))return;
  openUnitId=id;practiceConceptId=null;
  $("#learning-studio").hidden=true;
  setActiveView("practice",{scroll:false});
  $("#practice-active").hidden=false;
  $("#practice-selected-title").textContent=practiceUnits.get(id).title;
  renderPracticeHub();
  renderPracticeCases(practiceUnits.get(id));
  const concept=byId(practiceUnits.get(id).conceptId);
  if(window.AtlasGuidedPractice&&concept)window.AtlasGuidedPractice.mount({host:$("#practice-guided-prompts"),concept,concepts});
  if(window.AtlasLiterature&&concept)window.AtlasLiterature.mount({host:$("#practice-literature"),concept});
  if(mode)startAdaptiveQuiz(mode);
  else renderAdaptivePanel();
  $("#practice-active").scrollIntoView?.({behavior:lowerMotion()?"auto":"smooth",block:"start"});
}
function closePracticeUnit(){
  openUnitId=null;practiceConceptId=null;
  $("#practice-active").hidden=true;
  $("#practice-case-studies").hidden=true;
  renderPracticeHub();
  updateOtto();
}
function openLearningUnit(id){
  if(!learningUnits.has(id))return;
  openUnitId=id;openConcept(id,true);
  setActiveView("explore",{scroll:false});
  $("#constellation-shell").hidden=true;
  $("#constellation-research").hidden=true;
  $("#learn-hub").hidden=true;
  const area=$("#learning-studio");area.hidden=false;
  renderLearningUnit();
  area.scrollIntoView?.({behavior:lowerMotion()?"auto":"smooth",block:"start"});
  area.focus?.();
}
function closeLearningUnit(){
  openUnitId=null;$("#learning-studio").hidden=true;
  $("#learn-hub").hidden=false;
  setActiveView("explore");
}
function returnFromLearningToGraph(){
  openUnitId=null;$("#learning-studio").hidden=true;
  $("#learn-hub").hidden=false;
  setActiveView("explore");scrollToExplorer();
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
  const all=[...practiceUnits.values()];
  const due=window.AtlasAdaptive.dueObjectives(all,adaptiveHistory);
  const host=$("#due-practice");host.replaceChildren();
  const p=document.createElement("p");
  p.className="adaptive-due-info";
  p.textContent=due.length?due.length+" learning objective"+(due.length===1?" is":"s are")+" ready for another review.":"No reviews due right now. Try a research practice track to get started.";
  host.appendChild(p);
  const shown=new Set();
  for(const x of due){
    if(shown.has(x.unitId))continue;shown.add(x.unitId);
    const b=button("Review "+practiceUnits.get(x.unitId).title+" ↗",()=>{
      openPracticeUnit(x.unitId,"review");
    },"adaptive-due-button");
    host.appendChild(b);
  }
  const hint=$("#practice-due-summary");
  if(hint)hint.textContent=due.length?due.length+" objective"+(due.length===1?"":"s")+" due for review":"Adaptive practice · "+practiceUnits.size+" research tracks";
}
function startAdaptiveQuiz(mode="practice",objectiveId=null){
 const unit=practiceUnits.get(openUnitId);if(!unit)return;
 const dueObjectives=mode==="review"?unit.objectives.filter(o=>window.AtlasAdaptive.objectiveStats(unit.id,o.id,adaptiveHistory).due).map(o=>o.id):[];
 const restricted=mode==="component"&&unit.objectives.some(o=>o.id===objectiveId)?[objectiveId]:
   mode==="review"?dueObjectives:[];
 const available=adaptiveItems.filter(q=>q.unitId===unit.id&&(!restricted.length||restricted.includes(q.objectiveId))).length;
 const length=mode==="component"?Math.min(3,available):
   mode==="review"?Math.min(8,available):Math.min(unit.sessionLength||5,available);
 if(!length)return;
 const session={unitId:unit.id,mode,focusObjectiveIds:dueObjectives,restrictObjectiveIds:restricted,
   targetLength:length,results:[],current:null,choice:null,answered:false,done:false};
 quizSessions.set(unit.id,session);
 advanceAdaptiveQuiz();renderAdaptivePanel();
}
function advanceAdaptiveQuiz(){
 const unit=practiceUnits.get(openUnitId),session=quizSessions.get(openUnitId);
 if(!session||!unit)return;
 if(session.results.length>=session.targetLength){session.done=true;session.current=null;return;}
 // Each result is in adaptiveHistory. Exclude current-session records before supplying them separately.
 const lifetime=adaptiveHistory.filter(r=>!session.results.includes(r));
 session.current=window.AtlasAdaptive.chooseNext(adaptiveItems,unit,lifetime,session.results,Date.now(),
   session.focusObjectiveIds,session.restrictObjectiveIds);
 session.choice=null;session.answered=false;
 if(!session.current)session.done=true;
}
function answerAdaptiveQuiz(choice){
 const session=quizSessions.get(openUnitId);
 if(!session||!session.current||session.answered||!Number.isInteger(choice)||choice<0||choice>=session.current.choices.length)return;
 session.choice=choice;session.answered=true;
 const item=session.current;
 const record={unitId:session.unitId,itemId:item.id,objectiveId:item.objectiveId,difficulty:item.difficulty,
   correct:choice===item.correctIndex,at:Date.now()};
 session.results.push(record);adaptiveHistory.push(record);
 saveAdaptiveHistory();updateReviewBadge();renderPracticeHub();renderAdaptivePanel();researchController?.refresh();
}
function renderPracticeObjectives(unit,session){
 const host=$("#practice-objectives");if(!host)return;
 const shown=session?.mode==="component"?"Targeted component check · ":session?.mode==="review"?"Due review · ":"";
 host.innerHTML='<span class="lesson-kicker">'+shown+"KNOWLEDGE COMPONENTS"+'</span>'+
 '<p>Each component is tested separately. Select one for a focused three-question check, or use the full assessment to connect all components.</p>'+
 '<div class="practice-objective-grid">'+unit.objectives.map(o=>{
   const hits=session?.results.filter(r=>r.objectiveId===o.id)||[];
   const correct=hits.filter(r=>r.correct).length;
   const status=hits.length?correct+" / "+hits.length+" this session":"Try a focused check";
   return '<button type="button" class="practice-objective-button" data-practice-component="'+html(o.id)+'"'+
    (session&&!session.done?" disabled":"")+'><span>'+html(o.component||"conceptual").replace(/-/g," ")+'</span>'+
    '<strong>'+html(o.title)+'</strong><small>'+html(o.evidence||"")+'</small><em>'+status+' ↗</em></button>';
 }).join("")+'</div>';
 host.querySelectorAll("[data-practice-component]").forEach(btn=>btn.addEventListener("click",()=>startAdaptiveQuiz("component",btn.dataset.practiceComponent)));
}
function renderAdaptivePanel(){
 const host=$("#adaptive-panel");if(!host||!openUnitId)return;
 const unit=practiceUnits.get(openUnitId),session=quizSessions.get(openUnitId);if(!unit)return;
 const due=unit.objectives.map(o=>({objective:o,...window.AtlasAdaptive.objectiveStats(unit.id,o.id,adaptiveHistory)}));
 renderPracticeObjectives(unit,session);
 if(!session){
   host.innerHTML='<span class="lesson-kicker">RESEARCH PRACTICE · '+unit.objectives.length+' COMPONENTS</span>'+
    '<h3>Test the connections, not just the vocabulary.</h3>'+
    '<p>This track combines conceptual interpretation, worked calculations, causal reasoning and model critique when authored. A full assessment samples each objective without repeating an item within the session. Answers receive explanatory feedback; results are formative, not calibrated mastery estimates.</p>'+
    '<p class="practice-readiness">'+due.map(x=>html(x.objective.title)+': '+x.attempts+" past responses"+(x.due?" · review due":"")).join(" · ")+'</p>'+
    '<button id="practice-start" type="button" class="lesson-submit">Start adaptive practice · '+unit.sessionLength+' questions →</button>'+
    (due.some(x=>x.due)?'<button id="practice-review" type="button" class="lesson-back">Review due objectives →</button>':"")+
    '<small class="practice-privacy">Your graded answers stay in this browser when local storage is available. Applied research cases below are self-checked and not graded or stored.</small>';
   $("#practice-start").addEventListener("click",()=>startAdaptiveQuiz("practice"));
   if(due.some(x=>x.due))$("#practice-review").addEventListener("click",()=>startAdaptiveQuiz("review"));
   return;
 }
 if(session.done){
   const correct=session.results.filter(r=>r.correct).length;
   const summary=unit.objectives.map(o=>{
     const rows=session.results.filter(r=>r.objectiveId===o.id);
     return '<li><strong>'+html(o.title)+'</strong> · '+rows.filter(r=>r.correct).length+' / '+rows.length+
       ' correct in this session'+(rows.length?' · '+html(o.evidence):' · Not sampled in this session')+'</li>';
   }).join("");
   host.innerHTML='<span class="lesson-kicker">SESSION COMPLETE · FORMATIVE EVIDENCE</span>'+
     '<h3>'+correct+" / "+session.results.length+' questions answered correctly</h3>'+
     '<p>This is a record of these particular responses, not a mastery certificate. Compare the reasoning for each component, revisit the source and worked cases, then retest.</p>'+
     '<ul class="practice-outcomes">'+summary+'</ul>'+
     '<button id="practice-again" type="button" class="lesson-submit">Practise again with a new route →</button>'+
     '<button id="practice-back" type="button" class="lesson-back">Back to practice sets</button>';
   $("#practice-again").addEventListener("click",()=>startAdaptiveQuiz(session.mode==="component"?"component":"practice",session.restrictObjectiveIds[0]||null));
   $("#practice-back").addEventListener("click",closePracticeUnit);
   return;
 }
 const item=session.current,objective=unit.objectives.find(o=>o.id===item.objectiveId);
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
 host.innerHTML='<span class="lesson-kicker">'+(session.mode==="review"?"DUE REVIEW":session.mode==="component"?"COMPONENT CHECK":"CROSS-COMPONENT ASSESSMENT")+
   ' · '+progress+' / '+session.targetLength+'</span>'+
   '<div class="practice-progress-track"><span style="width:'+(Math.min(progress,session.targetLength)/session.targetLength*100)+'%"></span></div>'+
   '<p class="practice-objective">'+html((objective.component||item.component||"conceptual").replace(/-/g," "))+' · '+html(objective.title)+
   ' · Authored difficulty '+item.difficulty+' / 3</p>'+
   '<h3>'+html(item.prompt)+'</h3><div class="practice-choices">'+options+'</div>'+
   (session.answered?feedback:'<details class="practice-hint"><summary>Need a hint?</summary><p>'+html(item.hint)+'</p></details>')+
   (session.answered?'<button id="practice-next" class="lesson-submit" type="button">'+
      (session.results.length>=session.targetLength?"Finish this session":"Next question →")+'</button>':"")+
   '<p class="practice-privacy">Item routing uses objective coverage, past answers and author-defined difficulty. No calibrated ability score is inferred.</p>';
 if(session.answered)$("#practice-next").addEventListener("click",()=>{advanceAdaptiveQuiz();renderAdaptivePanel();});
 else host.querySelectorAll("[data-adaptive-choice]").forEach(btn=>btn.addEventListener("click",()=>answerAdaptiveQuiz(Number(btn.dataset.adaptiveChoice))));
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
    sections+worked+activity+'<section class="lesson-worked lesson-practice-link"><span class="lesson-kicker">PRACTICE</span><h3>Ready to apply this?</h3><p>Open this concept’s dedicated practice set or browse due reviews.</p><button type="button" id="lesson-go-practice" class="lesson-submit">Practise this concept →</button></section></div>'+
    '<aside class="lesson-research"><section><span class="lesson-kicker">RESEARCH APPLICATION</span>'+para(unit.researchConnection)+'</section>'+
    '<section><span class="lesson-kicker">PUBLIC SOURCES & PROVENANCE</span><ul>'+refs+'</ul></section>'+
    '<section><span class="lesson-kicker">ABOUT YOUR PROGRESS</span><p>Adaptive practice provides formative evidence and suggested review, not a verified proficiency estimate. Your self-reported understanding marker stays separate from practice history.</p></section></aside></div>';
  $("#lesson-go-practice").addEventListener("click",()=>openPracticeUnit(unit.id));
  $("#lesson-concept-back").addEventListener("click",returnFromLearningToGraph);
}

function renderDashboard() {
  statsElement.innerHTML='<span><strong>'+concepts.length+'</strong> concepts</span>'+
    '<span><strong>'+atlas.macros.length+'</strong> regions</span>'+
    '<span><strong>'+researchQuestions.length+'</strong> research pathways</span>';
  updateLearningStats();
  diagnosticController?.renderOverview();
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
  if(diagnosticController?.hasRatings()){
    const legend=document.createElement("div");legend.className="diagnostic-map-legend";
    legend.innerHTML='<span><i class="supported"></i> Conceptual check supported</span>'+
      '<span><i class="uncertain"></i> Correct but uncertain</span>'+
      '<span><i class="review"></i> Review suggested</span>'+
      '<span><i class="unassessed"></i> Unassessed / self-rated only</span>'+
      '<button type="button" id="diagnostic-map-update">Update my starting point ↗</button>';
    mapElement.appendChild(legend);
    legend.querySelector("#diagnostic-map-update").addEventListener("click",()=>diagnosticController.open());
  }
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
    const dStatus=node.type==="concept"?diagnosticController?.status(node.id):"unassessed";
    const dLabel=dStatus&&dStatus!=="unassessed"?" · "+diagnosticController.labelFor(node.id):"";
    container.appendChild(makeCard(node.name,description,
      node.type==="macro"?"KNOWLEDGE REGION "+String(i+1).padStart(2,"0"):
      node.type==="topic"?"TOPIC "+String(i+1).padStart(2,"0"):"CONCEPT "+String(i+1).padStart(2,"0"),
      footer+dLabel,()=>handleNodeClick(node),colorFor(node.domain),
      "map-card "+(node.id===selectedId?"selected ":"")+(node.type==="concept"?"is-"+learningState(concept)+" diag-"+(dStatus||"unassessed"):"")));
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
    (diagnosticController?'<button type="button" id="diagnostic-on-question" class="diag-inline-cta">Find my starting point for this question ↗</button>':'')+
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
  if(diagnosticController)$("#diagnostic-on-question").addEventListener("click",()=>diagnosticController.open("q:"+q.id));
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
  const diagnosticState=diagnosticController?.status(concept.id)||"unassessed";
  const diagnosticNote='<div class="concept-diagnostic" data-state="'+html(diagnosticState)+'">'+
    '<span>Concept discovery: '+html(diagnosticController?.labelFor(concept.id)||"Not yet assessed")+'</span>'+
    (diagnosticController?'<button id="assess-current-concept" type="button">Reassess this concept ↗</button>':'')+
    '<small>Self-ratings and single conceptual checks never certify mastery or imply that all prerequisites are understood.</small></div>';
  const lessonStatus='<div class="lesson-progress is-'+html(state)+'"><div class="lesson-progress-row"><span class="lesson-progress-badge">'+html(badge)+'</span><button class="lesson-mark" id="mark-understood" type="button">'+html(action)+'</button></div>'+
    '<p>'+(state==="locked"?"You can preview this concept now; the guided path recommends its necessary prerequisites first.":state==="studied"?"This is your own study marker, not a graded or verified mastery certificate.":"The necessary prerequisites have been self-marked. Explore the objectives and assess your understanding.")+'</p>'+
    (readyStep?'<button id="next-required" class="next-required" type="button">Go to next recommended prerequisite: '+html(readyStep.title)+' ↗</button>':'')+
    '<small>Progress is stored in this browser only. This self-report does not verify mastery.</small></div>';
  detailsElement.innerHTML=(activeQuestionId?'<button id="back-to-question" class="back-to-question" type="button">← Back to research question</button>':'')+'<div class="detail-top"><span class="domain-pill" style="--domain-color:'+colorFor(concept.domain)+'"><i></i>'+html(concept.domain)+'</span><span class="scale-badge '+html(concept.scale)+'">'+html(concept.scale)+' scale</span></div>'+
    '<h2>'+html(concept.title)+'</h2><p class="unit">'+html(concept.unit)+'</p>'+
    diagnosticNote+lessonStatus+
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
  if(diagnosticController)$("#assess-current-concept").addEventListener("click",()=>diagnosticController.open("c:"+concept.id));
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
      fetch("knowledge-graph/adaptive-items.json"),
      fetch("knowledge-graph/practice-sets.json"),
      fetch("knowledge-graph/deep-explanations.json"),
      fetch("knowledge-graph/research-journey.json"),
      fetch("knowledge-graph/diagnostic-questions.json")
    ]);
    if(responses.some(r=>!r.ok))throw Error("A curriculum or navigation file failed to load.");
    const [curriculum,sources,navigation,questionsData,unitsData,adaptiveData,practiceData,deepData,journeyData,diagnosticData]=await Promise.all(responses.map(r=>r.json()));
    if(curriculum.schemaVersion!==4 || navigation.schemaVersion!==1)throw Error("Unsupported curriculum/navigation schema.");
    concepts=curriculum.concepts; researchSources=sources.sources||[];atlas=navigation;
    if(!window.AtlasResearchExperience||!window.AtlasResearchModels)throw Error("The research-learning modules did not load.");
    window.AtlasResearchExperience.validate(journeyData,concepts,researchSources);
    if(!window.AtlasConceptInsight)throw Error("The concept explanation module did not load.");
    window.AtlasConceptInsight.load(deepData,concepts);
    if(questionsData.schemaVersion!==1 || !Array.isArray(questionsData.questions))throw Error("Unsupported research question data.");
    researchQuestions=questionsData.questions;
    if(unitsData.schemaVersion!==1||!Array.isArray(unitsData.units))throw Error("Unsupported learning units.");
    learningUnits=new Map(unitsData.units.map(unit=>[unit.id,unit]));
    if(!window.AtlasAdaptive||!window.AtlasPractice)throw Error("A practice module did not load.");
    const catalog=window.AtlasPractice.build(unitsData.units,adaptiveData,practiceData,concepts);
    practiceUnits=catalog.units;practiceByConcept=catalog.byConcept;adaptiveItems=catalog.items;
    window.AtlasAdaptive.validateBank({schemaVersion:1,items:adaptiveItems},[...practiceUnits.values()]);
    loadAdaptiveHistory();
    const conceptIds=new Set(concepts.map(c=>c.id)),sourceIds=new Set(researchSources.map(s=>s.id));
    for(const q of researchQuestions) {
      if(!q.title || !q.conceptIds.length || q.conceptIds.some(id=>!conceptIds.has(id)) ||
        q.sourceIds.some(id=>!sourceIds.has(id)))throw Error("Invalid research question: "+q.id);
    }
    macroById=new Map(atlas.macros.map(m=>[m.id,m]));
    topicById=new Map(atlas.topics.map(t=>[t.id,t]));
    locationByConcept=new Map();validateNavigation();loadLearningProgress();
    if(window.AtlasDiagnostic && window.AtlasDiagnosticUI){
      diagnosticController=window.AtlasDiagnosticUI.mount({
        host:$("#diagnostic-root"),overview:$("#diagnostic-overview"),
        concepts,questions:diagnosticData.questions,questionPaths:researchQuestions,
        macros:atlas.macros,topics:atlas.topics,engine:window.AtlasDiagnostic,
        navigate:view=>setActiveView(view),
        openConcept:id=>{openConcept(id,true);scrollToExplorer();},
        openLearningUnit:id=>openLearningUnit(id),
        onProfileChange:()=>{
          guideController?.render();
          focusedHome?.refresh();
          renderDashboard();
          if(atlas)draw({frame:false});
          if(selectedId)showConceptDetails(byId(selectedId));
        },
        onOnboardingComplete:()=>{markOnboardingSeen();focusedHome?.refresh();},
        onSkipOnboarding:()=>{markOnboardingSeen();focusedHome?.refresh();},
        onStageChange:(stage,correct)=>{
          const title=$("#otto-coach-title"),line=$("#otto-coach-line");
          if(!title||!line)return;
          const scripts={
            choose:["What would you like to discover?","Pick a mission. I’ll help you find your starting point, one idea at a time."],
            rate:["How familiar is this idea?","No pressure to know everything. A quick self-rating is enough to start."],
            check:["A tiny knowledge check.","Try one question if you like. You can skip it and keep exploring."],
            feedback:correct?["Nice reasoning!","One good answer is a start. We’ll keep discovering what you know."]:
              ["An interesting clue!","That’s a useful place to explore next. We’ll check the foundations together."],
            results:["Your journey starts here.","Your answers suggest a path, but you can explore wherever curiosity takes you."]
          };
          const copy=scripts[stage]||scripts.choose;
          title.textContent=copy[0];line.textContent=copy[1];
        }
      });
    }else{
      console.warn("[Research Atlas] Diagnostic module unavailable; the rest of the Atlas remains usable.");
      $("#diagnostic-root").textContent="The diagnostic is temporarily unavailable. You can still explore the knowledge atlas.";
      $("#tab-diagnostic").disabled=true;
      markOnboardingSeen();
    }
    renderDashboard();renderFeaturedUnits();updateReviewBadge();renderPracticeFilters();renderPracticeHub();mountMissionGuide();mountFocusedHome(diagnosticData.questions);
    researchController=window.AtlasResearchExperience.mount({
      host:$("#research-experience"),data:journeyData,concepts,sources:researchSources,
      model:window.AtlasResearchModels,
      openConcept:id=>{setActiveView("explore",{scroll:false});constellation?.showConcept(id);},
      openPractice:id=>openConceptPractice(id),
      getEvidence:()=>window.AtlasResearchModels.evidence(adaptiveHistory,[...practiceUnits.values()]),
      storage:window.localStorage
    });
    // The full Explorer is now one progressive 3D constellation, not the legacy
    // structured-map / sidebar workspace. The legacy data engine remains for
    // research, deep links, the learning studio and old progress records.
    enterGlobal();
    if(window.AtlasConstellation){
      constellation=window.AtlasConstellation.mount({
        host:$("#constellation-shell"),macros:atlas.macros,topics:atlas.topics,
        relationData:journeyData.relationships,
        concepts,locationByConcept,researchSources,researchQuestions,diagnosticQuestions:diagnosticData.questions,
        onConceptSelected:id=>{updateOtto();renderGraphResearchQuestions(id);},
        forceGraph:()=>typeof ForceGraph3D==="function"?ForceGraph3D():null,
        openConcept:id=>{constellation?.showConcept(id);setActiveView("explore");},
        openLesson:id=>openLearningUnit(id),
        startDrill:id=>openConceptPractice(id),
        hasPractice:()=>true,
        startPractice:id=>openConceptPractice(id),
        hasLesson:id=>learningUnits.has(id)
      });
    }else console.warn("[Research Atlas] Constellation unavailable; the normal learning journey remains accessible.");
    renderGraphResearchQuestions();
    firstRunLanding();
    console.info("[Research Atlas] Loaded "+concepts.length+" concepts across "+atlas.macros.length+" regions and "+atlas.topics.length+" curated topics.");
  }catch(error){showGraphError("Unable to render the knowledge graph.",error);}
}
searchInput.addEventListener("input",event=>renderSearch(event.target.value));
searchInput.addEventListener("keydown",event=>{
  if(event.key==="Escape"){searchInput.value="";searchResults.hidden=true;}
  if(event.key==="Enter")searchResults.querySelector("button")?.click();
});
document.addEventListener("keydown",event=>{
  if(event.key==="/" && activeView==="explore" && document.activeElement!==searchInput){event.preventDefault();searchInput.focus();}
  if(event.key==="Escape" && searchResults.hidden){if(activeView==="explore")constellation?.back();else goParent();}
});
document.addEventListener("click",event=>{if(!event.target.closest(".graph-toolbar"))searchResults.hidden=true;});
$("#global-view").addEventListener("click",enterGlobal);
$("#parent-view").addEventListener("click",goParent);
$("#history-view").addEventListener("click",()=>{const prior=previousLocations.pop();if(prior)restoreLocation(prior);});
$("#open-full-3d").addEventListener("click",()=>{scrollToExplorer();});
function continueRecommendedPath(){
  const diagnosticPick=diagnosticController?.snapshot?.()?.goal?.goalId;
  const next=(diagnosticPick&&byId(diagnosticPick)&&learningState(byId(diagnosticPick))!=="studied"?byId(diagnosticPick):null)||
    concepts.find(c=>learningState(c)==="ready" && c.scale!=="macro")||
    concepts.find(c=>learningState(c)==="ready");
  if(next){openConcept(next.id,true);scrollToExplorer();}
  else scrollToExplorer();
}
$("#resume-learning").addEventListener("click",continueRecommendedPath);
$("#home-continue").addEventListener("click",continueRecommendedPath);
$("#home-learn").addEventListener("click",()=>setActiveView("learn"));
$("#home-research").addEventListener("click",()=>setActiveView("paths"));
$("#brand-home").addEventListener("click",event=>{event.preventDefault();setActiveView("home");});
$("#simple-home-graph").addEventListener("click",()=>{constellation?.openOverview();setActiveView("explore");});
$("#simple-home-diagnostic").addEventListener("click",()=>diagnosticController?.open());
$("#otto-helper-button").addEventListener("click",()=>{
 const visible=$("#otto-helper-message").hidden;
 $("#otto-helper-message").hidden=!visible;
 $("#otto-helper-button").setAttribute("aria-expanded",String(visible));updateOtto();
});
$("#otto-helper-close").addEventListener("click",()=>{
 $("#otto-helper-message").hidden=true;$("#otto-helper-button").setAttribute("aria-expanded","false");
});
$("#close-learning-studio").addEventListener("click",closeLearningUnit);
$("#practice-return-graph").addEventListener("click",()=>{
  const id=practiceUnits.get(openUnitId)?.conceptId||practiceConceptId;
  closePracticeUnit();
  if(id)openConcept(id,true);
  scrollToExplorer();
});
$("#view-map").addEventListener("click",()=>setDisplayMode("map"));
$("#view-3d").addEventListener("click",()=>setDisplayMode("3d"));
$("#reset-view").addEventListener("click",()=>{if(displayMode==="3d")graph?.zoomToFit(lowerMotion()?0:700,72);});
window.addEventListener("resize",()=>{
  if(activeView==="explore")constellation?.ensureVisible();
  draw({frame:false});
});
initialise();
