const DOMAIN_COLORS = {
  Mathematics: "#69a8ff", Physics: "#a587ff", "Stellar Astrophysics": "#65d6e6",
  "Binary Stellar Evolution": "#d58acb", "General Relativity and Gravitational Waves": "#8595ff",
  "Scientific Computing": "#66c6a4", "Population Synthesis and Paleontology": "#d4a667",
  "Research Practice": "#f08fa9"
};
const NODE_SIZE = { domain: 28, macro: 16, meso: 7, micro: 3.2 };
const LABEL_SIZE = { domain: 8, macro: 6.4, meso: 4, micro: 3 };
const $ = selector => document.querySelector(selector);
const graphElement = $("#graph");
const detailsElement = $("#details");
const searchInput = $("#concept-search");
const searchResults = $("#search-results");
let graph;
let concepts = [];
let researchSources = [];
let navigationLevel = "global";
let selectedDomain = null;
let selectedId = null;
let focusDepth = 1;
let fullDetail = false;
let pendingFrame = true;

const colorFor = domain => DOMAIN_COLORS[domain] || "#9aa9c7";
const conceptById = id => concepts.find(concept => concept.id === id);
const childrenOf = id => concepts.filter(concept => concept.parentId === id);
const edgesOf = (concept, kind) => concept.prerequisites.filter(edge => edge.kind === kind);
const domainNodeId = domain => `domain::${domain}`;
const sourceId = link => typeof link.source === "object" ? link.source.id : link.source;
const targetId = link => typeof link.target === "object" ? link.target.id : link.target;

function safeLink(value) {
  try {
    const url = new URL(value, window.location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "#";
  } catch { return "#"; }
}

function stableAngle(value) {
  let hash = 0;
  for (const character of value) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  return (Math.abs(hash) % 360) * Math.PI / 180;
}

function domainNode(domain, index, count) {
  const angle = index / count * Math.PI * 2 - Math.PI / 2;
  const radius = 115;
  return { id: domainNodeId(domain), name: domain, domain, scale: "domain", isDomain: true,
    x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, z: index % 2 ? 20 : -20,
    fx: Math.cos(angle) * radius, fy: Math.sin(angle) * radius, fz: index % 2 ? 20 : -20 };
}

function conceptNode(concept) {
  return { id: concept.id, name: concept.title, domain: concept.domain, scale: concept.scale, parentId: concept.parentId };
}

function hierarchyPath(concept) {
  const path = [];
  const visited = new Set();
  let current = concept;
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    path.unshift(current);
    current = current.parentId ? conceptById(current.parentId) : null;
  }
  return path;
}

function descendantsOf(id) {
  const result = new Set();
  const queue = [id];
  while (queue.length) childrenOf(queue.shift()).forEach(child => { result.add(child.id); queue.push(child.id); });
  return result;
}

function prerequisiteNeighborhood(concept, depth) {
  const ids = new Set([concept.id]);
  let frontier = [concept.id];
  for (let level = 0; level < depth; level += 1) {
    const next = [];
    frontier.forEach(id => edgesOf(conceptById(id), "necessary").forEach(edge => {
      if (!ids.has(edge.id)) { ids.add(edge.id); next.push(edge.id); }
    }));
    frontier = next;
  }
  concept.prerequisites.forEach(edge => ids.add(edge.id));
  concepts.forEach(candidate => candidate.prerequisites.forEach(edge => { if (edge.id === concept.id) ids.add(candidate.id); }));
  hierarchyPath(concept).forEach(item => ids.add(item.id));
  childrenOf(concept.id).forEach(item => ids.add(item.id));
  return ids;
}

