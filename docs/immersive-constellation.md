# Immersive 3D knowledge constellation

This is the only **visible** Knowledge Map interface. The former structured two-column 2D map, structured/3D toggle, extensive right details sidebar and ten-region homepage preview have been retired from the active UI. A small hidden compatibility DOM remains for existing deep-link, search, research-question and study-state code; it is never exposed as an alternative navigation surface.

## Minimal interaction

- From Learn select **Explore the 3D knowledge constellation**, or select the **3D constellation** main tab.
- The first scene has one central Gravitational-Wave Paleontology sphere and **five large scientific clusters**, not 133 individual nodes.
- Click a cluster to reveal only its existing macro scientific regions.
- Click a region to reveal only its existing curated topic groups.
- Click a topic to reveal only its individual concepts.
- Click a concept to see a **compact below-graph preview**, then choose **Explore this concept** to jump to its focused learning page and prerequisites. If the selected concept has one of the original three full learning units, it also offers **Open lesson**.
- **Back** moves up one level (or closes the concept preview). **All clusters** returns to the initial big picture. **Recenter** reframes the current 3D scene.
- The concise, labeled buttons below the canvas mirror its currently visible scientific nodes for accessibility and keyboard navigation. Those buttons remain functional when the optional WebGL/CDN renderer is unavailable.

## Scientific meaning

Links in the constellation show **navigation containment** within the Atlas, not necessary prerequisites or a fictitious single universal learning order. The actual necessary and useful scientific learning prerequisites remain represented and explained on the individual concept pages. The five big clusters reuse the same scientific grouping as the main single-field journey, but do not claim that the entire math foundations section must be studied last. Concept identifiers, 10 existing macro regions, 36 curated topic groups and all 133 original concept records remain unchanged.

Research-question deep links open a concise question preview within the constellation and let visitors navigate to real linked concepts; none of the old visible map or sidebar is needed. Self-ratings, practice history and self-marked study progress are stored separately from view navigation.

## Rendering and performance

The site uses the existing pinned 3d-force-graph script. It does not create a WebGL renderer while the learner is on the homepage, during the optional first-visit diagnostic, or on the Research/Practice/Resources tabs. On the first visit to the 3D constellation, its canvas is measured after the tab is visible. Graph data is restricted to the current hierarchy level. The camera fits the visible node set; colored spheres distinguish scientific clusters; gentle particles indicate containment connections. Nodes can also be accessed by their labeled button equivalents. When WebGL or the optional CDN is unavailable, only the 3D view is replaced with a short explanation; chapter/region/topic/concept navigation still works.

## QA

Tests: `node scripts/test_constellation.mjs`, `node scripts/test_app.mjs`, `node scripts/test_single_field.mjs`, and existing diagnostic/adaptive/curriculum tests. Mocked graph and DOM tests cannot verify rendering quality or actual camera/label readability. Manually check deployed desktop and mobile views, click/rotate/zoom, first-open canvas dimensions, progressive navigation, Back/All clusters, opening an actual lesson, keyboard navigation via the labeled buttons, and non-WebGL fallback.
