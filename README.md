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
- `curriculum/` contains the learning resources linked from concepts.

## Relationship model

Each concept keeps the original `prerequisites` array for compatibility. These are **necessary** dependencies for the learning objectives at the stated depth. `prerequisiteNotes` explains each necessary edge, identifies the applicable objective, and records whether it is an educational proposal or research-backed relationship.

`usefulConnections` contains optional context that can strengthen intuition or enable deeper investigation without blocking progression. The graph shows these as purple, arrow-free links only around the selected concept, while necessary pathways remain blue and directed. Domain filters and Neighborhood view keep the full curriculum navigable at scale.

The dependency classifications are independently authored curricular judgments. A paper appearing in `researchReferences` supports the concept's research relevance; it does not imply that the paper asserted the Atlas dependency.

## Add a concept

Add an object to the `concepts` array in `knowledge-graph/concepts.json`:

```json
{
  "id": "unique-slug",
  "title": "Concept title",
  "domain": "Astrophysics",
  "unit": "Unit name",
  "prerequisites": ["existing-concept-id"],
  "prerequisiteNotes": {
    "existing-concept-id": {
      "explanation": "Why this is required at the intended depth.",
      "appliesTo": "The specific learning objective.",
      "provenance": "proposed-educational-dependency"
    }
  },
  "usefulConnections": [
    {
      "conceptId": "context-concept-id",
      "explanation": "Why this adds useful context.",
      "appliesTo": "The objective or application it enriches.",
      "provenance": "proposed-educational-connection"
    }
  ],
  "learningObjectives": ["A measurable learning objective."],
  "masteryAssessment": "A short demonstration of mastery.",
  "researchApplication": "A concrete application.",
  "resource": "curriculum/path/to/resource.md"
}
```

The Atlas automatically creates the node, prerequisite arrows, search entry, dependent-concept navigation, domain filters, and detail panel. Every referenced ID must match another concept's `id`. Arrows point from the necessary prerequisite toward the concept it supports. Run `python3 scripts/validate_curriculum.py` after editing to check the schema, references, and necessary-pathway acyclicity.
