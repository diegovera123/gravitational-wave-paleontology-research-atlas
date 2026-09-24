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

function orbitalEnergy(){
 const shape='<ellipse cx="301" cy="113" rx="234" ry="72" class="figure-orbit"/>'+
 '<circle cx="78" cy="113" r="10" class="figure-star"/>'+
 '<circle cx="67" cy="113" r="7" class="figure-remnant"/>'+
 '<circle cx="535" cy="113" r="7" class="figure-remnant"/>'+
 L(67,113,535,113,"figure-axis")+L(301,113,301,185,"figure-axis")+
 T(301,33,"Semi-major axis a = (r_peri + r_apo)/2",'text-anchor="middle"')+
 T(67,96,"Pericentre",'text-anchor="start"')+
 T(535,96,"Apocentre",'text-anchor="end"')+
 T(301,218,"At fixed masses and a: E = −G m₁ m₂ / (2a)",'text-anchor="middle"');
 return base("An elliptical Newtonian binary orbit with pericentre, apocentre and semi-major axis",
 "Schematic ellipse with a focus at a star and marked pericentre and apocentre. The orbital energy is determined by semi-major axis for fixed Newtonian point masses.",
 shape,"The two stars orbit their center of mass; this drawing uses a simplified focus picture for relative motion. Equal semi-major axes imply equal Keplerian energy at fixed component masses.");
}
function detector(){
 const s='<rect x="247" y="98" width="30" height="30" rx="5" class="figure-panel"/>'+
 L(262,113,262,39,"figure-velocity")+L(262,113,464,113,"figure-velocity")+
 '<rect x="249" y="28" width="26" height="10" rx="3" class="figure-panel"/>'+
 '<rect x="463" y="101" width="10" height="25" rx="3" class="figure-panel"/>'+
 '<path d="M 228 140 L 260 140 L 260 127" class="figure-flow"/>'+
 T(262,20,"Arm Y",'text-anchor="middle"')+T(468,92,"Arm X",'text-anchor="end"')+
 T(154,156,"Laser + readout",'text-anchor="middle"')+
 T(330,182,"Compare returning light phases",'text-anchor="middle"')+
 T(262,219,"Differential optical path responds to projected strain",'text-anchor="middle"');
 return base("Simplified two-arm laser interferometer with differential optical phase readout",
 "A laser readout connects to a central beam splitter; two perpendicular light paths terminate at suspended test masses and recombine for differential measurement.",
 s,"The interferometer measures a calibrated differential response. Antenna orientation, storage time and frequency-dependent transfer functions are not represented here.");
}
function wind(){
 let s='<circle cx="205" cy="119" r="52" class="figure-star"/>';
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4,x1=205+60*Math.cos(a),y1=119+60*Math.sin(a),x2=205+96*Math.cos(a),y2=119+96*Math.sin(a);
  s+=L(x1.toFixed(1),y1.toFixed(1),x2.toFixed(1),y2.toFixed(1),"figure-flow",true);
 }
 s+=T(205,124,"Hot star",'text-anchor="middle"')+
 '<rect x="385" y="63" width="205" height="116" rx="12" class="figure-panel"/>'+
 T(401,90,"Photon momentum → ions")+T(401,117,"Outflow carries mass away")+T(401,145,"Ṁ_loss = −dM_star/dt")+
 T(205,225,"Schematic line-driven outflow",'text-anchor="middle"');
 return base("Line-driven stellar wind schematic with radiation transferring momentum to atmospheric matter",
 "A hot luminous star is surrounded by outward arrows representing radiatively driven mass loss; a note shows the positive loss-rate convention.",
 s,"Atmospheric spectral-line interactions can accelerate outflow. This is not a wind hydrodynamics solution or a universal metallicity scaling.");
}
function weights(){
 let s=T(22,25,"Two distinct simulated systems: one outcome each");
 for(const [i,y,weight,success] of [[0,74,1,true],[1,143,9,false]]){
  s+='<circle cx="44" cy="'+y+'" r="10" class="'+(success?"figure-class-a":"figure-class-b")+'"/>'+
   T(64,y+4,"System "+(i+1)+(success?" · success":" · no success"))+
   '<rect x="296" y="'+(y-10)+'" width="'+(weight*26)+'" height="20" rx="5" class="'+(success?"figure-class-a":"figure-class-b")+'"/>'+
   T(545,y+4,"w = "+weight,'text-anchor="end"');
 }
 s+=T(305,207,"Raw success: 1/2 · weighted success: 1/10",'text-anchor="middle"');
 return base("Why sampling weights change a population summary",
 "Two simulated systems have equal raw sample frequency but population weights one and nine. The successful system has weight one; the weighted fraction is one tenth.",
 s,"A raw count of distinct sampled systems and a target-population weighted fraction answer different questions; neither alone defines a merger rate.");
}
function bayesian(){
 let s=T(55,30,"Prior for A: 0.20")+T(340,30,"Posterior for A: 0.43")+
 '<rect x="55" y="60" width="84" height="94" rx="5" class="figure-class-a"/>'+
 '<rect x="340" y="60" width="180" height="94" rx="5" class="figure-class-a"/>'+
 T(55,188,"Likelihood ratio A:B = 3:1")+
 L(160,107,306,107,"figure-link",true)+
 T(310,219,"Posterior depends on both prior and likelihood",'text-anchor="middle"');
 return base("A discrete Bayesian update from prior to posterior probability for one hypothesis",
 "An illustrative two-hypothesis example: A has prior 0.2; evidence three times as likely under A as under B increases its posterior to approximately 0.429.",
 s,"Bayes' theorem updates a stated hypothesis model. The bar areas are qualitative indicators of a numerical toy example, not measured astrophysical probabilities.");
}


