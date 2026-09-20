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
let selectedId = null;

const colorFor = domain => DOMAIN_COLORS[domain] || "#9aa9c7";

function makeNodeObject(node) {
  const group = new THREE.Group();
  const color = colorFor(node.domain);
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(5.5, 20, 20),
    new THREE.MeshLambertMaterial({ color, transparent: true, opacity: .95 })
  );
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(8.5, 16, 16),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .09 })
  );
  group.add(halo, sphere);

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  context.font = `600 ${13 * pixelRatio}px DM Sans, sans-serif`;
  const textWidth = context.measureText(node.name).width;
  canvas.width = Math.ceil(textWidth + 22 * pixelRatio);
  canvas.height = 32 * pixelRatio;
  context.font = `600 ${13 * pixelRatio}px DM Sans, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "rgba(5, 8, 16, .8)";
  context.roundRect(0, 0, canvas.width, canvas.height, 7 * pixelRatio);
  context.fill();
  context.fillStyle = "#eef3ff";
  context.fillText(node.name, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  label.position.set(0, -13, 0);
  label.scale.set(canvas.width / (4.5 * pixelRatio), canvas.height / (4.5 * pixelRatio), 1);
  label.renderOrder = 10;
  group.add(label);
  return group;
}

function relationButton(concept) {
  return `<button class="concept-link" type="button" data-concept="${concept.id}">${concept.title}</button>`;
}

function showConcept(concept, focus = true) {
  if (!concept) return;
  selectedId = concept.id;
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
  const node = graph.graphData().nodes.find(item => item.id === id);
  if (!node || !Number.isFinite(node.x)) return;
  const distance = 95;
  const magnitude = Math.hypot(node.x, node.y, node.z) || 1;
  graph.cameraPosition(
    { x: node.x + distance * node.x / magnitude, y: node.y + distance * node.y / magnitude, z: node.z + distance * node.z / magnitude },
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
    const response = await fetch("knowledge-graph/concepts.json");
    if (!response.ok) throw new Error(`Curriculum request failed (${response.status})`);
    const data = await response.json();
    concepts = data.concepts;
    const nodes = concepts.map(concept => ({ id: concept.id, name: concept.title, domain: concept.domain }));
    const links = concepts.flatMap(concept => concept.prerequisites.map(source => ({ source, target: concept.id })));

    graphElement.innerHTML = "";
    graph = ForceGraph3D()(graphElement)
      .graphData({ nodes, links })
      .backgroundColor("rgba(0,0,0,0)")
      .width(graphElement.clientWidth)
      .height(graphElement.clientHeight)
      .nodeLabel("name")
      .nodeAutoColorBy("domain")
      .nodeVal(5)
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
      .onNodeHover(node => { graphElement.style.cursor = node ? "pointer" : "grab"; });
    graph.d3Force("charge").strength(-170);
    graph.d3Force("link").distance(78);
    graph.cameraPosition({ x: 0, y: 0, z: 220 });

    const domains = [...new Set(concepts.map(concept => concept.domain))];
    document.querySelector("#legend").innerHTML = domains.map(domain => `<span style="color:${colorFor(domain)}"><i></i>${domain}</span>`).join("");
    showConcept(concepts[0], false);
  } catch (error) {
    graphElement.innerHTML = `<div class="loading">Unable to load the curriculum.<br>${error.message}</div>`;
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
document.querySelector("#reset-view").addEventListener("click", () => graph?.zoomToFit(900, 60));
window.addEventListener("resize", () => {
  if (graph) graph.width(graphElement.clientWidth).height(graphElement.clientHeight);
});

initialise();
