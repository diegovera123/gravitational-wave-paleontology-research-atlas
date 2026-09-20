# Gravitational-Wave Paleontology Research Atlas

An open, interconnected curriculum and immersive 3D knowledge graph for gravitational-wave astrophysics.

## Run locally

The Atlas is a static site, so it remains compatible with GitHub Pages. Because the curriculum is loaded with `fetch`, serve the repository instead of opening `index.html` directly:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Architecture

- `index.html` contains the accessible page structure and loads the graph library from a pinned CDN version.
- `style.css` defines the responsive visual system, graph workspace, search, and concept-detail presentation.
- `app.js` transforms the curriculum into graph nodes and directed prerequisite links, controls the 3D camera, and renders search and detail interactions.
- `knowledge-graph/concepts.json` is the curriculum's source of truth. The interface is generated from this file rather than hard-coded concept markup.
- `curriculum/` contains the learning resources linked from concepts.

## Add a concept

Add an object to the `concepts` array in `knowledge-graph/concepts.json`:

```json
{
  "id": "unique-slug",
  "title": "Concept title",
  "domain": "Astrophysics",
  "unit": "Unit name",
  "prerequisites": ["existing-concept-id"],
  "learningObjectives": ["A measurable learning objective."],
  "masteryAssessment": "A short demonstration of mastery.",
  "resource": "curriculum/path/to/resource.md"
}
```

The Atlas automatically creates the node, prerequisite arrows, search entry, dependent-concept navigation, domain legend, and detail panel. A prerequisite ID must match another concept's `id`. Arrows point from the prerequisite toward the concept it supports.
