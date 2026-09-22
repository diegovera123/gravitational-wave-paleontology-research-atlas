# Gravitational-Wave Paleontology Research Atlas

> **Current experience (September 2026): One-field gravitational-wave paleontology journey.** This is NOT a general choose-your-subject Atlas. The active homepage now begins with one field, explains its central research question, and progressively reveals **five connected parts → existing curriculum topics → individual concepts**, with the original typed prerequisites and actual available practice. The optional diagnostic also has **one field-wide starting goal**, not a list of ten competing domains. The knowledge graph is collapsed at the bottom and the full structured/3D Atlas remains available by choice. See [the current UX architecture](docs/single-field-learning-journey.md). Earlier sections below document historical iterations of the interface, not the current default navigation.

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

## Dashboard graph and guided learning progression

The homepage now keeps a **clickable, labeled knowledge graph visible alongside the dashboard**. Its ten macro-region nodes are linked by up to twelve aggregated arrows based on direct *necessary* prerequisites between concepts in different regions. These arrows summarize educational dependencies; they do not make a region's containment hierarchy a prerequisite or establish a single mandatory learning sequence. Clicking a region opens its topics in the explorer. The **Explore the 3D graph** action opens the interactive 3D constellation below; the default structured map and research-question dashboard remain available.

The structured map marks individual concepts **Ready**, **Guided path: prerequisites first**, or **Self-marked understood**. Ready means the concept's direct necessary prerequisites have been manually marked understood; useful supporting knowledge does not gate progression. Locked is a *recommended learning-path state*, not a restriction on browsing: learners can preview any lesson, navigate to the earliest reachable unfinished prerequisite, or explicitly select **I already know this (skip prerequisites)** to self-mark prior knowledge. The macro/meso structure is always navigable, even if the individual concept's suggested prerequisites have not been completed.

