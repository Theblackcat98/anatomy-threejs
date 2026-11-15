import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAndVerifyFigure } from "../../kit/bundle.mjs";
import * as model from "./model.mjs";
import { buildBase } from "./base.mjs";
import { buildStructure } from "./structure.mjs";
import { buildSubject } from "./subject.mjs";
import { buildMechanism, updateKinematics } from "./mechanism.mjs";
import { buildShader } from "./shader.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

buildAndVerifyFigure({
  figureDir: HERE,
  outFile: join(HERE, "dist", "dct-7speed.html"),
  meta: {
    title: "Anatomy · 7-Speed Dual-Clutch Transmission (Three.js Isometric)",
    ariaLabel: "Interactive 7-speed wet dual-clutch transmission (DCT) cutaway rig",
    figLabel: "Fig 07 · 7-Speed DCT",
    initialPhase: "GEAR 3 (K1 ODD) · PRE G4",
    initialReadout: "G3 · IN 2400 rpm · OUT 1320 rpm · 1.82:1",
    engravedTagsHtml: [
      `<div class="engraved-tag" id="tag-plate">7-DCT · WET</div>`,
      `<div class="engraved-tag" id="tag-mecha">MECHATRONICS</div>`
    ].join("\n        "),
    captionHtml:
      `<strong>Seamless torque handoff.</strong> Concentric multi-plate wet clutches <strong>K1 (odd 1·3·5·7)</strong> and <strong>K2 (even 2·4·6)</strong> drive nested input shafts while sliding brass dog-ring synchronizers pre-select the next gear before clutch cross-fade.`,
    legendHtml: [
      `<span class="legend-item"><span class="legend-swatch" id="leg-lit"></span>K1 Inner Odd Shaft</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-comp"></span>K2 Outer Even Shaft</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-intake"></span>Output Countershaft</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-comb"></span>Active Torque Flux</span>`
    ].join("\n        ")
  },
  model,
  buildBase,
  buildStructure,
  buildSubject,
  buildMechanism,
  buildShader,
  updateKinematics
});
