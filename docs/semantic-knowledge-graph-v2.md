# Semantic Knowledge Graph navigation v2

The public Knowledge Graph is designed around a simple rule: **complexity should be travelled through, not decoded all at once**.

## Navigation model

The visible graph uses progressive semantic zoom:

1. **Field overview** — five large scientific landmarks.
2. **Research region** — the major scientific areas inside that landmark.
3. **Topic** — a curated collection of related concepts.
4. **Concept neighbourhood** — one selected concept in the center, with only its immediate scientific relationships visible.
5. **Full reader** — opened explicitly from the context panel when the learner wants the long explanation.

The graph therefore never asks a learner to interpret hundreds of equally salient nodes at once. The exact 171-concept gravitational-wave paleontology coverage manifest is expanded into the live graph, but only a small relevant slice is visible at any one time.

## Orientation and wayfinding

A persistent breadcrumb records the current path through the Atlas. Search is navigational: choosing a result moves the graph to the concept's actual topic and enters focused-neighbourhood mode. The overview choices are presented as large scientific landmarks with short descriptions and child counts rather than as anonymous dots.

A compact structural minimap shows the nodes in the current level or neighbourhood. Camera controls support zoom in/out, fit-current-scene, and center-selected. The existing 3D canvas remains rotatable, but the hierarchy and accessible buttons do not require WebGL.

## Focused neighbourhoods

Selecting a concept no longer immediately opens the long reading drawer. Instead, the canvas reorganizes around that concept and displays at most twelve immediate neighbours. A side context panel shows:

- why the concept matters;
- its current scientific location;
- prerequisite/downstream/typed-link counts;
- immediate related concepts and relationship types;
- explicit actions to **Learn this concept**, **Practice**, or return to the whole topic.

The full continuous reader remains unchanged in principle: objectives first, mechanism-led explanation, connections, and research resources last. It opens only after the learner asks for it.

## Typed relationships

The graph distinguishes hierarchy from science. Containment is used only for navigating the curriculum structure. Scientific links use explicit types:

- **Prerequisite**
- **Physical influence / causal**
- **Application**
- **Useful context**

The toolbar lets the learner hide or show scientific relationship types. In focused-neighbourhood mode, disabling a relationship type removes those links and neighbours from the current scene rather than merely recoloring them.

No edge is presented as learner mastery, empirical causality, or scientific certainty merely because two concepts share a topic.

## Exact core coverage

The existing `knowledge-graph/gw-core-concepts.json` manifest is now progressively expanded by the live constellation itself. Semantically equivalent requested labels remain aliases of existing authored concepts. Missing requested concepts become clearly marked introductory orientation nodes in generated topics. This keeps the exact 171-item coverage searchable and navigable while preserving the distinction between a coverage orientation and a fully authored deep explanation.

## Verification limits

`tests/test_constellation.mjs` now checks semantic zoom, 263 live concepts after core expansion, search, breadcrumbs, focused-neighbourhood size, typed filters, the context-before-reader interaction, Practice routing, and the non-WebGL fallback.

These DOM/logic tests are not a substitute for real-browser visual inspection, 3D camera feel, mobile layout checks, keyboard/screen-reader testing, or astrophysics review of relationship data.