Progress is a **self-reported study marker, not a demonstrated mastery measurement**. It is saved using browser local storage under \`research-atlas-studied-v1\` when permitted; data is local to the browser and will not sync across devices. The user may undo a mark by opening the concept and choosing **Undo self-mark**. If storage is unavailable, the in-memory progression remains usable for the current page session.

No prerequisite relationships or scientific content have been rewritten by this feature. For now, concept-level unlocks are an exploratory prototype; a future assessment system could distinguish *visited*, *practiced*, and *demonstrated mastery* with evidence and domain-expert review. Browser/WebGL visual checks are still required in addition to mocked navigation tests.

## Learning Studio (three instructional pilots)

The Atlas now contains an expandable full-width Learning Studio for **Derivatives**, **Supernova Natal Kicks**, and **Population-Synthesis Outputs**. Open a pilot from the dashboard's Featured learning units section or from that concept's detail panel. Existing macro → topic → concept navigation, prerequisite-based guidance, seven research questions, and 3D/structured maps are unchanged.

Instructional content resides in \`knowledge-graph/learning-units.json\`: concept ID, a short explanation, objective-specific necessary/useful context and observable evidence, explanatory sections, a fully worked example, an independent activity with optional hint and solution, two objective-aligned multiple-choice checks with explanatory feedback, a research application, and source/provenance entries. The unit engine reads this JSON; it does not ingest or rewrite third-party pages on a visitor's device. All example numbers and toy records are illustrative and are explicitly identified as such.

**Source handling:** these three pilot explanations were independently authored, then checked against public references. The Atlas links out to OpenStax for the derivative definition and rate-of-change treatment, public natal-kick research for binary-survival context, and official COMPAS documentation for simulation-output structure. External source text, figures, exercises, notebooks, and datasets are not republished. COMPAS examples use invented toy records rather than downloaded astrophysical data, and no unpublished VIMES manuscript or private lab material is included.

Practice results are **formative only**: feedback is shown locally within the page, never sent to a server, never labeled certified mastery, and never used to auto-mark a concept understood. The existing self-reported progress indicator remains separate. Objective-level prerequisite annotations describe the scope of the *pilot learning objective*, not a claim that a concept is universally required for every possible treatment.

Run \`python3 scripts/validate_curriculum.py\` and \`node scripts/test_app.mjs\` after changing the lesson JSON or engine. Actual browser layout, keyboard navigation, quiz feedback and 3D rendering still require a visual browser test. The pilot has not been reviewed or endorsed by the GROWL lab.

## Focused navigation and adaptive practice pilot

The Atlas now separates five tasks so that the landing page is not one enormous scroll: **Overview** (graph, progress and three featured lessons), **Research pathways** (questions and domain cards), **Learn & practice** (full Learning Studio), **Knowledge atlas** (hierarchical structured graph and optional 3D), and **Resources** (public reading room). Tabs support keyboard arrow navigation; clicking a concept or learning unit opens the appropriate section without deleting the rest of the Atlas.

**Adaptive practice is available only for the three pilot units.** The static \`adaptive.js\` module reads the authored \`knowledge-graph/adaptive-items.json\` bank (24 items; four per objective), balances objective coverage, selects an authored difficulty based on recent responses, avoids reusing the same item in a short session, and displays hint and feedback after each answer. Sessions last up to five questions. A simple 1/3/7-day review suggestion can surface objectives due for review; the learner is always free to practise early or navigate ahead.

**Important limits:** these are transparent pedagogical heuristics, *not* a fitted item-response model, Bayesian knowledge-tracing model, FSRS, artificial-intelligence tutor, or empirically validated mastery estimate. Multiple-choice responses are formative evidence; they do not automatically advance the pre-existing self-reported understanding marker or verify research competence. Recent item/question identifiers, correctness flags, authored difficulty, objective and timestamps are kept locally in the learner's browser under \`research-atlas-adaptive-evidence-v1\`; no accounts or server-side adaptive data are created.

For the evidence informing this pilot, design tradeoffs, implementation and evaluation requirements, see [Adaptive learning design](docs/adaptive-learning-design.md).

After modifying the bank or lesson schema, run \`python3 scripts/validate_curriculum.py\`, \`node scripts/test_adaptive.mjs\`, and \`node scripts/test_app.mjs\`. Real-browser accessibility, mobile layout, review controls and WebGL still need visual inspection.

## Concept Discovery Diagnostic

The Atlas now includes an optional **My starting point** diagnostic. It does not ask every learner to sit the same placement test. Instead, the learner chooses a research question, a major knowledge region, or an individual concept. The diagnostic then surfaces up to ten relevant concepts from the existing necessary-prerequisite graph.

For every surfaced concept, the learner can:
- rate their current understanding on a five-level scale, from **New to me** through **I can use it independently in advanced work**;
- optionally state how certain they are about that self-rating;
- answer one short conceptual check when the Atlas currently has one for that concept;
- state confidence in the check answer **before** feedback is revealed;
- skip the concept, skip the check, or finish early.

The traversal is deliberately transparent. A low self-rating or incorrect conceptual check can send the next step toward direct necessary prerequisites, while the engine periodically returns to the chosen goal instead of descending forever. The current prototype samples at most ten concepts and at most five conceptual checks. There are 22 original Atlas diagnostic checks covering selected mathematical, physical, computational, stellar/binary, population-synthesis, inference and research-practice concepts.

Diagnostic evidence is represented as distinct states rather than one overall readiness percentage:
- **Self-rated only** — a learner judgment with no concept check.
- **One conceptual check correct** — limited supporting evidence, not mastery.
- **Correct check · low confidence** — initial evidence with uncertainty.
- **Review suggested** — one sampled check was incorrect.
- **Review suggested · high-confidence error** — a possible calibration mismatch worth revisiting, not proof of a misconception.
- **Not yet assessed** — absence of evidence remains absence of evidence.

The structured Atlas and 3D concept nodes can show this evidence as a lightweight personalized overlay while preserving the domain and prerequisite structure. A learner can reopen the diagnostic from any assessed concept or research question. Recommendations are starting points for exploration, not an official research-readiness score, ability estimate, prerequisite certification, or claim that untested concepts are mastered.

Ratings and conceptual-check records are stored in browser-local storage under \`research-atlas-concept-profile-v1\` when available. There is no account or server-side learner profile. Users can clear the saved diagnostic from the results screen.

Relevant implementation files: \`diagnostic.js\`, \`diagnostic-ui.js\`, and \`knowledge-graph/diagnostic-questions.json\`. Run \`node scripts/test_diagnostic.mjs\` and \`python3 scripts/validate_curriculum.py\` after modifying the diagnostic. Browser accessibility, mobile behavior and actual WebGL coloring still require manual visual QA.

## Diagnostic-first navigation

The default first-visit flow is now intentionally linear:

1. **Starting-point diagnostic first.** A new visitor is taken directly into Concept Discovery without seeing the dashboard, graph controls, tabs, or footer. They can complete the diagnostic or explicitly skip it.
2. **Knowledge map second.** The diagnostic results screen has a primary **Continue to my knowledge map** action. The returning-user home screen also puts the labeled macro knowledge graph before lessons, progress, or resources.
3. **Three obvious next actions.** From Home, a learner can continue a recommended concept, open Learn & Practice, or open Research. Detailed maps, resources, and 3D exploration remain available but are no longer competing for attention on first entry.
4. **Returning visits stay compact.** The large hero is reduced, the diagnostic tab is hidden from the normal top navigation (it remains accessible through the Home starting-point card, research questions, and concept panels), and the main graph appears higher on the page.

A first-run completion/skip marker is saved locally as \`research-atlas-onboarding-seen-v1\`. The diagnostic evidence itself remains separate under \`research-atlas-concept-profile-v1\`. If local storage is unavailable, skipping/completing still exits onboarding for the current page session, but that preference cannot persist across reloads. An incomplete diagnostic is shown again on the next visit unless the learner explicitly skipped.

This is a navigation change only: it does not alter the scientific curriculum, necessary/useful prerequisite judgments, diagnostic interpretation, adaptive-practice logic, or claims about mastery.

## Otto's guided research mission

The **default post-diagnostic home** is now Otto's mission journey rather than the full dashboard. Otto is an original astronaut-otter SVG mascot (\`assets/otto-orbit.svg\`) with short, scripted guidance during the initial concept diagnostic, returning-home experience, and pilot lessons. Otto is **not** an AI chatbot, psychological evaluator, source of novel science, or simulated researcher.

A learner chooses a research goal using the existing optional Concept Discovery diagnostic (or skips). The new \`guide.js\` route planner then displays **one real necessary-prerequisite chain** ending at the chosen goal, with at most five round, labeled, clickable stops and one primary **Continue my mission** action. Each stop opens its existing complete learning unit when available or its existing concept explanation and resources. Learners can freely open any stop, change their mission, or use the optional full structured/3D Atlas. The older dense dashboard remains in the DOM as a fallback if the guide module fails, while its original data and navigation stay available in expert mode.

**Progress semantics:** The new \`research-atlas-otto-visited-v1\` browser key stores *visited mission stops only*. This cannot establish prerequisite competence or scientific mastery, and is never conflated with the existing diagnostic ratings, adaptive quiz history, or the independent self-reported \`understood\` marker. Changing goals does not erase other visits; the visual route shows visited state only for its current stops. Prerequisite branches beyond the one displayed chain remain available in the complete map.

See [Otto's UX design and research notes](docs/otto-guided-mission-design.md) for the evidence-informed rationale, first-run and returning-user specification, visual/keyboard requirements, and optional continuation prompt. Run \`node scripts/test_guide.mjs\` and \`node scripts/test_app.mjs\`, plus the existing curriculum/diagnostic/adaptive tests, after altering this feature. Node tests use mocked DOM/WebGL and cannot substitute for visual testing on desktop and mobile browsers.

## Simplified domain-first home (current default)

The home page now starts with **domain cards**, then a short list of **concept cards** in the selected domain. Selecting a concept reveals its actual typed **necessary prerequisites**, optional useful connections, a few genuine downstream dependencies, and its curriculum's existing suggested exercise. Nothing in this interface assumes that opening or completing a card certifies mastery.

When a selected concept has an original short conceptual question in \`knowledge-graph/diagnostic-questions.json\`, its card offers a **one-question check** with immediate explanatory feedback. Those stand-alone responses are intentionally *not stored as mastery evidence*. For the three fully authored learning units (Derivatives, Supernova Natal Kicks, and Population-Synthesis Outputs), the concept panel links directly to the original lesson and existing five-question adaptive-practice session. For other concepts the interface offers their authored exercise idea and the complete concept page, **not an invented automated drill**. All 133 existing curriculum concepts remain accessible by domain or through the full Atlas.

The knowledge graph is now an **optional native disclosure at the bottom of the default home page**, not the primary interface. Its original directional macro-region overview is preserved; users can expand it, click a region, or open the complete structured/3D Atlas. The old Otto mission and large dashboard are kept as hidden fallbacks rather than being layered into the new default experience. A small Otto image remains in the new header, without scripted prompts or competing panels.

The first-visit concept diagnostic is still optional. Completing or skipping it opens the domain-first home and, if a goal is known, selects the goal's scientific domain. The goal is a starting suggestion: learners can switch domains and follow any connection. Research questions, resources, the knowledge hierarchy, and pilot lessons remain accessible from unobtrusive links.

Files: \`focus-home.js\` (domain/connection/practice interaction), \`index.html\` (native graph disclosure), \`style.css\` (compact responsive design), and \`app.js\` (existing-system navigation and data binding). Run \`node scripts/test_focus_home.mjs\` and the existing validation tests after editing. Actual desktop/mobile layout, scrolling, keyboard focus, WebGL and GitHub Pages deployment still require real-browser inspection.
