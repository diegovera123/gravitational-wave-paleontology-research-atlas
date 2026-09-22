/* The public Knowledge Graph: one immersive constellation.
   5 research clusters → actual macro regions → topics → individual concepts.
   Grouping edges show containment, NEVER necessary prerequisites or inferred mastery. */
(function(root){
"use strict";
const CHAPTERS=[
 {id:"stellar-origins",name:"Lives of stars",macros:["stellar-astrophysics","binary-stellar-evolution"],color:"#d59bbf"},
 {id:"compact-signals",name:"Compact objects & waves",macros:["classical-mechanics","general-relativity","gravitational-wave-science"],color:"#9cacf7"},
 {id:"model-populations",name:"Model stellar populations",macros:["scientific-computing","binary-population-synthesis"],color:"#71d8ca"},
 {id:"cosmic-record",name:"Reconstruct cosmic history",macros:["gravitational-wave-paleontology"],color:"#e0bd80"},
 {id:"research-tools",name:"Foundations & research tools",macros:["calculus","research-practice"],color:"#b49bf0"}
];
const esc=value=>String(value??"").replace(/[&<>"']/g,k=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[k]));
function mount({host,macros,topics,concepts,locationByConcept,researchSources=[],researchQuestions=[],diagnosticQuestions=[],onConceptSelected=()=>{},forceGraph,openConcept,openLesson,startDrill,hasLesson,hasPractice=()=>false,startPractice=()=>{}}){
 if(!host)throw Error("3D constellation mount missing");
 const $=sel=>host.querySelector(sel);
 const canvas=$("#constellation-canvas"),detail=$("#constellation-detail"),shade=$("#constellation-detail-shade"),choices=$("#constellation-choices");
 const byMacro=new Map(macros.map(m=>[m.id,m]));
 const byTopic=new Map(topics.map(t=>[t.id,t]));
 const byConcept=new Map(concepts.map(c=>[c.id,c]));
 const sourcesById=new Map(researchSources.map(source=>[source.id,source]));
 function safeUrl(value){
   try{const url=new URL(value,root.location?.href||"https://example.org/");
     return ["https:","http:"].includes(url.protocol)?url.href:null;
   }catch{return null;}
 }

 const macroGroup=new Map(CHAPTERS.flatMap(g=>g.macros.map(id=>[id,g])));
 const colorForMacro=id=>macroGroup.get(id)?.color||"#a2b8f0";
 let stage="overview",chapterId=null,macroId=null,topicId=null,selectedId=null,graph=null,renderToken=0,previousFocus=null;
 function position(id,name,type,color,index,total,radius,center=false){
   const theta=2*Math.PI*index/Math.max(1,total)-Math.PI/2;
   const phi=Math.sin(index*1.65)*.36;
   const x=center?0:Math.cos(theta)*radius;
   const y=center?0:Math.sin(theta)*radius*.8;
   const z=center?0:Math.sin(phi)*radius*.45;
   return {id,name,type,color,x,y,z,fx:x,fy:y,fz:z};
 }
 function clusterItems(){
   if(stage==="overview")return CHAPTERS.map(c=>({id:c.id,name:c.name,type:"chapter",color:c.color}));
   if(stage==="chapter"){const chapter=CHAPTERS.find(c=>c.id===chapterId);
     return (chapter?.macros||[]).map(id=>({id,name:byMacro.get(id)?.title||id,type:"macro",color:colorForMacro(id)}));}
   if(stage==="macro")return topics.filter(t=>t.macroId===macroId).map(t=>({id:t.id,name:t.title,type:"topic",color:colorForMacro(macroId)}));
   const t=byTopic.get(topicId);
   return (t?.conceptIds||[]).map(id=>({id,name:byConcept.get(id)?.title||id,type:"concept",color:colorForMacro(macroId)}));
 }
 function sceneData(){
   const items=clusterItems(),centerName=stage==="overview"?"Gravitational-Wave Paleontology":
     stage==="chapter"?CHAPTERS.find(c=>c.id===chapterId)?.name:
     stage==="macro"?byMacro.get(macroId)?.title:byTopic.get(topicId)?.title;
   const centerId="atlas-center",color=stage==="overview"?"#c8d3ff":colorForMacro(macroId||CHAPTERS.find(c=>c.id===chapterId)?.macros[0]);
   const radius=items.length>7?158:items.length>4?132:106;
   const nodes=[position(centerId,centerName,"center",color,0,1,0,true),
     ...items.map((item,i)=>position(item.id,item.name,item.type,item.color,i,items.length,radius))];
   const links=items.map(item=>({source:centerId,target:item.id,type:"containment"}));
   return {nodes,links,items};
 }
 function description(){
   if(stage==="overview")return "The entire research field";
   if(stage==="chapter")return CHAPTERS.find(c=>c.id===chapterId)?.name||"Research cluster";
   if(stage==="macro")return byMacro.get(macroId)?.title||"Knowledge region";
   return byTopic.get(topicId)?.title||"Scientific topic";
 }
 function navigate(node){
   if(node.type==="center"){
     if(stage==="overview")showConcept("gravitational-wave-paleontology");
     else if(stage==="chapter" && CHAPTERS.find(c=>c.id===chapterId)?.macros.length===1)openMacro(CHAPTERS.find(c=>c.id===chapterId).macros[0]);
     else if(stage==="macro")showConcept(macroId);
     return;
   }
   if(node.type==="chapter")openChapter(node.id);
   else if(node.type==="macro")openMacro(node.id);
   else if(node.type==="topic")openTopic(node.id);
   else if(node.type==="concept")showConcept(node.id);
 }
 function render(){
   selectedId=null;detail.hidden=true;shade.hidden=true;detail.classList.remove("is-expanded");$("#constellation-location").textContent=description();
   $("#constellation-home").disabled=stage==="overview";
   $("#constellation-back").disabled=stage==="overview";
   const {nodes,links,items}=sceneData();
   $("#constellation-prompt").textContent=
     stage==="overview"?"Open a research cluster":stage==="chapter"?"Open an area of science":
     stage==="macro"?"Open a topic":"Explore a concept";
   choices.replaceChildren();
   for(const item of items){
     const b=document.createElement("button");b.type="button";b.className="constellation-choice";
     b.style.setProperty("--node-color",item.color);
     b.innerHTML='<span class="constellation-choice-dot" aria-hidden="true"></span>'+
       '<span>'+esc(item.name)+'</span><span class="constellation-choice-arrow" aria-hidden="true">↗</span>';
     b.addEventListener("click",()=>navigate(item));
     choices.appendChild(b);
   }
   if(graph){
     graph.graphData({nodes,links});
     const token=++renderToken;
     setTimeout(()=>{if(token===renderToken && graph && !$("#constellation-shell").closest?.("[hidden]")){
       graph.zoomToFit(root.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches?0:550,92);
     }},130);
   }
 }
 function openOverview(){stage="overview";chapterId=null;macroId=null;topicId=null;render();}
 function openChapter(id){if(!CHAPTERS.some(c=>c.id===id))return;
   stage="chapter";chapterId=id;macroId=null;topicId=null;render();}
 function openMacro(id){const c=macroGroup.get(id);if(!c || !byMacro.has(id))return;
   stage="macro";chapterId=c.id;macroId=id;topicId=null;render();}
 function openTopic(id){const t=byTopic.get(id);if(!t)return;
   stage="topic";macroId=t.macroId;chapterId=macroGroup.get(macroId)?.id||null;topicId=id;render();}
 function closeDetail(){
   detail.hidden=true;shade.hidden=true;detail.classList.remove("is-expanded");
   selectedId=null;onConceptSelected(null);
   previousFocus?.focus?.();previousFocus=null;
 }
 function showDialog(){
   previousFocus=document.activeElement||previousFocus;
   detail.hidden=false;shade.hidden=false;
   detail.classList.remove("is-expanded");
   detail.focus?.();
 }
 function wireDialog(){
   detail.querySelector("#constellation-close-detail")?.addEventListener("click",closeDetail);
   detail.querySelector("#constellation-expand-detail")?.addEventListener("click",event=>{
     const expanded=detail.classList.toggle("is-expanded");
     event.currentTarget?.setAttribute?.("aria-pressed",String(expanded));
     event.currentTarget.textContent=expanded?"Exit expanded view ↙":"Expand view ↗";
   });
   detail.querySelectorAll("[data-related]").forEach(button=>
     button.addEventListener("click",()=>showConcept(button.dataset.related)));
   detail.querySelector("#constellation-lesson")?.addEventListener("click",()=>{
     closeDetail();openLesson(selectedLessonId);
   });
 }
 let selectedLessonId=null;
 function back(){if(!detail.hidden){closeDetail();return;}
   if(stage==="topic")openMacro(macroId);
   else if(stage==="macro")openChapter(chapterId);
   else openOverview();}
 function showConcept(id){
   const concept=byConcept.get(id);if(!concept)return;
   const loc=locationByConcept.get(id);
   if(loc && (loc.macroId!==macroId||loc.topicId!==topicId)){
     if(loc.topicId)openTopic(loc.topicId);else openMacro(loc.macroId);
   }
   selectedId=id;selectedLessonId=id;
   const necessary=(concept.prerequisites||[]).filter(e=>e.kind==="necessary"&&byConcept.has(e.id));
   const useful=(concept.prerequisites||[]).filter(e=>e.kind==="useful"&&byConcept.has(e.id));
   const downstream=concepts.filter(other=>(other.prerequisites||[]).some(e=>e.id===id&&e.kind==="necessary")).slice(0,5);
   const references=[...new Set((concept.researchReferences||[]).map(ref=>sourcesById.get(ref)).filter(x=>x&&safeUrl(x.url)))];
   const direct=safeUrl(concept.resource);
   const links=edges=>edges.map(edge=>
     '<button type="button" class="constellation-related" data-related="'+esc(edge.id)+'">'+
     esc(byConcept.get(edge.id).title)+' ↗</button>').join("");
   const relatedSection=(title,edges)=>edges.length?
     '<section class="concept-connection-group"><h4>'+title+'</h4><div class="constellation-related-list">'+links(edges)+'</div></section>':"";
   const referenceList=references.map(ref=>
     '<a href="'+esc(safeUrl(ref.url))+'" target="_blank" rel="noopener noreferrer">'+esc(ref.title||ref.citation)+' ↗</a>').join("")+
     (direct?'<a href="'+esc(direct)+'" target="_blank" rel="noopener noreferrer">Open '+esc(concept.title)+' reference ↗</a>':"");
   detail.innerHTML='<div class="concept-dialog-header"><div><span class="focus-eyebrow">LEARNING UNIT · '+esc(concept.unit||"RESEARCH ATLAS")+'</span>'+
      '<h3 id="concept-dialog-heading">'+esc(concept.title)+'</h3>'+
      '<p>'+esc(concept.whyItMatters||concept.researchApplication||"Follow this idea through the research field.")+'</p></div>'+
      '<div class="concept-dialog-actions"><button type="button" id="constellation-expand-detail" class="constellation-quiet" aria-pressed="false">Expand view ↗</button>'+
      '<button type="button" id="constellation-close-detail" class="constellation-quiet" aria-label="Close concept dialog">Close ✕</button></div></div>'+
      '<div class="concept-dialog-body concept-single-unit">'+
      '<section class="concept-unit-section concept-learning-goals" aria-labelledby="concept-learning-goals-title">'+
      '<h4 id="concept-learning-goals-title">Learning objectives</h4><ol class="constellation-objectives">'+(concept.learningObjectives||[]).map(o=>'<li>'+esc(o)+'</li>').join("")+'</ol></section>'+
      '<section class="concept-unit-section concept-explanation" aria-labelledby="concept-explanation-title">'+
      '<h4 id="concept-explanation-title">Understand the idea</h4>'+
      (root.AtlasConceptInsight?.render(concept)||'<p>Explore what this idea represents, how it works and which scientific assumptions it needs.</p>')+
      (hasLesson(id)?'<button type="button" id="constellation-lesson" class="focus-secondary">Read the full authored lesson →</button>':'')+
      '</section>'+
      '<section class="concept-unit-section concept-unit-connections" aria-labelledby="concept-connections-title">'+
      '<h4 id="concept-connections-title">Build on this understanding</h4>'+
      relatedSection("Necessary background",necessary)+
      relatedSection("Useful context",useful)+
      relatedSection("What this helps you learn next",downstream.map(x=>({id:x.id})))+
      (!necessary.length&&!useful.length&&!downstream.length?'<p>No other concept connections have been mapped here yet.</p>':"")+
      '</section>'+
      '<section class="concept-unit-section concept-unit-resources" aria-labelledby="concept-resources-title">'+
      '<h4 id="concept-resources-title">Research resources</h4>'+
      (referenceList?'<div class="constellation-resource-list">'+referenceList+'</div>':
      '<p>No individual public references have been mapped to this concept yet.</p>')+
      '<h4>Discover related papers</h4><div id="constellation-literature"></div></section></div>'+
      '<div class="concept-dialog-footer"><span>Work through problems in the dedicated Practice section.</span>'+
      '<button type="button" id="constellation-open-practice" class="focus-primary">Open practice for this concept →</button></div>';
   wireDialog();
   detail.querySelector("#constellation-open-practice")?.addEventListener("click",()=>{closeDetail();startPractice(id);});
   const resourceHost=detail.querySelector("#constellation-literature");
   root.AtlasLiterature?.mount({host:resourceHost,concept});
   showDialog();onConceptSelected(id);
 }
 function showQuestion(question){
   if(!question)return;
   openOverview();onConceptSelected(null);
   detail.innerHTML='<div class="concept-dialog-header"><div><span class="focus-eyebrow">RESEARCH QUESTION</span>'+
      '<h3>'+esc(question.title)+'</h3><p>'+esc(question.summary||"")+'</p></div>'+
      '<div class="concept-dialog-actions"><button type="button" id="constellation-expand-detail" class="constellation-quiet" aria-pressed="false">Expand view ↗</button>'+
      '<button type="button" id="constellation-close-detail" class="constellation-quiet">Close ✕</button></div></div>'+
      '<div class="concept-dialog-body"><p>Investigate: '+esc(question.activity||"")+'</p>'+
      '<h4>Explore related concepts</h4><div class="constellation-related-list">'+
      (question.conceptIds||[]).filter(id=>byConcept.has(id)).map(id=>
        '<button type="button" class="constellation-related" data-related="'+esc(id)+'">'+
        esc(byConcept.get(id).title)+' ↗</button>').join("")+'</div></div>';
   wireDialog();showDialog();
 }
 function ensureVisible(){
   if(!graph)return;
   const w=canvas.clientWidth,h=canvas.clientHeight;
   if(w&&h){graph.width(w).height(h);const token=++renderToken;setTimeout(()=>{
     if(graph&&token===renderToken)graph.zoomToFit(350,92);
   },100);}
 }
 function initialize(){
   if(graph)return;
   if(typeof forceGraph!=="function"){
     canvas.hidden=true;const fallback=$("#constellation-fallback");fallback.hidden=false;
     fallback.textContent="3D is unavailable in this browser. Choose any cluster below to explore the same concepts.";
     return;
   }
   try{
     const graphFactory=forceGraph();
     canvas.replaceChildren();
     graph=graphFactory(canvas)
       .width(canvas.clientWidth||900).height(canvas.clientHeight||530)
       .backgroundColor("rgba(0,0,0,0)")
       .nodeColor(n=>n.color)
       .nodeVal(n=>n.type==="center"?95:n.type==="chapter"?56:n.type==="macro"?45:n.type==="topic"?32:17)
       .nodeLabel(n=>n.name)
       .linkColor(()=>"rgba(151,180,229,.38)").linkWidth(1.3)
       .linkDirectionalParticles(2).linkDirectionalParticleWidth(1.2)
       .linkDirectionalParticleSpeed(.0019)
       .onNodeClick(n=>navigate(n))
       .onNodeHover(n=>{canvas.style.cursor=n?"pointer":"grab";});
     graph.d3Force?.("charge")?.strength?.(0);
     render();ensureVisible();
   }catch(error){
     console.warn("[Research Atlas] 3D constellation unavailable; accessible cluster navigation remains.",error);
     graph=null;canvas.hidden=true;const fallback=$("#constellation-fallback");fallback.hidden=false;
     fallback.textContent="3D rendering is unavailable. Use the cluster buttons below to follow the same research hierarchy.";
   }
 }
 shade.addEventListener("click",closeDetail);
 detail.addEventListener("keydown",event=>{
   if(event.key==="Escape"){event.preventDefault();closeDetail();}
   if(event.key==="Tab"){
     const focusable=[...detail.querySelectorAll("button:not([disabled]), a[href], [tabindex=\"0\"]")].filter(el=>!el.closest?.("[hidden]"));
     if(!focusable.length)return;
     if(event.shiftKey&&document.activeElement===focusable[0]){event.preventDefault();focusable[focusable.length-1].focus();}
     else if(!event.shiftKey&&document.activeElement===focusable[focusable.length-1]){event.preventDefault();focusable[0].focus();}
   }
 });
 $("#constellation-home").addEventListener("click",openOverview);
 $("#constellation-back").addEventListener("click",back);
 $("#constellation-reset").addEventListener("click",()=>{if(graph)graph.zoomToFit(450,92);});
 render();
 return {initialize,ensureVisible,openOverview,openChapter,openMacro,openTopic,showConcept,showQuestion,back,
   snapshot:()=>({stage,chapterId,macroId,topicId,selectedId,has3D:!!graph}),
   scene:()=>sceneData()};
}
root.AtlasConstellation={mount,CHAPTERS};
})(typeof window!=="undefined"?window:globalThis);
