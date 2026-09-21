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

Schema version 4 stores every prerequisite as one object in a single, consistent collection:

```json
{ "id": "derivatives", "kind": "necessary", "note": "Required to calculate rates of change." }
```

**Necessary** prerequisites are required for an objective at the stated depth. They form the blue, directed learning paths. **Useful** prerequisites add context, intuition, or depth without blocking progress; they appear as quieter purple, arrow-free edges around the selected concept. Each edge carries its own rationale and may also name the objective and Atlas provenance.

The dependency classifications are independently authored curricular judgments. A paper appearing in `researchReferences` supports the concept's research relevance; it does not imply that the paper asserted the Atlas dependency.

## Containment, scale, and navigation

`parentId` records conceptual containment independently from prerequisites. A concept may belong to a broader topic without requiring that topic first. Parent links must remain within a domain and form a cycle-free forest; `null` identifies a domain-level topic. This separation prevents visual organization from changing the curriculum's learning dependencies.

- **Macro** concepts are broad regions and pathway anchors, rendered as the largest fixed nodes.
- **Meso** concepts are modules and substantial topics, rendered at medium size.
- **Micro** concepts are focused ideas or techniques, rendered as smaller nodes.

Navigation has three levels. **Global Overview** shows eight stable domain anchors. **Domain Exploration** shows that domain's macro/meso hierarchy, with Full detail available for micro concepts. **Concept Focus** shows the parent path, children, immediate typed relationships, and downstream directions; Expand depth adds one necessary-prerequisite level at a time. Parent and breadcrumb controls preserve location. Reset Camera frames the current level rather than returning to an unrelated view.

The layout is deterministic: global domains occupy a compact ring, topic anchors remain stable inside a domain region, and concept focus places prerequisites and downstream concepts on opposite sides of the selected node. The force simulation only provides local motion. If the optional label library fails, sphere nodes and hover labels still work.

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
  "parentId": "broader-topic-id",
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

The Atlas automatically creates hierarchy links, prerequisite arrows, search navigation, breadcrumbs, and details. Every referenced ID must match another concept's `id`. `parentId` must reference a concept in the same domain and must never be inferred from a prerequisite. Arrows point from a necessary prerequisite toward the concept it supports. Run `python3 scripts/validate_curriculum.py` after editing to check the schema, containment forest, references, and necessary-pathway acyclicity.

## Progressive navigation

The live explorer now uses `knowledge-graph/navigation.json` as its **explicit navigation containment index**. The initial 3D scene shows only 10 macro knowledge regions. Select one to reveal its curated topic groups; select a topic to reveal only its own concepts. The navigation strip beneath the 3D canvas gives equivalent keyboard-accessible labels, so unavailable optional 3D text does not hide the curriculum.

The navigation index covers every existing concept exactly once: 10 macro anchors have their own learning-unit buttons and 123 other concepts belong to exactly one of 36 topic groups. A concept's `scale` still describes its educational granularity, which is independent of its depth in the navigation UI. Macro topic groups are navigation containers, not invented scientific prerequisites.

Necessary/useful prerequisite links **do not imply containment**. Clicking a cross-domain prerequisite or a global search result opens its containing macro and topic automatically and shows its learning panel; *Previous concept* returns to the earlier location, while *Parent* goes up exactly one level. Existing schema-v4 `parentId` fields remain as legacy conceptual annotations but do not override the new curated navigation membership. Changes to concept IDs or the topic map should update `navigation.json` and pass `python3 scripts/validate_curriculum.py`.

The optional three-spritetext CDN was removed from the critical rendering path. The graph uses the library's default sphere nodes, hover labels, and an always-readable HTML concept/topic navigation strip.

To check changes locally, run `python3 scripts/validate_curriculum.py` and `node scripts/test_app.mjs`, then visually test the actual 3D canvas in a browser. The Node smoke test uses a mocked graph and cannot prove WebGL rendering.

## Research dashboard and exploratory questions

The landing page presents a **structured research dashboard**: knowledge-region cards, six curated research questions, and public introductory resources. The structured card map is the default navigation surface; the existing 3D constellation remains available via the *3D constellation* switch. Both views share the same explicit macro → topic → concept containment and cross-domain prerequisite navigation. Hiding the 3D view does not remove the graph or change its underlying scientific relationships.

The questions in \`knowledge-graph/research-questions.json\` are **independently authored educational prompts**, not a claim about Floor Broekgaarden's or any laboratory's current research agenda. Each question links to existing concept IDs and public background sources from \`research-sources.json\`. A question opens in the detail pane; selecting a linked concept jumps directly to its containing topic, with a *Back to research question* button. Do not add unpublished paper drafts, private recordings, or unapproved lab material to the public dashboard.

The reading room includes public links provided for onboarding: an introductory video, a public research overview, and COMPAS documentation. Verify video-specific timestamps and individual paper sections before advertising them as precise instructional annotations.

After changing research questions, run \`python3 scripts/validate_curriculum.py\`. Navigation logic and dashboard rendering have mocked-DOM checks in \`node scripts/test_app.mjs\`; test actual 3D/WebGL rendering and mobile responsiveness in a browser before presenting the prototype to others.
