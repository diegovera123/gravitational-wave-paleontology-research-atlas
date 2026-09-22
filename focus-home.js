/* One research field, five connected parts: progressively reveal part → topic → concept.
   Existing curriculum and authored practice remain the only source of scientific content. */
(function(root){
"use strict";
const escape=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const necessary=c=>(c?.prerequisites||[]).filter(e=>e.kind==="necessary");
const useful=c=>(c?.prerequisites||[]).filter(e=>e.kind==="useful");
const CHAPTERS=[
  {id:"stellar-origins",title:"1 · The lives of stars",subtitle:"How stars evolve and influence their companions.",macros:["stellar-astrophysics","binary-stellar-evolution"],icon:"✦"},
  {id:"compact-signals",title:"2 · Compact objects and waves",subtitle:"How motion and gravity produce gravitational-wave signals.",macros:["classical-mechanics","general-relativity","gravitational-wave-science"],icon:"◎"},
  {id:"model-populations",title:"3 · Model stellar populations",subtitle:"How simulations connect stellar histories to predicted populations.",macros:["scientific-computing","binary-population-synthesis"],icon:"◈"},
  {id:"cosmic-record",title:"4 · Reconstruct cosmic history",subtitle:"How merger populations and observations inform stellar origins.",macros:["gravitational-wave-paleontology"],icon:"◌"},
  {id:"research-tools",title:"5 · Foundations and research tools",subtitle:"Math, statistics, and research methods for any part of the journey.",macros:["calculus","research-practice"],icon:"∑"}
];
function mount({host,macros,topics,concepts,questions,learningUnits,locationByConcept,getProfile,getStudied,openConcept,openLesson,startDrill,openDiagnostic,openMap,openRegion,openResearch,openAllPractice,openLibrary}){
 if(!host)throw Error("Focused Atlas home is missing");
 const $=selector=>host.querySelector(selector);
 const byId=new Map(concepts.map(c=>[c.id,c]));
 const byMacro=new Map(macros.map(m=>[m.id,m]));
 const byQuestion=new Map(questions.map(q=>[q.conceptId,q]));
 const unitIds=new Set(learningUnits.map(u=>u.id));
 const chapterByMacro=new Map(CHAPTERS.flatMap(ch=>ch.macros.map(id=>[id,ch.id])));
 let chapterId=null,topicId=null,selectedId=null,expanded=false,answered=false;
 let suggestedId=null;
 function suggestedFromDiagnostic(){
   const profile=getProfile?.()||{};
   const misses=Object.entries(profile.checks||{}).filter(([id,r])=>byId.has(id)&&r?.correct===false)
     .sort((a,b)=>(b[1]?.at||0)-(a[1]?.at||0));
   if(misses.length)return misses[0][0];
   const gaps=Object.entries(profile.ratings||{}).filter(([id,r])=>byId.has(id)&&Number.isInteger(r?.rating)&&r.rating<=1)
     .sort((a,b)=>(a[1].rating-b[1].rating)||((b[1]?.at||0)-(a[1]?.at||0)));
   return gaps[0]?.[0]||null;
 }

 function topicList(chapter){
   return chapter.macros.flatMap(id=>topics.filter(t=>t.macroId===id));
 }
 function renderChapters(){
   const container=$("#focus-domains");container.replaceChildren();
   for(const chapter of CHAPTERS){
     const b=document.createElement("button");b.type="button";
     b.className="gw-chapter"+(chapterId===chapter.id?" selected":"");
     b.setAttribute("aria-pressed",String(chapterId===chapter.id));
     b.innerHTML='<span class="gw-chapter-icon" aria-hidden="true">'+escape(chapter.icon)+'</span>'+
       '<span class="gw-chapter-copy"><strong>'+escape(chapter.title)+'</strong><small>'+escape(chapter.subtitle)+'</small></span>'+
       '<span aria-hidden="true" class="gw-chapter-arrow">↗</span>';
     b.addEventListener("click",()=>selectChapter(chapter.id));
     container.appendChild(b);
   }
 }
 function renderTopics(){
   const chapter=CHAPTERS.find(x=>x.id===chapterId);if(!chapter)return;
   const list=topicList(chapter),holder=$("#focus-topics");holder.replaceChildren();
   for(const t of list){
     const b=document.createElement("button");b.type="button";
     b.className="gw-topic"+(topicId===t.id?" selected":"");
     b.setAttribute("aria-pressed",String(topicId===t.id));
     b.innerHTML='<strong>'+escape(t.title)+'</strong><small>'+escape(byMacro.get(t.macroId)?.title||"")+
       ' · '+t.conceptIds.length+' ideas</small>';
     b.addEventListener("click",()=>selectTopic(t.id));
     holder.appendChild(b);
   }
 }
 function selectChapter(id){
   if(!CHAPTERS.some(x=>x.id===id))return;
   chapterId=id;topicId=null;selectedId=null;expanded=false;
   $("#focus-concept-section").hidden=false;$("#focus-detail").hidden=true;$("#focus-quiz").hidden=true;
   const chapter=CHAPTERS.find(x=>x.id===id);
   $("#focus-concept-title").textContent=chapter.title.replace(/^\d+ · /,"");
   $("#focus-domain-description").textContent=chapter.subtitle;
   $("#focus-concepts").replaceChildren();$("#focus-show-more").hidden=true;
   $("#focus-open-region").hidden=chapter.macros.length!==1;
   renderChapters();renderTopics();
   $("#focus-concept-section").scrollIntoView?.({behavior:"smooth",block:"start"});
 }
 function selectTopic(id){
   const chapter=CHAPTERS.find(x=>x.id===chapterId);
   const topic=chapter?topicList(chapter).find(t=>t.id===id):null;if(!topic)return;
   topicId=id;selectedId=null;expanded=false;$("#focus-detail").hidden=true;$("#focus-quiz").hidden=true;
   renderTopics();renderConcepts();
 }
 function orderedConcepts(){
   const topic=topics.find(t=>t.id===topicId);
   return topic?[...new Set(topic.conceptIds)].map(id=>byId.get(id)).filter(Boolean):[];
 }
 function renderConcepts(){
   const all=orderedConcepts(),items=expanded?all:all.slice(0,6),holder=$("#focus-concepts");
   holder.replaceChildren();
   for(const concept of items){
     const b=document.createElement("button");b.type="button";
     b.className="focus-concept"+(selectedId===concept.id?" selected":"");
     b.setAttribute("aria-pressed",String(selectedId===concept.id));
     const status=unitIds.has(concept.id)?"Lesson and practice":byQuestion.has(concept.id)?"Quick concept check":"Explore and try an exercise";
     b.innerHTML='<span class="focus-concept-name">'+escape(concept.title)+'</span>'+
       '<span class="focus-concept-meta">'+escape(status)+'</span>';
     b.addEventListener("click",()=>selectConcept(concept.id));
     holder.appendChild(b);
   }
   const more=$("#focus-show-more");more.hidden=all.length<=6;
   more.textContent=expanded?"Show fewer ideas ↑":"Show all "+all.length+" ideas ↓";
 }
 function linkFor(id){
   const c=byId.get(id);if(!c)return "";
   return '<button type="button" class="focus-prereq" data-focus-prereq="'+escape(id)+'">'+escape(c.title)+' <span aria-hidden="true">↗</span></button>';
 }
 function bindPrerequisites(){
   $("#focus-detail").querySelectorAll("[data-focus-prereq]").forEach(b=>
     b.addEventListener("click",()=>selectConcept(b.dataset.focusPrereq)));
 }
 function selectConcept(id){
   const c=byId.get(id);if(!c)return;
   const location=locationByConcept.get(id);
   let targetChapter=chapterByMacro.get(location?.macroId)||chapterByMacro.get(id);
   if(targetChapter&&targetChapter!==chapterId)selectChapter(targetChapter);
   if(location?.topicId&&location.topicId!==topicId)selectTopic(location.topicId);
   if(orderedConcepts().some(x=>x.id===id)&&!orderedConcepts().slice(0,6).some(x=>x.id===id))expanded=true;
   selectedId=id;answered=false;renderConcepts();
   const req=necessary(c),supp=useful(c),downstream=concepts.filter(other=>necessary(other).some(e=>e.id===id)).slice(0,3),detail=$("#focus-detail");
   const format=links=>links.map(e=>linkFor(e.id)).join("");
   const startLabel=unitIds.has(id)?"Start 5-question drill":byQuestion.has(id)?"Try a quick conceptual check":null;
   detail.hidden=false;detail.innerHTML=
     '<div class="focus-detail-top"><span class="focus-eyebrow">ONE IDEA AT A TIME</span>'+
     '<button type="button" id="focus-close-detail" aria-label="Close concept details" class="focus-text-button">Close ✕</button></div>'+
     '<h3>'+escape(c.title)+'</h3>'+
     '<p class="focus-detail-purpose">'+escape(c.whyItMatters||c.researchApplication||"Explore this concept and its research connections.")+'</p>'+
     '<div class="focus-relation"><strong>What helps me understand this?</strong>'+
     '<div class="focus-prereq-links">'+(req.length?format(req):'<span class="focus-muted">No direct necessary prerequisites listed.</span>')+'</div></div>'+
     (supp.length?'<details class="gw-optional-context"><summary>Useful background</summary><div class="focus-prereq-links">'+format(supp)+'</div></details>':'')+
     (downstream.length?'<details class="gw-optional-context"><summary>Where this leads</summary><div class="focus-prereq-links">'+downstream.map(next=>linkFor(next.id)).join("")+'</div></details>':'')+
     '<div class="focus-exercise"><strong>Try this</strong><p>'+escape(c.masteryAssessment||"Explain the central idea in your own words.")+'</p>'+
     '<small>Suggested practice prompt; not automatically graded.</small></div>'+
     '<div class="focus-detail-actions">'+
     (startLabel?'<button id="focus-start-drill" class="focus-primary" type="button">'+escape(startLabel)+' →</button>':'')+
     (unitIds.has(id)?'<button id="focus-read-lesson" class="focus-secondary" type="button">Read full lesson</button>':'')+
     '<button id="focus-open-concept" class="focus-text-button" type="button">Full concept and sources ↗</button></div>';
   bindPrerequisites();
   detail.querySelector("#focus-close-detail").addEventListener("click",()=>{
     detail.hidden=true;$("#focus-quiz").hidden=true;selectedId=null;renderConcepts();
   });
   detail.querySelector("#focus-open-concept").addEventListener("click",()=>openConcept(id));
   if(unitIds.has(id))detail.querySelector("#focus-read-lesson").addEventListener("click",()=>openLesson(id));
   if(startLabel)detail.querySelector("#focus-start-drill").addEventListener("click",()=>{
     if(unitIds.has(id)){startDrill(id);return;}showQuickCheck(id);
   });
   $("#focus-quiz").hidden=true;
   detail.scrollIntoView?.({behavior:"smooth",block:"nearest"});
 }
  function showQuickCheck(id){
    const q=byQuestion.get(id),panel=$("#focus-quiz");
    if(!q)return;
    answered=false;panel.hidden=false;
    panel.innerHTML='<span class="focus-eyebrow">ONE-QUESTION CONCEPT CHECK</span>'+
      '<h3>'+escape(q.prompt)+'</h3><div class="focus-answer-options">'+
      q.choices.map((choice,i)=>'<button type="button" data-focus-answer="'+i+'" class="focus-answer">'+escape(choice)+'</button>').join("")+
      '</div><div id="focus-quiz-feedback" role="status" aria-live="polite"></div>'+
      '<button id="focus-quiz-close" type="button" class="focus-text-button">Close check</button>';
    panel.querySelectorAll("[data-focus-answer]").forEach(b=>b.addEventListener("click",()=>{
      if(answered)return;
      answered=true;const index=Number(b.dataset.focusAnswer);
      panel.querySelectorAll("[data-focus-answer]").forEach(option=>{
        option.disabled=true;
        if(Number(option.dataset.focusAnswer)===q.correctIndex)option.classList.add("correct");
        if(option===b&&index!==q.correctIndex)option.classList.add("incorrect");
      });
      panel.querySelector("#focus-quiz-feedback").innerHTML=
        '<p><strong>'+(index===q.correctIndex?"Correct on this question.":"Review this distinction.")+'</strong> '+
        escape(q.feedback)+'</p><p>Answer: '+escape(q.choices[q.correctIndex])+'</p>'+
        '<small>This is one formative check, not demonstrated mastery. Your choice is not added to your saved learner profile.</small>';
    }));
    panel.querySelector("#focus-quiz-close").addEventListener("click",()=>{panel.hidden=true;});
    panel.scrollIntoView?.({behavior:"smooth",block:"nearest"});
  }

 function refresh(){
   suggestedId=suggestedFromDiagnostic();
   const start=$("#focus-big-picture");
   start.textContent=suggestedId?"Continue from my diagnostic →":"Start with the big picture →";
   start.setAttribute("aria-label",suggestedId?
     "Continue with the suggested concept "+byId.get(suggestedId).title:"Start with the big picture of gravitational-wave paleontology");
   renderChapters();
   // Never silently replace the learner's selected chapter or claim diagnostic mastery.
 }
 $("#focus-big-picture").addEventListener("click",()=>selectConcept(suggestedId||"gravitational-wave-paleontology"));
 $("#focus-back-chapters").addEventListener("click",()=>{
   chapterId=null;topicId=null;selectedId=null;expanded=false;
   $("#focus-concept-section").hidden=true;$("#focus-detail").hidden=true;$("#focus-quiz").hidden=true;renderChapters();
   $("#focus-domains").scrollIntoView?.({behavior:"smooth",block:"start"});
 });
 $("#focus-show-more").addEventListener("click",()=>{expanded=!expanded;renderConcepts();});
 $("#focus-open-region").addEventListener("click",()=>{
   const chapter=CHAPTERS.find(x=>x.id===chapterId);if(chapter?.macros.length===1)openRegion(chapter.macros[0]);else openMap();
 });
 $("#focus-change-goal").addEventListener("click",openDiagnostic);
 $("#focus-full-map").addEventListener("click",openMap);
 $("#focus-research").addEventListener("click",openResearch);
 $("#focus-all-practice").addEventListener("click",openAllPractice);
 $("#focus-library").addEventListener("click",openLibrary);
 $("#focus-concept-section").hidden=true;
 refresh();
 return {refresh,selectChapter,selectTopic,selectConcept,selected:()=>selectedId,chapter:()=>chapterId,topic:()=>topicId,
    domain:()=>{const chapter=CHAPTERS.find(x=>x.id===chapterId);return chapter?.macros[0]||null;},chapters:CHAPTERS};
}
root.AtlasFocusedHome={mount,CHAPTERS};
})(typeof window!=="undefined"?window:globalThis);
