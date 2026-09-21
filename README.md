# Gravitational-Wave Paleontology Research Atlas

An open, interconnected curriculum and immersive 3D knowledge graph for gravitational-wave astrophysics.

## Run locally

The Atlas is a static site, so it remains compatible with GitHub Pages. Because the curriculum is loaded with `fetch`, serve the repository instead of opening `index.html` directly:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Architecture

- `index.html` contains the accessible page structure and loads pinned versions of the graph and 3D-label libraries.
- `style.css` defines the responsive visual system, graph workspace, search, and concept-detail presentation.
- `app.js` transforms the curriculum into graph nodes and directed prerequisite links, controls the 3D camera, and renders search and detail interactions.
- `knowledge-graph/concepts.json` is the curriculum's source of truth. The interface is generated from this file rather than hard-coded concept markup.
- `knowledge-graph/research-sources.json` records literature alignment separately from independently proposed educational dependencies.
- `scripts/validate_curriculum.py` validates schema and graph integrity; `scripts/test_app.mjs` exercises graph initialization and concept selection with lightweight browser/WebGL stubs.
- `curriculum/` contains the learning resources linked from concepts.

## Relationship model

Schema version 3 stores every prerequisite as one object in a single, consistent collection:

```json
{ "id": "derivatives", "kind": "necessary", "note": "Required to calculate rates of change." }
```

**Necessary** prerequisites are required for an objective at the stated depth. They form the blue, directed learning paths. **Useful** prerequisites add context, intuition, or depth without blocking progress; they appear as quieter purple, arrow-free edges around the selected concept. Each edge carries its own rationale and may also name the objective and Atlas provenance.

The dependency classifications are independently authored curricular judgments. A paper appearing in `researchReferences` supports the concept's research relevance; it does not imply that the paper asserted the Atlas dependency.

## Concept scale and map modes

- **Macro** concepts are broad regions and pathway anchors, rendered as the largest fixed nodes.
- **Meso** concepts are modules and substantial topics, rendered at medium size.
- **Micro** concepts are focused ideas or techniques, rendered as smaller nodes.

Overview mode shows macro and meso structure by default. Full detail reveals micro concepts; Neighborhood isolates the selected concept's immediate incoming and outgoing relationships. Domain anchors are positioned in stable constellation regions, while the force simulation keeps local pathways alive. If the optional label library fails, sphere nodes and hover labels still work.

The **Research Practice** domain connects literature search, paper reading, research questions, concept mapping, computational workflow, reproduction, analysis, validation, writing, presentation, and responsible open science to the technical curriculum.

## Add a concept

Add an object to the `concepts` array in `knowledge-graph/concepts.json`:

```json
{
  "id": "unique-slug",
  "title": "Concept title",
  "domain": "Astrophysics",
  "unit": "Unit name",
  "scale": "meso",
  "prerequisites": [
    {
      "id": "existing-concept-id",
      "kind": "necessary",
      "note": "Why this is required at the intended depth.",
      "appliesTo": "The specific learning objective.",
      "provenance": "proposed-educational-dependency"
    }
  ],
  "learningObjectives": ["A measurable learning objective."],
  "masteryAssessment": "A short demonstration of mastery.",
  "whyItMatters": "Why a learner or researcher should care.",
  "researchApplication": "A concrete application.",
  "resource": "curriculum/path/to/resource.md",
  "tags": ["optional-search-term"]
}
```

Useful prerequisites use the same collection:

```json
"prerequisites": [
    {
      "id": "context-concept-id",
      "kind": "useful",
      "note": "Why this adds useful context.",
      "appliesTo": "The objective or application it enriches.",
      "provenance": "proposed-educational-connection"
    }
]
```

The Atlas automatically creates the node, prerequisite arrows, search entry, dependent-concept navigation, domain filters, and detail panel. Every referenced ID must match another concept's `id`. Arrows point from the necessary prerequisite toward the concept it supports. Run `python3 scripts/validate_curriculum.py` after editing to check the schema, references, and necessary-pathway acyclicity.
