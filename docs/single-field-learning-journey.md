# One field, five connected parts · Gravitational-Wave Paleontology Atlas

## Purpose and first-screen contract

The Atlas is **not** a generic choose-a-subject platform. Its sole scientific destination is **gravitational-wave paleontology**: connecting observed gravitational-wave populations to the earlier evolution and environments of their stellar progenitors. Mathematics, stellar astrophysics, binary evolution, general relativity, simulation, and research methods are supporting subjects *inside that story*.

The default screen presents:
1. A one-sentence explanation of the single research field, with a quiet Otto illustration.
2. One primary **Start with the big picture** action, optionally changed to **Continue from my diagnostic** when a previous short diagnostic found an area of uncertainty. This is a suggestion, **not proof of a gap or mastery**.
3. Five connected parts, each explained with a single sentence. These are **educational sections**, not prerequisites or five competing course choices.
4. **Only after** a part is selected, a small set of its existing curriculum topics. **Only after** a topic is selected, its existing concept names. A selected concept displays its actual necessary prerequisites, optional useful context, exercise prompt, and available learning or practice links.
5. At the very bottom, the pre-existing global knowledge graph in a **closed-by-default native disclosure**, plus quiet links to research questions, learning units, and public resources.

The separate detailed structured/3D graph remains available by choice. The earlier ten-region picker, dense dashboard and scripted mission are no longer visible in the main first-screen flow, but their original data and advanced navigation remain reachable. There is no server-side user profile.

## The five parts (display organization only)

| Story part | Existing scientific macro regions | Notes |
|---|---|---|
| The lives of stars | Stellar Astrophysics; Binary Stellar Evolution | From single-star structure and evolution to interactions and compact-binary formation |
| Compact objects and waves | Classical Mechanics; General Relativity; Gravitational-Wave Science | Motion, gravity, radiation, detectors, and the signals received today |
| Model stellar populations | Scientific Computing; Binary Population Synthesis | Numerical methods, simulations, evolving many binary systems, and population outputs |
| Reconstruct cosmic history | Gravitational-Wave Paleontology | Rates, cosmic history, selection effects, and population inference |
| Foundations and research tools | Mathematics; Research Practice | Cross-cutting foundations: useful at different depths across all other parts, **not necessarily the final part a learner should study** |

The order above is a storytelling scaffold, **not a universal necessary-prerequisite sequence**. True necessary and useful concept dependencies still come exclusively from \`knowledge-graph/concepts.json\` and retain their original types, notes and provenance. Topic membership comes exclusively from \`knowledge-graph/navigation.json\`. Cross-part prerequisite navigation moves to the actual containing part and topic rather than pretending that its location is a prerequisite.

All 133 existing concepts remain present, including the ten macro-anchor concepts and all topic members. No scientific concept, learning unit, existing quiz, video, research source or research question is deleted.

## One-field diagnostic

The optional first-run diagnostic no longer asks visitors to select a research area. It begins at the real macro concept \`gravitational-wave-paleontology\` and samples a small number of pre-existing concepts from several strands of the field, with additional necessary prerequisites when the learner reports limited familiarity or misses a short conceptual check. Skipping leads directly to the same one-field homepage. A completed diagnostic may nominate **one provisional starting concept**, using explicitly incorrect checks or low self-ratings; opening it does not establish that the other parts are understood.

The response history, self-ratings, confidence, self-reported progress and optional exercise checks remain distinct. Correctness on a single brief check never certifies mastery. New users should not need to understand the graph to get started.

## Follow-up QA

The files \`focus-home.js\`, \`index.html\`, \`style.css\`, and \`diagnostic-ui.js\` implement this interface. Run \`node scripts/test_single_field.mjs\`, \`node scripts/test_focus_home.mjs\`, \`node scripts/test_app.mjs\`, \`node scripts/test_diagnostic.mjs\`, \`node scripts/test_adaptive.mjs\`, and \`python3 scripts/validate_curriculum.py\` after changing data or presentation. In addition to mocked behavioral tests, visually inspect the deployed desktop and mobile versions, keyboard focus, concept details, prerequisite jumps, diagnostic completion/skip, the graph disclosure, and the optional 3D view. Never claim that mocked DOM or graph stubs are visual/browser QA.
