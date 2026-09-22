# Three-section Research Atlas: Practice workspace

## User-visible navigation

The Atlas now has **Home**, **Knowledge Graph**, and **Practice** as three separate, keyboard-accessible tabs. Home retains the optional starting-point diagnostic and Otto. Knowledge Graph retains the progressive 3D field hierarchy, scientific concept explanations, prerequisites, public research sources, research questions, and the three complete authored learning units. Its five-question **Start practice** affordance navigates to the separate Practice workspace, preselecting that concept. The lesson's practice button does the same.

## Practice workspace

The new third section lists the three existing fully authored pilot practice sets (Derivatives, Supernova Natal Kicks, and Population-Synthesis Outputs), each with an authored five-item adaptive session, hints, answer feedback, and session summary. It also displays the existing due-objective review queue, based only on locally saved formative evidence. Clicking a due review starts that unit's existing review-mode session in Practice. The button beside the active set returns to its concept in the 3D graph.

The remaining curriculum concepts do **not** silently acquire quizzes. Their existing open-ended exercise prompts and authored single-question checks remain within Knowledge Graph. No server grading, mastery certification, AI agent, or new item bank is implied. Adaptive evidence remains at the same browser-local storage key as before.

## Compatibility and QA

The retired Learn panel is still hidden for legacy internal DOM references. Only one `#adaptive-panel` exists, within the new `#practice-panel`, preventing an ambiguous target. Existing diagnostic, curriculum, graph, self-report and adaptive-history formats are unchanged. The page is still static and GitHub Pages compatible.

Run `node scripts/test_app.mjs`, `node scripts/test_constellation.mjs`, `node scripts/test_single_field.mjs`, `node scripts/test_adaptive.mjs`, `node scripts/test_diagnostic.mjs` and `python3 scripts/validate_curriculum.py`. In an actual browser, also verify graph → practice → graph, opening a full lesson → practice, due-review routing, page reload with saved history, keyboard tab focus, responsive three-button nav, no-WebGL fallback, and new-visitor diagnostic skip/completion. Mocked tests cannot establish visual/WebGL/keyboard quality.
