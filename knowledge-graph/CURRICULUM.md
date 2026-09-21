# Curriculum design and evidence policy

## Scope

The Atlas contains 133 concepts spanning eight connected domains: mathematical foundations, orbital mechanics, stellar astrophysics, binary stellar evolution, general relativity and gravitational waves, scientific computing, population synthesis/paleontology, and research practice. It is an independently authored educational map, not an official VIMES, Rakiura, COMPAS, or collaboration product.

The main pathway progresses from quantitative foundations through isolated binary dynamics, massive-star and interacting-binary evolution, compact-object formation, gravitational-wave sources, population synthesis, selection-aware inference, and gravitational-wave paleontology. Parallel computing concepts join this path at numerical evolution, population post-processing, and visualization.

## Necessary versus useful

A **necessary** edge means that the source concept is required to meet at least one named learning objective at the target concept's intended depth. It is stored in `prerequisites` as `{ id, kind: "necessary", note }`, with optional objective and provenance metadata. Necessary edges form the directed learning pathways and are validated as an acyclic graph.

A **useful** edge supplies intuition, context, comparison, or a route to deeper study without blocking the target objective. It uses the same `prerequisites` collection with `kind: "useful"`. For example, the general three-body problem contextualizes limitations of an isolated Newtonian two-body model but is not required to solve that model.

## Concept scale and research practice

`scale` distinguishes broad **macro** regions, **meso** modules, and focused **micro** techniques. Stable macro anchors organize each domain spatially; Overview mode suppresses micro nodes, while Full detail and Neighborhood make them available on demand.

The Research Practice region makes the transition from learning to contribution explicit. Its pathway covers finding and reading literature, formulating questions, mapping knowledge, building computational workflows, reproducing results, analyzing evidence, validating assumptions, writing, presenting, and ethical open practice. Connections to population synthesis, inference, visualization, and paleontology are useful relationships rather than artificial technical blockers.

Dependencies marked `proposed-educational-dependency` or `proposed-educational-connection` are curricular judgments by the Atlas, not claims made by cited authors. `researchReferences` separately records which literature motivated or supports a concept's research relevance. Indirect dependencies are not copied transitively into a concept.

## Literature alignment

Bibliographic records and concept mappings live in `research-sources.json`. Where a stable public article or documentation landing page is known, it is recorded. The environment used for this revision could not access external full texts, so the Atlas avoids unverified section or equation numbers. The one specific locator recorded is Figure 1 of Abbott et al. (2016), whose waveform presentation directly supports the GW150914 and waveform concepts. Entries described as forthcoming or unavailable contain no invented URL or locator.

The source mapping is intentionally conservative:

- Marchant & Bodensteiner motivates massive-binary interaction, tides, Roche geometry, transfer, common envelopes, and compact-binary pathways.
- Ekström motivates massive-star evolution, metallicity-dependent outcomes, core collapse, and final fates.
- Vink motivates massive-star mass loss and line-driven winds.
- Han et al. and Breivik motivate population-synthesis inputs, prescriptions, Monte Carlo populations, and compact-source predictions.
- Abbott et al. supports the observational pathway from waveforms and detectors to GW150914.
- Mandel & Broekgaarden motivates delay times, formation efficiencies, cosmic histories, rates, selection effects, and population interpretation.
- Public COMPAS documentation supports simulation-output and post-processing skills.

These mappings are topic-level unless `verificationNote` gives a narrower locator. Contributors should add section, figure, or equation locators only after verifying the public full text.

## VIMES educational pathway

The VIMES-aligned pathway connects:

1. Keplerian orbits, separation, eccentricity, and binary orbital evolution.
2. Stellar structure, massive-star evolution, mass loss, and compact-remnant formation.
3. Roche geometry, mass transfer, common-envelope evolution, natal kicks, and disruption.
4. Binary population synthesis and structured simulation outputs.
5. interpolation, temporal sampling, scientific visualization, and scientific animation.
6. A culminating simulated binary-evolution visualization assessment that requires learners to distinguish simulated states from interpolated presentation.

Only the author/title and topics supplied for the educational brief are recorded. No private link, unpublished text, figure, result, or equation is included.

## Validation and maintenance

Run:

```bash
python3 scripts/validate_curriculum.py
```

The validator checks schema version 3, required fields, valid scales and relationship kinds, unique concept IDs, resolved necessary and useful references, valid research-source IDs, relationship notes, and absence of cycles among necessary prerequisites. Useful links are intentionally excluded from progression-cycle checks.
