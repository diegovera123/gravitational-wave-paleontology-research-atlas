# Deep scientific Practice workspace (September 2026)

The app has three primary destinations: Home (optional diagnostic and Otto), Knowledge Graph (progressive 3D concept hierarchy and actual authored full learning units), and standalone Practice. The **three original complete lessons** still reside within the Knowledge Graph. Additional practice sets are independent assessment resources; no corresponding full lessons or graded written responses are claimed where none are authored.

## Assessed breadth and depth

**15 selectable sets:** 3 original pilots (Derivatives, Supernova Natal Kicks, Population-Synthesis Outputs) and 12 expanded field-specific assessments: Binary orbits and binding energy; Massive-star evolution and metallicity; Roche geometry and mass-transfer stability; Common-envelope energetics and channels; Compact remnants and formation channels; GW generation and chirps; Interferometers and detector evidence; Population synthesis and Monte Carlo; Detector selection effects; Cosmic star formation/delay times/merger rates; Hierarchical GW population inference; Reproducible research workflows.

The 12 new sets each contain four independently written and explicitly tagged components: conceptual understanding, quantitative interpretation, causal reasoning and model critique, with three questions per component and author-defined difficulty labels (1–3). Each new set also has two synthetic applied research scenarios with task prompts, a scratchpad, stepwise worked solutions hidden until revealed, and public source links for further reading. The overall bank contains **168 authored multiple-choice questions (24 existing + 144 new), 48 new component objectives and 24 ungraded research cases**. Questions and examples are learning exercises, not reproduced papers, official lab data or validated psychometric tests.

## Routing and evidence

The new 12-question assessment samples all four components, without repeated questions inside a session. Focused component checks present three items for a selected objective; review mode restricts questions to components due according to the original transparent heuristic. The original three pilot sets retain their five-question sessions and the complete pilot learning units. Answer options are stably permuted so all correct keys do not occupy the same displayed position; the key/feedback remain aligned. Detailed item feedback follows each response and session summaries show attempted/correct counts per objective, **not mastery**. Existing browser-local adaptive evidence key is preserved, with the recent-record cap raised to 2000 to accommodate more practice.

Search and research-area filters organize the fifteen sets. A mapped concept in Knowledge Graph offers an 'Open in-depth practice track' action; starting a pilot drill similarly routes to Practice. The user can return to the corresponding concept. Case notes are optional unsaved scratch work; revealable solutions are self-checked, not automatically evaluated. No backend, live Otto agent, new lab results or publication-grade data analysis is implied.

## Verification

Run `python3 scripts/validate_curriculum.py` and Node tests `test_practice_catalog.mjs`, `test_adaptive.mjs`, `test_app.mjs`, `test_constellation.mjs`, `test_single_field.mjs`, `test_diagnostic.mjs` through the checked-in GitHub Actions workflow. The tests validate item schema and unique keys, curriculum mappings, objective coverage and routing, preserved pilot lessons/history, and simulated 12-question end-to-end sessions. Real browser/mobile/WebGL/keyboard testing and domain-expert scientific review remain advisable before treating this as a validated assessment instrument.