function nodesForCurrentView() {
  const domains = Object.keys(DOMAIN_COLORS);
  if (navigationLevel === "global") return domains.map((domain, index) => domainNode(domain, index, domains.length));
  const anchor = { ...domainNode(selectedDomain, 0, 1), x: 0, y: 0, z: 0, fx: 0, fy: 0, fz: 0 };
  if (navigationLevel === "domain") {
    const visible = concepts.filter(concept => concept.domain === selectedDomain && (fullDetail || concept.scale !== "micro"));
    return [anchor, ...visible.map(conceptNode)];
  }
  const selected = conceptById(selectedId);
  let visibleIds = prerequisiteNeighborhood(selected, focusDepth);
  if (fullDetail) {
    const topic = hierarchyPath(selected).find(item => item.scale === "macro") || hierarchyPath(selected)[0];
    visibleIds = new Set([...visibleIds, ...descendantsOf(topic.id), topic.id]);
  }
  return [anchor, ...concepts.filter(concept => visibleIds.has(concept.id)).map(conceptNode)];
}

function positionNodes(nodes) {
  nodes.forEach(node => { if (!node.isDomain) { delete node.fx; delete node.fy; delete node.fz; } });
  if (navigationLevel === "global") return nodes;
  const domainAnchor = nodes.find(node => node.isDomain);
  Object.assign(domainAnchor, { x: 0, y: 0, z: 0, fx: 0, fy: 0, fz: 0 });
  const conceptNodes = nodes.filter(node => !node.isDomain);
  if (navigationLevel === "domain") {
    const roots = conceptNodes.filter(node => !node.parentId || !conceptNodes.some(other => other.id === node.parentId));
    roots.forEach((node, index) => {
      const angle = index / Math.max(roots.length, 1) * Math.PI * 2;
      const radius = roots.length <= 2 ? 82 : 120;
      Object.assign(node, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, z: index % 2 ? 24 : -24 });
      if (node.scale === "macro") Object.assign(node, { fx: node.x, fy: node.y, fz: node.z });
    });
    conceptNodes.filter(node => !roots.includes(node)).forEach(node => {
      const parent = conceptNodes.find(candidate => candidate.id === node.parentId) || domainAnchor;
      const angle = stableAngle(node.id);
      Object.assign(node, { x: parent.x + Math.cos(angle) * 52, y: parent.y + Math.sin(angle) * 52, z: parent.z + Math.sin(angle * 2) * 24 });
    });
    return nodes;
  }
  const selected = conceptNodes.find(node => node.id === selectedId);
  if (selected) Object.assign(selected, { x: 0, y: 0, z: 0, fx: 0, fy: 0, fz: 0 });
  const others = conceptNodes.filter(node => node.id !== selectedId);
  others.forEach((node, index) => {
    const concept = conceptById(node.id);
    const relation = concept.prerequisites.find(edge => edge.id === selectedId);
    const isPrerequisite = conceptById(selectedId).prerequisites.some(edge => edge.id === node.id);
    const side = isPrerequisite ? -1 : relation ? 1 : 0;
    const angle = index / Math.max(others.length, 1) * Math.PI * 2;
    Object.assign(node, { x: side * 105 + Math.cos(angle) * 48, y: Math.sin(angle) * 80, z: Math.cos(angle * 2) * 42 });
  });
  Object.assign(domainAnchor, { x: 0, y: -155, z: -45, fx: 0, fy: -155, fz: -45 });
  return nodes;
}

function linksForNodes(nodes) {
  if (navigationLevel === "global") return [];
  const visible = new Set(nodes.map(node => node.id));
  const links = [];
  nodes.filter(node => !node.isDomain).forEach(node => {
    const concept = conceptById(node.id);
    const parent = concept.parentId && visible.has(concept.parentId) ? concept.parentId : domainNodeId(concept.domain);
    if (visible.has(parent)) links.push({ source: parent, target: concept.id, type: "containment" });
    if (navigationLevel === "concept" || fullDetail) concept.prerequisites.forEach(edge => {
      if (visible.has(edge.id) && (edge.kind === "necessary" || concept.id === selectedId || edge.id === selectedId))
        links.push({ source: edge.id, target: concept.id, type: edge.kind });
    });
  });
  return links;
}

