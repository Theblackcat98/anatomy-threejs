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
  outFile: join(HERE, "dist", "helicopter-swashplate.html"),
  meta: {
    title: "Anatomy · Helicopter Swashplate & Rotor Hub (Three.js Isometric)",
    ariaLabel: "Interactive helicopter swashplate and articulated rotor hub test rig",
    figLabel: "Fig 05 · Rotor Swashplate",
    initialPhase: "FORWARD CYCLIC",
    initialReadout: "ψ 323° · COLL 8.5° · CYC +6.5°/-4.5° · B1 12.2° · 120 rpm",
    engravedTagsHtml: [
      `<div class="engraved-tag" id="tag-plate">MRH-3 · CCPM 120° · 4:1</div>`,
      `<div class="engraved-tag" id="tag-pitch">BLADE 1 PITCH°</div>`
    ].join("\n        "),
    captionHtml:
      `<strong>The object is the explanation.</strong> Drag the swashplate, cyclic stick, or collective lever directly: three 120° actuators tilt and lift the non-rotating lower swashplate while the bearing-mounted upper ring rotates with the mast so pitch links feather all three blades.`,
    legendHtml: [
      `<span class="legend-item"><span class="legend-swatch" id="leg-lit"></span>Lit Rotor Hub &amp; Blades</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-intake"></span>Swept Rotor-Disc Blur</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-comb"></span>Pitch Links &amp; Conduits</span>`
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
