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
  outFile: join(HERE, "dist", "bambu-p1s.html"),
  meta: {
    title: "Anatomy · Bambu Lab P1S CoreXY 3D Printer (Three.js Isometric)",
    ariaLabel: "Interactive Bambu Lab P1S CoreXY 3D printer cutaway figure",
    figLabel: "Fig 09 · Bambu P1S CoreXY",
    initialPhase: "L5/14 (31%) · OUTER WALL",
    initialReadout: "X84 Y108 Z24.0 · 200mm/s · 16.8mm³/s · 220°C",
    engravedTagsHtml: [
      `<div class="engraved-tag" id="tag-plate">BAMBU LAB P1S · 256³ mm · 20 m/s²</div>`,
      `<div class="engraved-tag" id="tag-corexy">COREXY · A/B BELTS · 9:53 EXT</div>`
    ].join("\n        "),
    captionHtml:
      `<strong>The object is the explanation.</strong> Drag the carbon-rod toolhead in X/Y or the textured PEI bed in Z: two rear-mounted stepper motors drive stacked upper (blue) and lower (red) CoreXY timing belts differentially—turning together for X travel and opposite for Y—while one bottom motor synchronizes three Z lead screws and a 9:53 dual-gear extruder feeds a 300 °C ceramic hotend.`,
    legendHtml: [
      `<span class="legend-item"><span class="legend-swatch" id="leg-lit"></span>Lit Extrusion &amp; Filament</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-intake"></span>Belt A (ΔX+ΔY) &amp; Cooling Air</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-exh"></span>Belt B (ΔX−ΔY)</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-comb"></span>300°C Ceramic Hotend</span>`
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