function makeNodeLabel(node) {
  const show = node.isDomain || node.scale === "macro" || node.id === selectedId || (navigationLevel === "domain" && node.scale === "meso");
  const label = new SpriteText(show ? node.name : "");
  label.color = "#f2f6ff";
  label.textHeight = LABEL_SIZE[node.scale];
  label.backgroundColor = node.isDomain ? "rgba(7, 12, 24, .96)" : "rgba(5, 8, 16, .84)";
  label.padding = node.isDomain ? 3.5 : 2;
  label.borderRadius = 3;
  label.position.y = -(Math.cbrt(NODE_SIZE[node.scale]) * 4.6 + 5);
  label.material.depthTest = false;
  label.renderOrder = 10;
  return label;
}

function frameCurrentView(duration = 800) {
  if (!graph) return;
  const padding = navigationLevel === "global" ? 105 : navigationLevel === "domain" ? 85 : 72;
  graph.zoomToFit(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : duration, padding);
}

function updateNavigationControls() {
  $("#global-view").setAttribute("aria-pressed", String(navigationLevel === "global"));
  $("#domain-view").disabled = !selectedDomain;
  $("#domain-view").setAttribute("aria-pressed", String(navigationLevel === "domain"));
  $("#concept-view").disabled = !selectedId;
  $("#concept-view").setAttribute("aria-pressed", String(navigationLevel === "concept"));
  $("#parent-view").disabled = navigationLevel === "global";
  $("#expand-view").disabled = navigationLevel !== "concept";
  $("#expand-view").textContent = `Expand depth ${focusDepth}`;
  $("#detail-view").setAttribute("aria-pressed", String(fullDetail));
}

function renderCurrentView({ frame = true } = {}) {
  if (!graph) return;
  const nodes = positionNodes(nodesForCurrentView());
  const links = linksForNodes(nodes);
  pendingFrame = frame;
  graph.graphData({ nodes, links });
  if (typeof SpriteText === "function") graph.nodeThreeObject(graph.nodeThreeObject());
  updateNavigationControls();
  if (frame) setTimeout(() => frameCurrentView(), 180);
}

function enterGlobal() {
  navigationLevel = "global";
  fullDetail = false;
  renderCurrentView();
  detailsElement.innerHTML = '<div class="empty-state"><div class="orbit-icon" aria-hidden="true"><i></i></div><p class="eyebrow">Global overview</p><h2>Choose a domain</h2><p>Start with one of the eight regions, then move from topics to individual concepts.</p></div>';
}

function enterDomain(domain) {
  selectedDomain = domain;
  navigationLevel = "domain";
  fullDetail = false;
  renderCurrentView();
  const count = concepts.filter(concept => concept.domain === domain).length;
  detailsElement.innerHTML = `<div class="empty-state"><div class="domain-orbit" style="--domain-color:${colorFor(domain)}"></div><p class="eyebrow">Domain exploration</p><h2>${domain}</h2><p>${count} concepts. Select a topic to inspect its hierarchy and learning relationships.</p></div>`;
}

function relationCard(concept, edge) {
  return `<button class="relationship-card ${edge.kind}" type="button" data-concept="${concept.id}"><span>${concept.title}</span><small>${edge.note}</small>${edge.appliesTo ? `<em>Applies to: ${edge.appliesTo}</em>` : ""}</button>`;
}

function detailGroup(title, items, empty, open = false) {
  return `<details class="detail-group" ${open ? "open" : ""}><summary>${title}<span>${items.length}</span></summary><div class="relationship-list">${items.length ? items.map(item => relationCard(item.concept, item.edge)).join("") : `<p class="none">${empty}</p>`}</div></details>`;
}

