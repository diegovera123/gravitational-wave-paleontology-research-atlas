const DOMAIN_COLORS = {
  Mathematics: "#69a8ff",
  Physics: "#a587ff",
  "Stellar Astrophysics": "#65d6e6",
  "Binary Stellar Evolution": "#d58acb",
  "General Relativity and Gravitational Waves": "#8595ff",
  "Scientific Computing": "#66c6a4",
  "Population Synthesis and Paleontology": "#d4a667",
  "Research Practice": "#f08fa9"
};

const SCALE_SIZE = { macro: 18, meso: 8, micro: 3.5 };
const SCALE_LABEL = { macro: 7.2, meso: 4.2, micro: 3.2 };
const graphElement = document.querySelector("#graph");
const detailsElement = document.querySelector("#details");
const searchInput = document.querySelector("#concept-search");
const searchResults = document.querySelector("#search-results");
let graph;
let concepts = [];
let researchSources = [];
let selectedId = null;
let allNodes = [];
let allLinks = [];
let activeDomains = new Set();
let neighborhoodOnly = false;
let overviewMode = true;
let hasFramedGraph = false;

const colorFor = domain => DOMAIN_COLORS[domain] || "#9aa9c7";
const edgesOf = (concept, kind) => concept.prerequisites.filter(edge => edge.kind === kind);
const conceptById = id => concepts.find(concept => concept.id === id);

function safeLink(value) {
  try {
    const url = new URL(value, window.location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "#";
  } catch {
    return "#";
  }
}

function stableJitter(value, axis) {
  let hash = 0;
  for (const character of `${value}-${axis}`) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  return ((Math.abs(hash) % 1000) / 1000 - .5) * 72;
}

function buildPositionedNodes() {
  const domains = [...new Set(concepts.map(concept => concept.domain))];
  const radius = 185;
  const centers = new Map(domains.map((domain, index) => {
    const angle = (index / domains.length) * Math.PI * 2;
    return [domain, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, z: index % 2 ? 38 : -38 }];
  }));
  return concepts.map(concept => {
    const center = centers.get(concept.domain);
    const node = {
      id: concept.id,
      name: concept.title,
      domain: concept.domain,
      scale: concept.scale,
      x: center.x + stableJitter(concept.id, "x"),
      y: center.y + stableJitter(concept.id, "y"),
      z: center.z + stableJitter(concept.id, "z") * .7
    };
    if (concept.scale === "macro") Object.assign(node, { fx: center.x, fy: center.y, fz: center.z });
    return node;
  });
}

function makeNodeLabel(node) {
  const shouldLabel = node.scale !== "micro" || node.id === selectedId;
  const label = new SpriteText(shouldLabel ? node.name : "");
  label.color = "#eef3ff";
  label.textHeight = SCALE_LABEL[node.scale];
  label.backgroundColor = node.scale === "macro" ? "rgba(8, 12, 24, .94)" : "rgba(5, 8, 16, .8)";
  label.padding = node.scale === "macro" ? 3 : 2;
  label.borderRadius = 3;
  label.position.y = -(Math.cbrt(SCALE_SIZE[node.scale]) * 5 + 5);
  label.material.depthTest = false;
  label.renderOrder = 10;
  return label;
}

function showGraphError(title, error) {
  const message = error instanceof Error ? error.message : String(error || "Unknown error");
  console.error(`[Research Atlas] ${title}`, error);
  graphElement.innerHTML = `<div class="graph-error" role="alert"><strong>${title}</strong><span>${message}</span><small>Reload the page, check your connection, and confirm that WebGL is enabled.</small></div>`;
}

function relationCard(concept, edge, direction = "prerequisite") {
  const label = edge.provenance?.startsWith("proposed-") ? "Atlas educational judgment" : "Documented relationship";
  return `<button class="relationship-card ${edge.kind}" type="button" data-concept="${concept.id}">
    <span>${concept.title}</span><small>${edge.note}</small>
    ${edge.appliesTo ? `<em>Applies to: ${edge.appliesTo}</em>` : ""}<b>${direction === "next" ? "Next direction · " : ""}${label}</b>
  </button>`;
}

