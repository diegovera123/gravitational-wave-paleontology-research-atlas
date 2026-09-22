# Research Atlas: Home + Knowledge Graph

## The whole product in two destinations

**Home** introduces the one field of gravitational-wave paleontology. It contains a welcoming start button, an *optional* diagnostic (short confidence/familiarity ratings plus authored checks), and a small floating Otto helper available throughout the site. Completing or skipping the diagnostic returns to Home. Otto is currently a scripted, context-sensitive helper with different advice for the welcome, diagnostic, graph and lesson; this is **not** an LLM-powered autonomous agent.

**Knowledge Graph** is the single interactive scientific environment. The full-width 3D scene begins with five large educational groups, opens their existing regions and then their existing topics and concepts. The five groups and topic containment are *presentation hierarchy*, **not automatically prerequisite relationships**. Direct necessary/useful prerequisites come exclusively from the curriculum data. Each selected concept opens its instructional content below the 3D scene: research relevance, learning objectives, necessary background (clickable cross-domain), optional useful context/downstream links, public resource links, related curated research questions, and available practice.

The three complete authored pilot units (Derivatives, Supernova Natal Kicks, and Population-Synthesis Outputs) have their full explanation, worked example, sources, and five-question adaptive practice **inside Knowledge Graph**; opening the unit temporarily hides the 3D canvas and opens the focused lesson at the same location, then returns to the graph. Concepts without a complete pilot unit show their existing educational exercise prompt, explicitly ungraded, and an original single conceptual check when authored. A single check is never treated as validated mastery. Do not invent complete instruction, quiz banks or citations for the other concepts.

Research questions are an optional expandable set under the graph and relevant concept units; existing public resources appear in concept units with their original provenance, not in a separate Resources tab. Users may explore any part at any time. No block is imposed by an educational prerequisite suggestion or self-reported diagnostic answer.

## Minimal navigation and legacy compatibility

The top level has exactly **Home** and **Knowledge Graph**. The retired Starting Point, Research, Learn & Practice and Resources panels remain hidden in the DOM only where necessary for legacy rendering and state functions. There is no visible structured-map toggle or two-column details sidebar. The home view does not expose a second knowledge network or the superseded mission/dashboard cards.

- \`index.html\`: only two public tab buttons. The optional diagnostic is nested within Home; \`learning-studio\` and research-question index live within Knowledge Graph.
- \`app.js\`: legacy internal routing aliases map to one of the two public destinations. It preserves saved self-report, diagnostic, and adaptive quiz state independently. Pilot lessons and adaptive items keep using the existing educational data model.
- \`constellation.js\`: progressive cluster → region → topic → concept, integrated context and practice, no dependency between concepts inferred from spatial position, accessible button equivalents and a no-WebGL fallback.
- \`style.css\`: one calm Home, wide 3D stage, focused reading content, mobile styles, and a small unobtrusive Otto helper.
- Previous \`focus-home.js\` and \`guide.js\` are retained only for compatibility with historical saved state and older internal navigation, **not rendered as competing homepages**. Consolidating dead code can be considered after testing existing data migration.

## Before deployment

Run regression suites (especially \`node scripts/test_app.mjs\`, \`node scripts/test_constellation.mjs\`, \`node scripts/test_single_field.mjs\` and adaptive/diagnostic tests). Verify in a real browser that the first-visit diagnostic appears inside Home, skip/completion shows the welcome, only two tabs are visible, the 3D canvas initializes on first graph open, cluster→region→topic→concept clicks function, concept units include their original links and practice, complete pilot lesson and drill return to the graph, research questions open their linked concepts, and the fallback is usable without WebGL. Browser visual/keyboard/mobile verification is separate from mocked JavaScript tests.

The user can later add genuinely adaptive, agent-driven Otto support, but it needs an explicitly defined data scope, user consent and safe handling of learning history; don't label the current scripted helper a live AI agent.
