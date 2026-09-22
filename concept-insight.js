/* Concise intuition first; diagrams are explanatory schematics, not simulated data. */
(function(root){
"use strict";
const escape=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const NOTES={
 "linearized-gravity":{
   question:"How can a small ripple in spacetime be described with equations we can solve?",
   intuition:"Start with flat spacetime as a simple reference and add a tiny change to its metric. Rather than solving Einstein's full nonlinear equations at once, keep only terms that are first order in that change. The remaining equations describe weak disturbances that can travel as waves.",
   mechanism:"Write gμν = ημν + hμν, with |hμν| small in an appropriate coordinate description. Terms quadratic in h are neglected at leading order. Coordinate (gauge) freedom means that some apparent changes in h are descriptions of the same geometry, not extra physical wave modes.",
   boundary:"This approximation is useful for weak radiation far from a source. It does not describe the strongly curved merger region by itself.",
   visual:"wave"},
 "supernova-kicks":{
   question:"How can one stellar explosion change an entire binary orbit?",
   intuition:"Imagine the two stars moving around each other. When one becomes a compact remnant, it can abruptly lose mass and receive a directional velocity kick. The other star has not instantly changed its position. The new relative speed and the weaker gravitational pull together determine the next orbit.",
   mechanism:"Add the kick vector to the remnant's pre-event velocity, then calculate the relative velocity with respect to the companion. Evaluate post-event orbital energy using both final masses and instantaneous separation; speed of the remnant alone cannot establish survival.",
   boundary:"The simple impulse picture assumes an event rapid relative to the orbital period. Real explosions, mass loss and natal kicks have model-dependent distributions.",
   visual:"kick"},
 "binary-orbital-evolution":{
   question:"Why can two stars get closer even while one loses mass?",
   intuition:"An orbit responds not only to how much matter is present, but also to where mass and orbital angular momentum go. Transfer between stars, escaping winds and tides can shrink or widen the separation under different conditions.",
   mechanism:"Follow both component masses, separation, eccentricity and angular-momentum exchange through each evolutionary stage; a single mass-change number cannot fix the new orbit.",
   boundary:"A two-body Keplerian orbit is a useful reference, but interacting binaries exchange mass and energy, so isolated-orbit conservation laws need not hold for the binary alone.",
   visual:"binary"},
 "chirp-mass":{
   question:"Why does a gravitational-wave chirp reveal a combination of two masses?",
   intuition:"Two inspiralling bodies emit waves and lose orbital energy. Their orbital frequency rises as the separation falls, so wave cycles arrive faster and faster. At leading order, the way that frequency accelerates depends strongly on a particular combination of their masses: the chirp mass.",
   mechanism:"M_c = (m₁m₂)^(3/5)/(m₁+m₂)^(1/5). The phase evolution constrains this combination especially well in a quasi-circular inspiral, even when separate component masses remain less certain.",
   boundary:"The observed timescale constrains redshifted masses; source-frame values and progenitor histories require further inference.",
   visual:"chirp"},
 "mass-transfer":{
   question:"What happens when one star grows too large for its part of a binary?",
   intuition:"Each star occupies a region where its gravity competes with its companion's gravity and the orbit's rotation. If a star expands to its Roche-lobe boundary, material can flow toward the other star. Whether that flow settles down or runs away depends on how both the star and its Roche lobe respond.",
   mechanism:"Compare the donor radius with the effective Roche-lobe radius over time; track the mass the donor loses, how much the companion accretes, and any matter or angular momentum leaving the system.",
   boundary:"Filling the lobe identifies the onset of overflow, not its stability or the final orbital separation.",
   visual:"transfer"},
 "common-envelope":{
   question:"How can a very wide stellar binary become a tight pair?",
   intuition:"In some unstable interactions, a companion enters an expanded star's envelope. Moving through the gas can drain the orbit's energy and angular momentum. The cores spiral closer while energy transferred to the gas may help expel the envelope.",
   mechanism:"Compare the energy required to unbind the envelope with energy the shrinking orbit can release, using an explicitly stated efficiency prescription.",
   boundary:"A simplified energy budget cannot alone decide whether the cores survive or merge; gas dynamics and stellar structure matter.",
   visual:"binary"},
 "binary-population-synthesis":{
   question:"How can we study millions of possible stellar histories without watching them all?",
   intuition:"Create an ensemble of hypothetical newborn binaries. Sample their masses and orbits, evolve each using stated physical prescriptions, then count and characterize the outcomes. Comparing these simulated populations with observations tests combinations of assumptions, not a single inevitable stellar history.",
   mechanism:"Initial distributions → stellar and binary evolution → compact remnants → delays and mergers → selection-filtered predictions.",
   boundary:"Sampling weights, physical prescriptions and detector selection are required to turn simulated counts into comparable population predictions.",
   visual:"pipeline"},
 "gravitational-wave-paleontology":{
   question:"How can waves detected today tell us about stars born long ago?",
   intuition:"The observed wave is a trace of the compact binary at merger, but its masses, spins, orbit and rate were shaped by earlier stellar evolution. A forward model predicts which merger populations different histories produce; comparing those predictions to data allows us to constrain possible histories.",
   mechanism:"Progenitor population → binary interactions and remnants → delayed mergers → gravitational-wave signals → detector selection → population inference.",
   boundary:"Different birth histories can produce similar merger properties. The reconstruction is statistical and conditional on the formation and detection models.",
   visual:"pipeline"},
 "detector-selection-effects":{
   question:"Why is a catalog of detected mergers not a census of all mergers?",
   intuition:"A loud nearby source is easier to detect than an otherwise identical distant or poorly oriented source. Your observed catalog therefore overrepresents some parts of the intrinsic population and misses others.",
   mechanism:"Expected detected distribution is the intrinsic merger distribution weighted by the probability of detection as a function of source and detector properties.",
   boundary:"A toy volume scaling does not capture real networks, observing schedules, cosmology or full search pipelines.",
   visual:"selection"},
 "cosmic-merger-rates":{
   question:"Why do mergers today depend on stars formed billions of years ago?",
   intuition:"A compact binary is not usually born and merged at the same instant. Stars form, evolve, leave remnants and eventually spiral together after a delay. To estimate mergers at one epoch, combine births from earlier epochs with the range of possible delays.",
   mechanism:"Formation history by time and metallicity convolved with formation efficiency and delay-time distributions produces an intrinsic merger-rate history.",
   boundary:"Comoving-volume and source-versus-observer-time conventions, cosmology and detector selection must be handled separately.",
   visual:"pipeline"},
 "population-inference":{
   question:"How do many uncertain detections constrain one underlying population?",
   intuition:"Each detected event gives a range of plausible masses, spins and distances rather than one exact answer. A population model describes how often different properties occur. Combine the evidence from all events while accounting for which events the detector could have found.",
   mechanism:"Event likelihoods + population distribution + selection normalization → constraints on population hyperparameters.",
   boundary:"Inferred parameters depend on the chosen population family, event priors, detector selection and measurement uncertainties.",
   visual:"selection"},
 "gravitational-waveforms":{
   question:"What does a changing strain signal reveal about a compact binary?",
   intuition:"A rotating binary generates time-varying gravitational radiation. During inspiral, the orbital motion speeds up and the signal typically chirps. Merger and ringdown then contain strong-field dynamics and remnant oscillations.",
   mechanism:"Orbital dynamics determines a predicted strain waveform; fitting a detector-calibrated waveform to data constrains source parameters.",
   boundary:"Signal amplitude also depends on distance, orientation and detector response. Simple inspiral models cannot replace full strong-field waveforms near merger.",
   visual:"chirp"}
};
function visual(kind){
 const scientific=root.AtlasScientificFigures?.render?.(kind);
 if(scientific)return scientific;
 const label={
 wave:["Flat-spacetime reference","Small metric perturbation","Propagating weak wave"],
 kick:["Pre-event orbital velocity","Directional natal kick","New relative orbit"],
 binary:["Initial orbit","Mass / energy / angular momentum exchange","Updated orbit"],
 chirp:["Wide, slower inspiral","Shrinking separation","Faster wave cycles"],
 transfer:["Expanding donor","Roche-lobe overflow","Mass and angular-momentum response"],
 pipeline:["Progenitor assumptions","Evolution and merger","Signal + observational inference"],
 selection:["Intrinsic source population","Detector sensitivity filter","Observed catalog"]
 }[kind]||["Question","Scientific model","Testable consequence"];
 const arrows='<span class="concept-schematic-arrow" aria-hidden="true">→</span>';
 return '<figure class="concept-schematic" aria-label="Conceptual flow diagram, not a measured dataset">'+
  '<div class="concept-schematic-flow">'+label.map((x,i)=>'<div class="concept-schematic-step">'+
   '<span class="concept-schematic-number">0'+(i+1)+'</span><span>'+escape(x)+'</span></div>').join(arrows)+
   '</div><figcaption>Conceptual schematic · relationships shown are illustrative, not a simulation or observation.</figcaption></figure>';
}
let deepUnits=new Map();
function load(data,concepts=[]){
 if(data?.schemaVersion!==1||!Array.isArray(data.units))throw Error("Unsupported deep-explanation schema.");
 const known=new Set(concepts.map(c=>c.id)),seen=new Set();
 for(const unit of data.units){
   if(!unit.id||!known.has(unit.id)||seen.has(unit.id)||!unit.opening||!unit.example?.title||
      !unit.example.text||!unit.boundary||!Array.isArray(unit.steps)||unit.steps.length<4||
      unit.steps.some(step=>!step.heading||!step.text))throw Error("Invalid deep explanation "+unit?.id);
   seen.add(unit.id);
 }
 deepUnits=new Map(data.units.map(unit=>[unit.id,unit]));
}
function render(concept){
 const deep=deepUnits.get(concept.id);
 if(deep){
   const kind=NOTES[concept.id]?.visual||"pipeline";
   return '<article class="concept-deep-lesson" data-deep-explanation="'+escape(concept.id)+'">'+
     '<p class="concept-deep-opening">'+escape(deep.opening)+'</p>'+
     '<div class="concept-deep-steps">'+deep.steps.map((step,i)=>
      '<section class="concept-deep-step"><span class="concept-deep-step-num">STEP '+String(i+1).padStart(2,"0")+'</span>'+
      '<h5>'+escape(step.heading)+'</h5><p>'+escape(step.text)+'</p></section>').join("")+'</div>'+
     '<section class="concept-deep-example"><span class="lesson-kicker">FOLLOW AN EXAMPLE</span>'+
      '<h5>'+escape(deep.example.title)+'</h5><p>'+escape(deep.example.text)+'</p></section>'+
     visual(kind)+
     '<section class="concept-intuition-limits"><strong>Where the model stops</strong><p>'+
       escape(deep.boundary)+'</p></section></article>';
 }
 const note=NOTES[concept.id];
 if(note){
  return '<div class="concept-intuition"><p class="concept-intuition-question">'+escape(note.question)+'</p>'+
   '<p>'+escape(note.intuition)+'</p><div class="concept-intuition-model"><strong>Connect the mechanism</strong><p>'+
   escape(note.mechanism)+'</p></div><div class="concept-intuition-limits"><strong>Where this picture stops</strong><p>'+
   escape(note.boundary)+'</p></div>'+visual(note.visual)+'</div>';
 }
 const why=concept.whyItMatters||concept.researchApplication||"the research problem";
 const a=(concept.learningObjectives||[])[0]||"explain how this idea works";
 const b=(concept.learningObjectives||[])[1]||"apply it to a relevant example";
 return '<div class="concept-intuition"><p class="concept-intuition-question">A first orientation to '+escape(concept.title)+'</p>'+
  '<p>This concept enters the research work through '+escape(why)+
  '. A complete worked explanation has not yet been authored for this concept in the Atlas. Use the learning objectives above to identify exactly what should be explained before accepting an unfamiliar equation or term.</p>'+
  '<div class="concept-intuition-model"><strong>What to unpack</strong><p>'+
  escape(a)+' Then: '+escape(b)+
  '. Follow the necessary-background links and the public resources below for the underlying definitions, physical examples and derivations.</p></div>'+
  '<div class="concept-intuition-limits"><strong>What remains to be developed</strong><p>This short orientation is not a substitute for a concept-specific derivation or worked example. The longer, concrete lessons will be added in explicitly authored batches.</p></div></div>';
}
root.AtlasConceptInsight={render,load,NOTES,deepCount:()=>deepUnits.size};
})(typeof window!=="undefined"?window:globalThis);