function downstreamOf(id, kind) {
  return concepts.flatMap(concept => concept.prerequisites
    .filter(edge => edge.id === id && edge.kind === kind)
    .map(edge => ({ concept, edge })));
}

function relationshipSection(title, key, items, empty, direction = "prerequisite") {
  return `<section class="detail-section"><h3>${title}</h3><p class="relationship-key ${key}">${key === "necessary" ? "Required at this learning depth" : "Helpful context; does not block progress"}</p>
    <div class="relationship-list">${items.length ? items.map(item => relationCard(item.concept, item.edge, direction)).join("") : `<span class="none">${empty}</span>`}</div></section>`;
}

function showConcept(concept, focus = true) {
  if (!concept) return;
  selectedId = concept.id;
  const necessary = edgesOf(concept, "necessary").map(edge => ({ concept: conceptById(edge.id), edge })).filter(item => item.concept);
  const useful = edgesOf(concept, "useful").map(edge => ({ concept: conceptById(edge.id), edge })).filter(item => item.concept);
  const requiredNext = downstreamOf(concept.id, "necessary");
  const goodDirections = downstreamOf(concept.id, "useful");
  const references = concept.researchReferences.map(id => researchSources.find(source => source.id === id)).filter(Boolean);
  const index = concepts.findIndex(item => item.id === concept.id) + 1;

  detailsElement.innerHTML = `
    <div class="detail-top"><span class="domain-pill" style="--domain-color:${colorFor(concept.domain)}"><i></i>${concept.domain}</span><span class="detail-number">${String(index).padStart(3, "0")} / ${concepts.length}</span></div>
    <div class="concept-meta"><span>${concept.unit}</span><span class="scale-badge ${concept.scale}">${concept.scale} scale</span></div>
    <h2>${concept.title}</h2>
    <section class="why"><h3>Why this matters</h3><p>${concept.whyItMatters || concept.researchApplication}</p></section>
    ${relationshipSection("Necessary prerequisites", "necessary", necessary, "No necessary prerequisites — this is an entry point.")}
    ${relationshipSection("Useful prerequisites", "useful", useful, "No optional supporting prerequisites listed.")}
    <section class="detail-section"><h3>Learning objectives</h3><ul class="objectives">${concept.learningObjectives.map(objective => `<li>${objective}</li>`).join("")}</ul></section>
    <section class="detail-section"><h3>Mastery assessment</h3><div class="assessment">${concept.masteryAssessment}</div></section>
    ${relationshipSection("Required next steps", "necessary", requiredNext, "No concept currently requires this one.", "next")}
    ${relationshipSection("Good next directions", "useful", goodDirections, "No optional downstream direction is currently mapped.", "next")}
    <section class="detail-section"><h3>Learning resource</h3><a class="resource-link" href="${safeLink(concept.resource)}" target="_blank" rel="noopener"><span>Open learning resource</span><span aria-hidden="true">↗</span></a></section>
    <section class="detail-section"><h3>Research context</h3><div class="source-list">${references.length ? references.map(source => source.url
      ? `<a href="${safeLink(source.url)}" target="_blank" rel="noopener"><span>${source.citation}</span><small>${source.title}</small></a>`
      : `<div><span>${source.citation}</span><small>${source.verificationNote}</small></div>`).join("")
      : '<span class="none">Foundational or Atlas-authored educational concept; no research source assigned.</span>'}</div></section>`;

  detailsElement.querySelectorAll("[data-concept]").forEach(button => button.addEventListener("click", () => selectConcept(button.dataset.concept)));
  if (graph) {
    applyGraphFilters(false);
    if (typeof SpriteText === "function") graph.nodeThreeObject(graph.nodeThreeObject());
  }
  if (focus) requestAnimationFrame(() => focusNode(concept.id));
}

function focusNode(id) {
  if (!graph) return;
  const node = graph.graphData().nodes.find(item => item.id === id);
  if (!node || !Number.isFinite(node.x)) return;
  const distance = node.scale === "macro" ? 145 : 95;
  const camera = graph.cameraPosition();
  const offset = { x: camera.x - node.x, y: camera.y - node.y, z: camera.z - node.z };
  const magnitude = Math.hypot(offset.x, offset.y, offset.z) || 1;
  graph.cameraPosition({ x: node.x + distance * offset.x / magnitude, y: node.y + distance * offset.y / magnitude, z: node.z + distance * offset.z / magnitude }, node,
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1100);
}

