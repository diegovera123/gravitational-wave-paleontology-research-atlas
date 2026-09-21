#!/usr/bin/env python3
"""Validate Atlas curriculum identifiers, relationships, references, and DAG structure."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / "knowledge-graph/concepts.json").read_text())
sources_data = json.loads((ROOT / "knowledge-graph/research-sources.json").read_text())
concepts = data["concepts"]
assert data.get("schemaVersion") == 3, "Curriculum must use schema version 3"
ids = [concept["id"] for concept in concepts]
assert len(ids) == len(set(ids)), "Concept IDs must be unique"
concept_ids = set(ids)
source_ids = {source["id"] for source in sources_data["sources"]}
assert len(source_ids) == len(sources_data["sources"]), "Research-source IDs must be unique"
required = {
    "id", "title", "domain", "unit", "scale", "prerequisites",
    "learningObjectives", "masteryAssessment", "whyItMatters",
    "researchApplication", "resource", "researchReferences"
}
for concept in concepts:
    missing = required - concept.keys()
    assert not missing, f"{concept['id']} lacks {sorted(missing)}"
    assert concept["scale"] in {"macro", "meso", "micro"}, f"{concept['id']} has an invalid scale"
    prerequisite_ids = {edge["id"] for edge in concept["prerequisites"]}
    assert len(prerequisite_ids) == len(concept["prerequisites"]), f"{concept['id']} repeats a prerequisite"
    assert prerequisite_ids <= concept_ids, f"{concept['id']} has an unknown prerequisite"
    useful_ids = {edge["id"] for edge in concept["prerequisites"] if edge["kind"] == "useful"}
    assert concept["id"] not in useful_ids, f"{concept['id']} has a self-referencing useful connection"
    necessary_ids = {edge["id"] for edge in concept["prerequisites"] if edge["kind"] == "necessary"}
    assert concept["id"] not in necessary_ids, f"{concept['id']} has a self-referencing necessary prerequisite"
    assert not (useful_ids & necessary_ids), f"{concept['id']} duplicates a relationship type"
    assert set(concept["researchReferences"]) <= source_ids, f"{concept['id']} has an unknown source"
    for edge in concept["prerequisites"]:
        assert edge.get("kind") in {"necessary", "useful"}, f"{concept['id']} has an invalid relationship kind"
        assert edge.get("note"), f"{concept['id']} has an unexplained relationship"

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
        if prerequisite["kind"] == "necessary":
            visit(prerequisite["id"], path + [node_id])
    state[node_id] = 2
for concept_id in ids:
    visit(concept_id, [])

necessary_count = sum(sum(edge["kind"] == "necessary" for edge in concept["prerequisites"]) for concept in concepts)
useful_count = sum(sum(edge["kind"] == "useful" for edge in concept["prerequisites"]) for concept in concepts)
print(f"Validated {len(concepts)} concepts, {necessary_count} necessary relationships, "
      f"{useful_count} useful relationships, and an acyclic necessary graph.")
