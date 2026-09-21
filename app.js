const DOMAIN_COLORS = {
  Mathematics: "#69a8ff",
  Physics: "#a587ff",
  "Stellar Astrophysics": "#65d6e6",
  "Binary Stellar Evolution": "#d58acb",
  "General Relativity and Gravitational Waves": "#8595ff",
  "Scientific Computing": "#66c6a4",
  "Population Synthesis and Paleontology": "#d4a667"
};

const graphElement = document.querySelector("#graph");
const detailsElement = document.querySelector("#details");
const searchInput = document.querySelector("#concept-search");
const searchResults = document.querySelector("#search-results");
let graph;
let concepts = [];
let researchSources = [];
let hasFramedGraph = false;
let selectedId = null;
let allNodes = [];
let allLinks = [];
let activeDomains = new Set();
let neighborhoodOnly = false;

const colorFor = domain => DOMAIN_COLORS[domain] || "#9aa9c7";

function safeLink(value) {
  try {
    const url = new URL(value, window.location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "#";
  } catch {
    return "#";
  }
}

function makeNodeObject(node) {
  // The ForceGraph3D standalone bundle intentionally does not expose THREE as
  // a browser global. SpriteText provides a supported Three.js object without
  // coupling this application to the graph bundle's private Three.js instance.
  const label = new SpriteText(node.name);
  label.color = "#eef3ff";
  label.textHeight = 5.2;
  label.backgroundColor = "rgba(5, 8, 16, .82)";
  label.padding = 2.4;
  label.borderRadius = 3;
  label.position.y = -11;
  label.material.depthTest = false;
  label.renderOrder = 10;
  return label;
}

function showGraphError(title, error) {
  const message = error instanceof Error ? error.message : String(error || "Unknown error");
  console.error(`[Research Atlas] ${title}`, error);
  graphElement.innerHTML = `
    <div class="graph-error" role="alert">
      <strong>${title}</strong>
      <span>${message}</span>
      <small>Reload the page, check your connection, and confirm that WebGL is enabled.</small>
    </div>`;
}

function relationCard(concept, note, type) {
  const provenance = note.provenance.startsWith("proposed-") ? "Atlas educational judgment" : "Research-source backed";
  return `<button class="relationship-card ${type}" type="button" data-concept="${concept.id}">
    <span>${concept.title}</span>
    <small>${note.explanation}</small>
    <em>Applies to: ${note.appliesTo}</em>
    <b>${provenance}</b>
  </button>`;
}

function showConcept(concept, focus = true) {
  if (!concept) return;
  selectedId = concept.id;
  const prerequisites = concept.prerequisites.map(id => concepts.find(item => item.id === id)).filter(Boolean);
  const dependents = concepts.filter(item => item.prerequisites.includes(concept.id));
  const useful = concept.usefulConnections.map(connection => ({
    concept: concepts.find(item => item.id === connection.conceptId),
    note: connection
  })).filter(item => item.concept);
  const references = concept.researchReferences.map(id => researchSources.find(source => source.id === id)).filter(Boolean);
  const index = concepts.findIndex(item => item.id === concept.id) + 1;
  const safeResource = safeLink(concept.resource);

  detailsElement.innerHTML = `
    <div class="detail-top">
      <span class="domain-pill" style="--domain-color:${colorFor(concept.domain)}"><i></i>${concept.domain}</span>
      <span class="detail-number">${String(index).padStart(2, "0")} / ${String(concepts.length).padStart(2, "0")}</span>
    </div>
    <h2>${concept.title}</h2>
    <p class="unit">${concept.unit}</p>
    <section class="detail-section">
      <h3>Prerequisites</h3>
      <p class="relationship-key necessary">Necessary for the stated learning level</p>
      <div class="relationship-list">${prerequisites.length ? prerequisites.map(item => relationCard(item, concept.prerequisiteNotes[item.id], "necessary")).join("") : '<span class="none">Start here — no necessary prerequisites</span>'}</div>
    </section>
    <section class="detail-section">
      <h3>Supporting knowledge</h3>
      <p class="relationship-key useful">Useful, but does not block progression</p>
      <div class="relationship-list">${useful.length ? useful.map(item => relationCard(item.concept, item.note, "useful")).join("") : '<span class="none">No optional supporting connections listed</span>'}</div>
    </section>
    <section class="detail-section">
      <h3>Learning objectives</h3>
      <ul class="objectives">${concept.learningObjectives.map(objective => `<li>${objective}</li>`).join("")}</ul>
    </section>
    <section class="detail-section">
      <h3>Mastery assessment</h3>
      <div class="assessment">${concept.masteryAssessment}</div>
    </section>
    <section class="detail-section">
      <h3>Continue learning</h3>
      <div class="relationship-list">${dependents.length ? dependents.map(item => relationCard(item, item.prerequisiteNotes[concept.id], "necessary")).join("") : '<span class="none">No dependent concepts yet</span>'}</div>
    </section>
    <section class="detail-section">
      <h3>Research application</h3>
      <div class="assessment">${concept.researchApplication}</div>
    </section>
    <section class="detail-section">
      <h3>Learning resource</h3>
      <a class="resource-link" href="${safeResource}"><span>Open learning unit</span><span aria-hidden="true">↗</span></a>
    </section>
    <section class="detail-section">
      <h3>Research context</h3>
      <div class="source-list">${references.length ? references.map(source => source.url
        ? `<a href="${safeLink(source.url)}" target="_blank" rel="noopener"><span>${source.citation}</span><small>${source.title}</small></a>`
        : `<div><span>${source.citation}</span><small>${source.verificationNote}</small></div>`).join("")
        : '<span class="none">No research source is assigned; this is a foundational educational concept.</span>'}</div>
    </section>`;

  detailsElement.querySelectorAll("[data-concept]").forEach(button => {
    button.addEventListener("click", () => selectConcept(button.dataset.concept));
  });
  if (graph) applyGraphFilters(false);
  if (focus) focusNode(concept.id);
}

function focusNode(id) {
  if (!graph) return;
  const node = graph.graphData().nodes.find(item => item.id === id);
  if (!node || !Number.isFinite(node.x)) return;
  const distance = 95;
  const currentCamera = graph.cameraPosition();
  const offset = {
    x: currentCamera.x - node.x,
    y: currentCamera.y - node.y,
    z: currentCamera.z - node.z
  };
  const magnitude = Math.hypot(offset.x, offset.y, offset.z) || 1;
  graph.cameraPosition(
    {
      x: node.x + distance * offset.x / magnitude,
      y: node.y + distance * offset.y / magnitude,
      z: node.z + distance * offset.z / magnitude
    },
    node,
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1100
  );
}

function selectConcept(id) {
  const concept = concepts.find(item => item.id === id);
  if (!concept) return;
  activeDomains.add(concept.domain);
  showConcept(concept);
  searchInput.value = "";
  searchResults.hidden = true;
}

function visibleConceptIds() {
  const domainIds = new Set(concepts.filter(concept => activeDomains.has(concept.domain)).map(concept => concept.id));
  if (!neighborhoodOnly || !selectedId) return domainIds;
  const selected = concepts.find(concept => concept.id === selectedId);
  const neighborhood = new Set([selectedId, ...selected.prerequisites]);
  concepts.filter(concept => concept.prerequisites.includes(selectedId)).forEach(concept => neighborhood.add(concept.id));
  selected.usefulConnections.forEach(connection => neighborhood.add(connection.conceptId));
  return new Set([...domainIds].filter(id => neighborhood.has(id)));
}

function applyGraphFilters(fit = true) {
  if (!graph) return;
  const visible = visibleConceptIds();
  const nodes = allNodes.filter(node => visible.has(node.id));
  const links = allLinks.filter(link => {
    const sourceId = typeof link.source === "object" ? link.source.id : link.source;
    const targetId = typeof link.target === "object" ? link.target.id : link.target;
    if (!visible.has(sourceId) || !visible.has(targetId)) return false;
    return link.type === "necessary" || sourceId === selectedId || targetId === selectedId;
  });
  graph.graphData({ nodes, links });
  document.querySelectorAll("[data-domain]").forEach(button => {
    button.setAttribute("aria-pressed", String(activeDomains.has(button.dataset.domain)));
  });
  if (fit) setTimeout(() => graph.zoomToFit(700, 70), 80);
}

function renderDomainFilters() {
  const domains = [...new Set(concepts.map(concept => concept.domain))];
  activeDomains = new Set(domains);
  document.querySelector("#legend").innerHTML = domains.map(domain =>
    `<button type="button" data-domain="${domain}" aria-pressed="true" style="--legend-color:${colorFor(domain)}"><i></i>${domain}</button>`
  ).join("");
  document.querySelectorAll("[data-domain]").forEach(button => button.addEventListener("click", () => {
    const domain = button.dataset.domain;
    if (activeDomains.has(domain) && activeDomains.size > 1) activeDomains.delete(domain);
    else activeDomains.add(domain);
    applyGraphFilters();
  }));
}

function renderSearch(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    searchResults.hidden = true;
    return;
  }
  const matches = concepts.filter(concept => `${concept.title} ${concept.domain} ${concept.unit}`.toLowerCase().includes(normalized));
  searchResults.innerHTML = matches.length
    ? matches.map(concept => `<button class="search-result" role="option" type="button" data-concept="${concept.id}"><span>${concept.title}</span><small>${concept.domain}</small></button>`).join("")
    : '<div class="search-empty">No concepts found.</div>';
  searchResults.hidden = false;
  searchResults.querySelectorAll("[data-concept]").forEach(button => button.addEventListener("click", () => selectConcept(button.dataset.concept)));
}