function selectConcept(id) {
  const concept = conceptById(id);
  if (!concept) return;
  activeDomains.add(concept.domain);
  showConcept(concept);
  searchInput.value = "";
  searchResults.hidden = true;
}

function visibleConceptIds() {
  const inDomain = concepts.filter(concept => activeDomains.has(concept.domain));
  if (neighborhoodOnly && selectedId) {
    const neighborhood = new Set([selectedId]);
    conceptById(selectedId).prerequisites.forEach(edge => neighborhood.add(edge.id));
    concepts.forEach(concept => concept.prerequisites.forEach(edge => { if (edge.id === selectedId) neighborhood.add(concept.id); }));
    return new Set(inDomain.filter(concept => neighborhood.has(concept.id)).map(concept => concept.id));
  }
  return new Set(inDomain.filter(concept => !overviewMode || concept.scale !== "micro" || concept.id === selectedId).map(concept => concept.id));
}

function applyGraphFilters(fit = true) {
  if (!graph) return;
  const visible = visibleConceptIds();
  const nodes = allNodes.filter(node => visible.has(node.id));
  const links = allLinks.filter(link => {
    const sourceId = typeof link.source === "object" ? link.source.id : link.source;
    const targetId = typeof link.target === "object" ? link.target.id : link.target;
    return visible.has(sourceId) && visible.has(targetId) && (link.type === "necessary" || sourceId === selectedId || targetId === selectedId);
  });
  graph.graphData({ nodes, links });
  document.querySelectorAll("[data-domain]").forEach(button => button.setAttribute("aria-pressed", String(activeDomains.has(button.dataset.domain))));
  if (fit) setTimeout(() => graph.zoomToFit(700, 85), 100);
}

function renderDomainFilters() {
  const domains = [...new Set(concepts.map(concept => concept.domain))];
  activeDomains = new Set(domains);
  document.querySelector("#legend").innerHTML = domains.map(domain => `<button type="button" data-domain="${domain}" aria-pressed="true" style="--legend-color:${colorFor(domain)}"><i></i>${domain}</button>`).join("");
  document.querySelectorAll("[data-domain]").forEach(button => button.addEventListener("click", () => {
    const domain = button.dataset.domain;
    if (activeDomains.has(domain) && activeDomains.size > 1) activeDomains.delete(domain); else activeDomains.add(domain);
    applyGraphFilters();
  }));
}

function renderSearch(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) { searchResults.hidden = true; return; }
  const matches = concepts.filter(concept => `${concept.title} ${concept.domain} ${concept.unit} ${(concept.tags || []).join(" ")}`.toLowerCase().includes(normalized)).slice(0, 18);
  searchResults.innerHTML = matches.length ? matches.map(concept => `<button class="search-result" role="option" type="button" data-concept="${concept.id}"><span>${concept.title}</span><small>${concept.scale} · ${concept.domain}</small></button>`).join("") : '<div class="search-empty">No concepts found.</div>';
  searchResults.hidden = false;
  searchResults.querySelectorAll("[data-concept]").forEach(button => button.addEventListener("click", () => selectConcept(button.dataset.concept)));
}

