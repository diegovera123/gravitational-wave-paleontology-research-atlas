(function(root){
 "use strict";
 const RESOURCES={
  "gravitational-wave-science":"https://www.ligo.org/science/",
  "stellar-astrophysics":"https://openstax.org/details/books/astronomy-2e",
  "binary-stellar-evolution":"https://ui.adsabs.harvard.edu/abs/2024ARA%26A..62...21M/abstract",
  "binary-population-synthesis":"https://compas.science/",
  "gravitational-wave-paleontology":"https://compas.science/"
 };
 const clean=value=>String(value||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
  .replace(/χ_eff/g,"chi-eff").replace(/χ/g,"chi").replace(/[–—]/g,"-")
  .toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
 const conceptId=label=>"core-"+clean(label);
 const topicId=(macro,title)=>"topic-core-"+clean(macro)+"-"+clean(title);
 const copy=value=>JSON.parse(JSON.stringify(value));
 function sectionFor(manifest,number){return manifest.sections.find(s=>number>=s.start&&number<=s.end);}
 function validate(manifest,baseConcepts,navigation){
  if(manifest?.schemaVersion!==1||!Array.isArray(manifest.labels)||manifest.labels.length!==171)
   throw Error("GW core coverage must contain exactly 171 requested labels.");
  if(new Set(manifest.labels).size!==171)throw Error("GW core coverage labels must be unique.");
  if(!Array.isArray(manifest.sections)||!manifest.sections.length)throw Error("GW core coverage sections are missing.");
  const ids=new Set(baseConcepts.map(c=>c.id)),macros=new Set(navigation.macros.map(m=>m.id));
  for(const [label,id] of Object.entries(manifest.existingConceptMap||{})){
   if(!manifest.labels.includes(label)||!ids.has(id))throw Error("Invalid core concept alias: "+label+" → "+id);
  }
  for(let i=1;i<=171;i++){
   const section=sectionFor(manifest,i);
   if(!section||!macros.has(section.macroId))throw Error("Missing core concept section for item "+i);
  }
  const resolved=manifest.labels.map(label=>(manifest.existingConceptMap||{})[label]||conceptId(label));
  if(new Set(resolved).size!==171)throw Error("Every requested GW concept must resolve to its own canonical concept node.");
  return true;
 }
 function orientation(label,id,macroConcept,section){
  const researchApplication="Use "+label+" when tracing how source physics, observations, populations, or cosmic history contribute to gravitational-wave paleontology.";
  return {
   id,title:label,domain:macroConcept.domain,unit:section.title,prerequisites:[],
   learningObjectives:[
    "Define "+label+" and distinguish it from closely related gravitational-wave paleontology concepts.",
    "Explain where "+label+" enters a source, detector, population, or reconstruction workflow."
   ],
   masteryAssessment:"Explain "+label+" in one concrete gravitational-wave paleontology example and state one assumption or limitation that matters.",
   researchApplication,resource:RESOURCES[section.macroId]||"https://www.ligo.org/science/",
   researchReferences:[],scale:"micro",whyItMatters:researchApplication,parentId:null,
   tags:["gw-core","coverage-orientation",label],aliases:[label]
  };
 }
 function expand(manifest,baseConcepts,navigation){
  validate(manifest,baseConcepts,navigation);
  const concepts=copy(baseConcepts),nav=copy(navigation),byId=new Map(concepts.map(c=>[c.id,c]));
  const macros=new Map(nav.macros.map(m=>[m.id,byId.get(m.id)]));
  let aliasesAdded=0,generated=0;
  const supplemental=new Map();
  manifest.labels.forEach((label,index)=>{
   const number=index+1,section=sectionFor(manifest,number),mapped=(manifest.existingConceptMap||{})[label];
   if(mapped){
    const concept=byId.get(mapped),aliases=new Set(concept.aliases||[]);
    if(!aliases.has(label)){aliases.add(label);aliasesAdded++;}
    concept.aliases=[...aliases];
    concept.tags=[...new Set([...(concept.tags||[]),"gw-core",label])];
    return;
   }
   const id=conceptId(label);
   if(byId.has(id))throw Error("Generated GW concept collides with existing ID: "+id);
   const macroConcept=macros.get(section.macroId);
   if(!macroConcept)throw Error("Missing macro concept "+section.macroId);
   const concept=orientation(label,id,macroConcept,section);
   concepts.push(concept);byId.set(id,concept);generated++;
   const key=section.macroId+"|"+section.title;
   if(!supplemental.has(key))supplemental.set(key,{section,ids:[]});
   supplemental.get(key).ids.push(id);
  });
  for(const {section,ids} of supplemental.values()){
   if(!ids.length)continue;
   const sameMacro=nav.topics.filter(t=>t.macroId===section.macroId);
   const id=topicId(section.macroId,section.title);
   if(nav.topics.some(t=>t.id===id))throw Error("Generated GW topic collides with existing ID: "+id);
   nav.topics.push({id,macroId:section.macroId,title:section.title,order:sameMacro.length,conceptIds:ids});
  }
  const coverage=manifest.labels.map((label,index)=>({
   number:index+1,label,conceptId:(manifest.existingConceptMap||{})[label]||conceptId(label),
   reused:Boolean((manifest.existingConceptMap||{})[label])
  }));
  return {concepts,navigation:nav,coverage,generated,aliasesAdded};
 }
 root.AtlasCoreCoverage={validate,expand,conceptId};
})(typeof window!=="undefined"?window:globalThis);
