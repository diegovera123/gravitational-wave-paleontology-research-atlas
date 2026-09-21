#!/usr/bin/env python3
"""Validate Atlas curriculum identifiers, relationships, references, and DAG structure."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / "knowledge-graph/concepts.json").read_text())
sources_data = json.loads((ROOT / "knowledge-graph/research-sources.json").read_text())
concepts = data["concepts"]
assert data.get("schemaVersion") == 4, "Curriculum must use schema version 4"
ids = [concept["id"] for concept in concepts]
assert len(ids) == len(set(ids)), "Concept IDs must be unique"
concept_ids = set(ids)
source_ids = {source["id"] for source in sources_data["sources"]}
assert len(source_ids) == len(sources_data["sources"]), "Research-source IDs must be unique"
required = {
    "id", "title", "domain", "unit", "scale", "parentId", "prerequisites",
    "learningObjectives", "masteryAssessment", "whyItMatters",
    "researchApplication", "resource", "researchReferences"
}
for concept in concepts:
    missing = required - concept.keys()
    assert not missing, f"{concept['id']} lacks {sorted(missing)}"
    assert concept["scale"] in {"macro", "meso", "micro"}, f"{concept['id']} has an invalid scale"
    parent_id = concept["parentId"]
    assert parent_id is None or parent_id in concept_ids, f"{concept['id']} has an unknown parent"
    assert parent_id != concept["id"], f"{concept['id']} cannot contain itself"
    if parent_id:
        parent = next(item for item in concepts if item["id"] == parent_id)
        assert parent["domain"] == concept["domain"], f"{concept['id']} has a parent in another domain"
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

# Containment is independent from prerequisites and must also form a forest.
for concept in concepts:
    hierarchy_path = set()
    current = concept
    while current["parentId"] is not None:
        assert current["id"] not in hierarchy_path, f"Containment cycle involving {current['id']}"
        hierarchy_path.add(current["id"])
        current = next(item for item in concepts if item["id"] == current["parentId"])

necessary_count = sum(sum(edge["kind"] == "necessary" for edge in concept["prerequisites"]) for concept in concepts)
useful_count = sum(sum(edge["kind"] == "useful" for edge in concept["prerequisites"]) for concept in concepts)
print(f"Validated {len(concepts)} concepts, {necessary_count} necessary relationships, "
      f"{useful_count} useful relationships, an acyclic necessary graph, and an acyclic containment hierarchy.")


# The UI navigation hierarchy is a curated, independent containment index.
navigation = json.loads((ROOT / "knowledge-graph/navigation.json").read_text())
assert navigation.get("schemaVersion") == 1, "Navigation must use schema version 1"
macro_ids = [macro["id"] for macro in navigation["macros"]]
topic_ids = [topic["id"] for topic in navigation["topics"]]
assert len(macro_ids) == len(set(macro_ids)), "Duplicate macro navigation IDs"
assert len(topic_ids) == len(set(topic_ids)), "Duplicate topic navigation IDs"
assert set(macro_ids) <= concept_ids, "Macro navigation IDs must reference real concepts"
concept_lookup = {concept["id"]: concept for concept in concepts}
for macro_id in macro_ids:
    assert concept_lookup[macro_id]["scale"] == "macro", f"Navigation macro {macro_id} lacks macro scale"
seen_members = set()
for topic in navigation["topics"]:
    assert topic["macroId"] in macro_ids, f"Topic {topic['id']} has no containing macro"
    assert topic["conceptIds"], f"Topic {topic['id']} has no concept children"
    for concept_id in topic["conceptIds"]:
        assert concept_id in concept_ids, f"Unknown navigation concept {concept_id}"
        assert concept_id not in macro_ids, f"Macro {concept_id} cannot also be a topic leaf"
        assert concept_id not in seen_members, f"Concept {concept_id} appears in multiple topics"
        seen_members.add(concept_id)
        assert concept_lookup[concept_id]["domain"] == concept_lookup[topic["macroId"]]["domain"], (
            f"Concept {concept_id} has a parent in another domain"
        )
assert seen_members == (concept_ids - set(macro_ids)), (
    f"Missing concept navigation paths: {sorted((concept_ids - set(macro_ids)) - seen_members)}"
)
print(f"Validated navigation: {len(macro_ids)} macro regions, {len(topic_ids)} topics, "
      f"{len(seen_members)} uniquely accessible concept leaves.")


# Exploratory research pathways are independent teaching prompts, not official lab projects.
questions_data = json.loads((ROOT / "knowledge-graph/research-questions.json").read_text())
assert questions_data.get("schemaVersion") == 1, "Research questions must use schema version 1"
questions = questions_data["questions"]
question_ids = [question["id"] for question in questions]
assert len(question_ids) == len(set(question_ids)), "Research question IDs must be unique"
for question in questions:
    assert question["title"] and question["summary"] and question["activity"], (
        f"{question['id']} needs a title, explanation, and learning activity"
    )
    assert question["conceptIds"], f"{question['id']} must map to learning concepts"
    assert len(question["conceptIds"]) == len(set(question["conceptIds"])), (
        f"{question['id']} repeats a linked concept"
    )
    assert set(question["conceptIds"]) <= concept_ids, f"{question['id']} references missing concepts"
    assert set(question["sourceIds"]) <= source_ids, f"{question['id']} references missing sources"
    for source_id in question["sourceIds"]:
        source = next(s for s in sources_data["sources"] if s["id"] == source_id)
        assert source.get("url"), f"{question['id']} references a nonpublic/unverified source {source_id}"
print(f"Validated {len(questions)} curated educational research questions and their public source links.")


# Pilot learning units are separately authored instructional resources, not fetched/copyrighted source copies.
unit_data=json.loads((ROOT / "knowledge-graph/learning-units.json").read_text())
assert unit_data.get("schemaVersion")==1, "Unsupported learning-unit schema"
units=unit_data["units"]
unit_ids=[u["id"] for u in units]
assert len(unit_ids)==len(set(unit_ids)), "Duplicate learning unit IDs"
assert set(unit_ids)<=concept_ids, "Learning unit references unknown concepts"
for u in units:
    assert u["summary"] and u["level"] and u["sections"] and u["sources"], f"Incomplete lesson {u['id']}"
    assert len(u["objectives"])>=2, f"Lesson {u['id']} needs at least two explicit objectives"
    objective_ids=[o["id"] for o in u["objectives"]]
    assert len(objective_ids)==len(set(objective_ids)), f"Duplicate objective in lesson {u['id']}"
    assert len(u["assessment"])>=2, f"Lesson {u['id']} needs practice questions"
    for objective in u["objectives"]:
        assert objective["title"] and objective["evidence"], f"Unspecified objective in {u['id']}"
        assert set(objective["necessaryIds"]+objective["usefulIds"])<=concept_ids, f"Unknown objective dependency in {u['id']}"
        assert set(objective["necessaryIds"]).isdisjoint(objective["usefulIds"]), f"Conflicting objective dependency in {u['id']}"
    question_ids=[q["id"] for q in u["assessment"]]
    assert len(question_ids)==len(set(question_ids)), f"Duplicate practice ID in {u['id']}"
    for q in u["assessment"]:
        assert q["objectiveId"] in objective_ids, f"Practice question not aligned to an objective in {u['id']}"
        assert len(q["choices"])>=2 and 0<=q["correctIndex"]<len(q["choices"]), f"Invalid answer in {u['id']}"
        assert q["feedback"] and q["prompt"], f"Practice question lacks feedback in {u['id']}"
    assert u["workedExample"]["steps"] and u["activity"]["solution"], f"Lesson {u['id']} lacks a worked example or solution"
    for source in u["sources"]:
        assert source["url"].startswith("https://"), f"Lesson {u['id']} has no public source URL"
        assert source["title"] and source["role"] and source["license"], f"Lesson {u['id']} lacks source provenance"
print(f"Validated {len(units)} original pilot learning units with linked objectives, "
      "worked examples, formative assessments, and public references.")
