# Otto's Guided Research Mission · UX and implementation specification

## Design intention

The original Atlas remains a complex scientific reference system: 133 existing curriculum concepts, curated macro → topic → concept navigation, typed necessary/useful prerequisites, seven independently authored research questions, three complete pilot lessons, conceptual diagnostic and adaptive practice. **The default learner interface should not expose all of that at once.** Instead it offers *one scientific question, one short genuine prerequisite chain, one main next action*. The full structured/3D Atlas, research resources, all prerequisite branches, and the learning studio remain available via explicit links.

The guiding mascot is **Otto the Orbit Otter**, drawn originally as the local SVG \`assets/otto-orbit.svg\`. It is a scripted interface coach, **not** a conversational AI, source of new scientific claims, psychological evaluator or simulated scientist. Speech remains short and context-sensitive, not a new dashboard panel. The character should not distract from advanced mathematical and research content.

## Research and product-design basis

- [Duolingo, *The Science Behind Duolingo's Home Screen Redesign*](https://blog.duolingo.com/new-duolingo-home-screen-design/) describes replacing ambiguous course navigation with one clearer path and incorporating spaced review. This motivates **one default next step**, while the Atlas maintains an explicit expert escape route.
- [Duolingo, *New Mini-Units*](https://blog.duolingo.com/intermediate-mini-units/) describes smaller, more focused units with opportunities for practice. This motivates a **short guided route and one concept at a time**, not pretending that a short route covers an entire astrophysics field.
- [PatternFly, *Progressive Disclosure*](https://pf3.patternfly.org/v3/pattern-library/forms-and-controls/progressive-disclosure/) explains revealing task-relevant information only when needed. Here, the default home shows Otto and the route; all original technical controls are preserved in the optional full Atlas.
- [Gladstone et al. (2025), *Do Pedagogical Agents Enhance Student Motivation?*](https://doi.org/10.1007/s10648-025-10050-2) is a meta-analysis reporting effects on learners' interest and self-efficacy expectations, **not on all motivational beliefs**. Evidence does not establish that Otto improves learning or guarantees engagement in this astrophysics context.
- [Zhang et al. (2024), *Pedagogical agent design for K–12 education*](https://doi.org/10.1016/j.compedu.2024.105165) emphasizes the importance of a character's pedagogical role and context; merely adding an illustration is insufficient.

These sources motivate design *hypotheses*. The actual Atlas UI still requires testing with new researchers, advanced researchers, and accessibility users.

## User journey and acceptance requirements

1. **First visit:** The existing optional Concept Discovery diagnostic appears before any dashboard; Otto gives a short instruction for choosing a goal, rating concepts and trying occasional conceptual checks. Each check gives explicit feedback; an explicit Skip action remains. Diagnostic results show a primary **Meet Otto and start my mission** action.
2. **Returning visit:** Home opens directly to Otto plus a short route tied to the saved goal. The old dashboard does not dominate the viewport. Users see a short human-readable research goal and no more than five clickable round stops.
3. **Route generation:** Choose **one real chain of necessary prerequisites** ending at the goal concept. Prefer evidence of self-reported gaps or a missed sampled check when selecting a branch. Never fabricate adjacency between merely useful or related concepts, equate containment with prerequisite, or claim that this single route is comprehensive. Other branches remain in the full Atlas.
4. **Main call to action:** Continue my mission. Small secondary links let learners Change mission or Explore the full knowledge map. A research-question-specific route can also open that question.
5. **Actionable stops:** Clicking a stop opens the existing complete lesson when available; otherwise opens the existing concept explanation, objectives, prerequisite cards, and resources in the full Atlas. A learner may open any stop in any order.
6. **Progress semantics:** Clicking a stop stores only its **visited** state in browser storage under \`research-atlas-otto-visited-v1\`. This is separate from quiz history and self-marked understanding, and never claims academic mastery, readiness, verified prerequisite knowledge or measured ability.
7. **Optional deep dive:** When a learner chooses the full Atlas, all existing structured and 3D navigation, search, research pathways, sourced learning units, and practice remain reachable. The header returns them to the guided mission.
8. **Responsive and accessible:** Round steps have readable adjacent labels, accessible button names, visible focus, minimum legible text, no meaning conveyed only by color, and no essential animation. Respect reduced-motion settings; do not force a mascot interaction before ordinary browsing.
9. **Failure behavior:** If guide assets or code fail, the existing home dashboard remains available. If 3D fails, structured graph and learning remain functional. Skipping the diagnostic still lands on Otto's guided home.

## Current scope and future evaluation

This is a scripted **guide and visual redesign**, not a complete game engine or an intelligent avatar. The route planner follows one directed prerequisite chain and has no empirically validated recommendation policy. Evaluate first-visit comprehension, time to first concept, number of unnecessary backtracks, frequency of full-Atlas use, and learner-reported overload. Compare users who take the diagnostic with those who skip; do not interpret differential outcomes as causal without an appropriate evaluation design.

Before introducing animations, character dialogue generation, XP, streaks, or simulated mastery, test whether the simple path and clear human-readable concept labels already improve usability. Avoid copying Duolingo's brand, characters, proprietary game assets, or scientific content.

## Continuation prompt for a future code session

> Work in the existing Research Atlas GitHub repository. Preserve Otto's focused, round-node mission path as the default view and preserve the full structured/3D Atlas as a secondary expert mode. Improve real-browser mobile navigation and keyboard usability before adding new features. Keep prerequisite edges grounded in the existing \`knowledge-graph/concepts.json\`, never turn topic membership into a prerequisite. Keep the learner's visited state, self-report, diagnostic evidence, and adaptive quiz history separate. Do not award mastery for opening a page or answering a single multiple-choice question. Evaluate usability with the documented tests and include screenshots of first-run onboarding, returning guided home, and expert map at desktop and mobile widths. Never add new rectangles, menus or persistent panels without first identifying a user need and showing how the core next-action experience remains clear.
