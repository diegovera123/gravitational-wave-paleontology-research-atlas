#!/usr/bin/env node
// Lightweight integration smoke test for the static app without a WebGL browser.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";

class ElementStub {
  constructor() { this.innerHTML = ""; this.clientWidth = 1100; this.clientHeight = 534; this.style = {}; this.dataset = {}; }
  addEventListener() {}
  setAttribute() {}
  querySelector(selector) { return selector === "canvas" ? {} : null; }
  querySelectorAll() { return []; }
  closest() { return null; }
  focus() {}
}
const elements = new Map(["#graph", "#details", "#concept-search", "#search-results", "#legend", "#reset-view", "#neighborhood-view", "#overview-view"].map(key => [key, new ElementStub()]));
let graphData = { nodes: [], links: [] };
let labelFactory;
const force = { strength() { return force; }, distance() { return force; } };
const graphTarget = {
  graphData(value) { if (value) { graphData = value; return graph; } return graphData; },
  nodeThreeObject(value) { if (value) { labelFactory = value; return graph; } return labelFactory; },
  d3Force() { return force; },
  cameraPosition(value) { if (value) return graph; return { x: 0, y: 0, z: 640 }; },
  zoomToFit() { return graph; }
};
const graph = new Proxy(graphTarget, { get(target, property) { return property in target ? target[property] : () => graph; } });
const document = {
  activeElement: null,
  querySelector(selector) { return elements.get(selector) || new ElementStub(); },
  querySelectorAll() { return []; },
  addEventListener() {}
};
const context = vm.createContext({
  console, document,
  window: { location: { href: "http://localhost:8000/" }, matchMedia: () => ({ matches: false }), addEventListener() {} },
  ForceGraph3D: () => () => graph,
  SpriteText: class { constructor(text) { this.text = text; this.material = {}; this.position = {}; } },
  fetch: async path => ({ ok: true, status: 200, json: async () => JSON.parse(await fs.readFile(path, "utf8")) }),
  requestAnimationFrame: callback => callback(), setTimeout: callback => callback(), URL
});
vm.runInContext(await fs.readFile("app.js", "utf8"), context);
await new Promise(resolve => setTimeout(resolve, 100));
assert.ok(graphData.nodes.length > 0, "overview graph should contain nodes");
assert.ok(graphData.nodes.every(node => node.scale !== "micro" || node.id === "research-practice"), "overview should suppress micro nodes");
assert.match(elements.get("#details").innerHTML, /Research Practice/, "initial details should show the research anchor");
vm.runInContext('selectConcept("chirp-mass")', context);
assert.match(elements.get("#details").innerHTML, /Chirp Mass/, "selection should update concept details");
assert.ok(graphData.nodes.some(node => node.id === "chirp-mass"), "selected micro node should become visible in overview");
console.log(`App smoke test passed with ${graphData.nodes.length} visible overview nodes.`);
