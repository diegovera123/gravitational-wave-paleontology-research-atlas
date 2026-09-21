# Curriculum design and evidence policy

## Scope

The Atlas contains 116 concepts spanning seven connected domains: mathematical foundations, orbital mechanics, stellar astrophysics, binary stellar evolution, general relativity and gravitational waves, scientific computing, and population synthesis/paleontology. It is an independently authored educational map, not an official VIMES, Rakiura, COMPAS, or collaboration product.

The main pathway progresses from quantitative foundations through isolated binary dynamics, massive-star and interacting-binary evolution, compact-object formation, gravitational-wave sources, population synthesis, selection-aware inference, and gravitational-wave paleontology. Parallel computing concepts join this path at numerical evolution, population post-processing, and visualization.

## Necessary versus useful

A **necessary** edge means that the source concept is required to meet at least one named learning objective at the target concept's intended depth. It is stored in `prerequisites`; its explanation, applicable objective, and provenance are stored in `prerequisiteNotes`. Necessary edges form the directed learning pathways and are validated as an acyclic graph.

A **useful** edge supplies intuition, context, comparison, or a route to deeper study without blocking the target objective. It is stored as a structured object in `usefulConnections`. For example, the general three-body problem contextualizes limitations of an isolated Newtonian two-body model but is not required to solve that model.

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

The validator checks required fields, unique concept IDs, resolved necessary and useful references, matching prerequisite notes, valid research-source IDs, relationship explanations, provenance labels, and absence of cycles among necessary prerequisites. Useful links are intentionally excluded from progression-cycle checks.
