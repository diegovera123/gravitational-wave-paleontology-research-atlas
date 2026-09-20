const DOMAIN_COLORS = {
  Mathematics: "#69a8ff",
  Physics: "#a587ff",
  Astrophysics: "#65d6e6"
};

const graphElement = document.querySelector("#graph");
const detailsElement = document.querySelector("#details");
const searchInput = document.querySelector("#concept-search");
const searchResults = document.querySelector("#search-results");
let graph;
let concepts = [];
let hasFramedGraph = false;

const colorFor = domain => DOMAIN_COLORS[domain] || "#9aa9c7";

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

function relationButton(concept) {
  return `<button class="concept-link" type="button" data-concept="${concept.id}">${concept.title}</button>`;
}

function showConcept(concept, focus = true) {
  if (!concept) return;
  const prerequisites = concept.prerequisites.map(id => concepts.find(item => item.id === id)).filter(Boolean);
  const dependents = concepts.filter(item => item.prerequisites.includes(concept.id));
  const index = concepts.findIndex(item => item.id === concept.id) + 1;
  const safeResource = concept.resource.replace(/[^a-zA-Z0-9_./-]/g, "");

  detailsElement.innerHTML = `
    <div class="detail-top">
      <span class="domain-pill" style="--domain-color:${colorFor(concept.domain)}"><i></i>${concept.domain}</span>
      <span class="detail-number">${String(index).padStart(2, "0")} / ${String(concepts.length).padStart(2, "0")}</span>
    </div>
    <h2>${concept.title}</h2>
    <p class="unit">${concept.unit}</p>
    <section class="detail-section">
      <h3>Prerequisites</h3>
      <div class="concept-links">${prerequisites.length ? prerequisites.map(relationButton).join("") : '<span class="none">Start here — no prerequisites</span>'}</div>
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
      <div class="concept-links">${dependents.length ? dependents.map(relationButton).join("") : '<span class="none">No dependent concepts yet</span>'}</div>
    </section>
    <section class="detail-section">
      <h3>Learning resource</h3>
      <a class="resource-link" href="${safeResource}"><span>Open learning unit</span><span aria-hidden="true">↗</span></a>
    </section>`;

  detailsElement.querySelectorAll("[data-concept]").forEach(button => {
    button.addEventListener("click", () => selectConcept(button.dataset.concept));
  });
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
  showConcept(concept);
  searchInput.value = "";
  searchResults.hidden = true;
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

    const response = await fetch("knowledge-graph/concepts.json");
    if (!response.ok) throw new Error(`Curriculum request failed (${response.status})`);
    const data = await response.json();
    if (!Array.isArray(data.concepts) || data.concepts.length === 0) {
      throw new Error("The curriculum contains no concepts to render.");
    }
    concepts = data.concepts;
    const nodes = concepts.map(concept => ({ id: concept.id, name: concept.title, domain: concept.domain }));
    const links = concepts.flatMap(concept => concept.prerequisites.map(source => ({ source, target: concept.id })));

    graphElement.innerHTML = "";
    graph = ForceGraph3D()(graphElement)
      .graphData({ nodes, links })
      .backgroundColor("rgba(0,0,0,0)")
      .width(graphElement.clientWidth)
      .height(graphElement.clientHeight)
      .nodeColor(node => colorFor(node.domain))
      .nodeThreeObject(makeNodeObject)
      .nodeThreeObjectExtend(true)
      .nodeLabel("name")
      .nodeVal(6)
      .linkColor(() => "rgba(132, 158, 211, .43)")
      .linkWidth(1)
      .linkDirectionalArrowLength(5)
      .linkDirectionalArrowRelPos(.88)
      .linkDirectionalArrowColor(() => "#799ee8")
      .linkDirectionalParticles(1)
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
    console.info(`[Research Atlas] Rendered ${nodes.length} concepts and ${links.length} prerequisite links.`, {
      canvas: `${canvas.width} × ${canvas.height}`,
      container: `${width} × ${height}`
    });

    const domains = [...new Set(concepts.map(concept => concept.domain))];
    document.querySelector("#legend").innerHTML = domains.map(domain => `<span style="color:${colorFor(domain)}"><i></i>${domain}</span>`).join("");
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
window.addEventListener("resize", () => {
  if (graph) graph.width(graphElement.clientWidth).height(graphElement.clientHeight);
});

initialise();