async function initialise() {
  try {
    if (typeof ForceGraph3D !== "function") {
      throw new Error("The 3D graph library did not load.");
    }
    if (typeof SpriteText !== "function") {
      throw new Error("The 3D label library did not load.");
    }
    const width = graphElement.clientWidth;
    const height = graphElement.clientHeight;
    if (!width || !height) {
      throw new Error(`The graph container has invalid dimensions (${width} × ${height}).`);
    }

    const [curriculumResponse, sourcesResponse] = await Promise.all([
      fetch("knowledge-graph/concepts.json"),
      fetch("knowledge-graph/research-sources.json")
    ]);
    if (!curriculumResponse.ok) throw new Error(`Curriculum request failed (${curriculumResponse.status})`);
    if (!sourcesResponse.ok) throw new Error(`Research-source request failed (${sourcesResponse.status})`);
    const data = await curriculumResponse.json();
    const sourceData = await sourcesResponse.json();
    if (!Array.isArray(data.concepts) || data.concepts.length === 0) {
      throw new Error("The curriculum contains no concepts to render.");
    }
    concepts = data.concepts;
    researchSources = sourceData.sources || [];
    allNodes = concepts.map(concept => ({ id: concept.id, name: concept.title, domain: concept.domain }));
    const necessaryLinks = concepts.flatMap(concept => concept.prerequisites.map(source => ({ source, target: concept.id, type: "necessary" })));
    const usefulLinks = concepts.flatMap(concept => concept.usefulConnections.map(connection => ({ source: concept.id, target: connection.conceptId, type: "useful" })));
    allLinks = [...necessaryLinks, ...usefulLinks];

    graphElement.innerHTML = "";
    graph = ForceGraph3D()(graphElement)
      .graphData({ nodes: allNodes, links: necessaryLinks })
      .backgroundColor("rgba(0,0,0,0)")
      .width(graphElement.clientWidth)
      .height(graphElement.clientHeight)
      .nodeColor(node => colorFor(node.domain))
      .nodeThreeObject(makeNodeObject)
      .nodeThreeObjectExtend(true)
      .nodeLabel("name")
      .nodeVal(6)
      .linkColor(link => link.type === "useful" ? "rgba(165, 135, 255, .68)" : "rgba(105, 168, 255, .34)")
      .linkWidth(link => link.type === "useful" ? 1.4 : .75)
      .linkDirectionalArrowLength(link => link.type === "necessary" ? 4 : 0)
      .linkDirectionalArrowRelPos(.88)
      .linkDirectionalArrowColor(() => "#799ee8")
      .linkDirectionalParticles(link => link.type === "necessary" ? 1 : 0)
      .linkDirectionalParticleWidth(1.3)
      .linkDirectionalParticleSpeed(.003)
      .linkDirectionalParticleColor(() => "#9dbbff")
      .onNodeClick(node => selectConcept(node.id))
      .onNodeHover(node => { graphElement.style.cursor = node ? "pointer" : "grab"; })
      .onEngineStop(() => {
        if (!hasFramedGraph) {
          hasFramedGraph = true;
          graph.zoomToFit(700, 75);
        }
      });
    graph.d3Force("charge").strength(-170);
    graph.d3Force("link").distance(78);
    graph.cameraPosition({ x: 0, y: 0, z: 220 });

    const canvas = graphElement.querySelector("canvas");
    if (!canvas) throw new Error("The WebGL renderer did not create a canvas.");
    console.info(`[Research Atlas] Rendered ${allNodes.length} concepts, ${necessaryLinks.length} necessary links, and ${usefulLinks.length} contextual useful links.`, {
      canvas: `${canvas.width} × ${canvas.height}`,
      container: `${width} × ${height}`
    });

    renderDomainFilters();
    showConcept(concepts[0], false);
  } catch (error) {
    showGraphError("Unable to render the knowledge graph.", error);
  }
}

searchInput.addEventListener("input", event => renderSearch(event.target.value));
searchInput.addEventListener("keydown", event => {
  if (event.key === "Escape") { searchInput.value = ""; searchResults.hidden = true; }
  if (event.key === "Enter") searchResults.querySelector("[data-concept]")?.click();
});
document.addEventListener("keydown", event => {
  if (event.key === "/" && document.activeElement !== searchInput) { event.preventDefault(); searchInput.focus(); }
});
document.addEventListener("click", event => {
  if (!event.target.closest(".graph-toolbar")) searchResults.hidden = true;
});
document.querySelector("#reset-view").addEventListener("click", () => {
  if (graph) graph.zoomToFit(900, 75);
});
document.querySelector("#neighborhood-view").addEventListener("click", event => {
  neighborhoodOnly = !neighborhoodOnly;
  event.currentTarget.setAttribute("aria-pressed", String(neighborhoodOnly));
  applyGraphFilters();
});
window.addEventListener("resize", () => {
  if (graph) graph.width(graphElement.clientWidth).height(graphElement.clientHeight);
});

initialise();