function showConcept(concept, focus = true) {
  if (!concept) return;
  selectedId = concept.id;
  selectedDomain = concept.domain;
  navigationLevel = "concept";
  focusDepth = 1;
  fullDetail = false;
  const necessary = edgesOf(concept, "necessary").map(edge => ({ concept: conceptById(edge.id), edge })).filter(item => item.concept);
  const useful = edgesOf(concept, "useful").map(edge => ({ concept: conceptById(edge.id), edge })).filter(item => item.concept);
  const downstream = concepts.flatMap(candidate => candidate.prerequisites.filter(edge => edge.id === concept.id).map(edge => ({ concept: candidate, edge })));
  const sources = concept.researchReferences.map(id => researchSources.find(source => source.id === id)).filter(Boolean);
  const breadcrumb = [`<button data-domain-crumb="${concept.domain}">${concept.domain}</button>`, ...hierarchyPath(concept).map(item => `<button data-concept="${item.id}">${item.title}</button>`)].join("<i>›</i>");
  detailsElement.innerHTML = `<nav class="breadcrumbs" aria-label="Concept hierarchy">${breadcrumb}</nav>
    <div class="detail-top"><span class="domain-pill" style="--domain-color:${colorFor(concept.domain)}"><i></i>${concept.domain}</span><span class="scale-badge ${concept.scale}">${concept.scale}</span></div>
    <h2>${concept.title}</h2><p class="unit">${concept.unit}</p>
    <p class="concept-summary">${concept.whyItMatters || concept.researchApplication}</p>
    ${detailGroup("Necessary prerequisites", necessary, "This concept is an entry point.", true)}
    ${detailGroup("Useful supporting knowledge", useful, "No optional context is mapped.")}
    <details class="detail-group"><summary>Learning objectives<span>${concept.learningObjectives.length}</span></summary><ul class="objectives">${concept.learningObjectives.map(objective => `<li>${objective}</li>`).join("")}</ul></details>
    <details class="detail-group"><summary>Mastery assessment</summary><div class="assessment">${concept.masteryAssessment}</div></details>
    ${detailGroup("Downstream directions", downstream, "No downstream concept is mapped.")}
    <details class="detail-group"><summary>Research and resources<span>${sources.length + 1}</span></summary><p class="research-application">${concept.researchApplication}</p><a class="resource-link" href="${safeLink(concept.resource)}" target="_blank" rel="noopener">Open learning resource <span>↗</span></a><div class="source-list">${sources.map(source => source.url ? `<a href="${safeLink(source.url)}" target="_blank" rel="noopener"><span>${source.citation}</span><small>${source.title}</small></a>` : `<div><span>${source.citation}</span><small>${source.verificationNote}</small></div>`).join("")}</div></details>`;
  detailsElement.querySelectorAll("[data-concept]").forEach(button => button.addEventListener("click", () => showConcept(conceptById(button.dataset.concept))));
  detailsElement.querySelector("[data-domain-crumb]")?.addEventListener("click", () => enterDomain(concept.domain));
  renderCurrentView({ frame: focus });
  searchInput.value = "";
  searchResults.hidden = true;
}

function handleNodeClick(node) {
  if (node.isDomain) enterDomain(node.domain); else showConcept(conceptById(node.id));
}

function renderSearch(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) { searchResults.hidden = true; return; }
  const matches = concepts.filter(concept => `${concept.title} ${concept.domain} ${concept.unit} ${(concept.tags || []).join(" ")}`.toLowerCase().includes(normalized)).slice(0, 18);
  searchResults.innerHTML = matches.length ? matches.map(concept => `<button class="search-result" role="option" type="button" data-concept="${concept.id}"><span>${concept.title}</span><small>${concept.domain} · ${concept.scale}</small></button>`).join("") : '<div class="search-empty">No concepts found.</div>';
  searchResults.hidden = false;
  searchResults.querySelectorAll("[data-concept]").forEach(button => button.addEventListener("click", () => showConcept(conceptById(button.dataset.concept))));
}

function showGraphError(title, error) {
  console.error(`[Research Atlas] ${title}`, error);
  graphElement.innerHTML = `<div class="graph-error" role="alert"><strong>${title}</strong><span>${error.message || error}</span><small>Reload the page, check your connection, and confirm that WebGL is enabled.</small></div>`;
}

