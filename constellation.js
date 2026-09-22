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
function mount({host,macros,topics,concepts,locationByConcept,forceGraph,openConcept,openLesson,startDrill,hasLesson}){
 if(!host)throw Error("3D constellation mount missing");
 const $=sel=>host.querySelector(sel);
 const canvas=$("#constellation-canvas"),detail=$("#constellation-detail"),choices=$("#constellation-choices");
 const byMacro=new Map(macros.map(m=>[m.id,m]));
 const byTopic=new Map(topics.map(t=>[t.id,t]));
 const byConcept=new Map(concepts.map(c=>[c.id,c]));
 const macroGroup=new Map(CHAPTERS.flatMap(g=>g.macros.map(id=>[id,g])));
 const colorForMacro=id=>macroGroup.get(id)?.color||"#a2b8f0";
 let stage="overview",chapterId=null,macroId=null,topicId=null,selectedId=null,graph=null,renderToken=0;
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
   selectedId=null;detail.hidden=true;$("#constellation-location").textContent=description();
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
 function back(){if(!detail.hidden){detail.hidden=true;selectedId=null;return;}
   if(stage==="topic")openMacro(macroId);
   else if(stage==="macro")openChapter(chapterId);
   else openOverview();}
 function showConcept(id){
   const c=byConcept.get(id);if(!c)return;
   // Search and external deep links reveal the actual containing cluster and topic.
   const loc=locationByConcept.get(id);
   if(loc && id!==selectedId && (loc.macroId!==macroId||loc.topicId!==topicId)){
     if(loc.topicId)openTopic(loc.topicId);else openMacro(loc.macroId);
   }
   selectedId=id;detail.hidden=false;
   const req=(c.prerequisites||[]).filter(edge=>edge.kind==="necessary");
   const required=req.slice(0,4).map(edge=>byConcept.get(edge.id)?.title).filter(Boolean);
   detail.innerHTML='<div class="constellation-detail-top"><span class="focus-eyebrow">SCIENTIFIC CONCEPT</span>'+
     '<button type="button" id="constellation-close-detail" class="constellation-quiet" aria-label="Close concept preview">Close ✕</button></div>'+
     '<h3>'+esc(c.title)+'</h3><p>'+esc(c.whyItMatters||c.researchApplication||"Explore the scientific concept and its connections.")+'</p>'+
     (required.length?'<p class="constellation-prereq">Necessary background: '+required.map(esc).join(" · ")+
       (req.length>4?" · …":"")+'</p>':'')+
     '<div class="constellation-detail-actions"><button type="button" id="constellation-study" class="focus-primary">Explore this concept →</button>'+
     (hasLesson(id)?'<button type="button" id="constellation-lesson" class="focus-secondary">Open lesson</button>':'')+'</div>';
   detail.querySelector("#constellation-close-detail").addEventListener("click",()=>{detail.hidden=true;selectedId=null;});
   detail.querySelector("#constellation-study").addEventListener("click",()=>openConcept(id));
   if(hasLesson(id))detail.querySelector("#constellation-lesson").addEventListener("click",()=>openLesson(id));
   detail.scrollIntoView?.({behavior:"smooth",block:"nearest"});
 }
 function showQuestion(q){
   if(!q)return;
   openOverview();
   detail.hidden=false;
   detail.innerHTML='<div class="constellation-detail-top"><span class="focus-eyebrow">RESEARCH QUESTION</span>'+
     '<button type="button" id="constellation-close-detail" class="constellation-quiet">Close ✕</button></div>'+
     '<h3>'+esc(q.title)+'</h3><p>'+esc(q.summary||"")+'</p>'+
     '<p class="constellation-prereq">Investigate: '+esc(q.activity||"")+'</p>'+
     '<div class="constellation-choices">'+(q.conceptIds||[]).filter(id=>byConcept.has(id)).map(id=>
     '<button type="button" class="constellation-choice" data-question-concept="'+esc(id)+'">'+
     esc(byConcept.get(id).title)+' ↗</button>').join("")+'</div>';
   detail.querySelector("#constellation-close-detail").addEventListener("click",()=>{detail.hidden=true;});
   detail.querySelectorAll("[data-question-concept]").forEach(b=>
     b.addEventListener("click",()=>showConcept(b.dataset.questionConcept)));
   detail.scrollIntoView?.({behavior:"smooth",block:"nearest"});
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
