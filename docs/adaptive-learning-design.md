# Focused Atlas & adaptive practice: design note

## Scope and design constraints

The Atlas is an independent, static educational prototype. Five primary tabs simplify entry points: **Overview** (visible knowledge graph, progress, featured lessons); **Research pathways** (questions and domain cards); **Learn & practice** (instruction and short quizzes); **Knowledge atlas** (structured hierarchy, prerequisites and optional 3D); and **Resources** (public reading room). Selecting a concept, research question, or learning unit routes to the appropriate tab. All pre-existing curriculum concepts, prerequisite classifications, public links, research-question pathways, and 3D controls remain available.

Adaptive practice has been implemented for the **three pilot learning units only**. It is a deterministic, transparent *formative practice router*, not a psychometrically calibrated adaptive test, Bayesian knowledge-tracing (BKT) model, IRT model, learner-model-based AI tutor, or an implementation of FSRS. The only scoring shown is the number of correct answers on the current attempt. Self-reported "understood" markers are stored separately from assessment history. No quiz response automatically certifies mastery or unlocks a concept.

## Research used to derive design choices

| Public platform / research | Directly documented mechanism | Atlas prototype design choice |
|---|---|---|
| Carnegie Mellon Open Learning Initiative, https://oli.cmu.edu/ | Explicit learning goals, practice-by-doing, immediate feedback and hints. | Each item is associated with a stated objective; answers give immediate corrective feedback and optional hints. |
| Khan Academy's explanation of mastery levels, https://support.khanacademy.org/hc/en-us/articles/5548760867853--How-do-Khan-Academy-s-Mastery-levels-work | Performance across exercises and later assessments changes reported skill status; one answered item is not enough to declare full mastery. | Show *formative attempt evidence* separately from self-reported progress. No mastery classification from a five-question quiz. |
| Khan Academy's mastery challenge documentation, https://support.khanacademy.org/hc/en-us/articles/360037127892-What-are-Mastery-Challenges-in-course-mastery | Personalized review can select skills based on time since review and skill status. | Offer optional "review due" recommendations, at objective level. The pilot review timing is a simple heuristic, not a reproduction of Khan's schedule. |
| Carpenter, Pan & Butler (2022), https://doi.org/10.1038/s44159-022-00089-1 | A review of spacing and retrieval practice in learning. | Prefer later review over declaring learning complete after one pass. |
| Anki's FSRS explanation, https://faqs.ankiweb.net/what-spaced-repetition-algorithm.html | FSRS learns parameters from a review history and models retrievability, stability and difficulty. | **Do not claim to implement FSRS**: the pilot has neither enough historical data nor a validated memory model. Store review history for possible later research and use plainly labeled 1/3/7-day review heuristics. |
| Šahin & Weiss (2015), https://doi.org/10.12738/estp.2015.6.0102 | Calibrated computerized adaptive testing depends on an item bank and calibration data. | Our four author-rated questions per objective are **not** a calibrated IRT bank. Never display probability-of-mastery or ability scores from them. |
| 2025 review of AI-enabled adaptive learning platforms, https://doi.org/10.1016/j.caeai.2025.100429 | Reviews adaptive paths, educational evaluation, privacy and practical implementation limits. | Prefer explicit learner-controlled paths, locally stored results and a modular progression toward evaluation instead of claiming an AI-driven personalization engine. |

The source examples motivate specific affordances, **not a claim that this Atlas has been experimentally validated**.

## What the current algorithm actually does

* **Item bank:** \`knowledge-graph/adaptive-items.json\`; 24 original questions, four per objective, for two objectives in each of three pilot units. Each has a mapped objective, author-rated difficulty 1–3, hint, keyed answer and explanation.
* **Session:** a learner opts into a short session (up to five questions). The selector balances coverage between the unit's two objectives, revisits weaker objectives and favors less-practiced items. It avoids repeating the exact same question within a session.
* **Difficulty:** start with difficulty 1 for a new objective. Recent correct responses make an author-rated 2 or 3 more appropriate; errors redirect toward accessible material. This is a **rule**, not a measured ability, Bayesian posterior or learned item parameter.
* **Feedback:** show explanation and the correct response after each answer; the next question appears only when the learner chooses to continue.
* **Suggested review:** after the latest objective-level attempt, schedule 1 day for an initial success or error, 3 days after two consecutive successes and 7 days after three. These intervals are a *prototype heuristic*, not empirically optimized retention predictions. Learners can practise whenever they wish.
* **Privacy:** \`research-atlas-adaptive-evidence-v1\` stores a bounded history of the unit/item/objective identifier, author-rated difficulty, correct/incorrect flag and timestamp in this browser. The site has no backend profile or cross-device sync; clearing browser storage clears the saved record. Other tools on a learner's device may have access to the browser profile, so do not treat browser storage as a confidential research database.
* **Agency:** locked is only a recommended order. Learners can open every explanation, navigate to advanced concepts and explicitly self-mark prior learning. Adaptive practice does **not** change the existing self-report marker.

## What must come before a production adaptive platform

1. Expand and independently review item pools with expert-authored explanations and distractor rationales. Four questions per objective is **not enough** for long-term nonrepeating tests.
2. Add multiple evidence types: calculations with workings, interpretation of graphs, code/notebook output, and authentic research artifacts. A two- or five-item multiple-choice quiz cannot establish research competence.
3. Instrument consent-based, privacy-reviewed research to evaluate usability, calibration, retention, item exposure, bias and transfer to real scientific tasks. Keep identifying data out of public static repositories.
4. Only when there are appropriate responses per item and appropriate validation, evaluate IRT/CAT, BKT/knowledge tracing or fitted spaced-repetition models against the transparent baseline. Review model assumptions, fairness and the interpretation of each score.
5. Conduct usability testing with newcomers and experienced researchers; compare completion, navigation backtracking, comprehension and independent task performance before further adding panels.

## Checks

Run \`python3 scripts/validate_curriculum.py\`, \`node scripts/test_adaptive.mjs\`, and \`node scripts/test_app.mjs\`. The Node tests mock the DOM/WebGL; separately test real-browser keyboard navigation, mobile layout, quiz buttons, 3D canvas, missing CDN behavior and storage-denied behavior before inviting external researchers.
