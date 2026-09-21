# Concept Discovery Diagnostic

The Concept Discovery Diagnostic is a **goal-directed self-assessment and sampling tool**, not a placement exam or mastery classifier.

## Experience

1. The learner chooses a research goal (one of the Atlas research pathways) or a broad-foundations route.
2. The Atlas starts close to that goal and surfaces one concept at a time.
3. For each surfaced concept the learner reports:
   - current understanding: **New to me / recognize it / can explain the basics / can apply it / could teach or derive it**;
   - confidence in that judgment: **low / medium / high**.
4. The prerequisite graph changes what is surfaced next:
   - low ratings move immediately toward necessary prerequisites;
   - middle ratings sample an important prerequisite;
   - high, confident ratings allow progress near the goal while still sampling some prerequisite knowledge rather than assuming the whole chain is known.
5. After up to ten concept ratings, the Atlas chooses up to three **basic conceptual checks** from \`diagnostic-items.json\`, prioritizing positively self-rated concepts for which a question exists.
6. The learner selects an answer **and separately reports answer confidence**.
7. The result is a personalized provisional map rather than a single percentage.

## Interpretation

The current labels intentionally avoid "mastered":

- **Supported by sample check**: a positive self-rating plus one correct sampled conceptual check with medium/high answer confidence.
- **Correct, low confidence**: sampled performance was correct but answer confidence was low.
- **Review: high-confidence mismatch**: a strong self-rating and medium/high confidence accompanied an incorrect sampled check. This may indicate a misconception, misread question, or simple error; it is not treated as a diagnosis.
- **Review recommended**: current evidence suggests revisiting the concept.
- **High self-rating — not verified**: the learner rated the concept highly, but the small diagnostic did not sample it.
- **Developing understanding**: intermediate self-report/evidence.

One correct answer is **not** evidence of full mastery, and one error is **not** proof that a learner lacks a concept. The profile should be treated as a routing aid.

## Personalized map

The diagnostic profile is used in two ways:

- the result screen recommends next concepts constrained to the chosen goal's necessary-prerequisite closure;
- concept cards in the structured Knowledge Atlas display the stored diagnostic label when that concept was sampled.

The scientific prerequisite structure itself is unchanged. Personalization changes the learner's recommended route and visual state, not the underlying field model.

## Privacy and persistence

The profile is stored, when available, in browser local storage at \`research-atlas-concept-diagnostic-v1\`. The static Atlas has no account backend and does not sync the profile across devices. Clearing site storage removes the saved diagnostic.

Stored fields include the selected goal, concept IDs, self-ratings, confidence judgments, the sampled question ID/answer correctness, answer confidence, and timestamps. Do not use this browser-local prototype as a confidential human-subjects research database.

## Current question bank

\`knowledge-graph/diagnostic-items.json\` contains 24 independently authored basic conceptual checks across mathematics, mechanics, stellar/binary astrophysics, relativity/gravitational waves, computing, statistics and population synthesis. The bank is deliberately broad but sparse: generally one item per covered concept. It is therefore suitable for **sampling**, not reliable concept scoring.

Future versions should add multiple independently reviewed items per learning objective, numerical/graph interpretation tasks, code-output questions and authentic research artifacts before attempting stronger placement claims.