async function initialise() {
  try {
    if (typeof ForceGraph3D !== "function") throw new Error("The 3D graph library did not load.");
    const width = graphElement.clientWidth;
    const height = graphElement.clientHeight;
    if (!width || !height) throw new Error(`The graph container has invalid dimensions (${width} × ${height}).`);
    const [curriculumResponse, sourcesResponse] = await Promise.all([fetch("knowledge-graph/concepts.json"), fetch("knowledge-graph/research-sources.json")]);
    if (!curriculumResponse.ok) throw new Error(`Curriculum request failed (${curriculumResponse.status})`);
    if (!sourcesResponse.ok) throw new Error(`Research-source request failed (${sourcesResponse.status})`);
    const data = await curriculumResponse.json();
    const sourceData = await sourcesResponse.json();
    if (data.schemaVersion !== 3 || !Array.isArray(data.concepts) || !data.concepts.length) throw new Error("The curriculum is empty or uses an unsupported schema.");
    concepts = data.concepts;
    researchSources = sourceData.sources || [];
    allNodes = buildPositionedNodes();
    allLinks = concepts.flatMap(concept => concept.prerequisites.map(edge => ({ source: edge.id, target: concept.id, type: edge.kind })));
    const initialVisible = new Set(concepts.filter(concept => concept.scale !== "micro").map(concept => concept.id));

    graphElement.innerHTML = "";
    graph = ForceGraph3D()(graphElement)
      .graphData({ nodes: allNodes.filter(node => initialVisible.has(node.id)), links: allLinks.filter(link => link.type === "necessary" && initialVisible.has(link.source) && initialVisible.has(link.target)) })
      .backgroundColor("rgba(0,0,0,0)").width(width).height(height)
      .nodeColor(node => colorFor(node.domain)).nodeVal(node => SCALE_SIZE[node.scale]).nodeLabel(node => `${node.name} · ${node.scale}`)
      .linkColor(link => link.type === "useful" ? "rgba(165,135,255,.52)" : "rgba(105,168,255,.42)")
      .linkWidth(link => link.type === "useful" ? .55 : 1.15)
      .linkDirectionalArrowLength(link => link.type === "necessary" ? 4 : 0).linkDirectionalArrowRelPos(.88)
      .linkDirectionalArrowColor(() => "#8cb5ff").linkDirectionalParticles(link => link.type === "necessary" ? 1 : 0)
      .linkDirectionalParticleWidth(1.1).linkDirectionalParticleSpeed(.0025).linkDirectionalParticleColor(() => "#9dbbff")
      .onNodeClick(node => selectConcept(node.id)).onNodeHover(node => { graphElement.style.cursor = node ? "pointer" : "grab"; })
      .onEngineStop(() => { if (!hasFramedGraph) { hasFramedGraph = true; graph.zoomToFit(700, 90); } });
    if (typeof SpriteText === "function") graph.nodeThreeObject(makeNodeLabel).nodeThreeObjectExtend(true);
    else console.warn("[Research Atlas] three-spritetext did not load; using reliable sphere nodes with hover labels.");
    graph.d3Force("charge").strength(node => node.scale === "macro" ? -520 : node.scale === "meso" ? -180 : -65);
    graph.d3Force("link").distance(link => link.type === "useful" ? 100 : 72);
    graph.cameraPosition({ x: 0, y: 0, z: 640 });
    if (!graphElement.querySelector("canvas")) throw new Error("The WebGL renderer did not create a canvas.");
    console.info(`[Research Atlas] Loaded ${allNodes.length} concepts and ${allLinks.length} typed relationships in schema v3.`);
    renderDomainFilters();
    showConcept(conceptById("research-practice"), false);
  } catch (error) { showGraphError("Unable to render the knowledge graph.", error); }
}

searchInput.addEventListener("input", event => renderSearch(event.target.value));
searchInput.addEventListener("keydown", event => {
  if (event.key === "Escape") { searchInput.value = ""; searchResults.hidden = true; }
  if (event.key === "Enter") searchResults.querySelector("[data-concept]")?.click();
});
document.addEventListener("keydown", event => { if (event.key === "/" && document.activeElement !== searchInput) { event.preventDefault(); searchInput.focus(); } });
document.addEventListener("click", event => { if (!event.target.closest(".graph-toolbar")) searchResults.hidden = true; });
document.querySelector("#reset-view").addEventListener("click", () => graph?.zoomToFit(900, 90));
document.querySelector("#neighborhood-view").addEventListener("click", event => {
  neighborhoodOnly = !neighborhoodOnly;
  event.currentTarget.setAttribute("aria-pressed", String(neighborhoodOnly));
  applyGraphFilters();
});
document.querySelector("#overview-view").addEventListener("click", event => {
  overviewMode = !overviewMode;
  event.currentTarget.setAttribute("aria-pressed", String(overviewMode));
  event.currentTarget.textContent = overviewMode ? "Overview" : "Full detail";
  applyGraphFilters();
});
window.addEventListener("resize", () => { if (graph) graph.width(graphElement.clientWidth).height(graphElement.clientHeight); });
initialise();
