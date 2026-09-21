#!/usr/bin/env node
// Logic-level integration checks. This does not claim real WebGL rendering coverage.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";

const appSource = await fs.readFile("app.js", "utf8");
class ElementStub {
  constructor() { this.innerHTML = ""; this.clientWidth = 1100; this.clientHeight = 534; this.style = {}; this.dataset = {}; this.disabled = false; }
  addEventListener() {}
  setAttribute() {}
  querySelector(selector) { return selector === "canvas" ? {} : null; }
  querySelectorAll() { return []; }
  closest() { return null; }
  focus() {}
}

async function runApp(withLabels) {
  const selectors = ["#graph", "#details", "#concept-search", "#search-results", "#global-view", "#domain-view", "#concept-view", "#parent-view", "#expand-view", "#detail-view", "#reset-view"];
  const elements = new Map(selectors.map(key => [key, new ElementStub()]));
  let graphData = { nodes: [], links: [] };
  let labelFactory;
  let frameCount = 0;
  const force = { strength() { return force; }, distance() { return force; } };
  const graphTarget = {
    graphData(value) { if (value) { graphData = value; return graph; } return graphData; },
    nodeThreeObject(value) { if (value) { labelFactory = value; return graph; } return labelFactory; },
    d3Force() { return force; }, zoomToFit() { frameCount += 1; return graph; }
  };
  const graph = new Proxy(graphTarget, { get(target, property) { return property in target ? target[property] : () => graph; } });
  const document = { activeElement: null, querySelector: selector => elements.get(selector) || new ElementStub(), querySelectorAll: () => [], addEventListener() {} };
  const context = vm.createContext({
    console, document, window: { location: { href: "http://localhost:8000/" }, matchMedia: () => ({ matches: false }), addEventListener() {} },
    ForceGraph3D: () => () => graph,
    SpriteText: withLabels ? class { constructor(text) { this.text = text; this.material = {}; this.position = {}; } } : undefined,
    fetch: async path => ({ ok: true, json: async () => JSON.parse(await fs.readFile(path, "utf8")) }),
    requestAnimationFrame: callback => callback(), setTimeout: callback => callback(), URL
  });
  vm.runInContext(appSource, context);
  await new Promise(resolve => setTimeout(resolve, 100));
  return { context, elements, getData: () => graphData, getFrames: () => frameCount };
}

const labelled = await runApp(true);
assert.equal(labelled.getData().nodes.length, 8, "global overview should show eight domain anchors");
assert.ok(labelled.getData().nodes.every(node => node.isDomain), "global overview should not be a concept cloud");
vm.runInContext('enterDomain("Mathematics")', labelled.context);
assert.ok(labelled.getData().nodes.some(node => node.id === "calculus"), "domain view should reveal topic anchors");
assert.ok(labelled.getData().nodes.every(node => node.isDomain || node.domain === "Mathematics"), "domain view should remain in its region");
vm.runInContext('showConcept(conceptById("chirp-mass"))', labelled.context);
assert.match(labelled.elements.get("#details").innerHTML, /Chirp Mass/, "concept focus should update details");
assert.ok(labelled.getData().nodes.some(node => node.id === "compact-binary-inspiral"), "focus should reveal the parent topic");
const depthOneCount = labelled.getData().nodes.length;
vm.runInContext('focusDepth = 2; renderCurrentView()', labelled.context);
assert.ok(labelled.getData().nodes.length >= depthOneCount, "expanded depth should not hide the existing neighborhood");
assert.ok(labelled.getFrames() > 0, "navigation should request camera framing");

const fallback = await runApp(false);
assert.equal(fallback.getData().nodes.length, 8, "missing optional labels must not prevent graph initialization");
console.log("Hierarchy navigation smoke test passed with and without optional labels.");
