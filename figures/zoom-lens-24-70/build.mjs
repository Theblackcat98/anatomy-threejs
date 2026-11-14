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
  outFile: join(HERE, "dist", "zoom-lens-24-70.html"),
  meta: {
    title: "Anatomy · 24–70mm f/2.8 Parfocal Zoom Lens (Three.js Isometric)",
    ariaLabel: "Interactive 24-70mm f/2.8 four-group parfocal zoom lens optical bench",
    figLabel: "Fig 08 · 24–70mm f/2.8 Zoom",
    initialPhase: "MID ZOOM · PARFOCAL TRACKING",
    initialReadout: "35mm f/2.8 · FOV 63.4° · d 1.50m · G2/G3 Δ 0.65 · ΔBFL 0.00mm",
    engravedTagsHtml: [
      `<div class="engraved-tag" id="tag-plate">24–70mm f/2.8 · 4-GROUP CAM</div>`,
      `<div class="engraved-tag" id="tag-zoom">24 · 35 · 50 · 70mm</div>`
    ].join("\n        "),
    captionHtml:
      `<strong>The object is the explanation.</strong> Drag the slotted brass zoom cam barrel, G2 variator carriage, or servo zoom rocker: rotating the cam drum drives the G2 variator monotonically while reciprocating the G3 compensator along a non-linear parabolic track so the back focal distance stays locked to the sensor across 24–70 mm.`,
    legendHtml: [
      `<span class="legend-item"><span class="legend-swatch" id="leg-lit"></span>Lit Variator &amp; Compensator</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-intake"></span>G1 Collector &amp; CMOS Sensor</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-comb"></span>Parfocal Ray Envelope</span>`
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
