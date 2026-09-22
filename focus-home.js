/* Focused home: choose a domain, inspect a concept, then practise.
 * Uses the existing curriculum, necessary/useful edges, public lesson pilots and original checks.
 * One checked answer is formative feedback, not a mastery or research-readiness score. */
(function(root){
"use strict";
const escape=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const necessary=c=>(c?.prerequisites||[]).filter(e=>e.kind==="necessary");
const useful=c=>(c?.prerequisites||[]).filter(e=>e.kind==="useful");
function mount({host,macros,topics,concepts,questions,learningUnits,locationByConcept,getProfile,getStudied,openConcept,openLesson,startDrill,openDiagnostic,openMap,openRegion,openResearch,openAllPractice,openLibrary}){
  if(!host)throw Error("Focused home is missing");
  const $=selector=>host.querySelector(selector),byId=new Map(concepts.map(c=>[c.id,c]));
  const byMacro=new Map(macros.map(m=>[m.id,m]));
  const byQuestion=new Map(questions.map(q=>[q.conceptId,q]));
  const unitIds=new Set(learningUnits.map(u=>u.id));
  let domainId=null,selectedId=null,expanded=false,answered=false,goalIdSeen=null;
  function relatedIds(macroId){return topics.filter(t=>t.macroId===macroId).flatMap(t=>t.conceptIds);}
  function pickDomain(goalId){
    return locationByConcept.get(goalId)?.macroId|| (byMacro.has(goalId)?goalId:null) ||
      (byMacro.has("binary-stellar-evolution")?"binary-stellar-evolution":macros[0]?.id);
  }
  function orderedConcepts(id){
    const ids=[...new Set(relatedIds(id))];
    return ids.map(cid=>byId.get(cid)).filter(Boolean).sort((a,b)=>{
      const priority=c=>(unitIds.has(c.id)?0:byQuestion.has(c.id)?1:2);
      return priority(a)-priority(b)||a.title.localeCompare(b.title);
    });
  }
  function renderDomains(){
    const container=$("#focus-domains");container.replaceChildren();
    for(const macro of macros){
      const b=document.createElement("button");
      b.type="button";b.className="focus-domain"+(macro.id===domainId?" selected":"");
      b.setAttribute("aria-pressed",String(macro.id===domainId));
      b.textContent=macro.title;
      b.addEventListener("click",()=>selectDomain(macro.id));
      container.appendChild(b);
    }
  }
  function renderConcepts(){
    const macro=byMacro.get(domainId);
    $("#focus-concept-title").textContent=macro?macro.title:"Concepts";
    $("#focus-domain-description").textContent=macro? "Select a concept to see what it connects to and how to practise it.":"";
    const all=orderedConcepts(domainId),items=expanded?all:all.slice(0,6);
    const container=$("#focus-concepts");container.replaceChildren();
    for(const c of items){
      const button=document.createElement("button");
      button.type="button";button.className="focus-concept"+(selectedId===c.id?" selected":"");
      button.setAttribute("aria-pressed",String(selectedId===c.id));
      const status=unitIds.has(c.id)?"Lesson + 5-question drill":byQuestion.has(c.id)?"Conceptual check":"Exercise idea";
      const count=necessary(c).length;
      button.innerHTML='<span class="focus-concept-name">'+escape(c.title)+'</span>'+
        '<span class="focus-concept-meta">'+count+" necessary prerequisite"+(count===1?"":"s")+
        ' <span aria-hidden="true">·</span> '+escape(status)+'</span>';
      button.addEventListener("click",()=>selectConcept(c.id));
      container.appendChild(button);
    }
    const more=$("#focus-show-more");more.hidden=all.length<=6;more.textContent=expanded?"Show fewer concepts ↑":"Show all "+all.length+" concepts ↓";
  }
  function selectDomain(id){
    if(!byMacro.has(id))return;
    domainId=id;selectedId=null;expanded=false;answered=false;
    $("#focus-detail").hidden=true;$("#focus-quiz").hidden=true;
    renderDomains();renderConcepts();
  }
  function linkFor(id){
    const c=byId.get(id);
    if(!c)return "";
    return '<button type="button" class="focus-prereq" data-focus-prereq="'+escape(id)+'">'+escape(c.title)+' <span aria-hidden="true">↗</span></button>';
  }
  function bindPrerequisites(){
    $("#focus-detail").querySelectorAll("[data-focus-prereq]").forEach(b=>
      b.addEventListener("click",()=>selectConcept(b.dataset.focusPrereq)));
  }
  function selectConcept(id){
    const c=byId.get(id);if(!c)return;
    const nextDomain=locationByConcept.get(id)?.macroId||(byMacro.has(id)?id:null);
    if(nextDomain&&nextDomain!==domainId){
      domainId=nextDomain;expanded=true;renderDomains();
    }
    selectedId=id;answered=false;
    renderConcepts();
    const req=necessary(c),supp=useful(c),detail=$("#focus-detail");
    const format=links=>links.map(e=>linkFor(e.id)).join("");
    const startLabel=unitIds.has(id)?"Start 5-question drill":byQuestion.has(id)?"Try a quick conceptual check":null;
    detail.hidden=false;detail.innerHTML=
      '<div class="focus-detail-top"><span class="focus-eyebrow">SELECTED CONCEPT</span>'+
      '<button type="button" id="focus-close-detail" aria-label="Close concept details" class="focus-text-button">Close ✕</button></div>'+
      '<h3>'+escape(c.title)+'</h3>'+
      '<p class="focus-detail-purpose">'+escape(c.whyItMatters||c.researchApplication||"Explore how this idea connects to research.")+'</p>'+
      '<div class="focus-relation"><strong>Necessary before this</strong>'+
      '<div class="focus-prereq-links">'+(req.length?format(req):'<span class="focus-muted">No direct necessary prerequisites listed.</span>')+'</div></div>'+
      (supp.length?'<div class="focus-relation"><strong>Useful for context</strong><div class="focus-prereq-links">'+format(supp)+'</div></div>':'')+
      '<div class="focus-exercise"><strong>Exercise idea</strong><p>'+escape(c.masteryAssessment||"Explain the central idea in your own words.")+'</p>'+
      '<small>Suggested practice prompt; not automatically graded.</small></div>'+
      '<div class="focus-detail-actions">'+
      (startLabel?'<button id="focus-start-drill" class="focus-primary" type="button">'+escape(startLabel)+' →</button>':'')+
      (unitIds.has(id)?'<button id="focus-read-lesson" class="focus-secondary" type="button">Read full lesson</button>':'')+
      '<button id="focus-open-concept" class="focus-text-button" type="button">Full concept & connections ↗</button></div>';
    bindPrerequisites();
    detail.querySelector("#focus-close-detail").addEventListener("click",()=>{
      detail.hidden=true;$("#focus-quiz").hidden=true;selectedId=null;renderConcepts();
    });
    detail.querySelector("#focus-open-concept").addEventListener("click",()=>openConcept(id));
    if(unitIds.has(id))detail.querySelector("#focus-read-lesson").addEventListener("click",()=>openLesson(id));
    if(startLabel)detail.querySelector("#focus-start-drill").addEventListener("click",()=>{
      if(unitIds.has(id)){startDrill(id);return;}
      showQuickCheck(id);
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
    const currentGoal=getProfile()?.goal?.goalId||null;
    if(domainId===null||currentGoal!==goalIdSeen){
      goalIdSeen=currentGoal;
      selectDomain(pickDomain(currentGoal));
    }else renderDomains();
  }
  $("#focus-show-more").addEventListener("click",()=>{expanded=!expanded;renderConcepts();});
  $("#focus-open-region").addEventListener("click",()=>openRegion(domainId));
  $("#focus-change-goal").addEventListener("click",openDiagnostic);
  $("#focus-full-map").addEventListener("click",openMap);
  $("#focus-research").addEventListener("click",openResearch);
  $("#focus-all-practice").addEventListener("click",openAllPractice);
  $("#focus-library").addEventListener("click",openLibrary);
  refresh();
  return {refresh,selectDomain,selectConcept,selected:()=>selectedId,domain:()=>domainId};
}
root.AtlasFocusedHome={mount};
})(typeof window!=="undefined"?window:globalThis);
