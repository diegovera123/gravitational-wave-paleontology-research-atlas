# 171-concept gravitational-wave paleontology coverage

The Atlas now has an explicit machine-checked coverage manifest at `knowledge-graph/gw-core-concepts.json` containing the exact 171 concepts requested for the gravitational-wave paleontology map.

At runtime, `gw-core-coverage.js` merges that manifest with the authored base curriculum before the Knowledge Graph is initialized. **41** requested labels reuse semantically equivalent existing Atlas concepts and are added as exact searchable aliases. **130** concepts that were genuinely absent are added as separate navigable orientation nodes, producing **263 live concepts** from the current 133-concept authored base. Each of the 171 requested entries resolves to a distinct canonical node.

The new nodes are grouped into explicit graph topics covering source dynamics and waveforms; detectors and observatories; Bayesian and population inference; cosmology and rates; stellar populations and remnants; binary interaction; dynamical environments; population synthesis; catalogs and computational inference; progenitor reconstruction and constraints; backgrounds and multimessenger observations; and cosmic archaeology.

## Important depth distinction

Coverage is not the same thing as a finished textbook chapter. The 130 newly generated nodes are marked `coverage-orientation`. They have an exact title, a navigable graph location, two learning objectives, an application to gravitational-wave paleontology, a public starting resource, and an explicit assessment prompt. They intentionally use the Atlas's existing short-orientation presentation until a concept-specific derivation, worked example, scientific visual, curated literature pathway and authored question set are written for that concept.

The existing 37 long-form explanations remain the deeper authored subset. This expansion therefore guarantees **breadth of the requested map without falsely claiming equivalent instructional depth across all 171 concepts**.

## Regression check

`scripts/test_core_concepts.mjs` verifies that:

- the manifest contains exactly 171 unique requested labels;
- every requested label resolves to its own canonical concept node;
- every resulting node is searchable by the exact requested wording;
- every non-macro requested concept has exactly one navigation location;
- generated concepts stay within the scientific domain of their containing macro;
- new orientation nodes explicitly identify their introductory status and limitations.

The check runs in GitHub Actions with the rest of the Atlas test suite.