function imf(){
 let curve="";for(let i=0;i<=120;i++){const m=1+9*i/120,x=74+470*i/120,y=184-143*Math.pow(m,-1.8);curve+=(i?" L":"M")+x.toFixed(1)+" "+y.toFixed(1);}
 const shapes=L(74,35,74,184,"figure-axis")+L(74,184,550,184,"figure-axis",true)+
 '<path d="'+curve+'" class="figure-waveform"/>'+
 T(80,28,"Number density (arbitrary units)")+T(366,216,"Initial stellar mass →")+
 T(89,200,"lower mass")+T(473,200,"higher mass")+
 T(220,66,"p(m) ∝ m^(−α)");
 return base("Illustrative declining stellar initial-mass probability density across a limited mass interval",
 "A descending power-law-shaped curve plots toy number density versus initial stellar mass, with more low-mass stars per unit mass interval. Axes have no empirical survey units.",
 shapes,"An IMF is a birth-number density, not a distribution of detected mergers. Normalize it over the chosen mass interval and distinguish number-weighted from mass-weighted fractions.");
}
function collapse(){
 const shapes='<circle cx="92" cy="119" r="49" class="figure-star"/>'+
 L(148,119,205,119,"figure-link",true)+
 '<circle cx="259" cy="119" r="24" class="figure-remnant"/>'+
 '<circle cx="259" cy="119" r="43" class="figure-orbit"/>'+
 L(305,119,368,119,"figure-link",true)+
 '<rect x="380" y="70" width="205" height="99" rx="12" class="figure-panel"/>'+
 T(92,191,"Evolved core",'text-anchor="middle"')+
 T(259,190,"Core collapse",'text-anchor="middle"')+
 T(483,96,"Possible outcomes",'text-anchor="middle"')+
 T(395,123,"• Neutron-star remnant")+T(395,146,"• Black hole / fallback")+
 T(105,33,"Support changes → rapid contraction");
 return base("Conceptual progression from an evolved massive stellar core to compact-remnant alternatives",
 "A large stellar core contracts to a smaller high-density object, with divergent final outcomes marked as model-dependent neutron-star or black-hole possibilities.",
 shapes,"Collapse, bounce, explosion and fallback need detailed physical calculations. The diagram does not imply every core explodes or each initial mass maps uniquely to one remnant type.");
}
function quadrupole(){
 const shapes='<ellipse cx="155" cy="115" rx="82" ry="60" class="figure-orbit"/>'+
 '<circle cx="237" cy="115" r="12" class="figure-star"/><circle cx="73" cy="115" r="10" class="figure-remnant"/>'+
 L(259,115,354,115,"figure-link",true)+
 '<ellipse cx="466" cy="115" rx="50" ry="78" class="figure-wave-ring"/>'+
 '<circle cx="466" cy="37" r="11" class="figure-star"/>'+
 '<circle cx="466" cy="193" r="10" class="figure-remnant"/>'+
 T(155,27,"Orientation at t",'text-anchor="middle"')+
 T(466,22,"After half an orbit",'text-anchor="middle"')+
 T(310,218,"Quadrupole repeats: f_GW ≈ 2 f_orb",'text-anchor="middle"');
 return base("Two opposite binary orientations that repeat the mass-quadrupole pattern after half an orbit",
 "Two binary-orbit orientations show a horizontal pair followed by a vertically separated pair; the mass quadrupole's rotation yields a leading double-orbital-frequency wave.",
 shapes,"This schematic is about the leading quadrupole time dependence, not identical mass positions after half an orbit. Higher harmonics and eccentric orbits need additional modeling.");
}
function spacetime(){
 const shapes=L(65,177,553,177,"figure-axis",true)+L(65,177,65,29,"figure-axis",true)+
 L(93,163,490,47,"figure-result",true)+
 '<path d="M93 163 Q262 57 490 47" class="figure-flow"/>'+
 T(69,23,"ct ↑")+T(510,201,"x →")+
 T(296,40,"Two timelike paths between events",'text-anchor="middle"')+
 '<circle cx="93" cy="163" r="5" class="figure-particle"/><circle cx="490" cy="47" r="5" class="figure-particle"/>'+
 T(105,151,"A")+T(476,35,"B")+
 T(309,222,"Clock time = integral of proper time along a path",'text-anchor="middle"');
 return base("Two illustrative worldlines joining the same spacetime events",
 "A spacetime coordinate diagram shows two distinct timelike paths between events A and B, whose accumulated proper times can differ even when endpoints agree.",
 shapes,"Coordinate paths are illustrative; proper time is computed with a specified metric, not by visually measuring the Euclidean drawn line length.");
}
function metallicity(){
 const shapes='<rect x="31" y="58" width="258" height="133" rx="11" class="figure-panel"/>'+
 '<rect x="330" y="58" width="258" height="133" rx="11" class="figure-panel"/>'+
 T(45,43,"Birth cohort A")+T(345,43,"Birth cohort B")+
 '<rect x="47" y="87" width="202" height="24" rx="4" class="figure-class-a"/>'+
 '<rect x="47" y="126" width="40" height="24" rx="4" class="figure-class-b"/>'+
 '<rect x="346" y="87" width="72" height="24" rx="4" class="figure-class-a"/>'+
 '<rect x="346" y="126" width="170" height="24" rx="4" class="figure-class-b"/>'+
 T(49,176,"More low-Z births")+T(348,176,"More high-Z births")+
 T(310,224,"Equal total star formation ≠ equal metal distribution",'text-anchor="middle"');
 return base("Two hypothetical stellar birth cohorts with different low- and high-metallicity mixtures",
 "Two birth populations have illustrative opposite metallicity mixtures even if they contain the same total formed stellar mass.",
 shapes,"Merger production depends on how each metallicity bin is weighted by its conditional binary-formation yield and the distribution of delays.");
}
function cluster(){
 let s='<circle cx="153" cy="111" r="83" class="figure-orbit"/>';
 for(const [x,y] of [[113,65],[190,62],[99,120],[167,157],[200,130],[150,100],[116,166],[214,91]])s+='<circle cx="'+x+'" cy="'+y+'" r="7" class="figure-particle"/>';
 s+=L(244,113,351,113,"figure-link",true)+
 '<ellipse cx="465" cy="113" rx="86" ry="46" class="figure-orbit"/>'+
 '<circle cx="382" cy="113" r="12" class="figure-remnant"/>'+
 '<circle cx="548" cy="113" r="11" class="figure-remnant"/>'+
 T(153,24,"Dense cluster",'text-anchor="middle"')+
 T(466,43,"Reconfigured binary",'text-anchor="middle"')+
 T(309,220,"Close encounters can exchange partners and orbital energy",'text-anchor="middle"');
 return base("Dense stellar environment with encounters that can reconfigure compact-object binaries",
 "Several objects in a schematic cluster lead to a later compact binary assembled or hardened through interactions; the illustration does not simulate encounter probabilities.",
 s,"Dynamical formation depends on encounter rates and multi-body energy exchange; a merger waveform alone rarely identifies a unique historical encounter sequence.");
}
function sampling(){
 const shapes=L(49,181,574,181,"figure-axis",true)+L(49,181,49,29,"figure-axis",true)+
 '<path d="M49 163 L165 161 L165 45 L330 44 L330 146 L460 144 L460 79 L569 78" class="figure-waveform"/>'+
 '<circle cx="49" cy="163" r="5" class="figure-particle"/>'+
 '<circle cx="165" cy="45" r="5" class="figure-particle"/>'+
 '<circle cx="330" cy="146" r="5" class="figure-particle"/>'+
 '<circle cx="460" cy="79" r="5" class="figure-particle"/>'+
 T(61,23,"Rapid transitions can fall between stored samples")+
 T(57,217,"Time →")+
 T(310,198,"Only selected event snapshots shown",'text-anchor="middle"');
 return base("An illustrative rapidly changing state sampled at sparse times",
 "A schematic state history has rapid transitions between a few marked output snapshots, showing why evenly spaced records can fail to capture events.",
 shapes,"Interpolating sparse stored points cannot recover an unrecorded supernova, mass-transfer onset or short-lived orbital transition.");
}

const figures={wave,kick,chirp,selection,transfer,pipeline:synthesis,binary:synthesis,cosmic,orbitalEnergy,detector,wind,weights,bayesian,imf,collapse,quadrupole,spacetime,metallicity,cluster,sampling};
function render(kind){return (figures[kind]||synthesis)();}
root.AtlasScientificFigures={render,figures};
})(typeof window!=="undefined"?window:globalThis);
