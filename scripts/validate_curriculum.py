#!/usr/bin/env python3
"""Validate Atlas curriculum identifiers, relationships, references, and DAG structure."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / "knowledge-graph/concepts.json").read_text())
sources_data = json.loads((ROOT / "knowledge-graph/research-sources.json").read_text())
concepts = data["concepts"]
ids = [concept["id"] for concept in concepts]
assert len(ids) == len(set(ids)), "Concept IDs must be unique"
concept_ids = set(ids)
source_ids = {source["id"] for source in sources_data["sources"]}
assert len(source_ids) == len(sources_data["sources"]), "Research-source IDs must be unique"
required = {
    "id", "title", "domain", "unit", "prerequisites", "prerequisiteNotes",
    "usefulConnections", "learningObjectives", "masteryAssessment",
    "researchApplication", "resource", "researchReferences"
}
for concept in concepts:
    missing = required - concept.keys()
    assert not missing, f"{concept['id']} lacks {sorted(missing)}"
    assert set(concept["prerequisites"]) == set(concept["prerequisiteNotes"]), \
        f"{concept['id']} prerequisite notes do not match prerequisites"
    assert set(concept["prerequisites"]) <= concept_ids, f"{concept['id']} has an unknown prerequisite"
    useful_ids = {edge["conceptId"] for edge in concept["usefulConnections"]}
    assert useful_ids <= concept_ids, f"{concept['id']} has an unknown useful connection"
    assert concept["id"] not in useful_ids, f"{concept['id']} has a self-referencing useful connection"
    assert not (useful_ids & set(concept["prerequisites"])), f"{concept['id']} duplicates a relationship type"
    assert set(concept["researchReferences"]) <= source_ids, f"{concept['id']} has an unknown source"
    for note in concept["prerequisiteNotes"].values():
        assert note.get("explanation") and note.get("appliesTo") and note.get("provenance")
    for edge in concept["usefulConnections"]:
        assert edge.get("explanation") and edge.get("appliesTo") and edge.get("provenance")

for source in sources_data["sources"]:
    assert set(source["supportedConceptIds"]) <= concept_ids, f"{source['id']} maps to an unknown concept"
    expected = {concept["id"] for concept in concepts if source["id"] in concept["researchReferences"]}
    assert set(source["supportedConceptIds"]) == expected, f"{source['id']} mapping is not reciprocal"

# Necessary prerequisites must form a directed acyclic graph. Useful edges are deliberately excluded.
state = {}
def visit(node_id, path):
    if state.get(node_id) == 1:
        raise AssertionError("Necessary-prerequisite cycle: " + " -> ".join(path + [node_id]))
    if state.get(node_id) == 2:
        return
    state[node_id] = 1
    concept = next(item for item in concepts if item["id"] == node_id)
    for prerequisite in concept["prerequisites"]:
        visit(prerequisite, path + [node_id])
    state[node_id] = 2
for concept_id in ids:
    visit(concept_id, [])

print(f"Validated {len(concepts)} concepts, {sum(len(c['prerequisites']) for c in concepts)} necessary relationships, "
      f"{sum(len(c['usefulConnections']) for c in concepts)} useful relationships, and an acyclic necessary graph.")