async function initialise() {
  try {
    if (typeof ForceGraph3D !== "function") throw new Error("The 3D graph library did not load.");
    if (!graphElement.clientWidth || !graphElement.clientHeight) throw new Error("The graph container has invalid dimensions.");
    const [curriculumResponse, sourceResponse] = await Promise.all([fetch("knowledge-graph/concepts.json"), fetch("knowledge-graph/research-sources.json")]);
    if (!curriculumResponse.ok || !sourceResponse.ok) throw new Error("The curriculum or research-source registry could not be loaded.");
    const data = await curriculumResponse.json();
    researchSources = (await sourceResponse.json()).sources || [];
    if (data.schemaVersion !== 4 || !data.concepts?.length) throw new Error("The curriculum is empty or uses an unsupported schema.");
    concepts = data.concepts;
    graphElement.innerHTML = "";
    graph = ForceGraph3D()(graphElement).backgroundColor("rgba(0,0,0,0)").width(graphElement.clientWidth).height(graphElement.clientHeight)
      .nodeColor(node => colorFor(node.domain)).nodeVal(node => NODE_SIZE[node.scale]).nodeLabel(node => node.name)
      .linkColor(link => link.type === "containment" ? "rgba(142,160,194,.18)" : link.type === "useful" ? "rgba(165,135,255,.48)" : "rgba(105,168,255,.55)")
      .linkWidth(link => link.type === "containment" ? .35 : link.type === "useful" ? .6 : 1.3)
      .linkDirectionalArrowLength(link => link.type === "necessary" ? 4 : 0).linkDirectionalArrowRelPos(.88)
      .linkDirectionalArrowColor(() => "#8cb5ff").linkDirectionalParticles(link => link.type === "necessary" ? 1 : 0)
      .linkDirectionalParticleWidth(1).linkDirectionalParticleSpeed(.0025).onNodeClick(handleNodeClick)
      .onNodeHover(node => { graphElement.style.cursor = node ? "pointer" : "grab"; })
      .onEngineStop(() => { if (pendingFrame) { pendingFrame = false; frameCurrentView(650); } });
    if (typeof SpriteText === "function") graph.nodeThreeObject(makeNodeLabel).nodeThreeObjectExtend(true);
    else console.warn("[Research Atlas] Optional labels unavailable; sphere nodes and hover labels remain active.");
    graph.d3Force("charge").strength(node => node.isDomain ? -700 : node.scale === "macro" ? -360 : node.scale === "meso" ? -120 : -45);
    graph.d3Force("link").distance(link => link.type === "containment" ? 54 : link.type === "useful" ? 92 : 72);
    enterGlobal();
    console.info(`[Research Atlas] Loaded ${concepts.length} concepts in an explicit containment hierarchy.`);
  } catch (error) { showGraphError("Unable to render the knowledge graph.", error); }
}

searchInput.addEventListener("input", event => renderSearch(event.target.value));
searchInput.addEventListener("keydown", event => { if (event.key === "Escape") { searchInput.value = ""; searchResults.hidden = true; } if (event.key === "Enter") searchResults.querySelector("[data-concept]")?.click(); });
document.addEventListener("keydown", event => { if (event.key === "/" && document.activeElement !== searchInput) { event.preventDefault(); searchInput.focus(); } });
document.addEventListener("click", event => { if (!event.target.closest(".graph-toolbar")) searchResults.hidden = true; });
$("#global-view").addEventListener("click", enterGlobal);
$("#domain-view").addEventListener("click", () => selectedDomain && enterDomain(selectedDomain));
$("#concept-view").addEventListener("click", () => selectedId && showConcept(conceptById(selectedId)));
$("#parent-view").addEventListener("click", () => {
  if (navigationLevel === "domain") enterGlobal();
  else if (selectedId) { const parent = conceptById(selectedId).parentId; parent ? showConcept(conceptById(parent)) : enterDomain(selectedDomain); }
});
$("#expand-view").addEventListener("click", () => { focusDepth = Math.min(focusDepth + 1, 4); renderCurrentView(); });
$("#detail-view").addEventListener("click", () => { fullDetail = !fullDetail; renderCurrentView(); });
$("#reset-view").addEventListener("click", () => frameCurrentView(900));
window.addEventListener("resize", () => { if (graph) graph.width(graphElement.clientWidth).height(graphElement.clientHeight); });
initialise();
