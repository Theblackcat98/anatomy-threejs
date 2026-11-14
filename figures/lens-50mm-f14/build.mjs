import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAndVerifyFigure } from "../../kit/bundle.mjs";
import * as model from "./model.mjs";
import { buildBase } from "./base.mjs";
import { buildStructure } from "./structure.mjs";
import { buildSubject } from "./subject.mjs";
import { buildMechanism, updateKinematics, tourAt } from "./mechanism.mjs";
import { buildShader } from "./shader.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

buildAndVerifyFigure({
  figureDir: HERE,
  outFile: join(HERE, "dist", "lens-50mm-f14.html"),
  meta: {
    title: "Anatomy · 50mm f/1.4 Double-Gauss Prime Lens (Three.js Isometric)",
    ariaLabel: "Interactive 50mm f/1.4 Double-Gauss prime camera lens optical test bench",
    figLabel: "Fig 07 · 50mm f/1.4 Prime",
    initialPhase: "BALANCED · DOUBLE-GAUSS",
    initialReadout: "50mm · f/2.0 · d 1.20m (+2.2mm) · DoF 1.12–1.30m · MTF 76%",
    engravedTagsHtml: [
      `<div class="engraved-tag" id="tag-plate">50mm f/1.4 · 7E/6G GAUSS</div>`,
      `<div class="engraved-tag" id="tag-scale">f/1.4 – f/16</div>`
    ].join("\n        "),
    captionHtml:
      `<strong>The object is the explanation.</strong> Drag the Double-Gauss carriage, follow-focus wheel, or aperture lever: rotating the brass multi-start helicoid translates all seven glass elements as one unit to focus from 0.45 m to ∞, while the 9-blade iris diaphragm controls spherical aberration, depth of field, and marginal ray convergence onto the 36×24 mm sensor.`,
    legendHtml: [
      `<span class="legend-item"><span class="legend-swatch" id="leg-lit"></span>Lit Helicoid &amp; Iris</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-intake"></span>CMOS Sensor &amp; Marginal Rays</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-comb"></span>Axial Focal Waist</span>`
    ].join("\n        ")
  },
  model,
  buildBase,
  buildStructure,
  buildSubject,
  buildMechanism,
  buildShader,
  updateKinematics,
  tourAt
});
