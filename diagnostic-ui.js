/* Research Atlas Concept Discovery Diagnostic: progressive disclosure and learner-controlled goals.
 * This UI stores self-ratings and sparse one-question checks, never a mastery score. */
(function(root){
"use strict";
const STORE_KEY="research-atlas-concept-profile-v1",SESSION_KEY="research-atlas-concept-session-v1";
const esc=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const ratingLabels=[
  "New to me",
  "I've encountered it",
  "I can describe the idea",
  "I can explain and apply it",
  "I can use it independently in advanced work"
];
const statusNames={
  "unassessed":"Not yet assessed",
  "skipped":"Skipped",
  "self-reported-gap":"Self-reported starting point",
  "self-reported":"Self-rated only · not verified",
  "supported":"One conceptual check correct",
  "supported-uncertain":"Correct check · low confidence",
  "review":"Review suggested · check incorrect",
  "review-confident":"Review suggested · high-confidence error"
};
function mount({host,overview,concepts,questions,questionPaths,macros,topics,engine,onProfileChange,navigate,openConcept,openLearningUnit}){
  if(!host||!overview)throw Error("Diagnostic interface missing.");
  engine.validateQuestions({schemaVersion:1,questions},concepts);
  const m=new Map(concepts.map(c=>[c.id,c])),qMap=new Map(questions.map(q=>[q.conceptId,q]));
  const pathMap=new Map(questionPaths.map(q=>[q.id,q]));
  const macroMap=new Map(macros.map(x=>[x.id,x]));
  let profile={ratings:{},checks:{},goal:null,completedAt:null},session=null,stage="choose",choice=null,answerConfidence=0;
  let storageAvailable=true,goalKey="";
  function read(key){try{return root.localStorage?.getItem(key)||null;}catch(e){storageAvailable=false;return null;}}
  function write(key,value){try{if(!root.localStorage){storageAvailable=false;return;}root.localStorage.setItem(key,JSON.stringify(value));}
    catch(e){storageAvailable=false;}}
  function validRecord(id,r){return m.has(id)&&r&&Number.isInteger(r.rating)&&r.rating>=0&&r.rating<=4&&
    Number.isInteger(r.certainty)&&r.certainty>=0&&r.certainty<=3;}
  function hydrate(){
    try{
      const raw=read(STORE_KEY);if(raw){
        const obj=JSON.parse(raw);
        if(obj?.schemaVersion===1&&obj.ratings&&obj.checks){
          for(const [id,r] of Object.entries(obj.ratings)){if(validRecord(id,r))profile.ratings[id]=r;}
          for(const [id,c] of Object.entries(obj.checks)){
            if(validRecord(id,profile.ratings[id])&&qMap.has(id)&&
              c.questionId===qMap.get(id).id&&typeof c.correct==="boolean"&&
              Number.isInteger(c.answerConfidence)&&c.answerConfidence>=1&&c.answerConfidence<=3)profile.checks[id]=c;
          }
          profile.goal=obj.goal||null;profile.completedAt=obj.completedAt||null;
        }
      }
    }catch(e){storageAvailable=false;profile={ratings:{},checks:{},goal:null,completedAt:null};}
    // In-progress diagnostic is explicitly restarted after refresh, but saved ratings remain usable.
    session=null;stage="choose";renderOverview();
  }
  function save(){
    write(STORE_KEY,{schemaVersion:1,...profile});
    onProfileChange?.();
    renderOverview();
  }
  function checkCount(){return session?Object.keys(session.checks).length:0;}
  function labelFor(id){return statusNames[status(id)]||statusNames.unassessed;}
  function status(id){return engine.resultStatus(profile.ratings[id],profile.checks[id]);}
  function current(){return session&&m.get(session.currentId);}
  function researchGoal(gKey){
    if(gKey.startsWith("q:")){
      const path=pathMap.get(gKey.slice(2));if(!path)return null;
      return {label:path.title,goalId:path.conceptIds.at(-1),seedIds:[...path.conceptIds].reverse()};
    }
    if(gKey.startsWith("m:")){
      const macro=macroMap.get(gKey.slice(2));if(!macro)return null;
      const seeds=topics.filter(t=>t.macroId===macro.id).map(t=>t.conceptIds.at(-1)).filter(id=>m.has(id));
      return {label:macro.title,goalId:seeds[0]||macro.id,seedIds:[...seeds,macro.id]};
    }
    if(gKey.startsWith("c:")&&m.has(gKey.slice(2))){
      const id=gKey.slice(2);
      return {label:m.get(id).title,goalId:id,seedIds:[id]};
    }
    return null;
  }
  function begin(key){
    const goal=researchGoal(key);if(!goal)return;
    goalKey=key;session=engine.start(concepts,goal.goalId,goal.seedIds,10);
    profile.goal={key,label:goal.label,goalId:goal.goalId};
    choice=null;answerConfidence=0;stage="rate";render();
    save();
  }
  function open(key=null){
    navigate("diagnostic");
    if(key){begin(key);return;}
    stage=session&&!session.finished?stage:"choose";
    render();
  }
  function getQuestion(id){return qMap.get(id)||null;}
  function renderOverview(){
    const n=Object.keys(profile.ratings).length;
    const wrong=Object.keys(profile.checks).filter(id=>!profile.checks[id].correct).length;
    const text=n?n+" concept"+(n===1?"":"s")+" self-rated · "+Object.keys(profile.checks).length+
      " brief conceptual checks · "+wrong+" check"+(wrong===1?"":"s")+" to revisit":"Choose a research goal, then rate the concepts the Atlas surfaces.";
    overview.innerHTML='<div class="diag-overview-copy"><p class="eyebrow">Find your starting point</p><h3>What do you already know?</h3>'+
      '<p>'+esc(text)+'</p><small>Ratings and checks are provisional, not a mastery score. You can skip, correct, or repeat them.</small></div>'+
      '<button id="diagnostic-launch" type="button" class="diagnostic-main-action">'+(n?"Update my knowledge map ↗":"Start concept discovery ↗")+'</button>';
    overview.querySelector("#diagnostic-launch").addEventListener("click",()=>open());
  }
  function renderChoose(){
    const completed=Object.keys(profile.ratings).length;
    host.innerHTML='<div class="diag-heading"><p class="eyebrow">01 / Define your direction</p>'+
      '<h2>Find your place in the research landscape.</h2>'+
      '<p>Choose a question or scientific region. The Atlas will surface up to ten relevant concepts, then move toward necessary prerequisites when you report a possible gap. This is self-assessment, not a placement verdict.</p></div>'+
      '<div class="diag-goal-grid"><div><label class="diag-label" for="diagnostic-goal-select">My research interest</label>'+
      '<select id="diagnostic-goal-select" class="diag-select"><optgroup label="Explore a research question">'+
      questionPaths.map(q=>'<option value="q:'+esc(q.id)+'">'+esc(q.title)+'</option>').join("")+
      '</optgroup><optgroup label="Explore a scientific region">'+macros.map(x=>'<option value="m:'+esc(x.id)+'">'+esc(x.title)+'</option>').join("")+
      '</optgroup></select><button type="button" id="diagnostic-begin" class="diag-primary">Begin concept discovery →</button></div>'+
      '<div class="diag-support"><strong>Prefer a particular concept?</strong><p>Search for any of the '+concepts.length+' Atlas concepts and assess it directly.</p>'+
      '<label class="diag-label" for="diagnostic-concept-search">Concept name</label><input id="diagnostic-concept-search" list="diagnostic-concept-options" placeholder="e.g. Probability Distributions" autocomplete="off"/>'+
      '<datalist id="diagnostic-concept-options">'+concepts.map(c=>'<option value="'+esc(c.title)+'"></option>').join("")+'</datalist>'+
      '<button id="diagnostic-start-concept" type="button" class="diag-secondary">Assess this concept →</button><p id="diagnostic-search-feedback" role="status"></p></div></div>'+
      (completed?'<p class="diag-saved">'+completed+' previous self-ratings are saved in this browser. A new diagnostic updates only the concepts you reassess.</p>':'')+
      '<p class="diag-privacy">Optional · about 8–12 concept ratings · at most five short conceptual checks · skip or end early anytime. No sign-in or server profile.</p>';
    const select=host.querySelector("#diagnostic-goal-select");
    if(goalKey&&researchGoal(goalKey))select.value=goalKey;
    host.querySelector("#diagnostic-begin").addEventListener("click",()=>begin(select.value));
    host.querySelector("#diagnostic-start-concept").addEventListener("click",()=>{
      const query=host.querySelector("#diagnostic-concept-search").value.trim().toLowerCase();
      const match=concepts.find(c=>c.title.toLowerCase()===query||c.id===query);
      if(!match){host.querySelector("#diagnostic-search-feedback").textContent="Select a concept from the suggested names.";return;}
      begin("c:"+match.id);
    });
  }
  function topLine(){
    const progress=session.stepIds.length+1;
    return '<div class="diag-step-line"><span>CONCEPT '+Math.min(progress,session.maxSteps)+' / '+session.maxSteps+'</span>'+
      '<span>'+checkCount()+' / '+session.maxChecks+' conceptual checks</span></div>'+
      '<div class="diag-track"><span style="width:'+Math.min(100,progress/session.maxSteps*100)+'%"></span></div>';
  }
  function conceptContext(c){
    const deps=engine.necessary(c).map(id=>m.get(id)?.title).filter(Boolean).slice(0,4);
    const prev=profile.ratings[c.id];
    return topLine()+'<div class="diag-concept-meta"><span>'+esc(c.domain)+'</span><span>'+esc(c.unit)+'</span></div>'+
      '<h2 class="diag-concept-title">'+esc(c.title)+'</h2>'+
      '<p class="diag-concept-description">Rate what you can currently explain or do. The concept\'s exact learning objectives and explanations are available in the Knowledge Atlas.</p>'+
      (deps.length?'<p class="diag-small"><strong>Related necessary prerequisites:</strong> '+deps.map(esc).join(" · ")+'</p>':'')+
      (prev?'<p class="diag-saved">Your current saved self-rating: '+esc(ratingLabels[prev.rating]||"Not rated")+'</p>':"");
  }
  function renderRate(){
    const c=current();if(!c)return finish();
    const saved=profile.ratings[c.id],prior=session.ratings[c.id]||saved;
    host.innerHTML='<div class="diag-quiz-card">'+conceptContext(c)+
      '<fieldset class="diag-fieldset"><legend>How well can you explain or use this concept?</legend>'+
      ratingLabels.map((text,i)=>'<label class="diag-option"><input type="radio" name="concept-rating" value="'+i+'" '+(prior?.rating===i?'checked':'')+'><span><strong>'+i+'</strong> '+esc(text)+'</span></label>').join("")+'</fieldset>'+
      '<fieldset class="diag-confidence"><legend>How sure are you about your self-rating? <small>(optional)</small></legend>'+
      [[0,"Not specified"],[1,"Unsure"],[2,"Moderately sure"],[3,"Very sure"]].map(([value,label])=>
        '<label><input type="radio" name="rating-certainty" value="'+value+'" '+((prior?.certainty||0)===value?'checked':'')+'>'+label+'</label>').join("")+
      '</fieldset><div class="diag-actions"><button type="button" id="diag-rate-next" class="diag-primary">Continue →</button>'+
      '<button type="button" id="diag-skip" class="diag-secondary">Skip this concept</button>'+
      (session.stepIds.length?'<button type="button" id="diag-end" class="diag-text-action">Finish early</button>':'')+
      '</div><p id="diag-rate-error" role="status" class="diag-error"></p></div>';
    host.querySelector("#diag-rate-next").addEventListener("click",()=>{
      const rated=host.querySelector('input[name="concept-rating"]:checked');
      if(!rated){host.querySelector("#diag-rate-error").textContent="Choose a self-rating or skip this concept.";return;}
      const certainty=host.querySelector('input[name="rating-certainty"]:checked');
      engine.rate(session,c.id,Number(rated.value),certainty?Number(certainty.value):0);
      profile.ratings[c.id]=session.ratings[c.id];delete profile.checks[c.id];
      save();
      if(engine.canCheck(session,questions,c.id)){stage="check";choice=null;answerConfidence=0;render();}
      else next();
    });
    host.querySelector("#diag-skip").addEventListener("click",()=>{
      engine.skip(session,concepts);stage=session.finished?"results":"rate";render();
    });
    if(session.stepIds.length)host.querySelector("#diag-end").addEventListener("click",finish);
  }
  function renderCheck(){
    const c=current(),q=getQuestion(c?.id);if(!q)return next();
    host.innerHTML='<div class="diag-quiz-card">'+topLine()+
      '<p class="eyebrow">02 / Optional conceptual check</p><h2>'+esc(c.title)+'</h2>'+
      '<p>One short question can provide a little evidence beyond your self-rating. You may skip it. Your confidence is recorded before feedback is revealed.</p>'+
      '<fieldset class="diag-fieldset"><legend>'+esc(q.prompt)+'</legend>'+
      q.choices.map((v,i)=>'<label class="diag-option"><input type="radio" name="diagnostic-answer" value="'+i+'" '+(choice===i?'checked':'')+'><span>'+esc(v)+'</span></label>').join("")+
      '</fieldset><fieldset class="diag-confidence"><legend>How confident are you in your answer?</legend>'+
      [[1,"Unsure"],[2,"Moderately confident"],[3,"Very confident"]].map(([v,label])=>'<label><input type="radio" name="answer-confidence" value="'+v+'" '+(answerConfidence===v?'checked':'')+'>'+label+'</label>').join("")+
      '</fieldset><div class="diag-actions"><button id="diag-check-answer" type="button" class="diag-primary">Check answer →</button>'+
      '<button id="diag-skip-check" type="button" class="diag-secondary">Continue without checking</button></div>'+
      '<p id="diag-check-error" role="status" class="diag-error"></p></div>';
    host.querySelector("#diag-check-answer").addEventListener("click",()=>{
      const answer=host.querySelector('input[name="diagnostic-answer"]:checked');
      const conf=host.querySelector('input[name="answer-confidence"]:checked');
      if(!answer||!conf){host.querySelector("#diag-check-error").textContent="Select an answer and your confidence, or skip this check.";return;}
      choice=Number(answer.value);answerConfidence=Number(conf.value);
      const record=engine.recordCheck(session,c.id,q,choice,answerConfidence);
      profile.checks[c.id]=record;save();stage="feedback";render();
    });
    host.querySelector("#diag-skip-check").addEventListener("click",next);
  }
  function renderFeedback(){
    const c=current(),q=getQuestion(c.id),record=session.checks[c.id];
    const interpretation=record.correct?
      (record.answerConfidence===1?"You answered correctly but were unsure. One check offers initial evidence; you may want another example.":"Correct on this one conceptual check. This is not a mastery demonstration."):
      (record.answerConfidence===3?"You were very confident, but this particular answer was incorrect. Review the explanation and try a different question before drawing conclusions.":"This answer was incorrect. The next path can sample a necessary prerequisite where relevant.");
    host.innerHTML='<div class="diag-quiz-card">'+topLine()+
      '<p class="eyebrow">03 / Feedback before proceeding</p>'+
      '<h2>'+esc(c.title)+'</h2><div class="diag-feedback '+(record.correct?"is-correct":"is-review")+'"><strong>'+
      (record.correct?"Correct on this check":"Review this distinction")+'</strong>'+
      '<p>'+esc(q.feedback)+'</p><p><strong>Answer:</strong> '+esc(q.choices[q.correctIndex])+'</p></div>'+
      '<p class="diag-interpret">'+esc(interpretation)+'</p>'+
      '<div class="diag-actions"><button id="diag-feedback-next" class="diag-primary" type="button">Next concept →</button>'+
      '<button id="diag-feedback-finish" class="diag-secondary" type="button">Finish & see my map</button></div></div>';
    host.querySelector("#diag-feedback-next").addEventListener("click",next);
    host.querySelector("#diag-feedback-finish").addEventListener("click",finish);
  }
  function next(){
    if(!session)return;
    engine.advance(session,concepts);
    stage=session.finished?"results":"rate";choice=null;answerConfidence=0;
    if(session.finished)finish();else render();
  }
  function finish(){
    if(!session)return;
    if(session.currentId&&!session.stepIds.includes(session.currentId)&&session.ratings[session.currentId]){
      // Save the last completed rating when the learner finishes before navigating again.
      session.stepIds.push(session.currentId);
    }
    session.finished=true;session.currentId=null;stage="results";
    profile.completedAt=Date.now();save();render();
  }
  function renderResults(){
    const stats=engine.summary(session,concepts);
    const mismatch=stats.checkedIds.filter(id=>session.checks[id]?.correct===false&&session.checks[id]?.answerConfidence===3);
    host.innerHTML='<div class="diag-result-head"><p class="eyebrow">Your provisional knowledge snapshot</p><h2>Here is a starting point, not a verdict.</h2>'+
      '<p>'+esc(profile.goal?.label||"Your research interest")+'</p><div class="diag-result-stats">'+
      '<span><strong>'+stats.rated+'</strong> concepts rated</span><span><strong>'+stats.checked+'</strong> short checks</span>'+
      '<span><strong>'+stats.correct+'</strong> correct checks</span></div>'+
      '<p>High self-ratings are not proof of prerequisite mastery, and one missed question is not proof of a misconception. Unassessed concepts remain unknown rather than assumed mastered.</p>'+
      (mismatch.length?'<p class="diag-calibration">You rated an answer very confidently but missed a conceptual check. Review the distinction before treating the concept as secure.</p>':'')+'</div>'+
      '<h3 class="diag-list-title">Suggested starting points</h3>'+
      '<div class="diag-recommendations">'+(stats.recommendations.length?stats.recommendations.map(item=>
        '<button data-diagnostic-recommend="'+esc(item.id)+'" class="diag-recommendation" type="button"><span><strong>'+esc(item.title)+'</strong>'+
        '<small>'+esc(statusNames[item.status]||statusNames.unassessed)+'</small></span><span aria-hidden="true">↗</span></button>').join(""):
        '<p>Nothing is flagged in this short sample. Choose a goal in the Atlas, or assess more concepts to refine your starting point.</p>')+'</div>'+
      '<p class="diag-privacy">These are provisional, learner-controlled recommendations, not a calibrated score, a claim that you mastered untested prerequisites, or an official research-readiness assessment.</p>'+
      '<div class="diag-actions"><button id="diag-open-map" class="diag-primary" type="button">View my personalized map →</button>'+
      '<button id="diag-repeat" class="diag-secondary" type="button">Explore another goal</button>'+
      '<button id="diag-clear" class="diag-text-action" type="button">Clear saved diagnostic</button></div>';
    host.querySelectorAll("[data-diagnostic-recommend]").forEach(b=>b.addEventListener("click",()=>openConcept(b.dataset.diagnosticRecommend)));
    host.querySelector("#diag-open-map").addEventListener("click",()=>{
      const choice=stats.recommendations[0];
      if(choice)openConcept(choice.id);else navigate("explore");
    });
    host.querySelector("#diag-repeat").addEventListener("click",()=>{stage="choose";session=null;render();});
    host.querySelector("#diag-clear").addEventListener("click",()=>{
      if(typeof root.confirm==="function"&&!root.confirm("Clear all saved diagnostic ratings and conceptual checks on this browser?"))return;
      profile={ratings:{},checks:{},goal:null,completedAt:null};session=null;stage="choose";goalKey="";
      save();render();
    });
  }
  function render(){
    if(stage==="choose"||!session)return renderChoose();
    if(stage==="rate")return renderRate();
    if(stage==="check")return renderCheck();
    if(stage==="feedback")return renderFeedback();
    renderResults();
  }
  function snapshot(){return {goal:profile.goal,ratings:profile.ratings,checks:profile.checks,storageAvailable};}
  hydrate();
  return {open,begin,status,labelFor,snapshot,renderOverview,render,hasRatings:()=>Object.keys(profile.ratings).length>0,
    currentSession:()=>session};
}
root.AtlasDiagnosticUI={mount};
})(typeof window!=="undefined"?window:globalThis);
