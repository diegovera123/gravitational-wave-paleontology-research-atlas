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
  $("#explorer")?.scrollIntoView?.({behavior:lowerMotion()?"auto":"smooth",block:"start"});
}
function makeCard(title,description,eyebrow,footer,action,color,kind="") {
  const card=button("",action,"explorer-card "+kind);
  card.style.setProperty("--choice-color",color);
  card.innerHTML='<span class="explorer-card-top"><span class="explorer-card-eyebrow">'+html(eyebrow)+'</span><span aria-hidden="true">↗</span></span>'+
    '<span class="explorer-card-title">'+html(title)+'</span>'+
    '<span class="explorer-card-summary">'+html(description)+'</span>'+
    '<span class="explorer-card-footer">'+html(footer)+'</span>';
  return card;
}
function renderDashboard() {
  statsElement.innerHTML='<span><strong>'+concepts.length+'</strong> concepts</span>'+
    '<span><strong>'+atlas.macros.length+'</strong> regions</span>'+
    '<span><strong>'+researchQuestions.length+'</strong> research pathways</span>';
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
    const footer=node.type==="macro"?count+" topics · Enter region":
      node.type==="topic"?count+" concepts · Open topic":
      concept.prerequisites.filter(e=>e.kind==="necessary").length+" necessary prerequisites · Open learning unit";
    container.appendChild(makeCard(node.name,description,
      node.type==="macro"?"KNOWLEDGE REGION "+String(i+1).padStart(2,"0"):
      node.type==="topic"?"TOPIC "+String(i+1).padStart(2,"0"):"CONCEPT "+String(i+1).padStart(2,"0"),
      footer,()=>handleNodeClick(node),colorFor(node.domain),
      "map-card "+(node.id===selectedId?"selected":"")));
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
  detailsElement.innerHTML=(activeQuestionId?'<button id="back-to-question" class="back-to-question" type="button">← Back to research question</button>':'')+'<div class="detail-top"><span class="domain-pill" style="--domain-color:'+colorFor(concept.domain)+'"><i></i>'+html(concept.domain)+'</span><span class="scale-badge '+html(concept.scale)+'">'+html(concept.scale)+' scale</span></div>'+
    '<h2>'+html(concept.title)+'</h2><p class="unit">'+html(concept.unit)+'</p>'+
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
  if(activeQuestionId)$("#back-to-question").addEventListener("click",()=>showQuestionDetails(researchQuestions.find(q=>q.id===activeQuestionId)));
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
      fetch("knowledge-graph/research-questions.json")
    ]);
    if(responses.some(r=>!r.ok))throw Error("A curriculum or navigation file failed to load.");
    const [curriculum,sources,navigation,questionsData]=await Promise.all(responses.map(r=>r.json()));
    if(curriculum.schemaVersion!==4 || navigation.schemaVersion!==1)throw Error("Unsupported curriculum/navigation schema.");
    concepts=curriculum.concepts; researchSources=sources.sources||[];atlas=navigation;
    if(questionsData.schemaVersion!==1 || !Array.isArray(questionsData.questions))throw Error("Unsupported research question data.");
    researchQuestions=questionsData.questions;
    const conceptIds=new Set(concepts.map(c=>c.id)),sourceIds=new Set(researchSources.map(s=>s.id));
    for(const q of researchQuestions) {
      if(!q.title || !q.conceptIds.length || q.conceptIds.some(id=>!conceptIds.has(id)) ||
        q.sourceIds.some(id=>!sourceIds.has(id)))throw Error("Invalid research question: "+q.id);
    }
    macroById=new Map(atlas.macros.map(m=>[m.id,m]));
    topicById=new Map(atlas.topics.map(t=>[t.id,t]));
    locationByConcept=new Map();validateNavigation();renderDashboard();
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
$("#view-map").addEventListener("click",()=>setDisplayMode("map"));
$("#view-3d").addEventListener("click",()=>setDisplayMode("3d"));
$("#reset-view").addEventListener("click",()=>{if(displayMode==="3d")graph?.zoomToFit(lowerMotion()?0:700,72);});
window.addEventListener("resize",()=>{
  if(graph && displayMode==="3d")graph.width(graphElement.clientWidth).height(graphElement.clientHeight);
  draw({frame:false});
});
initialise();
