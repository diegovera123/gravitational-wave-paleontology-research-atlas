/* Accessible, original educational schematics: NOT measured strains, real trajectories,
   calibrated probabilities or outputs from a numerical astrophysics simulation. */
(function(root){
"use strict";
const base=(label,description,shapes,footer)=>
 '<figure class="physics-figure"><svg viewBox="0 0 620 238" role="img" aria-label="'+label+'" xmlns="http://www.w3.org/2000/svg">'+
 '<title>'+label+'</title><desc>'+description+'</desc>'+
 '<defs><marker id="physics-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#b9c9ff"/></marker></defs>'+
 shapes+'</svg><figcaption><strong>Visual intuition.</strong> '+footer+
 ' <span>Illustrative diagram, not a measurement or numerical simulation.</span></figcaption></figure>';
const T=(x,y,label,extra="")=>'<text x="'+x+'" y="'+y+'" class="figure-label" '+extra+'>'+label+'</text>';
const L=(x1,y1,x2,y2,klass="",arrow=false)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" class="'+klass+'"'+
 (arrow?' marker-end="url(#physics-arrow)"':"")+'/>';
function wave(){
 let s='<circle cx="148" cy="120" r="57" class="figure-orbit"/><ellipse cx="445" cy="120" rx="81" ry="39" class="figure-wave-ring"/>'+
 L(233,120,339,120,"figure-link",true)+T(148,34,"Before the wave",'text-anchor="middle"')+
 T(445,34,"One phase of + polarization",'text-anchor="middle"');
 for(let i=0;i<8;i++){
  const a=2*Math.PI*i/8,x=148+57*Math.cos(a),y=120+57*Math.sin(a);
  const xx=445+81*Math.cos(a),yy=120+39*Math.sin(a);
  s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="4" class="figure-particle"/>'+
     '<circle cx="'+xx.toFixed(1)+'" cy="'+yy.toFixed(1)+'" r="4" class="figure-particle"/>';
 }
 s+=T(148,210,"Circular test-mass ring",'text-anchor="middle"')+T(445,210,"Stretched x, squeezed y",'text-anchor="middle"');
 return base("Idealized ring of freely falling test masses before and during a plus-polarized gravitational wave",
 "Two groups of eight free masses, circular before the wave and elliptical during one phase of a weak plus-polarized wave in a suitable detector frame.",
 s,"A passing + polarized wave creates opposite changes along two transverse directions. The distortion reverses half a cycle later.");
}
function kick(){
 const shape='<ellipse cx="151" cy="117" rx="116" ry="66" class="figure-orbit"/>'+
 '<circle cx="151" cy="117" r="13" class="figure-star"/><circle cx="267" cy="117" r="8" class="figure-remnant"/>'+
 L(267,117,267,51,"figure-velocity",true)+L(267,117,358,117,"figure-kick",true)+
 L(267,117,358,51,"figure-result",true)+
 T(178,36,"Before collapse")+T(264,45,"v")+
 T(314,105,"kick w")+
 T(372,58,"v + w")+
 L(389,111,451,111,"figure-link",true)+
 '<rect x="454" y="70" width="150" height="103" rx="12" class="figure-panel"/>'+
 T(465,95,"New mass M′")+T(465,119,"New separation r")+T(465,143,"New relative speed |v′|")+
 T(150,215,"The kick is a vector, not just a magnitude",'text-anchor="middle"');
 return base("A directional kick changes relative orbital velocity at the moment of core collapse",
 "A remnant on an illustrative orbit has an initial tangent velocity, a horizontal kick and their diagonal vector sum. The new total mass, separation and relative speed feed the post-event binding calculation.",
 shape,"Add the kick vector to the relevant stellar velocity, then determine survival from the new relative orbital energy.");
}
function chirp(){
 let d="",p=0;for(let i=0;i<=240;i++){const t=i/240,x=38+544*t;
 const phase=2*Math.PI*(2*t+10*t*t),envelope=9+43*t*t,y=116-envelope*Math.sin(phase);
 d+=(i?" L ":"M ")+x.toFixed(2)+" "+y.toFixed(2);p=x;}
 const s=L(38,116,585,116,"figure-axis")+L(38,185,585,185,"figure-axis",true)+
 '<path d="'+d+'" class="figure-waveform"/>'+T(38,30,"Earlier inspiral")+T(500,30,"Later inspiral")+
 T(38,209,"Time →")+T(43,101,"h")+
 T(305,225,"Cycles become closer together; strain envelope grows",'text-anchor="middle"');
 return base("Schematic inspiral waveform with increasing frequency and amplitude",
 "An invented illustrative oscillating trace whose cycles become closer and amplitude larger toward the right; axes have no measured units or numerical source parameters.",
 s,"Orbital energy loss tightens a quasi-circular compact binary, increasing the dominant wave frequency. Real strain depends on mass, orientation, distance and the detector.");
}
function selection(){
 let shapes=T(40,30,"Intrinsic: equal classes")+T(349,30,"Detected sample")+
 L(274,120,339,120,"figure-link",true);
 for(let i=0;i<10;i++){
  const x=54+(i%5)*39,y=77+Math.floor(i/5)*61;
  shapes+='<circle cx="'+x+'" cy="'+y+'" r="11" class="'+(i<5?"figure-class-a":"figure-class-b")+'"/>';
 }
 for(let i=0;i<5;i++) shapes+='<circle cx="'+(366+i*43)+'" cy="78" r="11" class="figure-class-a"/>';
 shapes+='<circle cx="366" cy="139" r="11" class="figure-class-b"/>'+
 T(54,197,"5 of A / 5 of B")+T(359,197,"5 of A / 1 of B")+
 T(292,92,"p(det|θ)",'text-anchor="middle"');
 return base("How detection filtering changes the apparent composition of a source population",
 "A deliberately illustrative display shows equal numbers of two intrinsic classes, then five class A detections and one class B detection after different detection probabilities.",
 shapes,"A catalog can overrepresent an easier-to-detect class even when both classes occur equally often in the underlying population.");
}
function transfer(){
 const s='<ellipse cx="179" cy="121" rx="142" ry="94" class="figure-lobe"/>'+
 '<ellipse cx="440" cy="121" rx="119" ry="79" class="figure-lobe"/>'+
 '<circle cx="176" cy="121" r="72" class="figure-star"/>'+
 '<circle cx="442" cy="121" r="34" class="figure-remnant"/>'+
 L(250,121,394,121,"figure-flow",true)+
 T(171,28,"Expanding donor",'text-anchor="middle"')+
 T(442,28,"Accretor",'text-anchor="middle"')+
 T(290,97,"Gas flows",'text-anchor="middle"')+
 T(290,210,"Schematic Roche boundaries",'text-anchor="middle"');
 return base("Two stars with illustrative Roche regions and matter flowing toward the companion",
 "A larger donor fills an illustrative dashed Roche boundary and a stream of gas flows toward a smaller companion. The boundaries are schematic and not an accurately computed equipotential.",
 s,"Overflow begins when the donor fills its Roche-lobe boundary. The donor's structural response and orbital evolution determine whether transfer remains stable.");
}
function synthesis(){
 const rows=[
 {x:16,y:78,w:125,text:"Sample birth binaries"},
 {x:182,y:44,w:143,text:"Evolve stellar physics"},
 {x:182,y:130,w:143,text:"Disruption / merger"},
 {x:365,y:44,w:119,text:"Compact binaries"},
 {x:511,y:44,w:95,text:"Detectability"}
 ];
 let s=T(17,25,"One simulated population, many possible histories")+
 L(141,109,181,74,"figure-link",true)+L(141,109,181,157,"figure-link",true)+
 L(326,71,364,71,"figure-link",true)+L(485,71,510,71,"figure-link",true);
 for(const r of rows)s+='<rect x="'+r.x+'" y="'+r.y+'" width="'+r.w+'" height="55" rx="10" class="figure-panel"/>'+
 T(r.x+r.w/2,r.y+24,r.text.split(" ").slice(0,2).join(" "),'text-anchor="middle"')+
 T(r.x+r.w/2,r.y+40,r.text.split(" ").slice(2).join(" "),'text-anchor="middle"');
 s+=T(318,225,"Track distinct systems, weights, delays and selection",'text-anchor="middle"');
 return base("An example branching workflow in binary population synthesis",
 "A model samples newborn binaries, evolves them according to stated prescriptions, tracks possible disruption or merger, and subjects surviving merging compact systems to detection selection.",
 s,"Each system follows its own modeled history; event-log rows are not independent births, and a surviving pair is not necessarily an observable merger.");
}
function cosmic(){
 const s=L(48,134,578,134,"figure-axis",true)+
 '<circle cx="88" cy="134" r="11" class="figure-class-a"/>'+
 '<circle cx="326" cy="134" r="11" class="figure-class-b"/>'+
 '<circle cx="533" cy="134" r="11" class="figure-remnant"/>'+
 T(88,83,"Stars form",'text-anchor="middle"')+T(326,83,"Compact merger",'text-anchor="middle"')+
 T(533,83,"Wave reaches detector",'text-anchor="middle"')+
 T(207,165,"formation-to-merger delay",'text-anchor="middle"')+
 T(428,165,"propagation",'text-anchor="middle"')+
 T(50,212,"Cosmic time →");
 return base("Illustrative timeline from stellar birth through compact-binary merger to observation",
 "Three milestones along cosmic time: birth of the progenitor stars, coalescence after a modeled delay and arrival of emitted radiation at a distant detector.",
 s,"The intrinsic merger-rate history depends on progenitor birth epochs and delay times; cosmological propagation and detector selection enter the observed count.");
}
const figures={wave,kick,chirp,selection,transfer,pipeline:synthesis,binary:synthesis,cosmic};
function render(kind){return (figures[kind]||synthesis)();}
root.AtlasScientificFigures={render,figures};
})(typeof window!=="undefined"?window:globalThis);
